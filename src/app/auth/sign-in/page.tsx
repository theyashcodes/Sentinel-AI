"use client";

import { useState } from "react";
import { signIn, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuantumFluxBackground } from "@/components/ui/quantum-flux-background";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Mail, Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignInPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [otp,      setOtp]      = useState("");
  const [remember, setRemember] = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [mode,     setMode]     = useState<"sign-in" | "forgot" | "verify">("sign-in");

  const router = useRouter();

  const errMsg = (e: { message?: string; code?: string } | null) =>
    e?.message ?? e?.code ?? "Unable to authenticate. Please try again.";

  /* ── Sign In ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { error: err } = await signIn.email({ email, password });
      if (err) { setError(errMsg(err)); return; }
      router.push("/dashboard");
    } catch { setError("Unexpected error. Please try again."); }
    finally   { setLoading(false); }
  };

  /* ── Send OTP ── */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { error: err } = await authClient.emailOtp.sendVerificationOtp({
        email, type: "forget-password",
      });
      if (err) { setError(errMsg(err)); return; }
      setSuccess("OTP sent! Check your email / dev console.");
      setMode("verify");
    } catch { setError("Failed to send OTP. Please try again."); }
    finally   { setLoading(false); }
  };

  /* ── Verify OTP & Reset ── */
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password) { setError("Fill in both the OTP and new password."); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token: otp });
      if (err) { setError(errMsg(err)); return; }
      setSuccess("Password reset! You can now sign in.");
      setMode("sign-in"); setPassword("");
    } catch { setError("Reset failed. Check your OTP and retry."); }
    finally   { setLoading(false); }
  };

  const goMode = (m: typeof mode) => { setMode(m); setError(null); setSuccess(null); };

  /* ─────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden">

      {/* Force-field particle canvas */}
      <QuantumFluxBackground />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-60"
        style={{ background: "linear-gradient(to bottom, #000 0%, transparent 30%, transparent 70%, #000 100%)" }}
      />

      {/* ── Card ── */}
      <main className="relative z-20 w-full max-w-[420px] px-5 py-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] shadow-2xl p-9 space-y-7"
          style={{
            background:      "rgba(10,10,10,0.45)",
            backdropFilter:  "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border:          "1px solid rgba(255,255,255,0.10)",
          }}
        >

          {/* ── Header ── */}
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-1"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <Layers className="w-5 h-5 text-white" />
            </div>

            <h1 className="text-[22px] font-bold tracking-tight text-white title-font uppercase leading-tight">
              SENTINEL-AI
            </h1>
            <p className="text-[13px] text-gray-400 font-light">
              {mode === "sign-in" && "AI Security Platform"}
              {mode === "forgot"  && "Reset your access key"}
              {mode === "verify"  && "Enter OTP authorization"}
            </p>
          </div>

          {/* ── Alerts ── */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 text-[12px] text-red-400 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.div>
            )}
            {success && (
              <motion.div key="ok"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 text-[12px] text-emerald-400 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════ MODE: SIGN IN ══════════════ */}
          {mode === "sign-in" && (
            <form onSubmit={handleSignIn} className="space-y-5">

              {/* Email */}
              <div className="space-y-[5px]">
                <label htmlFor="si-email"
                  className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500 ml-[2px]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-gray-500 pointer-events-none" />
                  <input id="si-email" type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="auth-input pl-11"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-[5px]">
                <div className="flex justify-between items-center ml-[2px] mr-[2px]">
                  <label htmlFor="si-pwd"
                    className="text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500">
                    Password
                  </label>
                  <button type="button" onClick={() => goMode("forgot")}
                    className="text-[11px] uppercase tracking-[0.12em] text-gray-500 hover:text-white transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-gray-500 pointer-events-none" />
                  <input id="si-pwd" type={showPwd ? "text" : "password"} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input pl-11 pr-11"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-white"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }} />
                <label htmlFor="remember" className="text-[12px] text-gray-400 cursor-pointer select-none">
                  Stay logged in for 30 days
                </label>
              </div>

              {/* CTA */}
              <button type="submit" disabled={loading}
                className="auth-btn-primary group">
                <span className="relative z-10">
                  {loading ? "Authenticating…" : "Continue Access"}
                </span>
                {/* Shimmer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent
                  -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms]" />
              </button>
            </form>
          )}

          {/* ══════════════ MODE: FORGOT ══════════════ */}
          {mode === "forgot" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-[5px]">
                <label htmlFor="fo-email"
                  className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500 ml-[2px]">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-gray-500 pointer-events-none" />
                  <input id="fo-email" type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="auth-input pl-11" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="auth-btn-primary group">
                <span className="relative z-10">{loading ? "Sending OTP…" : "Request OTP Code"}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent
                  -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms]" />
              </button>
              <button type="button" onClick={() => goMode("sign-in")}
                className="w-full text-[12px] text-gray-500 hover:text-white transition-colors py-1">
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* ══════════════ MODE: VERIFY OTP ══════════════ */}
          {mode === "verify" && (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-[5px]">
                <label htmlFor="otp-code"
                  className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500 ml-[2px]">
                  OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-gray-500 pointer-events-none" />
                  <input id="otp-code" type="text" required
                    value={otp} onChange={e => setOtp(e.target.value)}
                    placeholder="123456"
                    className="auth-input pl-11 font-mono tracking-[0.2em] text-[16px]" />
                </div>
              </div>
              <div className="space-y-[5px]">
                <label htmlFor="new-pwd"
                  className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500 ml-[2px]">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-gray-500 pointer-events-none" />
                  <input id="new-pwd" type={showPwd ? "text" : "password"} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input pl-11 pr-11" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="auth-btn-primary group">
                <span className="relative z-10">{loading ? "Resetting…" : "Confirm & Sign In"}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent
                  -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms]" />
              </button>
              <button type="button" onClick={() => goMode("sign-in")}
                className="w-full text-[12px] text-gray-500 hover:text-white transition-colors py-1">
                ← Cancel
              </button>
            </form>
          )}

          {/* ── Social divider (sign-in only) ── */}
          {mode === "sign-in" && (
            <>
              <div className="relative flex items-center">
                <div className="flex-grow border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }} />
                <span className="mx-4 text-[10px] uppercase tracking-[0.14em] text-gray-600">or authorized with</span>
                <div className="flex-grow border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Google */}
                <button type="button" className="auth-social-btn">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span className="text-[12px] text-white">Google</span>
                </button>

                {/* GitHub */}
                <button type="button" className="auth-social-btn">
                  <svg className="w-4 h-4 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
                      0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466
                      -.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832
                      .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688
                      -.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844
                      c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651
                      .64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855
                      0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span className="text-[12px] text-white">GitHub</span>
                </button>
              </div>
            </>
          )}

          {/* ── Footer ── */}
          <p className="text-center text-[12px] text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-white hover:underline font-medium ml-1">
              Request Access
            </Link>
          </p>

        </motion.div>
      </main>

      {/* ── Corner Status Badge ── */}
      <div className="fixed bottom-7 right-7 z-30 hidden md:block pointer-events-none">
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full text-[10px] font-mono text-gray-400"
          style={{
            background:          "rgba(10,10,10,0.60)",
            backdropFilter:      "blur(10px)",
            WebkitBackdropFilter:"blur(10px)",
            border:              "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 animate-pulse" />
            ENCRYPTION ACTIVE
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span>NODE: LAX-01</span>
        </div>
      </div>

      {/* Shared input styles via <style> tag (SSR-safe) */}
      <style>{`
        .auth-input {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          font-size: 14px;
          color: white;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.10);
          transition: border-color 0.2s, background 0.2s;
          outline: none;
          padding-right: 16px;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.18); }
        .auth-input:focus {
          border-color: rgba(255,255,255,0.30);
          background: rgba(255,255,255,0.05);
        }
        .auth-btn-primary {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 48px;
          border-radius: 12px;
          background: white;
          color: black;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          cursor: pointer;
        }
        .auth-btn-primary:hover { background: #e5e5e5; }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.05);
          transition: background 0.2s;
          cursor: pointer;
        }
        .auth-social-btn:hover { background: rgba(255,255,255,0.10); }
      `}</style>
    </div>
  );
}
