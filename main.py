"""
main.py - Role 9: The CLI / Dashboard Integrator
---------------------------------------------------
This is the entry point for Sky Watch Dashboard. It shows the menu,
calls the right function from each teammate's module, and passes
data between them (mainly the `location` dict).

Rule from the project doc: only Role 1 (location) and this file
are allowed to call input() directly. Every other module just
takes normal Python data in and gives normal Python data back.
"""

from datetime import datetime

# --- Teammate modules --------------------------------------------------
# NOTE: air_quality.py and stats.py currently run code the moment they
# are imported (see the message alongside this file for details).
# Once that's fixed, these imports will behave exactly like the rest.
import location
import weather
import air_quality
import iss_location
import iss_passes
import nasa_apod
import history
import stats


def print_menu(current_location: dict) -> None:
    """Show the main menu, including the currently set location."""
    print()
    print("╔══════════════════════════════════════╗")
    print("║       🌌 SKY WATCH DASHBOARD          ║")
    print("╠══════════════════════════════════════╣")
    print("║ 1. Set your location                  ║")
    print("║ 2. View Full Dashboard                ║")
    print("║ 3. Current Weather Only               ║")
    print("║ 4. Air Quality Index Only             ║")
    print("║ 5. ISS Live Position                  ║")
    print("║ 6. Next ISS Visible Pass              ║")
    print("║ 7. NASA Photo of the Day              ║")
    print("║ 8. View Search History                ║")
    print("║ 9. Dashboard Statistics               ║")
    print("║ 10. Save & Exit                       ║")
    print("╚══════════════════════════════════════╝")

    if current_location:
        city = current_location.get("name", "Unknown")
        country = current_location.get("country", "")
        lat = current_location.get("lat")
        lon = current_location.get("lon")
        print(f"Location: {city}, {country} ({lat}°N, {lon}°E)")
    else:
        print("Location: not set (choose option 1 first)")


def location_is_set(current_location: dict) -> bool:
    """location.get_location() returns {} if the user typed 'exit'
    or if the network call failed - treat that as 'no location yet'."""
    return bool(current_location)


def require_location(current_location: dict) -> bool:
    """Used before any option that needs a location. Prints a
    friendly message instead of crashing if none is set yet."""
    if not location_is_set(current_location):
        print("⚠️  Please set your location first (option 1).")
        return False
    return True


def get_next_pass_iso(current_location: dict):
    """Small helper: fetch the very next ISS pass and return its
    rise time as an ISO string (for saving to history), or None if
    no pass data is available. Used by both the full dashboard and
    the standalone 'next pass' option."""
    passes = iss_passes.get_next_passes(current_location)
    if not passes:
        return None, None
    next_pass = passes[0]
    return next_pass, next_pass["rise_time"].isoformat()


def show_full_dashboard(current_location: dict, lookup_history: list) -> None:
    """Option 2. Calls every data-fetching module in sequence. Each
    call is wrapped in its own try/except so one broken API doesn't
    take down the other sections - exactly what the project doc
    asks for."""
    if not require_location(current_location):
        return

    print(f"\n⏳ Fetching sky data for {current_location.get('name', 'your location')}...")

    # We'll fill these in as each section succeeds, and leave them
    # as None if a section fails - that's what we save to history.
    temp_c = None
    aqi_value = None
    next_iss_iso = None

    # --- Weather -----------------------------------------------------
    # weather.py raises exceptions on failure (ValueError/KeyError/
    # RuntimeError) instead of returning an error dict, so it needs
    # its own try/except here.
    try:
        weather_data = weather.get_weather(current_location)
        weather.print_weather(weather_data)
        temp_c = weather_data.get("temp_c")
    except (ValueError, KeyError, RuntimeError) as error:
        print(f"☁️  WEATHER — data unavailable ({error})")

    # --- Air Quality ---------------------------------------------------
    try:
        aq_data = air_quality.get_air_quality(current_location)
        air_quality.print_air_quality(aq_data)
        if aq_data and not aq_data.get("error"):
            aqi_value = aq_data.get("aqi")
    except Exception as error:
        print(f"🌫️  AIR QUALITY — data unavailable ({error})")

    # --- ISS Live Position ----------------------------------------------
    try:
        iss_data = iss_location.get_iss_position()
        iss_location.print_iss_position(iss_data, current_location)
    except Exception as error:
        print(f"🛰️  ISS POSITION — data unavailable ({error})")

    # --- Next ISS Pass ---------------------------------------------------
    try:
        next_pass, next_iss_iso = get_next_pass_iso(current_location)
        if next_pass:
            iss_passes.print_next_pass(next_pass)
        else:
            print("🔭 NEXT ISS PASS — no upcoming passes found.")
    except Exception as error:
        print(f"🔭 NEXT ISS PASS — data unavailable ({error})")

    # --- NASA Photo of the Day -------------------------------------------
    try:
        apod_data = nasa_apod.get_apod()
        nasa_apod.print_apod(apod_data)
    except Exception as error:
        print(f"📷 NASA PHOTO — data unavailable ({error})")

    # --- Save this lookup to history -------------------------------------
    entry = {
        "timestamp": datetime.now().isoformat(),
        "city": current_location.get("name", "Unknown"),
        "country": current_location.get("country", ""),
        "temp_c": temp_c,
        "aqi": aqi_value,
        "next_iss": next_iss_iso,
    }
    history.save_lookup(entry)
    lookup_history.append(entry)
    print("\n✅ Dashboard lookup saved to history.")


def main() -> None:
    print("🌌 Welcome to Sky Watch Dashboard!")

    lookup_history = history.load_history()
    print(f"Loaded {len(lookup_history)} history entries from history.json")

    current_location = {}

    while True:
        print_menu(current_location)
        choice = input("Enter your choice (1-10): ").strip()

        if choice == "1":
            print("\n--- Set Your Location ---")
            current_location = location.get_location()
            if location_is_set(current_location):
                name = current_location.get("name", "Unknown")
                country = current_location.get("country", "")
                lat = current_location.get("lat")
                lon = current_location.get("lon")
                print(f"✅ Location set to {name}, {country} ({lat}°N, {lon}°E)")
            else:
                print("Location was not set.")

        elif choice == "2":
            show_full_dashboard(current_location, lookup_history)

        elif choice == "3":
            if require_location(current_location):
                try:
                    weather.print_weather(weather.get_weather(current_location))
                except (ValueError, KeyError, RuntimeError) as error:
                    print(f"☁️  WEATHER — data unavailable ({error})")

        elif choice == "4":
            if require_location(current_location):
                air_quality.print_air_quality(air_quality.get_air_quality(current_location))

        elif choice == "5":
            iss_location.print_iss_position(
                iss_location.get_iss_position(), current_location
            )

        elif choice == "6":
            if require_location(current_location):
                next_pass, _ = get_next_pass_iso(current_location)
                if next_pass:
                    iss_passes.print_next_pass(next_pass)
                else:
                    print("No upcoming ISS passes found.")

        elif choice == "7":
            nasa_apod.print_apod(nasa_apod.get_apod(), truncate=False)

        elif choice == "8":
            history.print_history()

        elif choice == "9":
            stats.show_stats(lookup_history)

        elif choice == "10":
            print("💾 History saved. Goodbye — look up! 🌌")
            break

        else:
            print("⚠️  Please enter a number from 1 to 10.")


if __name__ == "__main__":
    main()