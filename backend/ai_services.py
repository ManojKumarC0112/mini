import json
import os
import re
from typing import Any, Dict, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

GEMINI_MODEL_CANDIDATES = [
    os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]


def _extract_json_payload(raw_text: str) -> Dict[str, Any]:
    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _generate_with_fallback(prompt: str, image_data: Optional[bytes] = None) -> Dict[str, Any]:
    last_error = None

    if image_data:
        payload: Any = [
            prompt,
            {"mime_type": "image/jpeg", "data": image_data},
        ]
    else:
        payload = prompt

    for model_name in GEMINI_MODEL_CANDIDATES:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(payload)
            return _extract_json_payload(response.text)
        except Exception as err:
            last_error = err

    raise Exception(
        f"No Gemini model worked from candidates {GEMINI_MODEL_CANDIDATES}. Last error: {last_error}"
    )


def extract_soil_data_and_allocate(image_data: Optional[bytes] = None):
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not configured")

    prompt = """
    You are an expert agronomist.
    1. Extract the NPK and pH values from this Soil Health Card image.
    2. Based on these values and local market overflow constraints, generate a 60/10/30 land allocation strategy.

    Anti-Herding Rule: 60% should be a low-risk staple crop, 10% should be a soil-healer crop, and 30% should be a high-risk jackpot crop.

    Return ONLY raw JSON with this structure:
    {
      "npk": {"n": 0, "p": 0, "k": 0, "ph": 0.0},
      "allocation": {
         "safe_crop": {"name": "CropName", "percent": 60, "reason": "Why?"},
         "healer_crop": {"name": "CropName", "percent": 10, "reason": "Why?"},
         "jackpot_crop": {"name": "CropName", "percent": 30, "reason": "Why?"}
      }
    }
    """
    return _generate_with_fallback(prompt, image_data=image_data)


GROQ_FALLBACK = {
    "condition": "Clear Sky Forecast",
    "task_priority": "Normal",
    "instruction": "Continue standard irrigation.",
    "reasoning": "Stable conditions detected. No immediate rain risks.",
    "voice_script": "Ramu kaka, aaj vatavaran saaf hai. Paani dena chalu rakho.",
    "recommended_product": {
        "type": "standard",
        "name": "NPK 19:19:19",
        "price": "Rs 450/bag",
        "benefits": "Balanced nutrition",
    },
    "irrigation_advice": "Continue standard irrigation.",
    "pesticide_suggestion": {
        "name": "Neem Oil (Organic)",
        "price_estimate": "Rs 350/liter",
        "market_link": "https://krishimarket.com/search?q=neem+oil",
    },
}


def estimate_mandi_prices_with_groq(markets, commodity: str, state: str, district: str):
    if not groq_client:
        return {}
    try:
        prompt = f"""
You are a mandi price estimator.
State: {state}
District: {district}
Commodity: {commodity}

Estimate realistic modal prices (Rs/quintal) for these markets:
{json.dumps(markets)}

Return ONLY JSON in this format:
{{
  "prices": {{
    "Lasalgaon Mandi": 2400,
    "Nashik APMC": 2100
  }}
}}
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        parsed = _extract_json_payload(chat_completion.choices[0].message.content)
        prices = parsed.get("prices", {})
        if isinstance(prices, dict):
            return {str(k).lower(): float(v) for k, v in prices.items() if v is not None}
    except Exception as err:
        print(f"[Groq Mandi Price] API failed, using fallback: {err}")
    return {}


def generate_personalized_schemes(profile: Dict[str, Any]):
    if groq_client:
        try:
            prompt = f"""
You are an agriculture scheme assistant for India.
Farmer profile: {json.dumps(profile)}

Suggest 3 schemes the farmer is likely eligible for.
Return ONLY JSON:
{{
  "schemes": [
    {{
      "name": "Scheme name",
      "benefit": "Short benefit",
      "why": "Why this farmer fits",
      "next_step": "Action the farmer should take"
    }}
  ]
}}
"""
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
            )
            parsed = _extract_json_payload(chat_completion.choices[0].message.content)
            schemes = parsed.get("schemes", [])
            if isinstance(schemes, list):
                return schemes
        except Exception as err:
            print(f"[Groq Schemes] API failed, using fallback: {err}")

    # Deterministic fallback for demo mode.
    crop = profile.get("crop_type", "Onion")
    district = profile.get("district", "Nashik")
    return [
        {
            "name": "PM-KISAN",
            "benefit": "Direct income support of Rs 6,000/year",
            "why": f"Active farmer in {district} cultivating {crop}",
            "next_step": "Verify Aadhaar + land records on PM-KISAN portal",
        },
        {
            "name": "Soil Health Card Scheme",
            "benefit": "Free soil testing + nutrient advisory",
            "why": "Recent OCR scan suggests soil-driven planning",
            "next_step": "Submit nearest KVK visit request",
        },
        {
            "name": "Pradhan Mantri Fasal Bima Yojana",
            "benefit": "Crop insurance against weather risk",
            "why": "Rainy forecast indicates elevated risk",
            "next_step": "Enroll via local bank or CSC center",
        },
    ]

def analyze_mandi_risks_with_groq(mandis, crop_type: str, weather_text: str):
    if groq_client:
        try:
            prompt = f"""
You are an agricultural logistics analyst.
Crop type: {crop_type}
Weather: {weather_text}

For each mandi object in this JSON array, assign:
1) risk_tag: one of "Low Risk", "Moderate Risk", "High Spoilage Risk"
2) risk_reason: short reason
3) confidence: 0 to 1

JSON input:
{json.dumps(mandis)}

Return ONLY JSON in this format:
{{
  "mandis": [
    {{
      "id": 1,
      "risk_tag": "Low Risk",
      "risk_reason": "Short reason",
      "confidence": 0.9
    }}
  ]
}}
"""
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.2,
            )
            parsed = _extract_json_payload(chat_completion.choices[0].message.content)
            return parsed.get("mandis", [])
        except Exception as groq_err:
            print(f"[Groq Mandi] API failed, using deterministic fallback: {groq_err}")
    return []


def analyze_price_trends(crop_type: str, current_price: float):
    fallback_trend = _build_trend_fallback(crop_type, current_price)
    if not groq_client:
        return fallback_trend
    try:
        prompt = f"""
You are a mandi price trend analyst.
Crop: {crop_type}
Current price: Rs {current_price}

Assume a 3-day outlook with typical volatility for this crop and current weather/cycle seasonality.
Return ONLY JSON in this format:
{{
  "recommendation": "SELL_NOW" | "WAIT_2_DAYS",
  "expected_change_percent": 10.5,
  "reason": "Short explanation",
  "trend_points": [2100, 2150, 2300]
}}
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        parsed = _extract_json_payload(chat_completion.choices[0].message.content)
        recommendation = parsed.get("recommendation", fallback_trend["recommendation"])
        if recommendation not in {"SELL_NOW", "WAIT_2_DAYS"}:
            recommendation = fallback_trend["recommendation"]
        expected_change = parsed.get("expected_change_percent", fallback_trend["expected_change_percent"])
        try:
            expected_change = float(expected_change)
        except (TypeError, ValueError):
            expected_change = fallback_trend["expected_change_percent"]
        trend_points = parsed.get("trend_points", fallback_trend["trend_points"])
        if not isinstance(trend_points, list) or len(trend_points) < 3:
            trend_points = fallback_trend["trend_points"]
        trend_points = [float(p) for p in trend_points[:3]]
        reason = parsed.get("reason") or fallback_trend["reason"]
        return {
            "recommendation": recommendation,
            "expected_change_percent": expected_change,
            "reason": reason,
            "trend_points": trend_points,
        }
    except Exception as err:
        print(f"[Groq Trend] API failed, using fallback: {err}")
        return fallback_trend


def _build_trend_fallback(crop_type: str, current_price: float) -> Dict[str, Any]:
    base = 4.0
    volatile = {"onion", "tomato", "potato", "chilli"}
    if crop_type and crop_type.lower() in volatile:
        base = 9.0
    if current_price > 2600:
        base -= 4.0
    expected_change = round(base, 1)
    recommendation = "WAIT_2_DAYS" if expected_change >= 6 else "SELL_NOW"
    trend_points = [
        round(current_price * 0.98, 2),
        round(current_price, 2),
        round(current_price * (1 + expected_change / 100), 2),
    ]
    reason = (
        "Short-term demand spike likely; waiting can lift price."
        if recommendation == "WAIT_2_DAYS"
        else "Prices look stable; selling now avoids volatility risk."
    )
    return {
        "recommendation": recommendation,
        "expected_change_percent": expected_change,
        "reason": reason,
        "trend_points": trend_points,
    }


def generate_growing_advisory(weather_text: str, crop_stage: int = 45):
    if groq_client:
        try:
            prompt = f"""
    You are a fast agricultural decision engine.
    Weather: {weather_text}
    Crop Stage: Day {crop_stage} of 120

    Respond in JSON only:
    {{
      "condition": "Short weather summary",
      "task_priority": "High | Normal | Low",
      "instruction": "Clear actionable task",
      "reasoning": "Scientific reasoning",
      "voice_script": "Short Hindi/Marathi advisory",
      "recommended_product": {{
          "type": "organic | standard | premium",
          "name": "Product Name",
          "price": "Rs XXX",
          "benefits": "Short benefit string"
      }}
    }}
    """
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
            )
            parsed = _extract_json_payload(chat_completion.choices[0].message.content)

            # Backward-compatible keys for older frontend widgets.
            parsed["irrigation_advice"] = parsed.get("instruction", "Follow normal irrigation schedule.")
            product = parsed.get("recommended_product") or {}
            product_name = product.get("name", "Neem Oil")
            parsed["pesticide_suggestion"] = {
                "name": product_name,
                "price_estimate": product.get("price", "Rs 350/liter"),
                "market_link": f"https://krishimarket.com/search?q={product_name.replace(' ', '+')}",
            }
            return parsed
        except Exception as groq_err:
            print(f"[Groq 3.3] API failed, using fallback: {groq_err}")
            return GROQ_FALLBACK

    print("[Groq] No API key configured, using fallback.")
    return GROQ_FALLBACK


def transcribe_audio_with_groq(file_bytes: bytes, filename: str, language: str = "en") -> str:
    if not groq_client:
        raise Exception("GROQ_API_KEY is not configured")
    transcription = groq_client.audio.transcriptions.create(
        file=(filename, file_bytes),
        model="whisper-large-v3-turbo",
        response_format="json",
        language=language,
        temperature=0.0,
    )
    if isinstance(transcription, dict):
        return transcription.get("text", "")
    return getattr(transcription, "text", "")


def generate_planning_voice_advice(user_query: str, context: Dict[str, Any]):
    fallback = {
        "answer": "Based on your current plan, sticking to the recommended mix will reduce price-crash risk. Tell me which crop you want to adjust and by how much.",
        "voice_script": "Based on your current plan, sticking to the recommended mix will reduce price-crash risk. Tell me which crop you want to adjust and by how much.",
    }
    if not groq_client:
        return fallback

    try:
        prompt = f"""
You are an agricultural planning advisor. Explain decisions in simple, practical language.

User question: {user_query}
Context JSON:
{json.dumps(context)}

Return ONLY JSON:
{{
  "answer": "Short explanation in English",
  "voice_script": "Same explanation, conversational"
}}
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        parsed = _extract_json_payload(chat_completion.choices[0].message.content)
        answer = parsed.get("answer") or fallback["answer"]
        voice_script = parsed.get("voice_script") or answer
        return {"answer": answer, "voice_script": voice_script}
    except Exception as err:
        print(f"[Groq Planning Voice] API failed, using fallback: {err}")
        return fallback
