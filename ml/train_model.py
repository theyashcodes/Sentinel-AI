import os
import sys
import time
import json
import joblib
import numpy as np
import pandas as pd
from concurrent.futures import ProcessPoolExecutor
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from ml.feature_extractor import extract_features, FEATURE_NAMES

def process_batch(url_batch):
    return [extract_features(u) for u in url_batch]

def main():
    dataset_path = "/Users/macbookm1/Downloads/malicious_phish.csv"
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}")
        sys.exit(1)

    print(f"[*] Loading dataset from {dataset_path}...")
    start_time = time.time()
    
    # Load dataset
    df = pd.read_csv(dataset_path)
    print(f"[*] Loaded {len(df):,} rows in {time.time() - start_time:.2f}s")
    
    # Clean rows: keep valid strings and known classes
    valid_classes = {"benign", "phishing", "defacement", "malware"}
    df = df.dropna(subset=["url", "type"])
    df = df[df["type"].isin(valid_classes)]
    print(f"[*] Valid records after filtering: {len(df):,}")
    print("[*] Class distribution:")
    for label, count in df["type"].value_counts().items():
        print(f"    - {label}: {count:,} ({count / len(df) * 100:.1f}%)")

    # Multi-core Feature extraction
    print("\n[*] Extracting engineered features for URLs (Parallel across CPU cores)...")
    f_start = time.time()
    
    urls = df["url"].tolist()
    total_urls = len(urls)
    batch_size = 25000
    batches = [urls[i:i + batch_size] for i in range(0, total_urls, batch_size)]
    
    features_list = []
    num_workers = min(os.cpu_count() or 4, 8)
    print(f"[*] Spawning {num_workers} parallel workers on {len(batches)} batches...")
    
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        for i, batch_result in enumerate(executor.map(process_batch, batches)):
            features_list.extend(batch_result)
            processed = min((i + 1) * batch_size, total_urls)
            print(f"    - Processed {processed:,} / {total_urls:,} URLs ({processed / total_urls * 100:.1f}%)", end="\r", flush=True)

    print()
    X = np.array(features_list, dtype=np.float32)
    y = df["type"].values
    
    print(f"[*] Feature extraction completed in {time.time() - f_start:.2f}s. Matrix shape: {X.shape}")

    # Train / Test split
    print("\n[*] Splitting into Train (80%) and Test (20%) sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[*] Training samples: {len(X_train):,}, Testing samples: {len(X_test):,}")

    # Train HistGradientBoostingClassifier
    print("\n[*] Training High-Performance HistGradientBoostingClassifier...")
    t_start = time.time()
    model = HistGradientBoostingClassifier(
        max_iter=160,
        learning_rate=0.1,
        max_leaf_nodes=50,
        random_state=42,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)
    train_duration = time.time() - t_start
    print(f"[*] Model trained successfully in {train_duration:.2f}s!")

    # Evaluation
    print("\n[*] Evaluating on Test Set...")
    e_start = time.time()
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    eval_duration = time.time() - e_start

    print(f"[*] Accuracy: {acc * 100:.2f}% (evaluated {len(y_test):,} samples in {eval_duration:.2f}s)")
    print("\n[*] Detailed Classification Report:")
    report = classification_report(y_test, y_pred, digits=4, output_dict=True)
    print(classification_report(y_test, y_pred, digits=4))

    # Save Model Artifacts
    output_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(output_dir, exist_ok=True)
    model_file = os.path.join(output_dir, "sentinel_url_model.joblib")
    meta_file = os.path.join(output_dir, "model_metadata.json")

    print(f"\n[*] Saving trained model to {model_file}...")
    joblib.dump(model, model_file, compress=3)
    
    metadata = {
        "model_type": "HistGradientBoostingClassifier",
        "classes": [str(c) for c in model.classes_],
        "feature_names": FEATURE_NAMES,
        "total_samples": len(df),
        "test_accuracy": float(acc),
        "classification_report": report,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_duration_seconds": train_duration
    }
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[*] Metadata saved to {meta_file}")
    print("\n[SUCCESS] Model training and export complete! Ready for inference.")

if __name__ == "__main__":
    main()
