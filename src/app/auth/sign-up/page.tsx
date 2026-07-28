"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuantumFluxBackground } from "@/components/ui/quantum-flux-background";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, User, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

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
              Request agent access clearance
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
          </AnimatePresence>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                  placeholder="Commander Alex"
                  required
                />
              </div>
            </div>

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
              <label htmlFor="password" className="block text-[11px] uppercase tracking-widest text-gray-500 font-semibold ml-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] focus:border-[rgba(255,255,255,0.3)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none transition-all rounded-xl text-sm text-white placeholder:text-gray-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 bg-white text-black font-semibold rounded-xl text-sm hover:bg-gray-200 transition-all duration-300 flex items-center justify-center overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>

          {/* Footer Link */}
          <p className="text-center text-xs text-gray-500 pt-2">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-white hover:underline font-medium ml-1">
              Sign In
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
