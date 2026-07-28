"use client";

import { useState } from "react";
import { signIn, emailOtp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  
  // "sign-in" | "forgot-password" | "verify-otp"
  const [mode, setMode] = useState<"sign-in" | "forgot-password" | "verify-otp">("sign-in");
  
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({
        email,
        password
    });
    setLoading(false);

    if (error) {
        alert(error.message);
    } else {
        router.push("/dashboard");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email");
    setLoading(true);
    
    // Send OTP for password reset
    const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password"
    });
    
    setLoading(false);
    if (error) {
        alert(error.message);
    } else {
        alert("If an account exists, an OTP has been sent. Check the console for the mocked OTP.");
        setMode("verify-otp");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password) return alert("Please fill all fields");
    setLoading(true);

    const { error } = await authClient.resetPassword({
        newPassword: password,
        token: otp // Better auth emailOTP plugin accepts the OTP as the token for password resets
    });

    setLoading(false);
    if (error) {
        alert(error.message);
    } else {
        alert("Password reset successfully. You can now log in.");
        setMode("sign-in");
        setPassword("");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 p-4">
      <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 text-neutral-50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
             {mode === "sign-in" ? "Sign in to Sentinel AI" : 
              mode === "forgot-password" ? "Forgot Password" : 
              "Reset Password"}
          </CardTitle>
          <CardDescription className="text-neutral-400 text-center">
            {mode === "sign-in" ? "Enter your email below to login to your account" :
             mode === "forgot-password" ? "Enter your email to receive an OTP" :
             "Enter the OTP sent to your email and your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "sign-in" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setMode("forgot-password")} className="text-sm text-neutral-400 hover:text-white">
                    Forgot Password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-neutral-950 border-neutral-800"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}

          {mode === "forgot-password" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-neutral-950 border-neutral-800"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setMode("sign-in")} className="w-full text-black">
                    Back to Sign In
                  </Button>
              </div>
            </form>
          )}

          {mode === "verify-otp" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="bg-neutral-950 border-neutral-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-neutral-950 border-neutral-800"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Resetting Password..." : "Reset Password"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setMode("sign-in")} className="w-full text-black">
                    Cancel
                  </Button>
              </div>
            </form>
          )}
        </CardContent>
        {mode === "sign-in" && (
          <CardFooter className="flex flex-col space-y-4 text-center text-sm text-neutral-400">
            <div>
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="text-white hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
