"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
import { CyBroAvatar, CyBroMood } from "./CyBroAvatar";
import { ScanEventDetail } from "@/lib/cybro/events";

interface Message {
  id: string;
  sender: "user" | "cybro";
  text: string;
  threatDetected?: boolean;
  mood?: CyBroMood;
  suggestions?: string[];
  timestamp: string;
}

const ENGLISH_HOOKS = [
  "Got a shady link? Let me inspect it 🛡️",
  "Don't click that link yet! Ask me 🛑",
  "Is that email legit? Drop it here 📬",
  "Need help with any Sentinel AI feature? 💡",
  "Your 24/7 digital bouncer is on duty ⚡",
  "Is that OTP message real? Check first 🔍",
  "Found something fishy? Throw it here 🤖",
  "Deepfake or authentic? Let's check 👁️",
];

export function CyBroWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<CyBroMood>("idle");
  const [isVisible, setIsVisible] = useState(true);
  const [hookIndex, setHookIndex] = useState(0);
  const [liveScanAlert, setLiveScanAlert] = useState<string | null>(null);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);

  // 1. Check & listen to CyBro visibility preference (Settings page toggle)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sentinel_show_cybro");
      if (saved === "false") {
        setIsVisible(false);
      }
    } catch {
      // ignore
    }

    const handleVisibilityChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setIsVisible(customEvent.detail);
      }
    };

    window.addEventListener("sentinel_cybro_visibility", handleVisibilityChange);
    return () => {
      window.removeEventListener("sentinel_cybro_visibility", handleVisibilityChange);
    };
  }, []);

  // 2. Rotate English speech bubble hook dynamically every 7.5 seconds (when no active scan alert)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!liveScanAlert) {
        setHookIndex((prev) => (prev + 1) % ENGLISH_HOOKS.length);
      }
    }, 7500);
    return () => clearInterval(timer);
  }, [liveScanAlert]);

  // 3. Listen to Real-Time Scan Events Across Dashboard (Tracer, Forensics, Email, Scanner)
  useEffect(() => {
    const handleScanComplete = async (e: Event) => {
      const customEvent = e as CustomEvent<ScanEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      const isThreat = detail.isThreat;
      const mood: CyBroMood = isThreat ? "angry" : "happy";
      setCurrentMood(mood);

      const alertBanner = isThreat
        ? `🚨 Threat in ${detail.tool.toUpperCase()}! Click for safe action plan.`
        : `😄 Clean ${detail.tool.toUpperCase()} scan on ${detail.target.slice(0, 20)}!`;
      
      setLiveScanAlert(alertBanner);
      setHasUnreadAlert(true);

      // Fetch automated Groq optimal safe action plan
      try {
        const res = await fetch("/api/cybro/analyze-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detail),
        });

        if (res.ok) {
          const data = await res.json();
          const scanMsg: Message = {
            id: `scan-advisory-${Date.now()}`,
            sender: "cybro",
            text: `⚡ **REAL-TIME SCAN ADVISORY: ${detail.tool.toUpperCase()}**\nTarget: \`${detail.target}\`\n\n${data.reply}`,
            threatDetected: data.threatDetected,
            mood: data.mood || mood,
            suggestions: data.quickSuggestions,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, scanMsg]);
          setCurrentMood(data.mood || mood);
        }
      } catch (err) {
        console.warn("Failed to get CyBro live scan advisory", err);
      }
    };

    window.addEventListener("sentinel_scan_completed", handleScanComplete);
    return () => {
      window.removeEventListener("sentinel_scan_completed", handleScanComplete);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-1",
      sender: "cybro",
      text: "Yo! I'm **CyBro** — your street-smart Sentinel AI cyber companion! 🤖⚡\n\nI monitor your dashboard scans in real time. Drop any suspicious link, SMS, or email, or run a scan in any tool (Redirect Tracer, AI Media Forensics, or Email Dissector) — I'll analyze the output and give you the optimal safe action!",
      mood: "smug",
      suggestions: [
        "How does Redirect Tracer detect homoglyphs?",
        "How does AI Media Forensics detect deepfakes?",
        "Check this link: https://раypal.com/login",
        "Check safe link: https://google.com",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  if (!isVisible) {
    return null;
  }

  const handleOpenWidget = () => {
    setIsOpen(!isOpen);
    setHasUnreadAlert(false);
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setCurrentMood("thinking");

    // Prepare history for Grok (last 6 messages)
    const history = messages.slice(-6).map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    try {
      const res = await fetch("/api/cybro/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to talk to CyBro");

      const botMood: CyBroMood =
        data.mood || (data.threatDetected ? "angry" : "happy");

      setCurrentMood(botMood);

      const botMsg: Message = {
        id: `cybro-${Date.now()}`,
        sender: "cybro",
        text: data.reply,
        threatDetected: data.threatDetected,
        mood: botMood,
        suggestions: data.quickSuggestions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setCurrentMood("angry");
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "cybro",
        text: "Arre yaar, server network hiccup! Ek baar refresh karke wapas bolo na bro.",
        mood: "angry",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render bold markdown (**text**), code (`text`), and lines
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return (
        <div key={i} style={{ minHeight: line === "" ? "8px" : undefined, marginBottom: "3px" }}>
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} style={{ color: "#FFFFFF", fontWeight: 700 }}>
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code
                  key={pIdx}
                  style={{
                    backgroundColor: "rgba(56,189,248,0.15)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    color: "#38BDF8",
                    fontFamily: "monospace",
                    fontSize: "11px",
                  }}
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* ── Floating Launcher Avatar Widget (Bottom Right) ── */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Dynamic English Speech Bubble Tooltip or Live Scan Alert */}
        {!isOpen && (
          <div
            onClick={handleOpenWidget}
            style={{
              backgroundColor: "#0F172A",
              border: `1.5px solid ${
                currentMood === "happy"
                  ? "rgba(16, 185, 129, 0.7)"
                  : currentMood === "angry"
                  ? "rgba(239, 68, 68, 0.85)"
                  : "rgba(56, 189, 248, 0.4)"
              }`,
              boxShadow: currentMood === "angry"
                ? "0 6px 28px rgba(239, 68, 68, 0.35)"
                : "0 6px 24px rgba(0,0,0,0.6)",
              borderRadius: "14px",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              color: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "fadeIn 0.3s ease",
              transition: "transform 0.15s ease",
              maxWidth: "280px",
            }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.04)")}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "14px" }}>
              {currentMood === "happy" ? "😄" : currentMood === "angry" ? "🚨" : "🛡️"}
            </span>
            <span style={{ whiteSpace: "normal", lineHeight: 1.3 }}>
              {liveScanAlert || ENGLISH_HOOKS[hookIndex]}
            </span>
          </div>
        )}

        {/* Floating Avatar Head Button */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={handleOpenWidget}
            aria-label="Toggle CyBro Assistant"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              outline: "none",
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(0.92)")}
            onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          >
            <CyBroAvatar size={58} mood={currentMood} />
          </button>

          {/* Unread Alert Ping Badge */}
          {hasUnreadAlert && !isOpen && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "14px",
                height: "14px",
                backgroundColor: currentMood === "angry" ? "#EF4444" : "#10B981",
                borderRadius: "50%",
                border: "2px solid #0F172A",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                animation: "pulse 1.2s infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* ── CyBro Chat Window ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "94px",
            right: "24px",
            width: "395px",
            height: "570px",
            backgroundColor: "#0B0F19",
            border: `1.5px solid ${
              currentMood === "happy"
                ? "rgba(16, 185, 129, 0.5)"
                : currentMood === "angry"
                ? "rgba(239, 68, 68, 0.6)"
                : "rgba(56, 189, 248, 0.35)"
            }`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.85), 0 0 30px rgba(56, 189, 248, 0.12)",
            borderRadius: "22px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "#0F172A",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CyBroAvatar size={36} mood={currentMood} />
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  CyBro
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "1px 6px",
                      borderRadius: "10px",
                    }}
                  >
                    ONLINE
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  {currentMood === "happy"
                    ? "Smiling 😄 (Safe & Verified!)"
                    : currentMood === "angry"
                    ? "Angry Alert 😡 (Scam Detected!)"
                    : currentMood === "smug"
                    ? "Roast & Solution Mode 😏"
                    : "Real-Time Cyber Copilot"}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                width: "28px",
                height: "28px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "transparent",
                color: "#94A3B8",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              padding: "14px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      backgroundColor: isUser
                        ? "#2563EB"
                        : msg.threatDetected
                        ? "rgba(220, 38, 38, 0.12)"
                        : msg.mood === "happy"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "#1E293B",
                      border: isUser
                        ? "none"
                        : msg.threatDetected
                        ? "1px solid rgba(220, 38, 38, 0.4)"
                        : msg.mood === "happy"
                        ? "1px solid rgba(16, 185, 129, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#EDEDED",
                      fontSize: "12.5px",
                      lineHeight: 1.5,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                  >
                    {renderFormattedText(msg.text)}
                  </div>

                  <span style={{ fontSize: "10px", color: "#64748B", padding: "0 4px" }}>
                    {msg.timestamp}
                  </span>

                  {/* Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {msg.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendMessage(s)}
                          style={{
                            background: "rgba(56, 189, 248, 0.08)",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                            borderRadius: "12px",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 500,
                            color: "#38BDF8",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            textAlign: "left",
                          }}
                          onMouseOver={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(56, 189, 248, 0.18)";
                          }}
                          onMouseOut={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(56, 189, 248, 0.08)";
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#38BDF8",
                  fontSize: "11px",
                  padding: "4px",
                }}
              >
                <CyBroAvatar size={24} mood="thinking" />
                <span>CyBro is checking Sentinel AI threat intelligence...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{
              padding: "10px 14px",
              backgroundColor: "#0F172A",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask CyBro or paste link, SMS, email..."
              style={{
                flex: 1,
                height: "38px",
                backgroundColor: "#1E293B",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "0 12px",
                color: "#FFFFFF",
                fontSize: "12.5px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: input.trim() ? "#38BDF8" : "rgba(255,255,255,0.06)",
                color: input.trim() ? "#0F172A" : "#64748B",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: input.trim() ? "pointer" : "default",
                transition: "background-color 0.15s ease",
              }}
            >
              <Send style={{ width: "16px", height: "16px" }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
