def explain_priority(vision_severity, nlp_urgency, sensor_alert, urgency_reports=0, radius_km=2):
	return (
		f"High Priority assigned due to severe visual structural damage "
		f"({vision_severity}%) corroborated by {urgency_reports} urgency reports "
		f"within {radius_km}km. Sensor alert level contributes {sensor_alert}% "
		f"and NLP urgency contributes {nlp_urgency}%."
	)
