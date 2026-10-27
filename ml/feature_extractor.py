import math
import re
from urllib.parse import urlparse

# Popular legitimate domains (Top web platforms)
TOP_LEGIT_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "amazon.com", "apple.com",
    "microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com",
    "wikipedia.org", "twitter.com", "x.com", "instagram.com",
    "linkedin.com", "netflix.com", "github.com", "yahoo.com", "reddit.com",
    "bing.com", "whatsapp.com", "pinterest.com", "cloudflare.com", "adobe.com",
    "spotify.com", "zoom.us", "dropbox.com", "twitch.tv", "paypal.com", "paypal.me",
    "ebay.com", "wordpress.org", "medium.com", "stackoverflow.com", "nih.gov",
    "harvard.edu", "mit.edu", "nytimes.com", "cnn.com", "bbc.co.uk", "reuters.com"
}

# Brands commonly targeted by phishing campaigns with their authentic domains
BRAND_LEGIT_DOMAINS = {
    "google": ["google.com", "google.co.in", "google.co.uk", "google.ca", "google.de", "youtube.com", "gmail.com"],
    "microsoft": ["microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com", "azure.com", "windows.net"],
    "apple": ["apple.com", "icloud.com"],
    "paypal": ["paypal.com", "paypal.me"],
    "amazon": ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de"],
    "netflix": ["netflix.com"],
    "facebook": ["facebook.com", "instagram.com", "whatsapp.com", "meta.com"],
    "instagram": ["instagram.com", "facebook.com"],
    "whatsapp": ["whatsapp.com"],
    "github": ["github.com"],
    "chase": ["chase.com"],
    "wellsfargo": ["wellsfargo.com"],
    "bankofamerica": ["bankofamerica.com", "bofa.com"],
    "citibank": ["citi.com", "citibank.com"],
    "barclays": ["barclays.co.uk", "barclays.com"],
    "ebay": ["ebay.com"],
    "dropbox": ["dropbox.com"],
    "outlook": ["outlook.com", "live.com", "microsoft.com", "office.com"],
    "office365": ["office.com", "office365.com", "microsoft.com"],
    "steam": ["steampowered.com", "steamcommunity.com"],
    "coinbase": ["coinbase.com"],
    "binance": ["binance.com"]
}

TARGETED_BRANDS = list(BRAND_LEGIT_DOMAINS.keys())

# Sensitive phishing lure terms
SUSPICIOUS_LURES = [
    "login", "signin", "verify", "verification", "secure", "security",
    "account", "banking", "update", "confirm", "password", "credential",
    "wallet", "token", "auth", "admin", "wp-content", "free", "gift",
    "bonus", "prize", "recover", "download", "setup", "install",
    "invoice", "payment", "webscr", "cmd", "action", "billing"
]

HIGH_RISK_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "buzz", "club", "work",
    "surf", "fit", "rest", "stream", "live", "icu", "cam", "bid", "loan",
    "click", "link", "party", "review", "trade", "date", "racing", "win"
}

SHORTENERS = {
    "bit.ly", "goo.gl", "tinyurl.com", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bit.do", "cutt.ly", "rebrand.ly", "tiny.cc",
    "shorte.st", "bc.vc", "v.gd", "soo.gd", "s.id"
}

IP_REGEX = re.compile(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    text_len = len(text)
    for count in freq.values():
        p = count / text_len
        entropy -= p * math.log2(p)
    return entropy

def get_base_domain(hostname: str) -> str:
    parts = hostname.lower().split(".")
    if len(parts) >= 2:
        # handle .co.uk, .com.br, etc.
        if len(parts) >= 3 and parts[-2] in {"co", "com", "org", "gov", "edu", "net"}:
            return ".".join(parts[-3:])
        return ".".join(parts[-2:])
    return hostname.lower()

FEATURE_NAMES = [
    "body_len",
    "domain_len",
    "path_len",
    "query_len",
    "count_dots",
    "count_hyphens",
    "count_underscores",
    "count_slashes",
    "count_question",
    "count_equal",
    "count_at",
    "count_ampersand",
    "count_percent",
    "count_digits",
    "digit_ratio",
    "entropy_url",
    "entropy_domain",
    "has_ip",
    "subdomain_count",
    "is_shortened",
    "has_port",
    "lure_count",
    "is_brand_spoof",
    "is_known_legit_domain",
    "is_high_risk_tld"
]

def extract_features(raw_url: str) -> list[float]:
    url = str(raw_url).strip()
    
    # Strip scheme for neutral feature representation
    clean_url = re.sub(r"^[a-zA-Z]+://", "", url)
    if clean_url.endswith("/") and clean_url.count("/") == 1:
        clean_url = clean_url[:-1]
    
    # Prepare parsed URL
    parsed_scheme = "http://" + clean_url
    domain = ""
    path = ""
    query = ""
    has_port = 0.0

    try:
        parsed = urlparse(parsed_scheme)
        domain = parsed.hostname or ""
        path = parsed.path or ""
        query = parsed.query or ""
        try:
            has_port = 1.0 if parsed.port is not None else 0.0
        except Exception:
            has_port = 1.0
    except Exception:
        domain = clean_url.split("/")[0].split("?")[0]
        path = ""
        query = ""
        has_port = 0.0

    domain = domain.lower()
    base_domain = get_base_domain(domain)

    # Core lexical lengths
    body_len = len(clean_url)
    domain_len = len(domain)
    path_len = len(path)
    query_len = len(query)

    # Punctuation counts
    count_dots = clean_url.count(".")
    count_hyphens = clean_url.count("-")
    count_underscores = clean_url.count("_")
    count_slashes = clean_url.count("/")
    count_question = clean_url.count("?")
    count_equal = clean_url.count("=")
    count_at = clean_url.count("@")
    count_ampersand = clean_url.count("&")
    count_percent = clean_url.count("%")
    count_digits = sum(c.isdigit() for c in clean_url)
    digit_ratio = count_digits / max(body_len, 1)

    entropy_url = calculate_entropy(clean_url)
    entropy_domain = calculate_entropy(domain)

    has_ip = 1.0 if (domain and IP_REGEX.match(domain)) else 0.0

    domain_parts = domain.split(".") if domain else []
    subdomain_count = max(0, len(domain_parts) - 2) if len(domain_parts) >= 2 else 0

    is_shortened = 1.0 if (domain in SHORTENERS or base_domain in SHORTENERS) else 0.0

    # Lures & Keywords
    url_lower = clean_url.lower()
    lure_count = sum(1 for kw in SUSPICIOUS_LURES if kw in url_lower)

    # Brand spoofing: brand mentioned in URL but NOT legitimate registered domain of that brand
    is_brand_spoof = 0.0
    for brand, legit_domains in BRAND_LEGIT_DOMAINS.items():
        if brand in url_lower:
            is_legit = any(
                base_domain == d or base_domain.endswith("." + d) or domain == d or domain.endswith("." + d)
                for d in legit_domains
            )
            if not is_legit:
                is_brand_spoof = 1.0
                break

    # Known popular legitimate domain check
    is_known_legit = 1.0 if (base_domain in TOP_LEGIT_DOMAINS or domain in TOP_LEGIT_DOMAINS) else 0.0

    # TLD risk
    tld = domain_parts[-1].lower() if len(domain_parts) > 1 else ""
    is_high_risk_tld = 1.0 if tld in HIGH_RISK_TLDS else 0.0

    return [
        float(body_len),
        float(domain_len),
        float(path_len),
        float(query_len),
        float(count_dots),
        float(count_hyphens),
        float(count_underscores),
        float(count_slashes),
        float(count_question),
        float(count_equal),
        float(count_at),
        float(count_ampersand),
        float(count_percent),
        float(count_digits),
        float(digit_ratio),
        float(entropy_url),
        float(entropy_domain),
        float(has_ip),
        float(subdomain_count),
        float(is_shortened),
        float(has_port),
        float(lure_count),
        float(is_brand_spoof),
        float(is_known_legit),
        float(is_high_risk_tld)
    ]
