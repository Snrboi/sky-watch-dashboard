"""Pure logic: distance, region labels, and the AQI table."""

import pytest

from app.services.aqi import level_for
from app.services.geo import describe_region, haversine_km


def test_haversine_matches_a_known_distance():
    london_to_paris = haversine_km(51.5074, -0.1278, 48.8566, 2.3522)
    assert 340 <= london_to_paris <= 348


def test_haversine_is_zero_for_the_same_point():
    assert haversine_km(4.8156, 7.0498, 4.8156, 7.0498) == 0


@pytest.mark.parametrize(
    ("lat", "lon", "expected"),
    [
        (4.8156, 7.0498, "Roughly over Africa"),  # Port Harcourt
        (10.0, 160.0, "Roughly over the Pacific Ocean"),  # the old code said Asia
        (-20.0, 150.0, "Roughly over the Pacific Ocean"),
        (-10.0, 80.0, "Roughly over the Indian Ocean"),  # the old code said Asia
        (0.0, -15.0, "Roughly over the Atlantic Ocean"),  # the old code said Africa
        (33.2889, -47.1633, "Roughly over the Atlantic Ocean"),
        (48.0, 10.0, "Roughly over Europe"),
        (25.0, -90.0, "Roughly over the Gulf of Mexico"),
        (-70.0, 0.0, "Roughly over the Southern Ocean"),
        (70.0, -100.0, "Roughly over the Arctic Ocean"),
        (-25.0, 135.0, "Roughly over Australia"),
    ],
)
def test_region_labels(lat, lon, expected):
    assert describe_region(lat, lon) == expected


def test_every_region_label_is_phrased_as_approximate():
    for lat in range(-80, 81, 20):
        for lon in range(-170, 181, 30):
            assert describe_region(lat, lon).startswith("Roughly over ")


def test_aqi_table_covers_1_to_5_and_nothing_else():
    assert level_for(1).label == "Good"
    assert level_for(5).color == "very-poor"
    for value in (None, 0, 6, True, "3"):
        assert level_for(value) is None
