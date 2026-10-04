from services.explanation import explain_priority


def calculate_priority(vision_damage_severity, nlp_urgency_score, sensor_alert_level):
	return round(
		0.4 * vision_damage_severity
		+ 0.35 * nlp_urgency_score
		+ 0.25 * sensor_alert_level,
		1,
	)


def build_fusion(incident):
	vision = incident.get("vision_damage_severity", incident.get("priority", 0))
	nlp = incident.get("nlp_urgency_score", 70 if incident.get("urgency") == "Critical" else 50)
	sensor = incident.get("sensor_alert_level", 60 if incident.get("source") == "IoT Sensor" else 30)
	priority = calculate_priority(vision, nlp, sensor)
	return {
		"location": incident.get("location"),
		"disaster_type": incident.get("type"),
		"people_affected": incident.get("people", 0),
		"severity": "Critical" if priority >= 85 else "High" if priority >= 70 else "Moderate" if priority >= 50 else "Low",
		"priority": priority,
		"confidence": min(95, round((vision + nlp + sensor) / 3)),
		"source_count": 3,
		"vision_damage_severity": vision,
		"nlp_urgency_score": nlp,
		"sensor_alert_level": sensor,
		"explanation": explain_priority(vision, nlp, sensor, incident.get("urgency_reports", incident.get("people", 0))),
		"required_aid": incident.get("aid", "General Assistance"),
		"recommendation": "Immediate Rescue + Medical Response" if "Rescue" in incident.get("aid", "") and "Medical" in incident.get("aid", "") else f"{incident.get('aid', 'General Assistance')} Response",
	}
