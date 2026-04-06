import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Listing all reachable models:")
try:
    models = genai.list_models()
    for m in models:
        # Print every model we can see
        print(f"ID: {m.name} | Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"CRITICAL API ERROR: {e}")

