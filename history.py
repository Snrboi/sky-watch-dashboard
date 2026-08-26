import json
from datetime import datetime

HISTORY_FILE = "history.json"

# Map AQI number (1-5) to an emoji, so print_history looks nice.
AQI_EMOJIS = {
    1: "🟢",
    2: "🟢",
    3: "🟡",
    4: "🟠",
    5: "🔴",
}


def save_lookup(entry: dict) -> None:
    """
    Append one lookup entry to history.json.

    Steps:
    1. Load whatever history already exists (empty list if no file yet).
    2. Add the new entry to the end of that list.
    3. Write the whole list back to the file.

    We re-write the whole file each time rather than trying to "append"
    to JSON directly, because JSON isn't a line-based format like a text
    log — you can't just tack text onto the end of a valid JSON file.
    """
    history = load_history()
    history.append(entry)

    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def load_history() -> list:
    """
    Read all past entries from history.json.
    Returns an empty list if the file doesn't exist yet
    (e.g. first time the app has ever been run).
    """
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        # File exists but is empty or corrupted — treat as no history
        # rather than crashing the whole app.
        return []


def print_history(n: int = 10) -> None:
    """
    Print the last n lookups in a readable table.
    """
    history = load_history()

    if not history:
        print("📜 No lookups yet — run a dashboard search first!")
        return

    recent = history[-n:]   # last n entries
    recent.reverse()        # show most recent first

    print("📜 Recent Lookups")
    print("─" * 66)

    for entry in recent:
        # Parse the ISO timestamp string back into a datetime object
        # so we can format it nicely (e.g. "Aug 10 14:32").
        dt = datetime.fromisoformat(entry["timestamp"])
        when = dt.strftime("%b %d %H:%M")

        city = entry.get("city", "Unknown")
        country = entry.get("country", "")
        temp = entry.get("temp_c", "?")
        aqi = entry.get("aqi")
        aqi_emoji = AQI_EMOJIS.get(aqi, "⚪")

        next_iss = entry.get("next_iss")
        if next_iss:
            iss_dt = datetime.fromisoformat(next_iss)
            iss_str = iss_dt.strftime("%b %d %H:%M")
        else:
            iss_str = "—"

        print(
            f"{when}  {city}, {country:<3} {temp}°C  "
            f"AQI {aqi_emoji}  ISS: {iss_str}"
        )

if __name__ == "__main__":
    # Fake a couple of lookups, just like real dashboard views would create
    test_entry_1 = {
        "timestamp": "2026-08-09T20:15:00",
        "city": "Lagos",
        "country": "NG",
        "temp_c": 26,
        "aqi": 1,
        "next_iss": "2026-08-10T05:58:00",
    }

    test_entry_2 = {
        "timestamp": datetime.now().isoformat(),
        "city": "Port Harcourt",
        "country": "NG",
        "temp_c": 28,
        "aqi": 3,
        "next_iss": "2026-08-11T06:42:00",
    }

    save_lookup(test_entry_1)
    save_lookup(test_entry_2)

    print_history()