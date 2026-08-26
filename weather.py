import os

import requests
from requests.exceptions import RequestException

WEATHER_ICONS = {
    "Clear": "☀️",
    "Clouds": "☁️",
    "Rain": "🌧️",
    "Drizzle": "🌦️",
    "Thunderstorm": "⛈️",
    "Snow": "❄️",
    "Mist": "🌫️",
    "Smoke": "🌫️",
    "Haze": "🌫️",
    "Dust": "🌪️",
    "Fog": "🌫️",
    "Sand": "🌪️",
    "Ash": "🌋",
    "Squall": "💨",
    "Tornado": "🌪️",
}


def get_weather(location: dict) -> dict:
    """Fetch current weather information for a location."""

    # First check for an environment variable.
    api_key = os.getenv("OPENWEATHER_API_KEY")

    # If it isn't found, read the .env file.
    if not api_key:
        try:
            with open(".env", "r") as file:
                for line in file:
                    line = line.strip()

                    if line.startswith("OPENWEATHER_API_KEY="):
                        api_key = line.split("=", 1)[1]
                        api_key = api_key.strip().strip('"').strip("'")
                        break
        except FileNotFoundError:
            pass

    if not api_key:
        raise ValueError(
            "OPENWEATHER_API_KEY was not found."
        )

    try:
        latitude = location["lat"]
        longitude = location["lon"]
    except KeyError as error:
        raise KeyError(
            "Location must contain 'lat' and 'lon'."
        ) from error

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "lat": latitude,
        "lon": longitude,
        "appid": api_key,
        "units": "metric",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        temperature = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        wind_speed = data["wind"]["speed"]

        condition = data["weather"][0]["main"]
        description = data["weather"][0]["description"]

    except RequestException as error:
        raise RuntimeError(
            f"Could not fetch weather data: {error}"
        ) from error

    except KeyError as error:
        raise RuntimeError(
            f"Weather response missing field: {error}"
        ) from error

    return {
        "location": location.get("name", "Unknown location"),
        "temp_c": round(temperature),
        "feels_like_c": round(feels_like),
        "description": description.capitalize(),
        "humidity": humidity,
        "wind_kph": round(wind_speed * 3.6),
        "icon_emoji": WEATHER_ICONS.get(condition, "🌡️"),
    }


def print_weather(weather_data: dict) -> None:
    """Display weather information in a formatted box."""

    print()
    print("╔══════════════════════════════════════╗")
    print(
        f"║ {weather_data['icon_emoji']} WEATHER — "
        f"{weather_data['location']}"
    )
    print("╠══════════════════════════════════════╣")
    print(f"║ Condition: {weather_data['description']}")
    print(
        f"║ Temperature: {weather_data['temp_c']}°C "
        f"(feels like {weather_data['feels_like_c']}°C)"
    )
    print(f"║ Humidity: {weather_data['humidity']}%")
    print(f"║ Wind: {weather_data['wind_kph']} km/h")
    print("╚══════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    port_harcourt = {
        "name": "Port Harcourt",
        "lat": 4.82,
        "lon": 7.05,
    }

    try:
        weather = get_weather(port_harcourt)
        print_weather(weather)
    except (ValueError, KeyError, RuntimeError) as error:
        print(f"Error: {error}")
