import os
import requests
# from dotenv import load_dotenv

# load_dotenv()


def get_location() -> dict:
    while True:
        city = input("Enter your city (or type 'exit' to quit): ").strip()

        if city.lower() == 'exit':
            return {}

        try:
            lines = [line for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")) if line.startswith("OWM_API_KEY=")]
            api_key = lines[0].split("=", 1)[1].strip() if lines else None
            response = requests.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={
                    "q": city,
                    "limit": 1,
                    "appid": api_key
                }
            )

            response.raise_for_status()
            data = response.json()

            if not data:
                print("City not found. Please try again.")
                continue

            location = data[0]

            return location

        except requests.exceptions.RequestException as e:
            print("\nCould not connect to the location service.")
            print("Please check your internet connection or API key.")
            return {} # Safe exit from the loop on network failure
