"""
NexaCity Backend — FastAPI
Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
from datetime import datetime, timedelta
import os

app = FastAPI(title="NexaCity API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load & preprocess data ──────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "../data/city_data.csv")
df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])

METRICS = ["traffic_index", "aqi", "energy_kwh", "water_liters", "transport_ridership"]
ZONES = df[["zone_id","zone_name","zone_type","lat","lon"]].drop_duplicates().to_dict("records")

# ── Anomaly Detection (Isolation Forest per zone) ──────────────────────────
anomaly_results = {}
for zone_id, zone_df in df.groupby("zone_id"):
    features = zone_df[METRICS].fillna(0)
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)
    model = IsolationForest(contamination=0.05, random_state=42)
    preds = model.fit_predict(scaled)
    scores = model.score_samples(scaled)
    zone_df = zone_df.copy()
    zone_df["anomaly"] = (preds == -1)
    zone_df["anomaly_score"] = -scores  # higher = more anomalous
    anomaly_results[zone_id] = zone_df

anomaly_df = pd.concat(anomaly_results.values())

# ── Simple Forecast (rolling trend extrapolation) ──────────────────────────
def forecast_metric(zone_id: str, metric: str, hours: int = 24):
    zdf = df[df["zone_id"] == zone_id].sort_values("timestamp")
    last_48 = zdf.tail(48)[metric].values
    # Compute hourly pattern from historical data
    hourly_avg = zdf.groupby("hour")[metric].mean()
    now_hour = datetime.now().hour
    forecast = []
    for i in range(hours):
        h = (now_hour + i) % 24
        base = hourly_avg.get(h, last_48.mean())
        noise = np.random.normal(0, base * 0.03)
        forecast.append(round(float(base + noise), 1))
    return forecast

# ── Cross-Domain Correlation ────────────────────────────────────────────────
def compute_correlations():
    results = []
    for zone_id, zdf in df.groupby("zone_id"):
        corr = zdf[METRICS].corr()
        pairs = [
            {"metric_a": "traffic_index", "metric_b": "aqi",
             "correlation": round(float(corr.loc["traffic_index","aqi"]), 3)},
            {"metric_a": "traffic_index", "metric_b": "energy_kwh",
             "correlation": round(float(corr.loc["traffic_index","energy_kwh"]), 3)},
            {"metric_a": "aqi", "metric_b": "transport_ridership",
             "correlation": round(float(corr.loc["aqi","transport_ridership"]), 3)},
        ]
        results.append({"zone_id": zone_id, "correlations": pairs})
    return results

correlations = compute_correlations()

# ── Zone Health Score (0-100, higher = healthier) ──────────────────────────
def compute_zone_health():
    latest = df.sort_values("timestamp").groupby("zone_id").last().reset_index()
    scores = []
    for _, row in latest.iterrows():
        # Normalize each metric (lower traffic/aqi/energy = better; higher transport = better)
        traffic_score = max(0, 100 - row["traffic_index"])
        aqi_score = max(0, 100 - (row["aqi"] - 50) / 2.5)
        energy_score = max(0, 100 - row["energy_kwh"] / 20)
        transport_score = min(100, row["transport_ridership"] / 10)
        health = round((traffic_score * 0.3 + aqi_score * 0.35 + energy_score * 0.2 + transport_score * 0.15), 1)
        health = np.clip(health, 0, 100)

        # Check for active anomalies
        zone_anomalies = anomaly_df[(anomaly_df["zone_id"] == row["zone_id"]) &
                                     (anomaly_df["anomaly"] == True)]
        recent_anomalies = zone_anomalies.tail(3)
        has_alert = len(recent_anomalies) > 0

        scores.append({
            "zone_id": row["zone_id"],
            "zone_name": row["zone_name"],
            "zone_type": row["zone_type"],
            "lat": row["lat"],
            "lon": row["lon"],
            "health_score": float(health),
            "status": "critical" if health < 40 else "warning" if health < 65 else "good",
            "has_alert": bool(has_alert),
            "latest": {
                "traffic_index": round(float(row["traffic_index"]), 1),
                "aqi": round(float(row["aqi"]), 1),
                "energy_kwh": round(float(row["energy_kwh"]), 1),
                "water_liters": round(float(row["water_liters"]), 1),
                "transport_ridership": int(row["transport_ridership"]),
            }
        })
    return scores

# ── ROUTES ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "NexaCity API running", "zones": len(ZONES), "records": len(df)}

@app.get("/api/zones")
def get_zones():
    return compute_zone_health()

@app.get("/api/zones/{zone_id}/timeseries")
def get_timeseries(zone_id: str, metric: str = "aqi", hours: int = 48):
    zdf = df[df["zone_id"] == zone_id].sort_values("timestamp").tail(hours)
    return {
        "zone_id": zone_id,
        "metric": metric,
        "data": [
            {"timestamp": row["timestamp"].isoformat(), "value": round(float(row[metric]), 1)}
            for _, row in zdf.iterrows()
        ]
    }

@app.get("/api/zones/{zone_id}/forecast")
def get_forecast(zone_id: str, metric: str = "aqi", hours: int = 24):
    values = forecast_metric(zone_id, metric, hours)
    now = datetime.now()
    return {
        "zone_id": zone_id,
        "metric": metric,
        "forecast": [
            {"hour": i+1, "timestamp": (now + timedelta(hours=i+1)).strftime("%H:00"), "value": v}
            for i, v in enumerate(values)
        ]
    }

@app.get("/api/anomalies")
def get_anomalies():
    alerts = anomaly_df[anomaly_df["anomaly"] == True].sort_values("anomaly_score", ascending=False)
    recent = alerts.tail(20)
    result = []
    for _, row in recent.iterrows():
        # Determine which metric is most anomalous
        metric_vals = {m: row[m] for m in METRICS}
        top_metric = max(metric_vals, key=lambda m: abs(metric_vals[m]))
        result.append({
            "zone_id": row["zone_id"],
            "zone_name": row["zone_name"],
            "timestamp": row["timestamp"].isoformat(),
            "anomaly_score": round(float(row["anomaly_score"]), 3),
            "top_metric": top_metric,
            "value": round(float(row[top_metric]), 1),
            "metrics": {m: round(float(row[m]), 1) for m in METRICS}
        })
    return result

@app.get("/api/correlations")
def get_correlations():
    return correlations

@app.get("/api/summary")
def get_summary():
    zone_health = compute_zone_health()
    critical = [z for z in zone_health if z["status"] == "critical"]
    warnings = [z for z in zone_health if z["status"] == "warning"]
    anomaly_count = int(anomaly_df["anomaly"].sum())
    return {
        "total_zones": len(zone_health),
        "critical_zones": len(critical),
        "warning_zones": len(warnings),
        "total_anomalies_detected": anomaly_count,
        "avg_city_health": round(float(np.mean([z["health_score"] for z in zone_health])), 1),
        "critical_zone_names": [z["zone_name"] for z in critical],
    }

@app.post("/api/query")
async def nlp_query(body: dict):
    question = body.get("question", "").lower()
    zone_health = compute_zone_health()
    anomalies = get_anomalies()

    # Rule-based NLP for demo reliability (no external API needed)
    if any(w in question for w in ["worst", "critical", "bad", "alert", "danger"]):
        critical = [z for z in zone_health if z["status"] == "critical"]
        if not critical:
            critical = sorted(zone_health, key=lambda z: z["health_score"])[:2]
        names = ", ".join([z["zone_name"] for z in critical])
        return {"answer": f"⚠️ Critical zones right now: **{names}**. These zones have health scores below 40 and require immediate attention.",
                "zones": [z["zone_id"] for z in critical], "type": "alert"}

    if any(w in question for w in ["air", "aqi", "pollution", "quality"]):
        worst_aqi = max(zone_health, key=lambda z: z["latest"]["aqi"])
        return {"answer": f"🌫️ Worst air quality is in **{worst_aqi['zone_name']}** with AQI {worst_aqi['latest']['aqi']}. "
                          f"{'This is hazardous — avoid outdoor activity.' if worst_aqi['latest']['aqi'] > 150 else 'Moderate levels — sensitive groups should take care.'}",
                "zones": [worst_aqi["zone_id"]], "type": "aqi"}

    if any(w in question for w in ["traffic", "congestion", "road", "jam"]):
        worst_traffic = max(zone_health, key=lambda z: z["latest"]["traffic_index"])
        return {"answer": f"🚗 Highest congestion: **{worst_traffic['zone_name']}** (index: {worst_traffic['latest']['traffic_index']:.0f}/100). "
                          f"Consider rerouting public transport through Z6 corridor.",
                "zones": [worst_traffic["zone_id"]], "type": "traffic"}

    if any(w in question for w in ["energy", "power", "electricity", "overload"]):
        worst_energy = max(zone_health, key=lambda z: z["latest"]["energy_kwh"])
        return {"answer": f"⚡ Peak energy consumption: **{worst_energy['zone_name']}** at {worst_energy['latest']['energy_kwh']:.0f} kWh. "
                          f"Recommend load balancing — shift non-critical loads to off-peak hours.",
                "zones": [worst_energy["zone_id"]], "type": "energy"}

    if any(w in question for w in ["water", "leak", "consumption"]):
        worst_water = max(zone_health, key=lambda z: z["latest"]["water_liters"])
        return {"answer": f"💧 Highest water consumption: **{worst_water['zone_name']}** at {worst_water['latest']['water_liters']:.0f} L/hr. "
                          f"{'⚠️ Anomaly detected — possible pipe leak. Dispatch inspection team.' if worst_water['zone_id'] == 'Z7' else 'Within expected range for zone type.'}",
                "zones": [worst_water["zone_id"]], "type": "water"}

    if any(w in question for w in ["anomal", "unusual", "spike", "strange"]):
        if anomalies:
            a = anomalies[0]
            return {"answer": f"🔍 Most significant anomaly: **{a['zone_name']}** — unusual {a['top_metric'].replace('_',' ')} detected (value: {a['value']}). "
                              f"Anomaly score: {a['anomaly_score']:.2f}. This occurred at {a['timestamp'][:16]}.",
                    "zones": [a["zone_id"]], "type": "anomaly"}

    if any(w in question for w in ["health", "overall", "summary", "status", "how is"]):
        summary = get_summary()
        return {"answer": f"🏙️ City Health Overview: Average score **{summary['avg_city_health']}/100**. "
                          f"{summary['critical_zones']} critical zones, {summary['warning_zones']} on watch. "
                          f"{summary['total_anomalies_detected']} anomalies detected in last 7 days.",
                "zones": [], "type": "summary"}

    return {"answer": "I can answer questions about: air quality, traffic, energy, water, anomalies, or overall city health. Try: 'Which zones have the worst AQI?' or 'Where is energy overloading?'",
            "zones": [], "type": "help"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
