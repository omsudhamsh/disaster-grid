"""Crisis text understanding for noisy, code-mixed disaster reports.

Extracts structured entities (location, region, disaster tag, urgency level
1-5, affected population, required rescue aid) from SMS, social media and
WhatsApp reports written in mixed English / Telugu / Tamil / Malayalam /
Hinglish text.
"""

import re

# ---------------------------------------------------------------------------
# Location knowledge base (canonical South India locations -> aliases)
# ---------------------------------------------------------------------------

LOCATION_ALIASES = {
    "Kukatpally": ["kukatpally"],
    "LB Nagar": ["lb nagar", "lbn", "lb-nagar"],
    "Secunderabad": ["secunderabad", "scb"],
    "Mehdipatnam": ["mehdipatnam", "mehdipatnam center"],
    "Charminar": ["charminar", "old city"],
    "Miyapur": ["miyapur", "miyapur highway"],
    "Uppal": ["uppal", "uppal lake"],
    "Hussain Sagar": ["hussain sagar", "hussainsagar"],
    "Begumpet": ["begumpet", "begambet"],
    "Hyderabad": ["hyderabad", "medchal", "abids"],
    "Vijayawada": ["vijayawada", "vijayawada"],
    "Prakasam": ["prakasam", "prakasam barrage"],
    "Guntur": ["guntur", "guntur city"],
    "Visakhapatnam": ["visakhapatnam", "vizag", "vizagapatnam"],
    "Rameswaram": ["rameswaram", "gajuwaka"],
    "Anantapur": ["anantapur", "anantapuram", "anatapur"],
    "Chennai": ["chennai", "madras", "t.nagar", "tnagar"],
    "Velachery": ["velachery"],
    "T. Nagar": ["t naga", "tnagar", "t.nagar"],
    "Adyar": ["adyar"],
    "Coimbatore": ["coimbatore", "cbe", "gandhipuram"],
    "Salem": ["salem", "salem city"],
    "Sirumalai": ["sirumalai"],
    "Tirunelveli": ["tirunelveli", "trichy", "thirunelveli"],
    "Bengaluru": ["bengaluru", "bangalore", "whitefield", "bellandur", "itpl"],
    "Whitefield": ["whitefield", "itpl"],
    "Mangaluru": ["mangaluru", "mangalore", "bhatkal"],
    "Hassan": ["hassan", "hassan taluk"],
    "Mysuru": ["mysuru", "mysore"],
    "Hubballi": ["hubballi", "hubli"],
    "Kochi": ["kochi", "cochin", "kuttanad", "ernakulam"],
    "Wayanad": ["wayanad", "meppadi", "kalpetta"],
    "Idukki": ["idukki"],
    "Thiruvananthapuram": ["thiruvananthapuram", "trivandrum"],
    "Alappuzha": ["alappuzha", "alleppey"],
}

# ---------------------------------------------------------------------------
# Region knowledge base
# ---------------------------------------------------------------------------

LOCATION_STATE = {
    "Kukatpally": "Telangana",
    "LB Nagar": "Telangana",
    "Secunderabad": "Telangana",
    "Mehdipatnam": "Telangana",
    "Charminar": "Telangana",
    "Miyapur": "Telangana",
    "Uppal": "Telangana",
    "Hussain Sagar": "Telangana",
    "Begumpet": "Telangana",
    "Hyderabad": "Telangana",
    "Vijayawada": "Andhra Pradesh",
    "Prakasam": "Andhra Pradesh",
    "Guntur": "Andhra Pradesh",
    "Visakhapatnam": "Andhra Pradesh",
    "Rameswaram": "Andhra Pradesh",
    "Anantapur": "Andhra Pradesh",
    "Chennai": "Tamil Nadu",
    "Velachery": "Tamil Nadu",
    "T. Nagar": "Tamil Nadu",
    "Adyar": "Tamil Nadu",
    "Coimbatore": "Tamil Nadu",
    "Salem": "Tamil Nadu",
    "Sirumalai": "Tamil Nadu",
    "Tirunelveli": "Tamil Nadu",
    "Bengaluru": "Karnataka",
    "Whitefield": "Karnataka",
    "Mangaluru": "Karnataka",
    "Hassan": "Karnataka",
    "Mysuru": "Karnataka",
    "Hubballi": "Karnataka",
    "Kochi": "Kerala",
    "Wayanad": "Kerala",
    "Idukki": "Kerala",
    "Thiruvananthapuram": "Kerala",
    "Alappuzha": "Kerala",
}

STATE_ALIASES = {
    "Telangana": ["telangana", "ts", "deccan"],
    "Andhra Pradesh": ["andhra", "andhra pradesh", "ap", "coastal andhra"],
    "Tamil Nadu": ["tamil nadu", "tamilnadu", "tamil nadesu", "tn"],
    "Karnataka": ["karnataka", "karnataka state", "kn"],
    "Kerala": ["kerala", "god's own country"],
}

# ---------------------------------------------------------------------------
# Disaster tag keywords (code-mixed)
# ---------------------------------------------------------------------------

DISASTER_KEYWORDS = {
    "Flood": [
        "flood", "flooded", "flooding", "inundation", "inundated",
        "waterlog", "waterlogged", "water logging", "ponding",
        "river overflow", "overflow", "monsoon", "thalai", "soodhikudutha",
        "alluvam", "eenthi chadda", "thoduku", "flood la", "flood conditions",
        "under water", "deep water", "feet water", "buried in water",
        "water level", "river bank", "lake overflow",
    ],
    "Earthquake": [
        "earthquake", "quake", "tremor", "earth shock", "seismic",
        "jolt", "hellu", "neelavukka", "bhoomi",
    ],
    "Cyclone": [
        "cyclone", "cyclonic", "storm surge", "gale", "hurricane",
        "severe storm", "vaigal", "thookku", "kadal vilai",
    ],
    "Wildfire": [
        "wildfire", "fire", "blaze", "burning", "burnt", "fires",
        "forest fire", "fire tender", "endh", "panch",
    ],
    "Landslide": [
        "landslide", "mudslide", "mud slides", "hill slide", "slump",
        "mud neda", "land ippudu",
    ],
    "Structural Damage": [
        "collapse", "collapsed", "collapses", "structural",
        "building damage", "cracked", "damaged building", "ceiling fell",
        "partially collapsed", "wall damage", "walls peeling", "building",
    ],
}

# ---------------------------------------------------------------------------
# Urgency keywords, scored by impact level
# ---------------------------------------------------------------------------

URGENCY_KEYWORDS = {
    5: [
        "trapped", "trapped since", "stuck", "missing", "drowning",
        "dead", "death", "casualt", "sos", "save us", "help needed",
        "urgent ah", "soodhaikkaima", "reekal", "paaranu", "prana",
        "life threatening", "collapsed on top", "buried",
    ],
    4: [
        "urgent", "urgently", "immediately", "emergency", "critical",
        "danger", "at risk", "in danger", "pooru", "pool", "dangal",
        "kharakaat", "eellikodalli", "quickly", "asap",
    ],
    3: [
        "need help", "help needed", "send help", "rescue", "evacuation",
        "evacuate", "dangerous", "warning", "alert", "concern",
        "help", "support", "needed", "need", "madagaali", "sahaayam",
        "madad", "bakshaat",
    ],
    2: [
        "affected", "damage", "damaged", "submerged", "overflow",
        "rising", "overflowing", "blocked", "cut off", "no power",
        "power outage", "no signal", "stranded", "water entered",
    ],
}

# ---------------------------------------------------------------------------
# Required rescue aid keywords (code-mixed)
# ---------------------------------------------------------------------------

AID_KEYWORDS = {
    "Rescue": [
        "rescue", "trapped", "boat", "boats", "helicopter", "rescue team",
        "rescue squad", "uddhaaram", "reekal", "soodhikku", "rescue teams",
    ],
    "Medical": [
        "medical", "doctor", "hospital", "injured", "injury", "ambulance",
        "casualty", "pharmacy", "first aid", "bp problem", "medical team",
        "panichu", "hospital ki", "doctor ki",
    ],
    "Food": [
        "food", "meals", "meal", "ration", "rations", "food packets",
        "hungry", "food shortage", "paacham", "food rations",
    ],
    "Water": [
        "water", "drinking water", "clean water", "water supply",
        "thirsty", "neru", "pani", "panichu", "pani ki",
    ],
    "Evacuation": [
        "evacuation", "evacuate", "safe zone", "shelter", "shelter camp",
        "relief camp", "vacate", "pogam", "pogalu",
    ],
}

PEOPLE_PATTERN = re.compile(
    r"(\d+)\s*(?:people|persons?|families?|members|residents|individuals|farmers?|children|person)"
    , re.IGNORECASE)


def _find_location(text):
    """Return (canonical_location, state) matched from the text."""
    lower = text.lower()
    best = None
    best_length = 0
    for location, aliases in LOCATION_ALIASES.items():
        for alias in aliases:
            if alias in lower and len(alias) > best_length:
                best = location
                best_length = len(alias)
    if best:
        return best, LOCATION_STATE.get(best)
    return None, None


def _find_state(text):
    lower = text.lower()
    for state, aliases in STATE_ALIASES.items():
        for alias in aliases:
            if alias in lower:
                return state
    return None


def _find_disaster(text):
    """Classify the dominant disaster tag."""
    lower = text.lower()
    scores = {}
    for tag, keywords in DISASTER_KEYWORDS.items():
        hits = sum(1 for keyword in keywords if keyword in lower)
        if hits:
            scores[tag] = hits
    if not scores:
        return "General Emergency"
    return max(scores, key=scores.get)


def _find_urgency(text, disaster):
    """Score urgency on a 1-5 scale from keyword impact levels."""
    lower = text.lower()
    level = 1
    for impact, keywords in URGENCY_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            level = max(level, impact)
    # Disaster amplifiers: life-threatening categories push the floor up.
    if disaster in ("Landslide", "Earthquake", "Cyclone"):
        level = max(level, 3)
    if disaster == "Flood" and "trapped" in lower:
        level = max(level, 5)
    return min(level, 5)


URGENCY_LABELS = {
    1: "Low",
    2: "Guarded",
    3: "Moderate",
    4: "High",
    5: "Critical",
}


def _find_people(text):
    match = PEOPLE_PATTERN.search(text)
    if match:
        return int(match.group(1))
    return None


def _find_aid(text):
    lower = text.lower()
    aid = []
    for category, keywords in AID_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            aid.append(category)
    return aid or ["General Assistance"]


def analyze_message(text, fallback_state=None, fallback_location=None):
    """Analyze a single crisis report.

    Returns a structured extraction result with location, region, disaster
    tag, urgency level (1-5), affected population and required aid.
    """
    if not text or not isinstance(text, str):
        return {
            "location": fallback_location,
            "state": fallback_state,
            "disaster_tag": "General Emergency",
            "urgency_level": 1,
            "urgency": "Low",
            "people_affected": None,
            "required_aid": ["General Assistance"],
            "code_mixed": False,
        }

    location, state = _find_location(text)
    if not state:
        state = fallback_state or _find_state(text)
    if not location:
        location = fallback_location

    disaster = _find_disaster(text)
    urgency_level = _find_urgency(text, disaster)
    people = _find_people(text)
    aid = _find_aid(text)

    non_ascii = any(not ord(char) < 128 for char in text)
    code_mixed = bool(
        non_ascii
        or any(
            marker in text.lower()
            for marker in ("lo ", "und", "eki", "iri", "ah ", "thee", "podu")
        )
    )

    return {
        "location": location,
        "state": state,
        "disaster_tag": disaster,
        "urgency_level": urgency_level,
        "urgency": URGENCY_LABELS[urgency_level],
        "people_affected": people,
        "required_aid": aid,
        "code_mixed": code_mixed,
    }
