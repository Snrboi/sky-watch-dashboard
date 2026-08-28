
import os

import requests
from dotenv import load_dotenv

load_dotenv()

APOD_URL = "https://api.nasa.gov/planetary/apod"


DEMO_KEY = "DEMO_KEY"


def get_apod(date: str = None) -> dict:
   
    api_key = os.getenv("NASA_API_KEY", DEMO_KEY)

    params = {"api_key": api_key}
    if date:
        params["date"] = date

    try:
        response = requests.get(APOD_URL, params=params, timeout=10)
        response.raise_for_status()  # raises an exception on 4xx/5xx status codes
        data = response.json()

        return {
            "title": data.get("title", "Untitled"),
            "date": data.get("date", date or "unknown"),
            "explanation": data.get("explanation", ""),
            "url": data.get("url", ""),
            "media_type": data.get("media_type", "image"),
        }

    except requests.exceptions.Timeout:
        return {"error": "NASA API timed out. Try again later."}
    except requests.exceptions.ConnectionError:
        return {"error": "No internet connection — couldn't reach NASA."}
    except requests.exceptions.HTTPError as e:
        # 429 = rate limit exceeded (common with DEMO_KEY), 400 = bad date, etc.
        return {"error": f"NASA API returned an error: {e}"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Unexpected network error: {e}"}
    except (KeyError, ValueError) as e:
        # ValueError covers response.json() failing to parse
        return {"error": f"Couldn't understand NASA's response: {e}"}


def print_apod(apod_data: dict, truncate: bool = True) -> None:
    
    if not apod_data or "error" in apod_data:
        error_msg = apod_data.get("error", "Unknown error") if apod_data else "No data"
        print(f"📷 NASA PHOTO OF THE DAY — ⚠️  unavailable ({error_msg})")
        return

    title = apod_data.get("title", "Untitled")
    date = apod_data.get("date", "unknown date")
    explanation = apod_data.get("explanation", "")
    url = apod_data.get("url", "")
    media_type = apod_data.get("media_type", "image")

    print(f"📷 NASA PHOTO OF THE DAY — {date}")
    print(f'"{title}"')

    if media_type == "video":
        print("(This is a video, not an image.)")

    if truncate and len(explanation) > 200:
        print(explanation[:200].rstrip() + "...")
    else:
        print(explanation)

    print(f"View: {url}")



if __name__ == "__main__":
    print("Fetching today's APOD...\n")
    result = get_apod()
    print_apod(result)