"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

export type ModalTab = "profile" | "password";

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ModalTab;
  currentUser: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onUserUpdated?: (updated: { name?: string; image?: string | null }) => void;
}

const AVATAR_PRESETS = [
  { id: "sentinel", name: "Sentinel Prime", url: "https://api.dicebear.com/7.x/bottts/svg?seed=SentinelPrime" },
  { id: "recon", name: "Shadow Recon", url: "https://api.dicebear.com/7.x/bottts/svg?seed=ShadowRecon" },
  { id: "ninja", name: "Cyber Ninja", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=CyberNinja" },
  { id: "guard", name: "Quantum Guard", url: "https://api.dicebear.com/7.x/bottts/svg?seed=QuantumGuard" },
  { id: "operator", name: "Ghost Operator", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=GhostOperator" },
  { id: "cyber", name: "Neo Agent", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NeoAgent" },
];

export function AccountSecurityModal({
  isOpen,
  onClose,
  initialTab = "profile",
  currentUser,
  onUserUpdated,
}: AccountSecurityModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);

  // Profile state
  const [name, setName] = useState(currentUser.name || "");
  const [selectedImage, setSelectedImage] = useState(currentUser.image || "");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || "");
      setSelectedImage(currentUser.image || "");
      setProfileMessage(null);
      setPasswordMessage(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Fetch user profile status to see if password exists
      fetch("/api/user/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setHasPassword(data.hasPassword ?? true);
          }
        })
        .catch(() => setHasPassword(true));
    }
  }, [isOpen, currentUser]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "NONE", color: "var(--hair-10)" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 25, label: "WEAK", color: "var(--crit)" };
    if (score === 3) return { score: 55, label: "FAIR", color: "var(--warn)" };
    if (score === 4) return { score: 80, label: "STRONG", color: "var(--ok)" };
    return { score: 100, label: "SENTINEL HARDENED", color: "var(--accent)" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      const finalImage = customImageUrl.trim() || selectedImage || currentUser.image;
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image: finalImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setProfileMessage({ type: "success", text: "Identity profile updated successfully." });
      onUserUpdated?.({ name: name.trim(), image: finalImage });
      router.refresh();
      setTimeout(() => {
        setProfileMessage(null);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setProfileMessage({ type: "error", text: msg });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
          revokeOtherSessions: revokeSessions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordMessage({ type: "success", text: data.message || "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
      setTimeout(() => {
        setPasswordMessage(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setPasswordMessage({ type: "error", text: msg });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const displayAvatar =
    customImageUrl.trim() ||
    selectedImage ||
    currentUser.image ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || "Sentinel"}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          backgroundColor: "var(--ground)",
          border: "1px solid var(--hair-10)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Terminal Header */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--hair-06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--panel-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span className="status-dot pulse" style={{ width: "7px", height: "7px" }} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink)",
                fontWeight: 500,
              }}
            >
              OPERATOR ACCOUNT & SECURITY // SENTINEL-AI
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close dialog"
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--hair-06)",
            backgroundColor: "var(--ground-secondary)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: activeTab === "profile" ? "var(--ground)" : "transparent",
              border: "none",
              borderBottom: activeTab === "profile" ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === "profile" ? "var(--ink)" : "var(--muted)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease",
            }}
          >
            <User style={{ width: "13px", height: "13px", color: activeTab === "profile" ? "var(--accent)" : undefined }} />
            <span>EDIT PROFILE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("password")}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: activeTab === "password" ? "var(--ground)" : "transparent",
              border: "none",
              borderBottom: activeTab === "password" ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === "password" ? "var(--ink)" : "var(--muted)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.15s ease",
            }}
          >
            <KeyRound style={{ width: "13px", height: "13px", color: activeTab === "password" ? "var(--accent)" : undefined }} />
            <span>CHANGE PASSWORD</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {/* ═════════ TAB 1: PROFILE ═════════ */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Profile Header Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  padding: "1rem",
                  border: "1px solid var(--hair-06)",
                  backgroundColor: "var(--panel-card)",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={displayAvatar}
                    alt="Active Operator Avatar"
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      border: "2px solid var(--accent)",
                      backgroundColor: "var(--ground)",
                    }}
                  />
                  <span
                    className="status-dot pulse"
                    style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "8px", height: "8px" }}
                  />
                </div>

                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        padding: "2px 6px",
                        border: "1px solid var(--hair-10)",
                        color: "var(--accent)",
                        backgroundColor: "var(--accent-subtle)",
                      }}
                    >
                      LEVEL-4 SEC-OPS
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        color: "var(--ok)",
                      }}
                    >
                      ● ACTIVE SESSION
                    </span>
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
                    {name || currentUser.name || "Operator"}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--muted)",
                      margin: 0,
                    }}
                  >
                    {currentUser.email || "user@sentinel.internal"}
                  </p>
                </div>
              </div>

              {/* Avatar Preset Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.625rem",
                  }}
                >
                  SELECT CYBER AVATAR PRESET
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: "0.625rem",
                  }}
                >
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedImage === preset.url && !customImageUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedImage(preset.url);
                          setCustomImageUrl("");
                        }}
                        style={{
                          position: "relative",
                          padding: "4px",
                          background: isSelected ? "var(--accent-subtle)" : "var(--panel-card)",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid var(--hair-06)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s ease",
                        }}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          style={{ width: "36px", height: "36px", objectFit: "cover" }}
                        />
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "8px",
                            color: isSelected ? "var(--ink)" : "var(--muted)",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: "100%",
                          }}
                        >
                          {preset.id.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Avatar URL */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  OR CUSTOM IMAGE URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    backgroundColor: "var(--panel-card)",
                    border: "1px solid var(--hair-10)",
                    color: "var(--ink)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Display Name Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  OPERATOR CALLSIGN / FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    backgroundColor: "var(--panel-card)",
                    border: "1px solid var(--hair-10)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Email (Readonly) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  REGISTERED EMAIL (LOCKED)
                </label>
                <div
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--hair-06)",
                    color: "var(--muted)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{currentUser.email || "No email assigned"}</span>
                  <Lock style={{ width: "12px", height: "12px", color: "var(--muted)" }} />
                </div>
              </div>

              {/* Notification Banner */}
              {profileMessage && (
                <div
                  style={{
                    padding: "0.625rem 0.75rem",
                    border: `1px solid ${profileMessage.type === "success" ? "var(--ok)" : "var(--crit)"}`,
                    backgroundColor: profileMessage.type === "success" ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    color: profileMessage.type === "success" ? "var(--ok)" : "var(--crit)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {profileMessage.type === "success" ? (
                    <Check style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: isSavingProfile ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
                      <span>SAVING PROFILE...</span>
                    </>
                  ) : (
                    <>
                      <Check style={{ width: "13px", height: "13px" }} />
                      <span>SAVE PROFILE CHANGES</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost"
                  style={{ justifyContent: "center" }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          )}

          {/* ═════════ TAB 2: PASSWORD ═════════ */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--hair-06)",
                  backgroundColor: "var(--panel-card)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <KeyRound style={{ width: "16px", height: "16px", color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  <p style={{ margin: "0 0 2px 0", color: "var(--ink)", fontWeight: 500 }}>
                    {hasPassword === false ? "Setup Initial Password" : "Rotate Account Password"}
                  </p>
                  <span>
                    {hasPassword === false
                      ? "You signed in via Google OAuth. Set a password below to enable direct email & password authentication."
                      : "Rotating your master password invalidates compromised tokens and enhances perimeter safety."}
                  </span>
                </div>
              </div>

              {/* Current Password (if user already has one) */}
              {hasPassword !== false && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    CURRENT MASTER PASSWORD
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      style={{
                        width: "100%",
                        padding: "0.625rem 2.25rem 0.625rem 0.75rem",
                        backgroundColor: "var(--panel-card)",
                        border: "1px solid var(--hair-10)",
                        color: "var(--ink)",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      {showCurrentPass ? <EyeOff style={{ width: "14px", height: "14px" }} /> : <Eye style={{ width: "14px", height: "14px" }} />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  NEW CIPHER PASSWORD (MIN 8 CHARS)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create robust passphrase"
                    style={{
                      width: "100%",
                      padding: "0.625rem 2.25rem 0.625rem 0.75rem",
                      backgroundColor: "var(--panel-card)",
                      border: "1px solid var(--hair-10)",
                      color: "var(--ink)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    {showNewPass ? <EyeOff style={{ width: "14px", height: "14px" }} /> : <Eye style={{ width: "14px", height: "14px" }} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
                        STRENGTH ENTROPY:
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "9px",
                          fontWeight: 600,
                          color: strength.color,
                        }}
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div style={{ height: "4px", backgroundColor: "var(--hair-06)", width: "100%", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${strength.score}%`,
                          backgroundColor: strength.color,
                          transition: "all 0.25s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  CONFIRM NEW PASSWORD
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat passphrase"
                    style={{
                      width: "100%",
                      padding: "0.625rem 2.25rem 0.625rem 0.75rem",
                      backgroundColor: "var(--panel-card)",
                      border:
                        confirmPassword && confirmPassword !== newPassword
                          ? "1px solid var(--crit)"
                          : "1px solid var(--hair-10)",
                      color: "var(--ink)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    {showConfirmPass ? <EyeOff style={{ width: "14px", height: "14px" }} /> : <Eye style={{ width: "14px", height: "14px" }} />}
                  </button>
                </div>
              </div>

              {/* Revoke sessions toggle */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={revokeSessions}
                  onChange={(e) => setRevokeSessions(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>Revoke all other active logins on other devices upon password update</span>
              </label>

              {/* Feedback Alert */}
              {passwordMessage && (
                <div
                  style={{
                    padding: "0.625rem 0.75rem",
                    border: `1px solid ${passwordMessage.type === "success" ? "var(--ok)" : "var(--crit)"}`,
                    backgroundColor: passwordMessage.type === "success" ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    color: passwordMessage.type === "success" ? "var(--ok)" : "var(--crit)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {passwordMessage.type === "success" ? (
                    <Check style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: "0.5rem",
                    cursor: isSavingPassword ? "not-allowed" : "pointer",
                  }}
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
                      <span>UPDATING CIPHER...</span>
                    </>
                  ) : (
                    <>
                      <Lock style={{ width: "13px", height: "13px" }} />
                      <span>{hasPassword === false ? "SET MASTER PASSWORD" : "CHANGE MASTER PASSWORD"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost"
                  style={{ justifyContent: "center" }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
