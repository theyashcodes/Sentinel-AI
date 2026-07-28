"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { QuantumFluxBackground } from "@/components/ui/quantum-flux-background";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      setLoading(false);

      if (result.error) {
        setErrorMsg(result.error.message ?? "Registration failed. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setErrorMsg("An unexpected registration error occurred.");
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
            <span className="text-neutral-400 font-normal">AGENT REGISTRATION</span>
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
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-center text-neutral-100">
                Register New Agent
              </CardTitle>
              <CardDescription className="text-neutral-400 text-center text-sm">
                Initialize your security clearance on Sentinel AI
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
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
              </AnimatePresence>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                    Agent Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-purple-400/80" />
                    <Input
                      id="name"
                      placeholder="Commander Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 text-neutral-100 placeholder:text-neutral-600 rounded-xl h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                    Email Address
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-neutral-300">
                    Security Passcode
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400/70" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-neutral-950/80 border-neutral-800 focus:border-cyan-500 text-neutral-100 placeholder:text-neutral-600 rounded-xl h-11"
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
                  className="w-full h-11 mt-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all duration-300 group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Clearance...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      INITIALIZE CLEARANCE
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 text-center text-xs text-neutral-400 border-t border-neutral-800/80 pt-4">
              <div>
                Already have security clearance?{" "}
                <Link href="/auth/sign-in" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
