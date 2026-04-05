"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import FrostedCard from "./FrostedCard";
import { Truck, CheckCircle2, Navigation2, XCircle, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

type WsBookingRequest = {
  event: string;
  order_id: string;
  farmer_id: string;
  distance_to_pickup_km?: number;
  details: {
    mandi_name: string;
    farmer_name: string;
    farmer_phone: string;
    crop: string;
    weight: string;
    distance: number;
    fuel_estimate?: number;
    price: number;
  };
};

type BookingStatus = "IDLE" | "SEARCHING" | "NEGOTIATING" | "ACCEPTED";

export default function LiveLogistics() {
  const { role, userId, userName, userPhone, driverName, driverPhone, selectedMandi, location, lockedPlan } = useAppStore();
  const wsClientId = useMemo(() => (role === "Driver" ? `${userId}_driver` : `${userId}_farmer`), [role, userId]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [activeRequests, setActiveRequests] = useState<WsBookingRequest[]>([]);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("IDLE");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOffer, setCurrentOffer] = useState<number | null>(null);
  const [counterDriverId, setCounterDriverId] = useState<string | null>(null);
  const [driverOnline, setDriverOnline] = useState(role === "Driver");
  const [systemMessage, setSystemMessage] = useState("");
  const [acceptedDriver, setAcceptedDriver] = useState<{ name: string; phone: string } | null>(null);
  const [tripMeta, setTripMeta] = useState<{ distance_km?: number; fuel_cost_estimate?: number; mandi_name?: string } | null>(null);
  const [counterByOrder, setCounterByOrder] = useState<Record<string, number>>({});
  const [driverActionByOrder, setDriverActionByOrder] = useState<Record<string, "idle" | "countered" | "accepted">>({});
  const [liveMapPoint, setLiveMapPoint] = useState<[number, number]>([19.9975, 73.7898]);
  const watchIdRef = useRef<number | null>(null);

  const mapCenter = useMemo<[number, number]>(() => {
    if (location && Array.isArray(location) && location.length === 2) return [location[0], location[1]];
    return liveMapPoint;
  }, [location, liveMapPoint]);

  useEffect(() => {
    if (role === "Driver") setDriverOnline(true);
  }, [role]);

  useEffect(() => {
    const initLeaflet = async () => {
      const leaflet = (await import("leaflet")).default;
      delete (leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });
    };
    initLeaflet();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${wsClientId}`);

    ws.onopen = () => {
      setIsSocketConnected(true);
      const locationPayload = location ? { lat: location[0], lng: location[1] } : null;
      ws.send(
        JSON.stringify({
          event: "REGISTER",
          role,
          location: locationPayload,
          is_online: role === "Driver" ? driverOnline : false,
          name: role === "Driver" ? driverName : userName,
          phone: role === "Driver" ? driverPhone : userPhone,
        })
      );
      setSystemMessage(role === "Driver" ? "Driver socket connected." : "Farmer socket connected.");
    };

    ws.onerror = () => {
      setIsSocketConnected(false);
      setSystemMessage("Live server not reachable. Start backend on :8000.");
    };

    ws.onclose = () => {
      setIsSocketConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (role === "Driver" && (data.event === "NEW_ORDER_AVAILABLE" || data.event === "NEW_BOOKING_REQUEST")) {
        setActiveRequests((prev) => {
          if (prev.some((req) => req.order_id === data.order_id)) return prev;
          return [...prev, data];
        });
        setCounterByOrder((prev) => ({
          ...prev,
          [data.order_id]: Math.max(Math.round((data.details?.price || 1200) + 100), 1000),
        }));
      }

      if (role === "Farmer" && (data.event === "BID_UPDATED" || data.event === "COUNTER_OFFER_RECEIVED")) {
        setBookingStatus("NEGOTIATING");
        setCurrentOffer(data.new_price);
        setCounterDriverId(data.driver_id || null);
        if (data.driver_name || data.driver_phone) {
          setAcceptedDriver({
            name: data.driver_name || "Driver",
            phone: data.driver_phone || "N/A",
          });
        }
      }

      if (role === "Farmer" && data.event === "ORDER_CREATED_ACK") {
        setCurrentOrderId(data.order_id);
        setBookingStatus("SEARCHING");
        setSystemMessage(`Found ${data.nearby_driver_count} nearby driver(s).`);
      }

      if (role === "Farmer" && data.event === "NO_DRIVERS_FOUND") {
        setBookingStatus("IDLE");
        setCurrentOrderId(data.order_id || null);
        setSystemMessage(data.message || "No nearby online drivers found right now.");
      }

      if (data.event === "TRIP_ACTIVE" || data.event === "BOOKING_CONFIRMED") {
        setBookingStatus("ACCEPTED");
        setCurrentOrderId((prev) => data.order_id || prev);
        if (data.driver_name || data.driver_phone) {
          setAcceptedDriver({
            name: data.driver_name || "Driver",
            phone: data.driver_phone || "N/A",
          });
        }
        if (data.distance_km || data.fuel_cost_estimate || data.mandi_name) {
          setTripMeta({
            distance_km: data.distance_km,
            fuel_cost_estimate: data.fuel_cost_estimate,
            mandi_name: data.mandi_name,
          });
        }
      }

      if (role === "Driver" && data.event === "ORDER_CLOSED") {
        setActiveRequests((prev) => prev.filter((r) => r.order_id !== data.order_id));
      }

      if (role === "Driver" && data.event === "BID_REJECTED") {
        setSystemMessage("Farmer rejected the counter-offer.");
      }
      if (role === "Driver" && data.event === "COUNTER_BID_SENT") {
        setSystemMessage(`Counter sent: Rs ${Math.round(data.new_price || 0)}`);
        setDriverActionByOrder((prev) => ({ ...prev, [data.order_id]: "countered" }));
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [role, wsClientId, location, driverOnline, driverName, driverPhone, userName, userPhone]);

  useEffect(() => {
    if (role !== "Driver" || !driverOnline || !socket) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude] as [number, number];
        setLiveMapPoint(loc);
        socket.send(
          JSON.stringify({
            event: "LOCATION_UPDATE",
            location: { lat: loc[0], lng: loc[1] },
          })
        );
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [role, driverOnline, socket]);

  const updateDriverStatus = (nextOnline: boolean) => {
    setDriverOnline(nextOnline);
    if (!socket) return;
    socket.send(
      JSON.stringify({
        event: "DRIVER_STATUS",
        is_online: nextOnline,
        location: { lat: mapCenter[0], lng: mapCenter[1] },
      })
    );
  };

  const requestTruck = () => {
    if (!socket) return;
    setSystemMessage("");
    setBookingStatus("SEARCHING");
    const mandiName = selectedMandi?.mandi_name || "Nearest Mandi";
    const routeDistance = selectedMandi?.distance_km || 0;
    const cropName = lockedPlan?.safe_crop?.name || "Mixed Produce";
    const estimatedWeight = 500;
    socket.send(
      JSON.stringify({
        event: "BOOK_TRUCK",
        mandi_name: mandiName,
        farmer_name: userName || "Ramesh Kumar",
        farmer_phone: userPhone || "",
        crop: cropName,
        weight: String(estimatedWeight),
        distance: routeDistance,
        price: 0,
        pickup: { lat: mapCenter[0], lng: mapCenter[1] },
        drop: { lat: mapCenter[0] + 0.08, lng: mapCenter[1] + 0.1 },
        radius_km: 20,
        demo_mode: true,
      })
    );
    setSystemMessage(
      selectedMandi
        ? `Broadcasting for ${selectedMandi.mandi_name} (${selectedMandi.distance_km.toFixed(1)} km route).`
        : "Broadcasting with current selected route."
    );
  };

  const counterOffer = (req: WsBookingRequest) => {
    if (!socket) return;
    const proposed = counterByOrder[req.order_id] ?? req.details.price;
    socket.send(
      JSON.stringify({
        event: "COUNTER_BID",
        order_id: req.order_id,
        price: proposed,
      })
    );
    setDriverActionByOrder((prev) => ({ ...prev, [req.order_id]: "countered" }));
    setSystemMessage(`Counter offer sent for ${req.details.farmer_name}: Rs ${Math.round(proposed)}`);
  };

  const declineBooking = (req: WsBookingRequest) => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        event: "REJECT_OFFER",
        order_id: req.order_id,
      })
    );
    setActiveRequests((prev) => prev.filter((item) => item.order_id !== req.order_id));
  };

  const acceptBookingDriver = (req: WsBookingRequest) => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        event: "ACCEPT_OFFER",
        order_id: req.order_id,
        price: req.details.price,
      })
    );
    setBookingStatus("ACCEPTED");
    setDriverActionByOrder((prev) => ({ ...prev, [req.order_id]: "accepted" }));
  };

  const acceptCounterByFarmer = () => {
    if (!socket || !currentOrderId || !counterDriverId) return;
    socket.send(
      JSON.stringify({
        event: "ACCEPT_OFFER",
        order_id: currentOrderId,
        driver_id: counterDriverId,
        price: currentOffer,
      })
    );
  };

  const rejectCounterByFarmer = () => {
    if (!socket || !currentOrderId) return;
    socket.send(
      JSON.stringify({
        event: "REJECT_OFFER",
        order_id: currentOrderId,
        driver_id: counterDriverId,
      })
    );
    setBookingStatus("SEARCHING");
  };

  const renderMap = () => (
    <div className="h-48 w-full bg-surface-container rounded-xl overflow-hidden mb-4 border border-outline-variant/30">
      <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Marker position={mapCenter} />
        {bookingStatus === "ACCEPTED" && <Marker position={[mapCenter[0] + 0.02, mapCenter[1] + 0.02]} opacity={0.8} />}
      </MapContainer>
    </div>
  );

  if (role === "Farmer") {
    return (
      <FrostedCard className="w-full max-w-md mx-auto border border-emerald-200 bg-white">
        <h3 className="text-xl font-manrope font-bold mb-2 text-emerald-700 flex items-center gap-2">
          <Truck /> Logistics Route Radar
        </h3>
        <p className="text-[12px] mb-3 text-slate-600">
          {isSocketConnected ? "Live connected" : "Disconnected"} {role === "Driver" ? "| Switch Online to receive pings" : ""}
        </p>
        {renderMap()}
        {bookingStatus === "IDLE" && (
          <button
            onClick={requestTruck}
            className="w-full py-4 bg-tertiary-container text-surface font-bold rounded-xl shadow-[0_5px_20px_rgba(109,254,156,0.3)] hover:bg-tertiary transition-colors"
          >
            Broadcast Request at Rs 1500
          </button>
        )}
        {bookingStatus === "SEARCHING" && (
          <div className="flex bg-surface-container py-4 rounded-xl items-center justify-center gap-4 text-on-surface-variant font-bold animate-pulse">
            <Navigation2 className="animate-spin text-tertiary-container" />
            Broadcasting to nearby drivers...
          </div>
        )}
        {bookingStatus === "NEGOTIATING" && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/20 rounded-xl border border-primary/50 text-center">
              <p className="text-sm text-on-surface-variant mb-1">Driver Counter-Offer</p>
              <p className="text-3xl font-manrope font-bold text-primary">Rs {currentOffer}</p>
              {acceptedDriver && (
                <p className="text-xs mt-2 text-on-surface-variant">
                  {acceptedDriver.name} | {acceptedDriver.phone}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={rejectCounterByFarmer}
                className="flex-1 py-3 border border-error text-error font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <XCircle size={18} /> Reject
              </button>
              <button
                onClick={acceptCounterByFarmer}
                className="flex-[2] py-3 bg-primary text-on-primary font-bold rounded-xl shadow-[0_5px_15px_rgba(204,151,255,0.3)] flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Accept
              </button>
            </div>
          </div>
        )}
        {bookingStatus === "ACCEPTED" && (
          <div className="bg-emerald-50 py-4 px-4 rounded-xl border border-emerald-200">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Truck className="text-emerald-700" size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-emerald-800">Live trip active</p>
                <span className="text-xs text-slate-700 flex items-center gap-1">
                  <Navigation2 size={12} /> Driver confirmed
                </span>
                {acceptedDriver && (
                  <span className="block text-xs mt-1 text-slate-700">
                    {acceptedDriver.name} | {acceptedDriver.phone}
                  </span>
                )}
                {tripMeta && (
                  <span className="block text-xs mt-1 text-slate-700">
                    {tripMeta.mandi_name || "Mandi"} | {tripMeta.distance_km ?? "-"} km | Fuel est Rs{" "}
                    {Math.round(tripMeta.fuel_cost_estimate || 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {systemMessage && <p className="text-xs mt-3 text-slate-600">{systemMessage}</p>}
      </FrostedCard>
    );
  }

  if (role === "Driver") {
    return (
      <div className="w-full max-w-md mx-auto mt-4 space-y-4">
        <FrostedCard className="border-emerald-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-manrope font-bold text-slate-900">Active Radar</h2>
              <p className="text-emerald-700 text-sm flex items-center gap-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${driverOnline ? "bg-tertiary-container animate-pulse" : "bg-slate-500"}`}
                />
                {driverOnline ? "Listening on Network" : "Offline"}
              </p>
            </div>
            <button
              onClick={() => updateDriverStatus(!driverOnline)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                driverOnline ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              <Power size={14} />
              {driverOnline ? "Online" : "Go Online"}
            </button>
          </div>
          {renderMap()}
        </FrostedCard>

        <AnimatePresence>
          {activeRequests.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-on-surface-variant p-8">
              No logistics loads available in your 20km radius yet.
            </motion.p>
          ) : (
            activeRequests.map((req) => (
              <motion.div
                key={req.order_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FrostedCard className="border-slate-200 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2 border-b border-outline-variant/20 pb-3">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">Farmer: {req.details.farmer_name}</h3>
                      <p className="text-sm text-primary">{req.details.farmer_phone}</p>
                      <p className="text-xs text-slate-600 mt-1">Pickup in ~{req.distance_to_pickup_km ?? 0} km</p>
                    </div>
                    <div className="text-right">
                      <span className="font-manrope font-bold text-2xl text-emerald-700">Rs {Math.round(req.details.price)}</span>
                      <p className="text-xs text-slate-600">
                        Fuel est: Rs {Math.round(req.details.fuel_estimate || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-3 mb-4">
                    <div className="bg-surface-variant/30 p-2 rounded">
                      <p className="text-slate-500 text-xs">Load details</p>
                      <p className="font-bold text-slate-800">
                        {req.details.weight}kg {req.details.crop}
                      </p>
                    </div>
                    <div className="bg-surface-variant/30 p-2 rounded">
                      <p className="text-slate-500 text-xs">Route</p>
                      <p className="font-bold text-slate-800">
                        Farm &rarr; {req.details.mandi_name} ({req.details.distance}km)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-600">Drag to counter-offer:</span>
                        <span className="font-bold text-primary">Rs {Math.round(counterByOrder[req.order_id] ?? req.details.price)}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.round(req.details.price)}
                        max={Math.round(req.details.price + 2000)}
                        step={50}
                        value={counterByOrder[req.order_id] ?? Math.round(req.details.price)}
                        onChange={(e) =>
                          setCounterByOrder((prev) => ({
                            ...prev,
                            [req.order_id]: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => declineBooking(req)}
                        className="px-4 py-3 rounded-lg border border-error text-error font-bold hover:bg-error/10 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => counterOffer(req)}
                        className="flex-1 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary/10 transition-colors"
                      >
                        {driverActionByOrder[req.order_id] === "countered" ? "Counter Sent" : "Send Counter"}
                      </button>
                      <button
                        onClick={() => acceptBookingDriver(req)}
                        className="flex-[1.5] py-3 rounded-lg bg-tertiary-container text-surface font-bold shadow-[0_5px_15px_rgba(109,254,156,0.3)]"
                      >
                        {driverActionByOrder[req.order_id] === "accepted" ? "Accepted" : "Accept Direct"}
                      </button>
                    </div>
                  </div>
                </FrostedCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {systemMessage && <p className="text-xs text-center text-slate-600">{systemMessage}</p>}
      </div>
    );
  }

  return null;
}
