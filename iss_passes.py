""" contains key functions such as get_next_passes(location:dict) and def print_next_pass(pass_data: dict)

    get_next_passes(location:dict): gets five future passes of the international space station based on
    any given location in the world and formats them in human readable way.

    def print_next_pass(pass_data: dict): This prints any of the passes retrieved by get_next_passes
    in a human readable format.
"""

import requests
from datetime import datetime
from requests.exceptions import RequestException

def get_next_passes(location: dict):
    """ this function receives a latitude and longitude in the form of a
    dictionary, retrieves and formats the number of future passes the
    international space station would make

    Args:
        dict: this contains the latitude and longitude of a particular location in the world

    Raise:
        RequestException: this captures a broad list of http error including 404, 401, 500, etc
        ConnectionError: any failed error from no internet access or inabilitu for request.get not getting
        to the server.

    Return:
        list: it returns a list of dictionaries which would contain the rise_time, direction, duration,
        and max_elevation of the latitude and longitude that was passed as argument into the function
    
    Example:


    """

    lat_titude, lon_gitude = location["lat"], location["lon"]
    try:
        response = requests.get(f"https://iss-api.polluxlabs.io/iss-pass?lat={lat_titude}&lon={lon_gitude}&visible_only=true")
 
        #checks response status and catches raises exceptions for unssuccessful Http Errors
        #like 404, 401, 500 etc
        response.raise_for_status()
    except RequestException as e:
        print(f"{e} kindly enter a valid location")
        return

    data = response.json()
    passes = data["passes"]
    cleaned_pass = []
    for index in passes:
        string_time = index["rise"]["time"]
        utc_time = datetime.fromisoformat(string_time)
        useful_data = {
            "rise_time": utc_time,
            "direction": index["rise"]["compass"],
            "duration": index["duration_sec"],
            "max_elevation": index["culmination"]["elevation_deg"]
        }
        cleaned_pass.append(useful_data)
    return cleaned_pass

def print_next_pass(pass_data: dict):
    """This function takes a single pass_data dictionary and prints the time, duration, height the ISS will pass
    the users entered location. It also prints if the ISS will be visible to the user and the direction they should look at
    """
    if not pass_data:
        print("No upcoming ISS passes found.")
        return

    future_date= pass_data["rise_time"]
    user_timezone = future_date.astimezone() #converts future_date to the timezone of the user

    # %A: specifies the day of the week, %I: hour,
    # %M: minutes, %p: time of the day, either AM or PM
    # %Z: the timezone e.g WAT
    rise_time = user_timezone.strftime("%A, %I:%M %p %Z")
    direction = pass_data["direction"]
    duration_min = pass_data["duration"]//60
    duration_sec = pass_data["duration"]%60
    height = pass_data["max_elevation"]

    if height >= 45:
        tip = f"Look {direction} — it will look like a bright, steadily moving star."
        telescope_status = "No telescope needed!"
    elif height >= 20:
        tip = f"Look towards the {direction}. It climbs high enough to spot, but find a spot clear of tall trees."
        telescope_status = "No telescope needed, but find a clear viewing area."
    else:
        tip = f"Visibility at {direction} is poor. It just skims above the horizon"
        telescope_status = "It will be difficult to see unless you have an entirely flat, unobstructed horizon."

    print("🔭  NEXT ISS VISIBLE PASS")
    print(f"When: {rise_time}")
    print(f"Duration: {duration_min} minute(s) and {duration_sec} second(s)")
    print(f"Height: {height}° above the horizon")
    print(f"Tip: {tip}")
    print(telescope_status)

# test case for both functions
if __name__ == "__main__":
    res = get_next_passes({"lat": 4.8242, "lon": 7.0336})
    print(res)

    libra_ry = {
        "rise_time": datetime.fromisoformat("2026-08-28T14:18:41Z"),
        "direction": "NNW",
        "duration": 402,
        "max_elevation": 70.3
    }

    print_next_pass(libra_ry)
