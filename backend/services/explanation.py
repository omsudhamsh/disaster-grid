"""Explainable AI (XAI) natural language generation for priority scores."""

SEVERITY_BANDS = (
    (85, "Critical"),
    (70, "High"),
    (50, "Moderate"),
    (0, "Low"),
)


def severity_label(priority):
    for threshold, label in SEVERITY_BANDS:
        if priority >= threshold:
            return label
    return "Low"


def explain_priority(
    vision_severity,
    nlp_urgency,
    sensor_alert,
    priority_score,
    urgent_messages=0,
    top_sensor=None,
    sensor_radius_km=3,
    people_affected=0,
):
    """Build a natural language rationale for a fused priority score.

    Example output:
    "Priority 92/100 assigned due to 85% visual structural damage
    corroborated by 14 urgent SOS messages and river overflow sensor
    alerts within 3km."
    """
    parts = [
        f"Priority {round(priority_score)}/100 assigned due to "
        f"{int(vision_severity)}% visual damage severity"
    ]

    evidence = []
    if urgent_messages > 0:
        evidence.append(f"{urgent_messages} corroborating crisis messages")
    if top_sensor:
        evidence.append(
            f"live sensor alerts from {top_sensor} within {sensor_radius_km}km"
        )

    if evidence:
        joined = " and ".join(evidence)
        parts.append(f"corroborated by {joined}")

    if people_affected > 0:
        parts.append(f"affecting an estimated {people_affected} people")

    sentence = " ".join(parts)
    if not sentence.endswith("."):
        sentence = sentence.rstrip(".") + "."

    formula_note = (
        f"Weighted evidence: 40% vision ({int(vision_severity)}), "
        f"35% NLP urgency ({int(nlp_urgency)}), 25% live sensor risk "
        f"({int(sensor_alert)}). "
        f"Overall band: {severity_label(priority_score)}."
    )

    return sentence + " " + formula_note
