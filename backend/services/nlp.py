"""Crisis text understanding for noisy, code-mixed disaster reports.

Extracts structured entities (location, region, disaster tag, urgency level
1-5, affected population, required rescue aid) from social media and
WhatsApp reports written in mixed English / Hindi / Telugu / Tamil /
Malayalam / Bengali / Assamese / Punjabi text.

Coverage: PAN India (all states and union territories).
"""

import re

# ---------------------------------------------------------------------------
# Location knowledge base (canonical location -> aliases)
# ---------------------------------------------------------------------------

LOCATION_ALIASES = {
    # -- South India (existing coverage) ----------------------------------
    "Kukatpally": ["kukatpally", "kukatpally lo"],
    "LB Nagar": ["lb nagar", "lbn", "lb-nagar"],
    "Secunderabad": ["secunderabad", "scb"],
    "Mehdipatnam": ["mehdipatnam", "mehdipatnam center"],
    "Charminar": ["charminar", "old city"],
    "Miyapur": ["miyapur", "miyapur highway"],
    "Uppal": ["uppal", "uppal lake"],
    "Hussain Sagar": ["hussain sagar", "hussainsagar"],
    "Begumpet": ["begumpet", "begambet"],
    "Hyderabad": ["hyderabad", "medchal", "abids", "secunderabad metro"],
    "Vijayawada": ["vijayawada", "vijayawada canal"],
    "Prakasam": ["prakasam", "prakasam barrage"],
    "Guntur": ["guntur", "guntur city"],
    "Visakhapatnam": ["visakhapatnam", "vizag", "vizagapatnam"],
    "Rameswaram": ["rameswaram", "gajuwaka"],
    "Anantapur": ["anantapur", "anantapuram", "anatapur"],
    "Chennai": ["chennai", "madras", "t.nagar", "tnagar"],
    "Velachery": ["velachery"],
    "T. Nagar": ["t nagar", "tnagar"],
    "Adyar": ["adyar", "adyar river"],
    "Coimbatore": ["coimbatore", "cbe", "gandhipuram"],
    "Salem": ["salem", "salem city"],
    "Sirumalai": ["sirumalai", "sherumalai"],
    "Tirunelveli": ["tirunelveli", "trichy", "thirunelveli"],
    "Bengaluru": ["bengaluru", "bangalore", "whitefield", "bellandur", "itpl"],
    "Whitefield": ["whitefield", "itpl corridor"],
    "Mangaluru": ["mangaluru", "mangalore", "bhatkal"],
    "Hassan": ["hassan", "hassan taluk"],
    "Mysuru": ["mysuru", "mysore"],
    "Hubballi": ["hubballi", "hubli"],
    "Kochi": ["kochi", "cochin", "kuttanad", "ernakulam"],
    "Wayanad": ["wayanad", "meppadi", "kalpetta"],
    "Idukki": ["idukki"],
    "Thiruvananthapuram": ["thiruvananthapuram", "trivandrum"],
    "Alappuzha": ["alappuzha", "alleppey"],
    "Port Blair": ["port blair", "south andaman"],
    "Kavaratti": ["kavaratti", "lakshadweep"],

    # -- North India ------------------------------------------------------
    "Delhi": ["delhi", "new delhi", "cp area", "connaught place", "ring road delhi"],
    "Gurugram": ["gurugram", "gurgaon", "gurugram cyber city"],
    "Noida": ["noida", "noida sector"],
    "Lucknow": ["lucknow", "lakhnau", "gomti"],
    "Varanasi": ["varanasi", "banaras", "kashi", "ghat"],
    "Patna": ["patna", "patna city", "ganga patna"],
    "Muzaffarpur": ["muzaffarpur", "tirhut"],
    "Ranchi": ["ranchi", "jharkhand capital", "subarnarekha"],
    "Dhanbad": ["dhanbad", "damodar"],
    "Dehradun": ["dehradun", "dehra dun", "doon"],
    "Haridwar": ["haridwar", "haridwar ganga"],
    "Shimla": ["shimla", "shimla hills"],
    "Chandigarh": ["chandigarh", "chandigarh sector"],
    "Ludhiana": ["ludhiana", "sutlej ludhiana"],
    "Amritsar": ["amritsar", "amritsar canal"],
    "Jaisalmer": ["jaisalmer", "indra water"],
    "Jaipur": ["jaipur", "pink city", "sambhar"],
    "Udaipur": ["udaipur", "fateh sagar", "lake pichola"],
    "Srinagar": ["srinagar", "srinagar city", "jhelum srinagar"],
    "Leh": ["leh", "leh ladakh", "indus valley leh"],

    # -- West India -------------------------------------------------------
    "Ahmedabad": ["ahmedabad", "amdavad", "sabarmati"],
    "Surat": ["surat", "surat city", "tapi"],
    "Bhavnagar": ["bhavnagar", "bhavnagar girnar"],
    "Vadodara": ["vadodara", "baroda"],
    "Indore": ["indore", "shipra"],
    "Bhopal": ["bhopal", "bhopal upper lake"],
    "Jabalpur": ["jabalpur", "narmada jabalpur"],
    "Mumbai": ["mumbai", "bombay", "mithi river"],
    "Pune": ["pune", "puna", "pimpri"],
    "Nagpur": ["nagpur", "nag river"],
    "Kolhapur": ["kolhapur", "krishna valley"],
    "Panaji": ["panaji", "goa", "mandovi"],

    # -- Central & East India --------------------------------------------
    "Raipur": ["raipur", "mahanadi", "bhilai"],
    "Bhubaneswar": ["bhubaneswar", "cuttack", "mahanadi delta"],
    "Balasore": ["balasore", "baleshwar"],
    "Kolkata": ["kolkata", "calcutta", "hooghly", "kolkata city"],
    "Siliguri": ["siliguri", "siliguri hills"],
    "Asansol": ["asansol", "asansol colliery"],

    # -- North East India -------------------------------------------------
    "Guwahati": ["guwahati", "dispur", "brahmaputra guwahati"],
    "Dibrugarh": ["dibrugarh", "dihing"],
    "Shillong": ["shillong", "meghalaya city"],
    "Imphal": ["imphal", "manipur city"],
    "Agartala": ["agartala", "tripura city"],
    "Aizawl": ["aizawl", "tlawng"],
    "Kohima": ["kohima", "nagaland city"],
    "Itanagar": ["itanagar", "siang", "arunachal city"],
    "Gangtok": ["gangtok", "teesta gangtok", "sikkim city"],
}

# ---------------------------------------------------------------------------
# Region knowledge base
# ---------------------------------------------------------------------------

LOCATION_STATE = {
    # South
    "Kukatpally": "Telangana", "LB Nagar": "Telangana", "Secunderabad": "Telangana",
    "Mehdipatnam": "Telangana", "Charminar": "Telangana", "Miyapur": "Telangana",
    "Uppal": "Telangana", "Hussain Sagar": "Telangana", "Begumpet": "Telangana",
    "Hyderabad": "Telangana",
    "Vijayawada": "Andhra Pradesh", "Prakasam": "Andhra Pradesh", "Guntur": "Andhra Pradesh",
    "Visakhapatnam": "Andhra Pradesh", "Rameswaram": "Andhra Pradesh", "Anantapur": "Andhra Pradesh",
    "Chennai": "Tamil Nadu", "Velachery": "Tamil Nadu", "T. Nagar": "Tamil Nadu",
    "Adyar": "Tamil Nadu", "Coimbatore": "Tamil Nadu", "Salem": "Tamil Nadu",
    "Sirumalai": "Tamil Nadu", "Tirunelveli": "Tamil Nadu",
    "Bengaluru": "Karnataka", "Whitefield": "Karnataka", "Mangaluru": "Karnataka",
    "Hassan": "Karnataka", "Mysuru": "Karnataka", "Hubballi": "Karnataka",
    "Kochi": "Kerala", "Wayanad": "Kerala", "Idukki": "Kerala",
    "Thiruvananthapuram": "Kerala", "Alappuzha": "Kerala",
    "Port Blair": "Andaman and Nicobar Islands", "Kavaratti": "Lakshadweep",
    # North
    "Delhi": "Delhi", "Gurugram": "Haryana", "Noida": "Uttar Pradesh",
    "Lucknow": "Uttar Pradesh", "Varanasi": "Uttar Pradesh", "Patna": "Bihar",
    "Muzaffarpur": "Bihar", "Ranchi": "Jharkhand", "Dhanbad": "Jharkhand",
    "Dehradun": "Uttarakhand", "Haridwar": "Uttarakhand", "Shimla": "Himachal Pradesh",
    "Chandigarh": "Chandigarh", "Ludhiana": "Punjab", "Amritsar": "Punjab",
    "Jaisalmer": "Rajasthan", "Jaipur": "Rajasthan", "Udaipur": "Rajasthan",
    "Srinagar": "Jammu and Kashmir", "Leh": "Ladakh",
    # West
    "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Bhavnagar": "Gujarat", "Vadodara": "Gujarat",
    "Indore": "Madhya Pradesh", "Bhopal": "Madhya Pradesh", "Jabalpur": "Madhya Pradesh",
    "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nagpur": "Maharashtra",
    "Kolhapur": "Maharashtra", "Panaji": "Goa",
    # Central & East
    "Raipur": "Chhattisgarh", "Bhubaneswar": "Odisha", "Balasore": "Odisha",
    "Kolkata": "West Bengal", "Siliguri": "West Bengal", "Asansol": "West Bengal",
    # North East
    "Guwahati": "Assam", "Dibrugarh": "Assam", "Shillong": "Meghalaya",
    "Imphal": "Manipur", "Agartala": "Tripura", "Aizawl": "Mizoram",
    "Kohima": "Nagaland", "Itanagar": "Arunachal Pradesh", "Gangtok": "Sikkim",
}

STATE_ALIASES = {
    "Telangana": ["telangana", "ts", "deccan"],
    "Andhra Pradesh": ["andhra", "andhra pradesh", "ap", "coastal andhra"],
    "Tamil Nadu": ["tamil nadu", "tamilnadu", "tamil nadesu", "tn"],
    "Karnataka": ["karnataka", "karnataka state", "kn"],
    "Kerala": ["kerala", "god's own country"],
    "Maharashtra": ["maharashtra", "maha", "bombay state"],
    "Gujarat": ["gujarat", "guj"],
    "Rajasthan": ["rajasthan", "raj", "desert state"],
    "Madhya Pradesh": ["madhya pradesh", "mp", "central india"],
    "Delhi": ["delhi", "ndli", "national capital", "ncr", "new delhi"],
    "Uttar Pradesh": ["uttar pradesh", "up"],
    "Bihar": ["bihar", "patna state"],
    "Jharkhand": ["jharkhand"],
    "West Bengal": ["west bengal", "bengal", "bangla", "wb"],
    "Odisha": ["odisha", "orissa"],
    "Chhattisgarh": ["chhattisgarh", "cg"],
    "Haryana": ["haryana", "hr"],
    "Punjab": ["punjab"],
    "Himachal Pradesh": ["himachal pradesh", "himachal", "hp"],
    "Uttarakhand": ["uttarakhand", "uk"],
    "Jammu and Kashmir": ["jammu and kashmir", "j&k", "kashmir", "jammu"],
    "Ladakh": ["ladakh"],
    "Goa": ["goa", "goan"],
    "Assam": ["assam"],
    "Meghalaya": ["meghalaya", "shillong state"],
    "Manipur": ["manipur"],
    "Nagaland": ["nagaland"],
    "Mizoram": ["mizoram"],
    "Tripura": ["tripura"],
    "Arunachal Pradesh": ["arunachal pradesh", "arunachal"],
    "Sikkim": ["sikkim"],
    "Andaman and Nicobar Islands": ["andaman and nicobar", "andaman", "nicobar"],
    "Lakshadweep": ["lakshadweep", "lakshadweep islands"],
    "Chandigarh": ["chandigarh"],
    "Puducherry": ["puducherry", "pondicherry"],
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
        # Hindi / pan-India
        "pani", "paani", "badh gaya", "paani me", "jalebi", "drowned",
        "jalgay", "barsi", "jalebi", "paani bhara",
        # Bengali
        "joli", "bonbon", "duiye", "jal dhuche",
        # Odia
        "pani", "baadh", "naali",
    ],
    "Earthquake": [
        "earthquake", "quake", "tremor", "earth shock", "seismic",
        "jolt", "hellu", "neelavukka", "bhoomi",
        "bhukamp", "hila", "hilaa", "kanp",
    ],
    "Cyclone": [
        "cyclone", "cyclonic", "storm surge", "gale", "hurricane",
        "severe storm", "vaigal", "thookku", "kadal vilai",
        "toofan", "andhi", "baadlon", "tufan", "khai cyclon",
        # Bengali / Odia
        "bon", "mashal", "kalpari",
    ],
    "Wildfire": [
        "wildfire", "fire", "blaze", "burning", "burnt", "fires",
        "forest fire", "fire tender", "endh", "panch",
        "aag", "jal raha", "dhuundh", "agni",
    ],
    "Landslide": [
        "landslide", "mudslide", "mud slides", "hill slide", "slump",
        "mud neda", "land ippudu",
        "bhalu", "pahaad", "dirt slid", "naala",
    ],
    "Structural Damage": [
        "collapse", "collapsed", "collapses", "structural",
        "building damage", "cracked", "damaged building", "ceiling fell",
        "partially collapsed", "wall damage", "walls peeling", "building",
        "gir gaya", "mahal gir", "tuta", "hathiya",
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
        "phanse", "phas gaye", "doob", "bahut khatarnak", "maran",
    ],
    4: [
        "urgent", "urgently", "immediately", "emergency", "critical",
        "danger", "at risk", "in danger", "pooru", "pool", "dangal",
        "kharakaat", "eellikodalli", "quickly", "asap",
        "jaldi", "turant", "jaldi bhejo", "fatafat", "khatarna",
    ],
    3: [
        "need help", "help needed", "send help", "rescue", "evacuation",
        "evacuate", "dangerous", "warning", "alert", "concern",
        "help", "support", "needed", "madagaali", "sahaayam",
        "madad", "bakshaat",
        "chahiye", "madad chahiye", "bhejo", "bachaao", "evacuate karna",
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
        "bachaao", "nauka", "ghaadi", "bachao", "rescue karo",
    ],
    "Medical": [
        "medical", "doctor", "hospital", "injured", "injury", "ambulance",
        "casualty", "pharmacy", "first aid", "bp problem", "medical team",
        "panichu", "hospital ki", "doctor ki",
        "dawai", "aushadhi", "treatment", "daktar",
    ],
    "Food": [
        "food", "meals", "meal", "ration", "rations", "food packets",
        "hungry", "food shortage", "paacham", "food rations",
        "khana", "roti", "anna", "bhojan",
    ],
    "Water": [
        "water", "drinking water", "clean water", "water supply",
        "thirsty", "neru", "pani", "panichu", "pani ki",
        "paani", "jal", "thirst",
    ],
    "Evacuation": [
        "evacuation", "evacuate", "safe zone", "shelter", "shelter camp",
        "relief camp", "vacate", "pogam", "pogalu",
        "shelter camp", "bachao", "safe jagah", "palayao",
    ],
}

PEOPLE_PATTERN = re.compile(
    r"(\d+)\s*(?:people|persons?|families?|members|residents|individuals|farmers?|children|person|logo|logon|family)",
    re.IGNORECASE,
)


def _build_patterns(alias_map):
    """Compile case-insensitive word-boundary patterns for alias matching.

    Word boundaries stop short aliases (e.g. "ap", "mp", "up") from matching
    inside unrelated words such as "map" or "help".
    """
    compiled = []
    for canonical, aliases in alias_map.items():
        for alias in aliases:
            compiled.append(
                (re.compile(r"(?<!\w)" + re.escape(alias) + r"(?!\w)", re.IGNORECASE), canonical, len(alias))
            )
    # Longest aliases first so specific names win over generic ones.
    compiled.sort(key=lambda item: item[2], reverse=True)
    return compiled


_LOCATION_PATTERNS = _build_patterns(LOCATION_ALIASES)
_STATE_PATTERNS = _build_patterns(STATE_ALIASES)


def _find_location(text):
    """Return (canonical_location, state) matched from the text."""
    for pattern, canonical, _ in _LOCATION_PATTERNS:
        if pattern.search(text):
            return canonical, LOCATION_STATE.get(canonical)
    return None, None


def _find_state(text):
    for pattern, state, _ in _STATE_PATTERNS:
        if pattern.search(text):
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
    if disaster == "Flood" and ("trapped" in lower or "phanse" in lower):
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
            for marker in (
                "lo ", "und", "eki", "iri", "ah ", "thee", "podu",
                "me ", "hai", "kar", "bhejo", "chahiye", "log",
            )
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