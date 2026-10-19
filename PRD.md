# Product Requirement Document (PRD)
## Project: Sentinel AI (Refactoring & ML Overhaul)

---

### 1. Overview & Objective
Sentinel AI is an AI-powered cybersecurity platform detecting phishing URLs, malicious QR codes, and cyber threats. 
This update addresses key requirements:
1. **Frontend Migration:** Transition from TypeScript to **React (JavaScript / JSX) + HTML / CSS**.
2. **Core Detection Engine:** Replace direct Gemini-dependent classification with a **custom trained Machine Learning model** (trained on a dedicated threat dataset).
3. **Gemini API Repositioning:** Gemini is retained purely for **contextual threat reasoning and human-readable explanations**, not raw classification.
4. **Scope Cleanup:** Remove unused or high-overhead features, specifically the **browser extension**.
5. **UI/UX Redesign:** Adopt an **Apple-inspired "Liquid Glass" (Glassmorphism)** visual design.

---

### 2. Key Changes & Scope

#### 2.1 Frontend Stack Transition
- **Goal:** Remove TypeScript from frontend code (`.tsx`/`.ts` -> `.jsx`/`.js`).
- **Target Tech:** React.js, standard JavaScript (ES6+), HTML5, and CSS / Vanilla CSS.
- **Reason:** Align project with curriculum/course requirements where TypeScript is excluded.

#### 2.2 Machine Learning & Detection Architecture
- **Datasets Provided:**
  - `malicious_phish.csv`: ~651,000 URLs with multi-class threat labels (`benign`, `phishing`, `defacement`, `malware`).
  - `QR codes/` (`malicious` & `benign`): Real-world QR code images for end-to-end validation, testing, and synthetic augmentation.
- **Model Architecture & Training:**
  - High-performance classifier (LightGBM / XGBoost / Random Forest) trained on engineered lexical, host, and domain features (URL length, special char frequency, entropy, IP presence, subdomain depth, keyword triggers).
  - Fast, lightweight inference (sub-20ms) exportable via ONNX / Scikit-learn / joblib or local microservice.
- **Inference Pipeline:**
  - Input: URL or decoded QR content (via QR decoder).
  - Feature Extraction: Real-time lexical analysis and domain indicators.
  - ML Model Prediction: Instant Threat Probability, Risk Score (0-100), and Threat Class.
- **Gemini Role (Reasoning Layer):**
  - Prompted with the ML classification, risk score, and extracted evidence.
  - Generates human-friendly threat intelligence explanations, attack vector breakdowns, and prevention guidance.

#### 2.3 Feature Cleanup
- **Remove:** Browser Extension components, builds, and docs.
- **Retain & Enhance:**
  - URL Security Scanner
  - QR Code Security Scanner
  - Scan History & Risk Breakdown Dashboard
  - User Authentication & Reports

#### 2.4 UI/UX: Apple "Liquid Glass" Aesthetic
- **Visual Language:** Apple-style Glassmorphism (Liquid Glass).
- **Core Elements:**
  - Dynamic frosted-glass panels (`backdrop-filter: blur()`).
  - Subtle multi-layered specular borders and soft glow highlights.
  - Deep dark/vibrant gradient canvas backgrounds.
  - Micro-interactions, smooth hover transitions, and clean typography.
  - Seamless layout ready to integrate specific Liquid Glass skill/tokens upon receipt.

---

### 3. Architecture & Data Flow

```
[ User Input (URL / QR Image) ]
              │
              ▼
    [ Feature Extractor ]
    (Domain, Lexical, SSL)
              │
              ▼
    [ Custom ML Model ]  ────────► [ Prediction: Risk Score & Threat Class ]
                                                  │
                                                  ▼
                                      [ Gemini Reasoning Engine ]
                                      (Generates Detailed Explanations)
                                                  │
                                                  ▼
                          [ Liquid Glass React.js UI (Dashboard) ]
```

---

### 4. Implementation Phases

1. **Phase 1: PRD & Architecture Alignment** *(Current)*
   - Finalize PRD and await dataset & Liquid Glass design guidelines.
2. **Phase 2: Feature Pruning**
   - Clean up browser extension modules and unnecessary configs.
3. **Phase 3: ML Pipeline Integration**
   - Data preprocessing & feature engineering on provided dataset.
   - Model training, evaluation, and backend inference endpoint integration.
   - Restructure Gemini API integration to strictly handle explanation generation.
4. **Phase 4: Frontend Conversion (TS to JS/React)**
   - Convert UI components from `.tsx`/`.ts` to `.jsx`/`.js`.
   - Update build and lint configurations.
5. **Phase 5: Liquid Glass UI Styling & Polish**
   - Apply Apple-style Liquid Glass components, layout, and animations.
   - Testing and verification.
