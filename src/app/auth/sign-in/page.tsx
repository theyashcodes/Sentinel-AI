"use client";

import { useState } from "react";
import { signIn, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuantumFluxBackground } from "@/components/ui/quantum-flux-background";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Mail, Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // "sign-in" | "forgot-password" | "verify-otp"
  const [mode, setMode] = useState<"sign-in" | "forgot-password" | "verify-otp">("sign-in");

  const router = useRouter();

  const getErrorMessage = (error: { message?: string; code?: string } | null) =>
    error?.message ?? error?.code ?? "Unable to authenticate. Please try again.";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await signIn.email({
        email,
        password,
      });

      if (error) {
        setErrorMsg(getErrorMessage(error));
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });

      if (error) {
        setErrorMsg(getErrorMessage(error));
        return;
      }

      setSuccessMsg("Verification OTP code sent! Check your email / console.");
      setMode("verify-otp");
    } catch (err) {
      setErrorMsg("Failed to send OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password) {
      setErrorMsg("Please enter both your OTP code and new password.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: otp,
      });

      if (error) {
        setErrorMsg(getErrorMessage(error));
        return;
      }

      setSuccessMsg("Password updated successfully! You can now sign in.");
      setMode("sign-in");
      setPassword("");
    } catch (err) {
      setErrorMsg("Failed to reset password. Check your OTP code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden selection:bg-white selection:text-black">
      {/* Force Field Background */}
      <QuantumFluxBackground />

      {/* Overlay Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none z-10 opacity-60" />

      {/* Main Content Card */}
      <main className="relative z-20 w-full max-w-md px-6 my-auto py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-[rgba(10,10,10,0.5)] backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl space-y-8"
        >
          {/* Logo / Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-2">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white title-font uppercase">
              SENTINEL AI
            </h1>
            <p className="text-sm text-gray-400 font-light">
              {mode === "sign-in" && "Sign in to access your security dashboard"}
              {mode === "forgot-password" && "Reset your security access key"}
              {mode === "verify-otp" && "Enter authorization OTP code"}
            </p>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MODE 1: SIGN IN FORM */}
          {mode === "sign-in" && (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot-password");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 accent-white cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none">
                  Stay logged in for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-12 bg-white text-black font-semibold rounded-xl text-sm hover:bg-gray-200 transition-all duration-300 flex items-center justify-center overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? "Authenticating..." : "Continue Access"}
                  {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </form>
          )}

          {/* MODE 2: FORGOT PASSWORD */}
          {mode === "forgot-password" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                  Registered Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full h-12 bg-white text-black font-semibold rounded-xl text-sm hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? "Sending OTP..." : "Request OTP Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full h-11 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: VERIFY OTP & RESET */}
          {mode === "verify-otp" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="otp" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                  OTP Code
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-all rounded-xl text-sm font-mono tracking-widest text-white placeholder:text-gray-600"
                    placeholder="123456"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full h-12 bg-white text-black font-semibold rounded-xl text-sm hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                >
                  {loading ? "Updating Password..." : "Confirm & Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full h-11 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Social Login Divider */}
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-white/5" />
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-gray-600">
              or authorized with
            </span>
            <div className="flex-grow border-t border-white/5" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs text-white transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs text-white transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Footer Link */}
          <p className="text-center text-xs text-gray-500 pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-white hover:underline font-medium ml-1">
              Request Access
            </Link>
          </p>
        </motion.div>
      </main>

      {/* Corner Stats Badge */}
      <div className="fixed bottom-8 right-8 z-30 pointer-events-none hidden md:block">
        <div className="bg-[rgba(10,10,10,0.6)] backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[10px] text-gray-400 font-mono flex items-center gap-4 shadow-xl">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ENCRYPTION ACTIVE
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span>NODE: SENTINEL-01</span>
        </div>
      </div>
    </div>
  );
}
