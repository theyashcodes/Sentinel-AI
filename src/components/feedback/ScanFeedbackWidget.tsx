"use client";

import { useState, useEffect } from "react";
import { Star, Lock, CheckCircle2, AlertCircle, Sparkles, BrainCircuit } from "lucide-react";
import { FeedbackTool, GroundTruthVerdict, StoredFeedback } from "@/lib/feedback/types";

interface ScanFeedbackWidgetProps {
  scanId: string;
  tool: FeedbackTool;
  target: string;
  originalVerdict?: string;
  originalRiskScore?: number;
  extractedFeatures?: Record<string, unknown>;
  compact?: boolean;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Critical Mistake (False Positive or Missed Threat)",
  2: "Inaccurate / Misleading Analysis",
  3: "Borderline / Mixed Signals",
  4: "Mostly Accurate (Minor nuances missed)",
  5: "Highly Accurate (Spot-on prediction!)",
};

const TOOL_TAG_SUGGESTIONS: Record<FeedbackTool, string[]> = {
  "media-forensics": [
    "Real Camera Photo",
    "Real Printed Document / Poster",
    "Social Media Compressed",
    "Synthetic DALL-E / Midjourney",
    "Subtle Face Deepfake",
  ],
  "voice-forensics": [
    "Real Human Voice",
    "Phone / WhatsApp Voice Note",
    "ElevenLabs / Synthetic Vocoder",
    "RVC Voice Conversion",
  ],
  "url-scanner": [
    "Legitimate Brand Portal",
    "Internal Corporate Domain",
    "Credential Harvesting Phishing",
    "Cyrillic Homoglyph Trap",
  ],
  "qr-scanner": [
    "Authentic Wi-Fi / Invoice QR",
    "Malicious URL Redirect",
    "Quishing Payment Trap",
  ],
  general: [
    "Verified Authentic",
    "Confirmed Threat",
    "Edge Case Scenario",
  ],
};

export function ScanFeedbackWidget({
  scanId,
  tool,
  target,
  originalVerdict,
  originalRiskScore,
  extractedFeatures,
  compact = false,
}: ScanFeedbackWidgetProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [groundTruth, setGroundTruth] = useState<GroundTruthVerdict>("UNSURE");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedFeedback, setLockedFeedback] = useState<StoredFeedback | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if this scan has already been rated and permanently locked
  useEffect(() => {
    if (!scanId) return;

    // 1. Check local storage first (instant)
    try {
      const localKey = `sentinel_scan_feedback_${scanId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed: StoredFeedback = JSON.parse(saved);
        if (parsed.isLocked) {
          setIsLocked(true);
          setLockedFeedback(parsed);
          setRating(parsed.rating);
          setSelectedTags(parsed.tags || []);
          setGroundTruth(parsed.groundTruth);
          setComment(parsed.comment || "");
          return;
        }
      }
    } catch {
      // ignore
    }

    // 2. Query server status
    fetch(`/api/feedback/status?scanId=${encodeURIComponent(scanId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isLocked && data.feedback) {
          setIsLocked(true);
          setLockedFeedback(data.feedback);
          setRating(data.feedback.rating);
          setSelectedTags(data.feedback.tags || []);
          setGroundTruth(data.feedback.groundTruth);
          setComment(data.feedback.comment || "");
          try {
            localStorage.setItem(
              `sentinel_scan_feedback_${scanId}`,
              JSON.stringify(data.feedback)
            );
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => console.warn("Failed to check feedback status:", err));
  }, [scanId]);

  const toggleTag = (tag: string) => {
    if (isLocked) return;
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (isLocked || rating === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          tool,
          target,
          rating,
          groundTruth,
          tags: selectedTags,
          comment,
          originalVerdict,
          originalRiskScore,
          extractedFeatures,
        }),
      });

      const data = await res.json();

      if (res.status === 409 || data.alreadyLocked) {
        // Already locked on server!
        setIsLocked(true);
        setLockedFeedback(data.feedback);
        setErrorMsg("Feedback was already submitted and is permanently locked.");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      const savedFeedback: StoredFeedback = data.feedback;
      setIsLocked(true);
      setLockedFeedback(savedFeedback);

      // Persist in localStorage so it never unlocks
      try {
        localStorage.setItem(
          `sentinel_scan_feedback_${scanId}`,
          JSON.stringify(savedFeedback)
        );
      } catch {
        // ignore
      }

      // Notify CyBro via custom event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sentinel_feedback_submitted", {
            detail: { scanId, rating, groundTruth, tool, target },
          })
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error submitting feedback";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTags = TOOL_TAG_SUGGESTIONS[tool] || TOOL_TAG_SUGGESTIONS.general;
  const currentRating = hoverRating || rating;

  return (
    <div
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(12px)",
        border: isLocked
          ? "1px solid rgba(16, 185, 129, 0.3)"
          : "1px solid rgba(56, 189, 248, 0.2)",
        borderRadius: "16px",
        padding: compact ? "12px 14px" : "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: isLocked
          ? "0 4px 20px rgba(16, 185, 129, 0.08)"
          : "0 4px 20px rgba(0, 0, 0, 0.35)",
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BrainCircuit style={{ width: "18px", height: "18px", color: isLocked ? "#10B981" : "#38BDF8" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC", letterSpacing: "0.02em" }}>
            Model Evaluation & Continuous Learning Feedback
          </span>
        </div>

        {isLocked ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34D399",
              padding: "3px 10px",
              borderRadius: "9999px",
              fontSize: "10.5px",
              fontWeight: 700,
            }}
          >
            <Lock style={{ width: "11px", height: "11px" }} />
            FEEDBACK PERMANENTLY LOCKED
          </div>
        ) : (
          <span style={{ fontSize: "11px", color: "#94A3B8" }}>
            Rate accuracy to train Sentinel AI models
          </span>
        )}
      </div>

      {/* ── Star Rating Section ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentRating;
            const isClickable = !isLocked;

            return (
              <button
                key={star}
                type="button"
                disabled={isLocked}
                onClick={() => setRating(star)}
                onMouseEnter={() => !isLocked && setHoverRating(star)}
                onMouseLeave={() => !isLocked && setHoverRating(0)}
                title={isLocked ? "Feedback is locked" : `Rate ${star} star(s)`}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "2px",
                  cursor: isClickable ? "pointer" : "default",
                  outline: "none",
                  transition: "transform 0.15s ease",
                  transform: isClickable && hoverRating === star ? "scale(1.2)" : "scale(1)",
                }}
              >
                <Star
                  style={{
                    width: compact ? "18px" : "24px",
                    height: compact ? "18px" : "24px",
                    color: isFilled
                      ? currentRating <= 2
                        ? "#EF4444"
                        : currentRating === 3
                        ? "#F59E0B"
                        : "#FACC15"
                      : "rgba(255, 255, 255, 0.18)",
                    fill: isFilled
                      ? currentRating <= 2
                        ? "#EF4444"
                        : currentRating === 3
                        ? "#F59E0B"
                        : "#FACC15"
                      : "transparent",
                    filter: isFilled ? "drop-shadow(0 0 6px rgba(250, 204, 21, 0.45))" : "none",
                    transition: "all 0.15s ease",
                  }}
                />
              </button>
            );
          })}

          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color:
                currentRating <= 2
                  ? "#F87171"
                  : currentRating === 3
                  ? "#FBBF24"
                  : currentRating >= 4
                  ? "#34D399"
                  : "#94A3B8",
              marginLeft: "6px",
            }}
          >
            {currentRating > 0 ? RATING_DESCRIPTIONS[currentRating] : "Select Rating (1 to 5)"}
          </span>
        </div>
      </div>

      {/* ── Detailed Tags & Ground Truth (When active or locked with data) ── */}
      {(!compact || isLocked || rating > 0) && (
        <>
          {/* Ground Truth Verdict Radio */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "11px" }}>
            <span style={{ color: "#94A3B8", fontWeight: 600 }}>Ground Truth Reality:</span>
            
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setGroundTruth("GENUINE_SAFE")}
              style={{
                backgroundColor: groundTruth === "GENUINE_SAFE" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${groundTruth === "GENUINE_SAFE" ? "#10B981" : "rgba(255, 255, 255, 0.1)"}`,
                color: groundTruth === "GENUINE_SAFE" ? "#34D399" : "#CBD5E1",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: isLocked ? "default" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🟢</span> Actually Genuine / Safe
            </button>

            <button
              type="button"
              disabled={isLocked}
              onClick={() => setGroundTruth("MALICIOUS_SYNTHETIC")}
              style={{
                backgroundColor: groundTruth === "MALICIOUS_SYNTHETIC" ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${groundTruth === "MALICIOUS_SYNTHETIC" ? "#EF4444" : "rgba(255, 255, 255, 0.1)"}`,
                color: groundTruth === "MALICIOUS_SYNTHETIC" ? "#F87171" : "#CBD5E1",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: isLocked ? "default" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🔴</span> Actually Threat / Fake
            </button>
          </div>

          {/* Quick Category Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {availableTags.map((t) => {
              const isSelected = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleTag(t)}
                  style={{
                    backgroundColor: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${isSelected ? "#38BDF8" : "rgba(255, 255, 255, 0.1)"}`,
                    color: isSelected ? "#38BDF8" : "#94A3B8",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 500,
                    cursor: isLocked ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSelected ? "✓ " : "+ "}
                  {t}
                </button>
              );
            })}
          </div>

          {/* Comment input if not locked */}
          {!isLocked && (
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional notes: e.g. Taken from Nikon DSLR, not generated..."
              style={{
                width: "100%",
                height: "34px",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "0 10px",
                color: "#FFFFFF",
                fontSize: "11.5px",
                outline: "none",
              }}
            />
          )}

          {/* Locked Comment View */}
          {isLocked && lockedFeedback?.comment && (
            <div style={{ fontSize: "11px", color: "#94A3B8", fontStyle: "italic", padding: "2px 4px" }}>
              Notes: "{lockedFeedback.comment}"
            </div>
          )}
        </>
      )}

      {/* ── Active Learning Calibration Alert on 1-Star ── */}
      {currentRating <= 2 && currentRating > 0 && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#FCA5A5",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle style={{ width: "15px", height: "15px", flexShrink: 0, color: "#EF4444" }} />
          <span>
            <strong>Adaptive Learning Flag:</strong> This feedback marks a model inaccuracy. Features and ground-truth will be archived for threshold recalibration and false-positive suppression!
          </span>
        </div>
      )}

      {/* ── Submission & Lock Confirmation ── */}
      {!isLocked && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
          {errorMsg && (
            <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>
              {errorMsg}
            </span>
          )}

          <button
            type="button"
            disabled={rating === 0 || isSubmitting}
            onClick={handleSubmit}
            style={{
              backgroundColor: rating > 0 ? "#10B981" : "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: rating > 0 ? "#022C22" : "#64748B",
              padding: "6px 16px",
              borderRadius: "8px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: rating > 0 ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: rating > 0 ? "0 0 12px rgba(16, 185, 129, 0.35)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Lock style={{ width: "12px", height: "12px" }} />
            {isSubmitting ? "Locking Feedback..." : "Submit & Permanently Lock Feedback"}
          </button>
        </div>
      )}

      {/* ── Locked Confirmation Footer ── */}
      {isLocked && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "10.5px",
            color: "#6EE7B7",
            paddingTop: "6px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 style={{ width: "13px", height: "13px", color: "#10B981" }} />
            Ingested into Sentinel AI continuous learning feedback loop
          </span>
          <span style={{ color: "#64748B" }}>
            {lockedFeedback?.createdAt
              ? new Date(lockedFeedback.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Locked"}
          </span>
        </div>
      )}
    </div>
  );
}
