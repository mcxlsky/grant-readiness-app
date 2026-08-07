"""
PLACEHOLDER funder-matching data.

This is a small, hand-curated seed list of well-known national funders
tagged by NTEE cause-area prefix, used only to demonstrate what
readiness-aware funder matching looks like. It is NOT the real funder
database this product needs (that requires a licensed data source such as
Candid's API, or an original 990-PF grants dataset) - it exists so the full
intake -> score -> match -> plan loop can be demoed end to end today.
"""

FUNDER_SEED_LIST = [
    {"name": "The Wallace Foundation", "focus": "Education, arts participation, youth development", "ntee_prefixes": ["A", "B"], "url": "https://www.wallacefoundation.org"},
    {"name": "Robert Wood Johnson Foundation", "focus": "Health and health equity", "ntee_prefixes": ["E", "F", "G"], "url": "https://www.rwjf.org"},
    {"name": "The Kresge Foundation", "focus": "Community development, human services, education", "ntee_prefixes": ["P", "S", "L", "B"], "url": "https://kresge.org"},
    {"name": "Doris Duke Foundation", "focus": "Arts, environment, medical research", "ntee_prefixes": ["A", "C", "H"], "url": "https://www.dorisduke.org"},
    {"name": "Wilburforce Foundation", "focus": "Environmental conservation", "ntee_prefixes": ["C", "D"], "url": "https://wilburforce.org"},
    {"name": "PetSmart Charities", "focus": "Animal welfare", "ntee_prefixes": ["D"], "url": "https://www.petsmartcharities.org"},
    {"name": "United Way (local chapters)", "focus": "Human services, community support", "ntee_prefixes": ["P", "S"], "url": "https://www.unitedway.org"},
    {"name": "National Endowment for the Arts", "focus": "Arts & culture", "ntee_prefixes": ["A"], "url": "https://www.arts.gov"},
    {"name": "Surdna Foundation", "focus": "Community, environment, arts, youth justice", "ntee_prefixes": ["C", "S", "A", "I"], "url": "https://surdna.org"},
    {"name": "The Libra Foundation", "focus": "Human rights, environmental and economic justice", "ntee_prefixes": ["R", "C", "S"], "url": "https://www.librafoundation.org"},
    {"name": "Local/regional community foundation", "focus": "General purpose — search by county/city name", "ntee_prefixes": ["T", "S", "P", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "Q", "R", "U", "V", "W", "X", "Y", "Z"], "url": "https://www.cof.org/community-foundation-locator"},
]


def match_funders(ntee_code, limit=5):
    prefix = (ntee_code or "")[:1].upper()
    matches = [f for f in FUNDER_SEED_LIST if prefix in f["ntee_prefixes"]]
    if not matches:
        matches = FUNDER_SEED_LIST[:limit]
    return matches[:limit]
