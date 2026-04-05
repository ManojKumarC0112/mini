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
