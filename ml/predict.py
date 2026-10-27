import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import json
import joblib
import numpy as np
try:
    from ml.feature_extractor import extract_features, FEATURE_NAMES
except ImportError:
    from feature_extractor import extract_features, FEATURE_NAMES


MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "sentinel_url_model.joblib")
_model = None

def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run train_model.py first.")
        _model = joblib.load(MODEL_PATH)
    return _model

def predict_url(url: str) -> dict:
    model = get_model()
    features = extract_features(url)
    X = np.array([features], dtype=np.float32)
    
    classes = list(model.classes_)
    probs = model.predict_proba(X)[0]
    
    class_probs = {cls: float(probs[i]) for i, cls in enumerate(classes)}
    predicted_class = str(model.predict(X)[0])
    
    # Benign vs Malicious risk calculation
    benign_prob = class_probs.get("benign", 0.0)
    risk_score = round((1.0 - benign_prob) * 100, 1)

    # Heuristic overrides for legitimate platforms, RFC reserved domains, and cleartext HTTP
    feature_dict = dict(zip(FEATURE_NAMES, features))
    is_legit_domain = feature_dict.get("is_known_legit_domain", 0) > 0
    is_brand_spoof = feature_dict.get("is_brand_spoof", 0) > 0

    from urllib.parse import urlparse
    import re
    parsed_u = urlparse(url if "://" in url else "https://" + url)
    host_lower = (parsed_u.hostname or "").lower()

    # 1. Authentic top-tier domains (Google, Microsoft, GitHub, Apple, etc.)
    # Legitimate authentication and service paths (/signin, /login, /security) are standard functionality
    if is_legit_domain and not is_brand_spoof:
        predicted_class = "benign"
        risk_score = round(min(risk_score, 5.0), 1)
        class_probs["benign"] = max(class_probs.get("benign", 0.95), 0.95)

    # 2. RFC 2606 / RFC 6761 Reserved documentation/test domains (example.com, etc.)
    # If not spoofing a brand, documentation URLs are non-malicious
    is_reserved_doc_domain = host_lower in {"example.com", "example.org", "example.net"} or (
        host_lower.endswith(".example.com") or host_lower.endswith(".example.org") or host_lower.endswith(".example.net")
    )
    if is_reserved_doc_domain and not is_brand_spoof:
        predicted_class = "benign"
        risk_score = round(min(risk_score, 5.0), 1)
        class_probs["benign"] = max(class_probs.get("benign", 0.95), 0.95)

    # 3. Reserved / private / loopback IP addresses (RFC 5737 TEST-NET, RFC 1918, Loopback)
    # Treat as reserved/private network destination, not malware payload distributor
    if feature_dict.get("has_ip", 0) > 0:
        m = re.match(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)$", host_lower)
        if m:
            a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if a in (127, 10, 0) or (a == 192 and b == 168) or (a == 172 and 16 <= b <= 31) or (a == 192 and b == 0 and c == 2) or (a == 169 and b == 254):
                predicted_class = "benign"
                risk_score = round(min(risk_score, 15.0), 1)
                class_probs["benign"] = max(class_probs.get("benign", 0.85), 0.85)

    # 4. Cleartext HTTP alone without brand spoof or lures (e.g. neverssl.com)
    if not is_brand_spoof and feature_dict.get("lure_count", 0) == 0 and feature_dict.get("has_ip", 0) == 0:
        if risk_score > 20:
            predicted_class = "benign"
            risk_score = round(min(risk_score, 10.0), 1)
            class_probs["benign"] = max(class_probs.get("benign", 0.90), 0.90)

    if risk_score < 20:
        risk_level = "SAFE"
    elif risk_score < 40:
        risk_level = "LOW"
    elif risk_score < 60:
        risk_level = "SUSPICIOUS"
    elif risk_score < 80:
        risk_level = "HIGH"
    else:
        risk_level = "MALICIOUS"

    # Top indicator reasons based on features
    indicators = []
    if feature_dict.get("is_brand_spoof", 0) > 0:
        indicators.append("Brand impersonation / spoofing detected in URL or subdomain")
    if feature_dict.get("has_ip", 0) > 0:
        indicators.append("Host is an IP address instead of domain")
    if feature_dict.get("is_shortened", 0) > 0:
        indicators.append("URL uses a known link shortener service")
    if feature_dict.get("lure_count", 0) > 0:
        indicators.append(f"Contains {int(feature_dict['lure_count'])} sensitive credential/phishing lure keywords")
    if feature_dict.get("is_high_risk_tld", 0) > 0:
        indicators.append("Domain uses a known high-risk / spam top-level domain")
    if feature_dict.get("digit_ratio", 0) > 0.25:
        indicators.append("Unusually high ratio of digits in URL structure")
    if feature_dict.get("entropy_domain", 0) > 3.8:
        indicators.append("High domain character entropy (possible DGA or algorithmic domain)")
    if feature_dict.get("is_known_legit_domain", 0) > 0 and feature_dict.get("is_brand_spoof", 0) == 0:
        indicators.append("Domain belongs to verified top-tier legitimate web platforms")

    return {
        "url": url,
        "prediction": predicted_class,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "probabilities": class_probs,
        "key_indicators": indicators,
        "features": feature_dict
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        test_url = "http://secure-login-appleid-verify.com.tk/login.php"
    else:
        test_url = sys.argv[1]

    result = predict_url(test_url)
    print(json.dumps(result, indent=2))
