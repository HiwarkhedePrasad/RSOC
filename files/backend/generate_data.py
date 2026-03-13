"""
NexaCity — Synthetic City Dataset Generator
Run: python generate_data.py
Outputs: city_data.csv (7 days of hourly data, 8 zones)
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

ZONES = {
    "Z1": {"name": " Sitabuldi", "lat": 21.1444, "lon": 79.0832, "type": "commercial"},
    "Z2": {"name": "Gandhibagh",  "lat": 21.1528, "lon": 79.1026, "type": "industrial"},
    "Z3": {"name": "Dharampeth",  "lat": 21.1399, "lon": 79.0607, "type": "residential"},
    "Z4": {"name": "Sadar",       "lat": 21.1610, "lon": 79.0760, "type": "commercial"},
    "Z5": {"name": "MIDC Hingna",     "lat": 21.0963, "lon": 78.9839, "type": "industrial"},
    "Z6": {"name": "Kamptee Road",    "lat": 21.2000, "lon": 79.1200, "type": "commercial"},
    "Z7": {"name": "Manish Nagar",    "lat": 21.0931, "lon": 79.0617, "type": "residential"},
    "Z8": {"name": "Wathoda",         "lat": 21.1458, "lon": 79.1350, "type": "industrial"},
}

records = []
start = datetime.now() - timedelta(days=7)

for day in range(7):
    for hour in range(24):
        ts = start + timedelta(days=day, hours=hour)
        is_weekday = ts.weekday() < 5
        is_peak = hour in [8, 9, 17, 18, 19]
        is_night = hour < 6 or hour > 22

        for zone_id, zone in ZONES.items():
            # Traffic (0-100 congestion index)
            base_traffic = 70 if (is_peak and is_weekday and zone["type"] in ["commercial","mixed"]) else 20
            if zone["type"] == "industrial":
                base_traffic = 60 if (7 <= hour <= 18 and is_weekday) else 15
            if is_night:
                base_traffic = 5
            traffic = np.clip(base_traffic + np.random.normal(0, 8), 0, 100)

            # AQI (50-300) — correlated with traffic + industrial
            aqi_base = 80 + traffic * 0.8
            if zone["type"] == "industrial":
                aqi_base += 60
            if zone["type"] == "residential" or zone["type"] == "educational":
                aqi_base -= 20
            aqi = np.clip(aqi_base + np.random.normal(0, 12), 40, 300)

            # Energy kWh (zone consumption)
            energy_base = 500 if zone["type"] == "commercial" else 300
            if is_peak and is_weekday:
                energy_base *= 1.6
            if is_night:
                energy_base *= 0.3
            if zone["type"] == "industrial":
                energy_base = 900 if is_weekday else 400
            energy = np.clip(energy_base + np.random.normal(0, 40), 50, 2000)

            # Water L/hr
            water_base = 1200 if zone["type"] == "residential" else 800
            if 6 <= hour <= 9 or 18 <= hour <= 21:
                water_base *= 1.5
            if is_night:
                water_base *= 0.2
            water = np.clip(water_base + np.random.normal(0, 80), 50, 4000)

            # Transport ridership
            transport_base = 800 if (is_peak and is_weekday) else 150
            if zone["type"] in ["commercial","educational"]:
                transport_base *= 1.4
            if is_night:
                transport_base = 20
            transport = np.clip(transport_base + np.random.normal(0, 60), 0, 3000)

            # Inject anomalies for demo interest
            if zone_id == "Z2" and day == 5 and 14 <= hour <= 16:
                aqi += 120  # Industrial pollution spike
                traffic += 30
            if zone_id == "Z7" and day == 3 and hour == 3:
                water *= 4.5  # Pipe leak anomaly at 3am
            if zone_id == "Z1" and day == 6 and 17 <= hour <= 19:
                energy *= 2.2  # Energy overload during event

            records.append({
                "timestamp": ts.isoformat(),
                "hour": hour,
                "day_of_week": ts.strftime("%A"),
                "zone_id": zone_id,
                "zone_name": zone["name"],
                "zone_type": zone["type"],
                "lat": zone["lat"],
                "lon": zone["lon"],
                "traffic_index": round(traffic, 1),
                "aqi": round(aqi, 1),
                "energy_kwh": round(energy, 1),
                "water_liters": round(water, 1),
                "transport_ridership": int(transport),
            })

df = pd.DataFrame(records)
df.to_csv("city_data.csv", index=False)
print(f"✅ Generated {len(df)} records across {len(ZONES)} zones × 7 days × 24 hours")
print(df.head())
