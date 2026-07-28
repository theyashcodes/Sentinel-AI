"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function UrlScannerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/scans/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to scan URL");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "SAFE": return "text-emerald-500";
      case "LOW": return "text-blue-500";
      case "MEDIUM": return "text-yellow-500";
      case "HIGH": return "text-orange-500";
      case "CRITICAL": return "text-red-500";
      default: return "text-neutral-400";
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">URL Scanner</h1>
        <p className="text-neutral-400">Deep AI analysis of URLs, WHOIS, DNS, and HTTP headers.</p>
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle>Scan a new URL</CardTitle>
          <CardDescription>Enter a suspicious link to analyze it instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="url" className="sr-only">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/login"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-neutral-950 border-neutral-800 font-mono"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-32">
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-950/50 border border-red-900 text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-neutral-900 border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-1">Target</h3>
                <p className="font-mono text-lg">{result.normalized}</p>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-medium text-neutral-400 mb-1">Risk Level</h3>
                <p className={`text-2xl font-bold ${getRiskColor(result.riskLevel)}`}>
                  {result.riskLevel}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-2">AI Reasoning</h3>
              <p className="text-sm text-neutral-200 leading-relaxed">{result.reasoning}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-2">Key Indicators</h3>
              {result.indicators && result.indicators.length > 0 ? (
                <ul className="space-y-1">
                  {result.indicators.map((indicator: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 italic">No malicious indicators found.</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
