import os
import sys
import json
import joblib
import numpy as np
from ml.feature_extractor import extract_features, FEATURE_NAMES

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

    # Heuristic override for top known trusted platforms (e.g. google.com root)
    feature_dict = dict(zip(FEATURE_NAMES, features))
    if feature_dict.get("is_known_legit_domain", 0) > 0 and feature_dict.get("lure_count", 0) == 0 and feature_dict.get("is_brand_spoof", 0) == 0 and feature_dict.get("path_len", 0) < 15:
        predicted_class = "benign"
        risk_score = round(min(risk_score, 5.0), 1)
        class_probs["benign"] = max(class_probs.get("benign", 0.95), 0.95)

    if risk_score < 25:
        risk_level = "SAFE"
    elif risk_score < 60:
        risk_level = "SUSPICIOUS"
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
