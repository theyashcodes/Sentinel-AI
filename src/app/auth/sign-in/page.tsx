"use client";

import { useState } from "react";
import { signIn, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { QuantumFluxBackground } from "@/components/ui/quantum-flux-background";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, KeyRound, ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
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

      setSuccessMsg("Verification OTP sent! Check console / email to reset password.");
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
      setErrorMsg("Please enter both the OTP code and your new password.");
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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-neutral-950 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Quantum Particle Background */}
      <QuantumFluxBackground />

      <div className="relative z-10 w-full max-w-md my-auto">
        {/* BIG BOLD HERO BRAND HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center mb-8 text-center"
        >
          {/* Cyber Shield Icon Badge */}
          <div className="relative flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-xl group">
            <Shield className="w-8 h-8 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: "6s" }} />
          </div>

          {/* BADA BADA SENTINEL AI TYPOGRAPHY */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            SENTINEL AI
          </h1>

          {/* Subtitle & Status Indicator */}
          <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-cyan-500/20 text-xs font-mono text-cyan-400/90 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold tracking-wide">SYSTEM ONLINE</span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400">QUANTUM THREAT SHIELD</span>
          </div>
        </motion.div>

        {/* GLASSMORPHISM QUANTUM CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="relative overflow-hidden bg-neutral-900/70 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_50px_-10px_rgba(6,182,212,0.25)] text-neutral-100 rounded-2xl">
            {/* Top Glow Border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-center text-neutral-100">
                {mode === "sign-in" && "Sign In to Access Shield"}
                {mode === "forgot-password" && "Reset Security Key"}
                {mode === "verify-otp" && "Verify OTP Authorization"}
              </CardTitle>
              <CardDescription className="text-neutral-400 text-center text-sm">
                {mode === "sign-in" && "Enter your credentials to access your security portal"}
                {mode === "forgot-password" && "Enter your registered email to receive a recovery code"}
                {mode === "verify-otp" && "Enter the OTP code sent to your email with a new password"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {/* Alert Feedback */}
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MODE 1: SIGN IN */}
              {mode === "sign-in" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                      Identity / Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400/70" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="agent@sentinel.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-neutral-100 placeholder:text-neutral-600 rounded-xl h-11 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                        Passcode
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot-password");
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400/70" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-neutral-100 placeholder:text-neutral-600 rounded-xl h-11 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 mt-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all duration-300 group"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        INITIALIZE SESSION
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* MODE 2: FORGOT PASSWORD */}
              {mode === "forgot-password" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                      Registered Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400/70" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="agent@sentinel.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 text-neutral-100 placeholder:text-neutral-600 rounded-xl h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      {loading ? "Transmitting OTP..." : "REQUEST OTP CODE"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setMode("sign-in");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="w-full text-neutral-400 hover:text-white"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                </form>
              )}

              {/* MODE 3: VERIFY OTP & RESET */}
              {mode === "verify-otp" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                      OTP Code
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-purple-400/80" />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="pl-10 bg-neutral-950/80 border-neutral-800 focus:border-purple-500 text-neutral-100 font-mono tracking-widest text-lg rounded-xl h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                      New Passcode
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400/70" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 text-neutral-100 rounded-xl h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.35)]"
                    >
                      {loading ? "Updating Security Key..." : "CONFIRM RESET & SIGN IN"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setMode("sign-in");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="w-full text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>

            {mode === "sign-in" && (
              <CardFooter className="flex flex-col space-y-3 text-center text-xs text-neutral-400 border-t border-neutral-800/80 pt-4">
                <div>
                  Need an authorized account?{" "}
                  <Link href="/auth/sign-up" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
                    Register New Agent
                  </Link>
                </div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
