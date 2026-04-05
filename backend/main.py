import base64
import json
import math
import os
import sys
import uuid
import asyncio
from datetime import datetime
from typing import Any, Dict, Optional, Set, Tuple

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Ensure local imports work correctly during uvicorn reload
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import ai_services
import models
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Krishi Sakhi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_meta: Dict[str, Dict[str, Any]] = {}
        self.online_drivers: Set[str] = set()

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_meta.setdefault(client_id, {"role": None, "location": None, "is_online": False})

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        self.online_drivers.discard(client_id)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def send_json(self, payload: Dict[str, Any], client_id: str):
        await self.send_personal_message(json.dumps(payload), client_id)

    async def broadcast_json(self, payload: Dict[str, Any]):
        await self.broadcast(json.dumps(payload))

    def register_client(
        self,
        client_id: str,
        role: Optional[str],
        location: Optional[Dict[str, float]],
        is_online: bool = False,
        name: Optional[str] = None,
        phone: Optional[str] = None,
    ):
        meta = self.client_meta.setdefault(client_id, {"role": None, "location": None, "is_online": False})
        if role:
            meta["role"] = role
        if name:
            meta["name"] = name
        if phone:
            meta["phone"] = phone
        if location:
            lat = location.get("lat")
            lng = location.get("lng")
            if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
                meta["location"] = {"lat": float(lat), "lng": float(lng)}
        if meta.get("role") == "Driver":
            meta["is_online"] = bool(is_online)
            if is_online:
                self.online_drivers.add(client_id)
            else:
                self.online_drivers.discard(client_id)

    def update_location(self, client_id: str, location: Dict[str, float]):
        meta = self.client_meta.setdefault(client_id, {"role": None, "location": None, "is_online": False})
        lat = location.get("lat")
        lng = location.get("lng")
        if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
            meta["location"] = {"lat": float(lat), "lng": float(lng)}

    def set_driver_online(self, client_id: str, is_online: bool):
        meta = self.client_meta.setdefault(client_id, {"role": None, "location": None, "is_online": False})
        meta["role"] = meta.get("role") or "Driver"
        meta["is_online"] = bool(is_online)
        if is_online:
            self.online_drivers.add(client_id)
        else:
            self.online_drivers.discard(client_id)

    def get_client_role(self, client_id: str) -> Optional[str]:
        return self.client_meta.get(client_id, {}).get("role")

    def get_client_location(self, client_id: str) -> Optional[Dict[str, float]]:
        return self.client_meta.get(client_id, {}).get("location")

    def get_client_name_phone(self, client_id: str) -> Tuple[str, str]:
        meta = self.client_meta.get(client_id, {})
        return meta.get("name", "Driver"), meta.get("phone", "")


manager = ConnectionManager()


class BookingController:
    def __init__(self, conn_manager: ConnectionManager):
        self.manager = conn_manager
        self.orders: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def haversine_km(start: Tuple[float, float], end: Tuple[float, float]) -> float:
        lat1, lon1 = start
        lat2, lon2 = end
        radius = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _find_nearby_drivers(self, pickup: Dict[str, float], radius_km: float) -> list:
        pickup_tuple = (pickup["lat"], pickup["lng"])
        candidates = []
        for driver_id in list(self.manager.online_drivers):
            dloc = self.manager.get_client_location(driver_id)
            if not dloc:
                continue
            distance = self.haversine_km(pickup_tuple, (dloc["lat"], dloc["lng"]))
            if distance <= radius_km:
                candidates.append((driver_id, round(distance, 2)))
        candidates.sort(key=lambda item: item[1])
        return candidates

    def _build_order(self, farmer_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        order_id = payload.get("order_id") or f"ord_{uuid.uuid4().hex[:8]}"
        farmer_loc = self.manager.get_client_location(farmer_id) or {}
        pickup = payload.get("pickup") or {}
        drop = payload.get("drop") or {}

        pickup_lat = pickup.get("lat", farmer_loc.get("lat", 19.9975))
        pickup_lng = pickup.get("lng", farmer_loc.get("lng", 73.7898))
        drop_lat = drop.get("lat", 20.0059)
        drop_lng = drop.get("lng", 73.7857)

        route_distance_km = self.haversine_km((float(pickup_lat), float(pickup_lng)), (float(drop_lat), float(drop_lng)))
        total_distance_with_pickup = route_distance_km * 1.1
        fuel_price = float(payload.get("fuel_price", 95))
        truck_avg = max(float(payload.get("truck_avg", 4.5)), 1.0)
        base_driver_fee = float(payload.get("base_driver_fee", 900))
        fuel_cost = (total_distance_with_pickup / truck_avg) * fuel_price
        suggested_quote = max(base_driver_fee + fuel_cost + 150, 1000)
        incoming_quote = float(payload.get("price", 0) or 0)

        order = {
            "order_id": order_id,
            "farmer_id": farmer_id,
            "farmer_name": payload.get("farmer_name", "Farmer"),
            "farmer_phone": payload.get("farmer_phone", ""),
            "crop": payload.get("crop", "Mixed Produce"),
            "weight": payload.get("weight", "0"),
            "quoted_price": round(incoming_quote if incoming_quote > 0 else suggested_quote, 2),
            "accepted_price": None,
            "mandi_name": payload.get("mandi_name", "Local Mandi"),
            "distance_km": round(route_distance_km, 2),
            "fuel_cost_estimate": round(fuel_cost, 2),
            "pickup": {"lat": float(pickup_lat), "lng": float(pickup_lng)},
            "drop": {"lat": float(drop_lat), "lng": float(drop_lng)},
            "status": "SEARCHING_DRIVER",
            "created_at": datetime.utcnow().isoformat(),
            "driver_candidates": [],
            "selected_driver_id": None,
            "latest_counter_offer": None,
        }
        self.orders[order_id] = order
        return order

    async def create_and_dispatch_order(self, farmer_id: str, payload: Dict[str, Any]):
        order = self._build_order(farmer_id, payload)
        radius_km = float(payload.get("radius_km", 20))
        demo_mode = bool(payload.get("demo_mode", True))
        nearby_drivers = self._find_nearby_drivers(order["pickup"], radius_km)
        order["driver_candidates"] = [d[0] for d in nearby_drivers]

        await self.manager.send_json(
            {
                "event": "ORDER_CREATED_ACK",
                "order_id": order["order_id"],
                "status": order["status"],
                "nearby_driver_count": len(nearby_drivers),
            },
            farmer_id,
        )

        if not nearby_drivers:
            await self.manager.send_json(
                {
                    "event": "NO_DRIVERS_FOUND",
                    "order_id": order["order_id"],
                    "message": "No online drivers found in 20km radius.",
                },
                farmer_id,
            )
            if demo_mode:
                # Hackathon-friendly fallback to keep flow interactive even without live drivers.
                await asyncio.sleep(1.2)
                demo_driver_id = f"demo_driver_{order['order_id']}"
                order["driver_candidates"] = [demo_driver_id]
                order["latest_counter_offer"] = {
                    "driver_id": demo_driver_id,
                    "price": max(order["quoted_price"] - 100, 900),
                }
                order["status"] = "NEGOTIATING"
                await self.manager.send_json(
                    {
                        "event": "BID_UPDATED",
                        "order_id": order["order_id"],
                        "driver_id": demo_driver_id,
                        "new_price": order["latest_counter_offer"]["price"],
                        "driver_name": "Demo Driver Suresh",
                        "driver_phone": "+91 9000012345",
                    },
                    farmer_id,
                )
            return

        for driver_id, distance_to_pickup in nearby_drivers:
            payload_for_driver = {
                "event": "NEW_ORDER_AVAILABLE",
                "order_id": order["order_id"],
                "farmer_id": order["farmer_id"],
                "distance_to_pickup_km": distance_to_pickup,
                "details": {
                    "mandi_name": order["mandi_name"],
                    "farmer_name": order["farmer_name"],
                    "farmer_phone": order["farmer_phone"],
                    "crop": order["crop"],
                    "weight": order["weight"],
                    "distance": order["distance_km"],
                    "fuel_estimate": order["fuel_cost_estimate"],
                    "price": order["quoted_price"],
                },
            }
            await self.manager.send_json(payload_for_driver, driver_id)

            # Backward-compatible event for existing frontend card
            legacy_payload = dict(payload_for_driver)
            legacy_payload["event"] = "NEW_BOOKING_REQUEST"
            await self.manager.send_json(legacy_payload, driver_id)

    async def handle_counter_bid(self, driver_id: str, payload: Dict[str, Any]):
        order_id = payload.get("order_id")
        order = self.orders.get(order_id)
        if not order:
            await self.manager.send_json({"event": "ERROR", "message": "Order not found"}, driver_id)
            return
        if driver_id not in order["driver_candidates"] and driver_id != order.get("selected_driver_id"):
            await self.manager.send_json({"event": "ERROR", "message": "Driver not eligible for this order"}, driver_id)
            return

        new_price = float(payload.get("price", order["quoted_price"]))
        order["latest_counter_offer"] = {"driver_id": driver_id, "price": new_price}
        order["status"] = "NEGOTIATING"
        driver_name, driver_phone = self.manager.get_client_name_phone(driver_id)

        farmer_id = order["farmer_id"]
        await self.manager.send_json(
            {
                "event": "BID_UPDATED",
                "order_id": order_id,
                "driver_id": driver_id,
                "new_price": new_price,
                "driver_name": driver_name,
                "driver_phone": driver_phone,
            },
            farmer_id,
        )
        await self.manager.send_json(
            {
                "event": "COUNTER_OFFER_RECEIVED",
                "order_id": order_id,
                "driver_id": driver_id,
                "new_price": new_price,
                "driver_name": driver_name,
                "driver_phone": driver_phone,
            },
            farmer_id,
        )
        await self.manager.send_json(
            {"event": "COUNTER_BID_SENT", "order_id": order_id, "new_price": new_price},
            driver_id,
        )

    async def handle_accept(self, actor_id: str, payload: Dict[str, Any]):
        order_id = payload.get("order_id")
        order = self.orders.get(order_id)
        if not order:
            await self.manager.send_json({"event": "ERROR", "message": "Order not found"}, actor_id)
            return

        actor_role = self.manager.get_client_role(actor_id)
        selected_driver_id = order.get("selected_driver_id")

        if actor_role == "Driver":
            selected_driver_id = actor_id
            order["accepted_price"] = float(payload.get("price", order["quoted_price"]))
        else:
            selected_driver_id = payload.get("driver_id") or selected_driver_id
            if not selected_driver_id and order.get("latest_counter_offer"):
                selected_driver_id = order["latest_counter_offer"]["driver_id"]
            if not selected_driver_id:
                await self.manager.send_json(
                    {"event": "ERROR", "message": "No driver selected for acceptance"}, actor_id
                )
                return
            offer = order.get("latest_counter_offer")
            order["accepted_price"] = float(payload.get("price", offer["price"] if offer else order["quoted_price"]))

        if selected_driver_id not in order["driver_candidates"]:
            await self.manager.send_json({"event": "ERROR", "message": "Selected driver is not a candidate"}, actor_id)
            return

        order["selected_driver_id"] = selected_driver_id
        order["status"] = "TRIP_ACTIVE"
        driver_name, driver_phone = self.manager.get_client_name_phone(selected_driver_id)
        if str(selected_driver_id).startswith("demo_driver_"):
            driver_name = "Demo Driver Suresh"
            driver_phone = "+91 9000012345"

        trip_payload = {
            "event": "TRIP_ACTIVE",
            "order_id": order_id,
            "farmer_id": order["farmer_id"],
            "driver_id": selected_driver_id,
            "price": order["accepted_price"],
            "pickup": order["pickup"],
            "drop": order["drop"],
            "mandi_name": order["mandi_name"],
            "driver_name": driver_name,
            "driver_phone": driver_phone,
            "distance_km": order["distance_km"],
            "fuel_cost_estimate": order.get("fuel_cost_estimate", 0),
        }
        await self.manager.send_json(trip_payload, order["farmer_id"])
        await self.manager.send_json(trip_payload, selected_driver_id)

        # Compatibility event
        await self.manager.send_json(
            {"event": "BOOKING_CONFIRMED", "farmer_id": order["farmer_id"], "driver_id": selected_driver_id},
            order["farmer_id"],
        )
        await self.manager.send_json(
            {"event": "BOOKING_CONFIRMED", "farmer_id": order["farmer_id"], "driver_id": selected_driver_id},
            selected_driver_id,
        )

        for candidate in order["driver_candidates"]:
            if candidate == selected_driver_id:
                continue
            await self.manager.send_json(
                {"event": "ORDER_CLOSED", "order_id": order_id, "reason": "Accepted by another driver"},
                candidate,
            )

    async def handle_reject(self, actor_id: str, payload: Dict[str, Any]):
        order_id = payload.get("order_id")
        order = self.orders.get(order_id)
        if not order:
            await self.manager.send_json({"event": "ERROR", "message": "Order not found"}, actor_id)
            return

        role = self.manager.get_client_role(actor_id)
        if role == "Driver":
            if actor_id in order["driver_candidates"]:
                order["driver_candidates"] = [d for d in order["driver_candidates"] if d != actor_id]
            await self.manager.send_json(
                {
                    "event": "DRIVER_DECLINED",
                    "order_id": order_id,
                    "driver_id": actor_id,
                    "remaining_candidates": len(order["driver_candidates"]),
                },
                order["farmer_id"],
            )
        else:
            driver_id = payload.get("driver_id")
            if driver_id:
                await self.manager.send_json(
                    {"event": "BID_REJECTED", "order_id": order_id, "farmer_id": actor_id},
                    driver_id,
                )
            await self.manager.send_json(
                {"event": "BOOKING_REJECTED", "order_id": order_id, "farmer_id": actor_id, "driver_id": driver_id},
                order["farmer_id"],
            )


booking_controller = BookingController(manager)


def _haversine_km(start: Tuple[float, float], end: Tuple[float, float]) -> float:
    lat1, lon1 = start
    lat2, lon2 = end
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _decode_data_url(data_url: str) -> Optional[bytes]:
    if not data_url or "," not in data_url:
        return None
    try:
        _, encoded = data_url.split(",", 1)
        return base64.b64decode(encoded)
    except Exception:
        return None


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Krishi Sakhi API Running"}


@app.post("/api/ocr")
async def process_ocr_scan(data: Optional[dict] = None):
    try:
        image_bytes = None
        image_data_url = (data or {}).get("image_data_url")
        if image_data_url:
            image_bytes = _decode_data_url(image_data_url)

        result = ai_services.extract_soil_data_and_allocate(image_bytes)
        return {"status": "success", "data": result}
    except Exception as e:
        error_msg = str(e)
        if "GEMINI" in error_msg.upper() or "401" in error_msg or "404" in error_msg:
            return {"status": "error", "source": "Gemini API", "message": error_msg}
        return {"status": "error", "source": "Unknown Processing", "message": error_msg}


@app.post("/api/advisory")
def get_weather_advisory(weather: str = "Rainy for next 48 hours", crop_stage: int = 45):
    try:
        result = ai_services.generate_growing_advisory(weather, crop_stage)
        return {"status": "success", "data": result}
    except Exception as e:
        error_msg = str(e)
        if "GROQ" in error_msg.upper() or "API" in error_msg.upper():
            return {"status": "error", "source": "Groq API", "message": error_msg}
        return {"status": "error", "source": "Unknown Processing", "message": error_msg}


@app.post("/api/tts")
def sarvam_tts(text: str, language: str = "hi"):
    try:
        sarvam_key = os.getenv("SARVAM_API_KEY")
        if not sarvam_key:
            raise Exception("SARVAM_API_KEY Missing")
        return {"status": "success", "message": f"Successfully mapped TTS for: {text}"}
    except Exception as e:
        return {"status": "error", "source": "Sarvam API", "message": str(e)}


@app.post("/api/register")
def register_user(data: dict):
    try:
        return {"status": "success", "userId": data.get("phone", "random123"), "location_mapped": True}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/mandi-profit")
def calculate_optimal_mandi(data: Optional[dict] = None):
    payload = data or {}

    crop_quantity = float(payload.get("crop_quantity", 20))  # Quintals
    fuel_price = float(payload.get("fuel_price", 95))
    truck_avg = float(payload.get("truck_avg", 4.5))  # km/l
    driver_fee = float(payload.get("driver_fee", 1500))
    weather = payload.get("weather", "Clear")
    crop_type = payload.get("crop_type", "Onion")
    farmer_lat = float(payload.get("farmer_lat", 20.0059))
    farmer_lng = float(payload.get("farmer_lng", 73.7898))

    if truck_avg <= 0:
        return {"status": "error", "message": "truck_avg must be greater than 0"}
    if crop_quantity <= 0:
        return {"status": "error", "message": "crop_quantity must be greater than 0"}

    mandi_list = [
        {"id": 1, "name": "Lasalgaon Mandi", "lat": 20.1486, "lng": 74.2392, "current_price": 2200, "toll": 80, "labor": 240},
        {"id": 2, "name": "Pimpalgaon Mandi", "lat": 20.3081, "lng": 74.0911, "current_price": 2140, "toll": 90, "labor": 230},
        {"id": 3, "name": "Nashik APMC", "lat": 20.0099, "lng": 73.7769, "current_price": 2080, "toll": 40, "labor": 210},
        {"id": 4, "name": "Mumbai Vashi Market", "lat": 19.0728, "lng": 73.0026, "current_price": 2520, "toll": 420, "labor": 410},
    ]

    results = []
    base_perishability_rate = 0.01
    if "rain" in weather.lower():
        base_perishability_rate = 0.02
    if crop_type.lower() in {"tomato", "strawberry", "leafy"}:
        base_perishability_rate += 0.02

    for mandi in mandi_list:
        distance_km = _haversine_km((farmer_lat, farmer_lng), (mandi["lat"], mandi["lng"]))
        travel_hours = distance_km / 32.0  # demo avg speed

        # Groq-inspired spoilage logic: >3 hrs gets stronger penalty.
        spoilage_rate = base_perishability_rate
        if travel_hours > 3:
            spoilage_rate += 0.05
        elif travel_hours > 2:
            spoilage_rate += 0.02

        gross_revenue = crop_quantity * mandi["current_price"]
        fuel_cost = (distance_km * 2 / truck_avg) * fuel_price
        mandi_charges = mandi["toll"] + mandi["labor"]
        decay_loss = gross_revenue * spoilage_rate
        net_profit = gross_revenue - (fuel_cost + driver_fee + mandi_charges + decay_loss)

        results.append(
            {
                "mandi_id": mandi["id"],
                "mandi_name": mandi["name"],
                "distance_km": round(distance_km, 1),
                "travel_hours": round(travel_hours, 1),
                "market_price": mandi["current_price"],
                "gross_revenue": round(gross_revenue, 2),
                "fuel_cost": round(fuel_cost, 2),
                "driver_fee": round(driver_fee, 2),
                "mandi_charges": round(mandi_charges, 2),
                "spoilage_rate": round(spoilage_rate, 3),
                "decay_loss": round(decay_loss, 2),
                "net_profit": round(net_profit, 2),
                "risk_tag": "Low Risk",
                "risk_reason": "Short haul with stable handling window.",
                "is_optimal": False,
            }
        )

    # Optional Groq risk enrichment
    risk_enrichment = ai_services.analyze_mandi_risks_with_groq(
        [{"id": r["mandi_id"], "distance_km": r["distance_km"], "travel_hours": r["travel_hours"]} for r in results],
        crop_type=crop_type,
        weather_text=weather,
    )
    risk_map = {r.get("id"): r for r in risk_enrichment}
    for item in results:
        enriched = risk_map.get(item["mandi_id"])
        if enriched:
            item["risk_tag"] = enriched.get("risk_tag", item["risk_tag"])
            item["risk_reason"] = enriched.get("risk_reason", item["risk_reason"])
        else:
            if item["travel_hours"] > 5:
                item["risk_tag"] = "High Spoilage Risk"
                item["risk_reason"] = "Long travel window increases spoilage loss."
            elif item["travel_hours"] > 3:
                item["risk_tag"] = "Moderate Risk"
                item["risk_reason"] = "Medium travel duration with handling risk."

    results.sort(key=lambda x: x["net_profit"], reverse=True)
    if results:
        results[0]["is_optimal"] = True

    return {
        "status": "success",
        "formula": "(Quantity*Price) - (Distance*Fuel) - DriverFee - MandiCharges - SpoilageLoss",
        "results": results[:3],
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({"event": "ERROR", "message": "Invalid JSON payload"}), client_id
                )
                continue

            event = payload.get("event")

            if event == "REGISTER":
                manager.register_client(
                    client_id=client_id,
                    role=payload.get("role"),
                    location=payload.get("location"),
                    is_online=bool(payload.get("is_online", False)),
                    name=payload.get("name"),
                    phone=payload.get("phone"),
                )
                await manager.send_json(
                    {
                        "event": "REGISTERED",
                        "client_id": client_id,
                        "role": manager.get_client_role(client_id),
                    },
                    client_id,
                )
            elif event == "DRIVER_STATUS":
                manager.set_driver_online(client_id, bool(payload.get("is_online", False)))
                if payload.get("location"):
                    manager.update_location(client_id, payload.get("location"))
                await manager.send_json(
                    {"event": "DRIVER_STATUS_UPDATED", "is_online": bool(payload.get("is_online", False))},
                    client_id,
                )
            elif event == "LOCATION_UPDATE":
                location = payload.get("location") or {}
                manager.update_location(client_id, location)
            elif event == "BOOK_TRUCK":
                await booking_controller.create_and_dispatch_order(client_id, payload)
            elif event in {"COUNTER_OFFER", "COUNTER_BID"}:
                await booking_controller.handle_counter_bid(client_id, payload)
            elif event == "ACCEPT_OFFER":
                await booking_controller.handle_accept(client_id, payload)
            elif event == "REJECT_OFFER":
                await booking_controller.handle_reject(client_id, payload)
            else:
                await manager.send_json({"event": "ERROR", "message": f"Unsupported event: {event}"}, client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)
