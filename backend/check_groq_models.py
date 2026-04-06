import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("Error: GROQ_API_KEY not found in .env file.")
else:
    try:
        client = Groq(api_key=GROQ_API_KEY)
        models = client.models.list()
        
        print(f"{'Model ID':<40} | {'Owned By':<15} | {'Active'}")
        print("-" * 70)
        for model in models.data:
            print(f"{model.id:<40} | {model.owned_by:<15} | {getattr(model, 'active', 'N/A')}")
            
    except Exception as e:
        print(f"Error fetching models from Groq: {e}")
