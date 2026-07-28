"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const result = await signUp.email({
      name,
      email,
      password,
    });

    console.log("SIGNUP RESULT:", result);

    setLoading(false);

    if (result.error) {
      console.error("SIGNUP ERROR:", result.error);
      alert(JSON.stringify(result.error, null, 2));
      return;
    }

    router.push("/dashboard");
  } catch (err) {
    setLoading(false);
    console.error("CATCH ERROR:", err);

    if (err instanceof Error) {
      alert(err.message);
    } else {
      alert(JSON.stringify(err));
    }
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 p-4">
      <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 text-neutral-50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Create an account</CardTitle>
          <CardDescription className="text-neutral-400 text-center">
            Enter your details to register for Sentinel AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-neutral-950 border-neutral-800"
                required
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
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
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center text-sm text-neutral-400">
          <div>
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-white hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
