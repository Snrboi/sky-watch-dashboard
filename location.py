import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OWM_API_KEY")
def get_location() -> dict:
    while True:
        city = input("Enter your city (or type 'exit' to quit): ").strip()

        if city.lower() == 'exit':
            return {}

        try:
            response = requests.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={
                    "q": city,
                    "limit": 1,
                    "appid": API_KEY
                }
            )

            response.raise_for_status()
            data = response.json()

            if not data:
                print("City not found. Please try again.")
                continue

            location = data[0]

            return {
            "city": location.get("name", "Unknown"),
            "country": location.get("country", "Unknown"),
            "lat": float(location["lat"]),
            "lon": float(location["lon"])
        }

        except requests.exceptions.RequestException as e:
            print("\nCould not connect to the location service.")
            print("Please check your internet connection or API key.")
            return {} # Safe exit from the loop on network failure
print(get_location())