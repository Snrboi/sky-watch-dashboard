from datetime import datetime

history = [
    {'timestamp': '2026-08-10T14:32:00', 'city': 'Port Harcourt', 'country': 'NG', 'temp_c': 28, 'aqi': 2, 'next_iss': '2026-08-11T06:42:00'},
    {'timestamp': '2026-08-09T20:15:00', 'city': 'Lagos', 'country': 'NG', 'temp_c': 26, 'aqi': 1, 'next_iss': '2026-08-10T05:58:00'},
    {'timestamp': '2026-08-08T07:03:00', 'city': 'Abuja', 'country': 'NG', 'temp_c': 24, 'aqi': 4, 'next_iss': None},
    {'timestamp': '2026-08-08T18:20:00', 'city': 'Port Harcourt', 'country': 'NG', 'temp_c': 30, 'aqi': 3, 'next_iss': '2026-08-09T05:11:00'},
    {'timestamp': '2026-08-07T09:45:00', 'city': 'Port Harcourt', 'country': 'NG', 'temp_c': 27, 'aqi': 5, 'next_iss': None},
]

def show_stats(history: list):
    # handle empty case first
    if not history:
        print("No data yet!- Run a dashboard lookup first.")
        return
    
    # Total lookups
    total_lookups = len(history)

    # Days active
    dates = []
    for item_date in history:
        real_date = item_date["timestamp"]
        date = datetime.fromisoformat(real_date).date()
        dates.append(date)
    final_date = set(dates)
    days_active = len(final_date)

    # Unique cities + Most searched city
        # Unique cities
    tally_cities = {}
    for item_city in history:
        city = item_city["city"]
        tally_cities[city] = tally_cities.get(city, 0)+ 1
    unique_cities = len(tally_cities)

        # Most searched city
    most_searched_city = None
    most_searched_count = 0
    for city, count in tally_cities.items():
        if count > most_searched_count:
            most_searched_city = city
            most_searched_count = count

    # Average temperature
    total = 0
    for item_temp in history:
        real_temp = item_temp["temp_c"]
        total = real_temp + total
    average_temperature = total / total_lookups

    # Best and worst air quality
        # Best air quality
    best_air_quality = 5
    for item in history:
        best_air = item["aqi"]
        date = datetime.fromisoformat(item["timestamp"]).date()
        if best_air < best_air_quality:
            best_air_quality = best_air
            best_air_date = date

        # Worst air quality
    worst_air_quality = 0
    for item in history:
        worst_air = item["aqi"]
        date = datetime.fromisoformat(item["timestamp"]).date()
        if worst_air > worst_air_quality:
            worst_air_quality = worst_air
            worst_air_date = date

    # ISS passes tracked
    iss_count = 0
    for item in history:
        iss = item["next_iss"]
        if iss is not None:
            iss_count = iss_count + 1 

    # Print display
    print("      Dashboard Statistics")
    print("-" * 40)
    print(f"Total lookups: {total_lookups}")
    print(f"Days active: {days_active}")
    print(f"Unique cities: {unique_cities}")
    print(f"Most-searched city: {most_searched_city} ({most_searched_count} lookups)")
    print(f"Average temperature: {round(average_temperature, 1)}°C")
    air_emojis = {1: "🟢", 2: "🟡", 3: "🟠", 4: "🔴", 5: "🟣"}
    print(f"Best air quality: AQI {air_emojis[best_air_quality]} {best_air_quality} ({best_air_date})")
    print(f"Worst air quality: AQI {air_emojis[worst_air_quality]} {worst_air_quality} ({worst_air_date})")
    print(f"ISS passes tracked: {iss_count}")

show_stats(history)