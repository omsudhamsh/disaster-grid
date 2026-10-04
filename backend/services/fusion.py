"""Multimodal fusion engine.

Fuses three independent signal families into a single operational
priority per grid cell:

    Priority = 0.40 * Vision Damage Severity
             + 0.35 * NLP Urgency Score
             + 0.25 * Live Sensor Risk Level
"""

import math

from services.explanation import explain_priority, severity_label

VISION_WEIGHT = 0.40
NLP_WEIGHT = 0.35
SENSOR_WEIGHT = 0.25

SENSOR_RADIUS_KM = 3

_URGENCY_DEFAULTS = {
    "Critical": 85,
    "High": 70,
    "Moderate": 50,
    "Low": 30,
}


def calculate_priority(vision_damage_severity, nlp_urgency_score, sensor_alert_level):
    """Weighted fusion formula. All inputs are expected on a 0-100 scale."""
    return round(
        VISION_WEIGHT * vision_damage_severity
        + NLP_WEIGHT * nlp_urgency_score
        + SENSOR_WEIGHT * sensor_alert_level,
        1,
    )


def haversine_km(lat_a, lon_a, lat_b, lon_b):
    radius = 6371.0
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    d_phi = math.radians(lat_b - lat_a)
    d_lambda = math.radians(lon_b - lon_a)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi_a) * math.cos(phi_b) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def _nearby_messages(messages, location):
    target = (location or "").lower()
    if not target:
        return []
    return [
        message
        for message in messages
        if (message.get("location") or "").lower() == target
        or target in (message.get("location") or "").lower()
        or (message.get("location") or "").lower() in target
    ]


def _nearby_sensors(sensors, latitude, longitude):
    nearby = []
    for sensor in sensors:
        try:
            distance = haversine_km(
                latitude,
                longitude,
                float(sensor.get("latitude")),
                float(sensor.get("longitude")),
            )
        except (TypeError, ValueError):
            continue
        if distance <= SENSOR_RADIUS_KM:
            nearby.append((distance, sensor))
    nearby.sort(key=lambda item: item[0])
    return nearby


def build_grid_fusion(incidents, messages, sensors):
    """Rank every incident location (grid cell) by fused priority."""
    cells = []
    for incident in incidents:
        urgency = incident.get("urgency", "Moderate")

        vision = incident.get("vision_damage_severity")
        if vision is None:
            vision = _URGENCY_DEFAULTS.get(urgency, 50)

        related = _nearby_messages(messages, incident.get("location"))
        if related:
            best = max(
                related,
                key=lambda message: message.get("analysis", {}).get(
                    "urgency_level", 1
                ),
            )
            nlp_score = best.get("analysis", {}).get("urgency_level", 3) * 20
        else:
            nlp_score = _URGENCY_DEFAULTS.get(urgency, 50)

        nearby = _nearby_sensors(
            sensors,
            incident.get("latitude"),
            incident.get("longitude"),
        )
        if nearby:
            _, top_sensor = nearby[0]
            sensor_score = float(top_sensor.get("alert_level", 50))
        else:
            sensor_score = 30.0

        priority = calculate_priority(vision, nlp_score, sensor_score)
        top_sensor_name = (
            nearby[0][1].get("name") if nearby else None
        )

        cells.append(
            {
                "id": f"GRID-{incident.get('id', 'UNKNOWN')}",
                "incident_id": incident.get("id"),
                "location": incident.get("location"),
                "state": incident.get("state"),
                "latitude": incident.get("latitude"),
                "longitude": incident.get("longitude"),
                "disaster_type": incident.get("type"),
                "people_affected": incident.get("people", 0),
                "required_aid": incident.get("aid", "General Assistance"),
                "priority": priority,
                "severity": severity_label(priority),
                "vision_damage_severity": vision,
                "nlp_urgency_score": nlp_score,
                "sensor_alert_level": sensor_score,
                "corroborating_messages": len(related),
                "top_sensor": top_sensor_name,
                "sensor_radius_km": SENSOR_RADIUS_KM,
                "explanation": explain_priority(
                    vision,
                    nlp_score,
                    sensor_score,
                    priority,
                    urgent_messages=len(related),
                    top_sensor=top_sensor_name,
                    sensor_radius_km=SENSOR_RADIUS_KM,
                    people_affected=incident.get("people", 0),
                ),
            }
        )

    cells.sort(key=lambda cell: cell["priority"], reverse=True)
    return cells


def build_fusion(incident, related_messages=0, top_sensor=None, sensor_score=30.0):
    """Fusion payload for a single incident (kept for backward compatibility)."""
    vision = incident.get("vision_damage_severity", incident.get("priority", 0))
    nlp = incident.get(
        "nlp_urgency_score",
        70 if incident.get("urgency") == "Critical" else 50,
    )
    sensor = incident.get("sensor_alert_level", sensor_score)
    priority = calculate_priority(vision, nlp, sensor)
    return {
        "location": incident.get("location"),
        "disaster_type": incident.get("type"),
        "people_affected": incident.get("people", 0),
        "severity": severity_label(priority),
        "priority": priority,
        "confidence": min(95, round((vision + nlp + sensor) / 3)),
        "source_count": 3,
        "vision_damage_severity": vision,
        "nlp_urgency_score": nlp,
        "sensor_alert_level": sensor,
        "explanation": explain_priority(
            vision,
            nlp,
            sensor,
            priority,
            urgent_messages=related_messages,
            top_sensor=top_sensor,
            people_affected=incident.get("people", 0),
        ),
        "required_aid": incident.get("aid", "General Assistance"),
        "recommendation": _recommendation(incident),
    }


def _recommendation(incident):
    aid = incident.get("aid", "General Assistance")
    if "Rescue" in aid and "Medical" in aid:
        return "Immediate Rescue + Medical Response"
    if "Rescue" in aid:
        return "Immediate Rescue Response"
    if "Medical" in aid:
        return "Medical Response"
    if "Evacuation" in aid:
        return "Evacuation Support"
    return f"{aid} Response"
