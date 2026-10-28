"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Send, Sparkles, ShieldAlert, CheckCircle2, RotateCcw, GripHorizontal } from "lucide-react";
import { CyBroAvatar, CyBroMood } from "./CyBroAvatar";
import { ScanEventDetail } from "@/lib/cybro/events";
import { authClient } from "@/lib/auth-client";

interface Message {
  id: string;
  sender: "user" | "cybro";
  text: string;
  threatDetected?: boolean;
  mood?: CyBroMood;
  suggestions?: string[];
  timestamp: string;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "initial-welcome",
  sender: "cybro",
  text: "Yo! I'm **CyBro** — your elite street-smart cyber-guardian on Sentinel AI! 🤖⚡\n\nEngineered by **Yash Gupta** to give you real-time threat intelligence. Ask me about your scan results, paste any suspicious link/SMS/email, or learn how Sentinel AI's forensics, scanner, and tracers work!",
  mood: "smug",
  suggestions: [
    "Who created Sentinel AI & CyBro?",
    "What tools does Sentinel AI offer?",
    "How does AI Media Forensics detect deepfakes?",
    "How does Redirect Tracer detect homoglyphs?",
  ],
  timestamp: "Online",
};

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
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "guest";

  const dragControls = useDragControls();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<CyBroMood>("idle");
  const [isVisible, setIsVisible] = useState(true);
  const [hookIndex, setHookIndex] = useState(0);
  const [liveScanAlert, setLiveScanAlert] = useState<string | null>(null);
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);
  const [latestScanContext, setLatestScanContext] = useState<ScanEventDetail | null>(null);

  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // 0. Load user-specific chat history from localStorage
  useEffect(() => {
    try {
      const storageKey = `sentinel_cybro_chat_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setHistoryLoaded(true);
          return;
        }
      }
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    } catch {
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    } finally {
      setHistoryLoaded(true);
    }
  }, [userId]);

  // Save chat history to localStorage whenever messages update (per user)
  useEffect(() => {
    if (!historyLoaded) return;
    try {
      const storageKey = `sentinel_cybro_chat_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save CyBro chat history", e);
    }
  }, [messages, userId, historyLoaded]);

  const handleClearHistory = () => {
    if (typeof window !== "undefined" && window.confirm("Reset CyBro chat history?")) {
      const fresh = [
        {
          ...DEFAULT_WELCOME_MESSAGE,
          id: `initial-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ];
      setMessages(fresh);
      try {
        localStorage.removeItem(`sentinel_cybro_chat_${userId}`);
      } catch {
        // ignore
      }
    }
  };

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

      setLatestScanContext(detail);
      setIsBubbleDismissed(false);

      const isThreat = detail.isThreat;
      const mood: CyBroMood = isThreat ? "angry" : "happy";
      setCurrentMood(mood);

      const alertBanner = isThreat
        ? `🚨 Security Alert in ${detail.tool.toUpperCase()}! Inspect findings.`
        : `⚡ Clean ${detail.tool.toUpperCase()} scan on ${detail.target.slice(0, 20)}!`;
      
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
          scanContext: latestScanContext,
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
      setCurrentMood("smug");
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "cybro",
        text: "Arre yaar, server network hiccup ho gaya! Ek baar refresh karke wapas bolo na bro.",
        mood: "smug",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render formatted markdown, badges, and code snippets
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();

      // Threat Badge detection (removes ugly raw bracket markdown)
      if (
        trimmed === "[THREAT DETECTED]" ||
        trimmed === "[SCAM / DANGEROUS]" ||
        trimmed === "[SCAM]" ||
        trimmed === "[DANGEROUS]" ||
        trimmed.startsWith("VERDICT: THREAT DETECTED") ||
        trimmed.startsWith("VERDICT: SCAM DETECTED")
      ) {
        return (
          <div key={i} style={{ margin: "6px 0" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(239, 68, 68, 0.16)",
                border: "1px solid rgba(239, 68, 68, 0.45)",
                color: "#FCA5A5",
                padding: "3px 10px",
                borderRadius: "9999px",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.25)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#EF4444",
                  boxShadow: "0 0 6px #EF4444",
                }}
              />
              THREAT DETECTED
            </span>
          </div>
        );
      }

      // Safe Badge detection
      if (
        trimmed === "[SAFE]" ||
        trimmed === "[CLEAN]" ||
        trimmed.startsWith("VERDICT: VERIFIED SAFE") ||
        trimmed.startsWith("VERDICT: SAFE")
      ) {
        return (
          <div key={i} style={{ margin: "6px 0" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(16, 185, 129, 0.16)",
                border: "1px solid rgba(16, 185, 129, 0.45)",
                color: "#6EE7B7",
                padding: "3px 10px",
                borderRadius: "9999px",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  boxShadow: "0 0 6px #10B981",
                }}
              />
              VERIFIED SAFE
            </span>
          </div>
        );
      }

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
        {!isOpen && !isBubbleDismissed && (
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
              padding: "8px 12px 8px 14px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              color: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "fadeIn 0.3s ease",
              transition: "transform 0.15s ease",
              maxWidth: "290px",
            }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.03)")}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "14px" }}>
              {currentMood === "happy" ? "😄" : currentMood === "angry" ? "🛡️" : "⚡"}
            </span>
            <span style={{ whiteSpace: "normal", lineHeight: 1.3, flex: 1 }}>
              {liveScanAlert || ENGLISH_HOOKS[hookIndex]}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLiveScanAlert(null);
                setIsBubbleDismissed(true);
                setHasUnreadAlert(false);
              }}
              title="Dismiss notification"
              aria-label="Dismiss notification"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                padding: "3px",
                borderRadius: "50%",
                cursor: "pointer",
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginLeft: "4px",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#94A3B8";
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.06)";
              }}
            >
              <X style={{ width: "12px", height: "12px" }} />
            </button>
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
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.05}
          className="right-3 sm:right-6 bottom-20 sm:bottom-[94px]"
          style={{
            position: "fixed",
            width: "calc(100vw - 24px)",
            maxWidth: "405px",
            height: "calc(100vh - 115px)",
            maxHeight: "585px",
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
              padding: "12px 14px",
              backgroundColor: "#0F172A",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              userSelect: "none",
            }}
          >
            {/* Draggable Title Area */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "grab",
                flex: 1,
                overflow: "hidden",
              }}
              title="Hold and drag to move CyBro anywhere on screen"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "#64748B",
                  flexShrink: 0,
                }}
              >
                <GripHorizontal style={{ width: "15px", height: "15px" }} />
              </div>
              <CyBroAvatar size={34} mood={currentMood} />
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "13.5px",
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
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "#94A3B8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentMood === "happy"
                    ? "Verified Clean ⚡ (Safe Target)"
                    : currentMood === "angry"
                    ? "Sentinel Alert 🛡️ (Threat Analysis)"
                    : currentMood === "smug"
                    ? "Tactical Intel & Roast Mode 🎯"
                    : currentMood === "thinking"
                    ? "Analyzing Threat Intel 🧠"
                    : "Real-Time Cyber Co-Pilot"}
                </div>
              </div>
            </div>

            {/* Header Actions: Reset chat & Close */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleClearHistory}
                title="Reset Chat History"
                aria-label="Reset Chat History"
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
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#EF4444";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239, 68, 68, 0.12)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#94A3B8";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <RotateCcw style={{ width: "14px", height: "14px" }} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close CyBro Assistant"
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
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#94A3B8";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>

          {/* Active Scan Telemetry Banner */}
          {latestScanContext && (
            <div
              style={{
                padding: "7px 14px",
                backgroundColor: latestScanContext.isThreat ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                borderBottom: `1px solid ${latestScanContext.isThreat ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <span style={{ fontSize: "12px" }}>{latestScanContext.isThreat ? "⚠️" : "🛡️"}</span>
                <span style={{ color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Active Scan: <strong style={{ color: "#FFFFFF" }}>{latestScanContext.tool.toUpperCase()}</strong> ({latestScanContext.target.slice(0, 20)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => sendMessage(latestScanContext.isThreat ? "Explain technical risk of this scan" : "What makes this target safe?")}
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38BDF8",
                  padding: "3px 8px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                Deep-Dive ⚡
              </button>
            </div>
          )}

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
        </motion.div>
      )}
    </>
  );
}
