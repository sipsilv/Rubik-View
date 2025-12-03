"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Lock, Mail, ArrowRight } from "lucide-react";
import RubikCube from "@/components/RubikCube";
import SimpleSpinner from "@/components/SimpleSpinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const response = await api.post("/auth/token", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("loginTimestamp", Date.now().toString());

      document.cookie = `token=${response.data.access_token}; path=/;`;
      router.push("/dashboard");
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage = (err as any).response?.data?.detail || "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="glass-panel w-full max-w-md p-8 rounded-2xl space-y-8 border-slate-700/50">
          {/* Logo at top - solving animation */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <RubikCube size={55} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
              <p className="text-slate-400 mt-1">Enter your credentials to access Rubik View.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-sky-500/20 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-sky-500/20 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-500/20 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <SimpleSpinner size={20} />
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-500">Don&apos;t have an account? <span className="text-sky-400 cursor-pointer hover:underline">Contact Admin</span></p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden border-l border-slate-800">
        {/* Abstract Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-900 to-slate-900"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative z-10 text-center space-y-8 p-12 max-w-lg">
          <div className="inline-flex items-center justify-center">
            <RubikCube size={130} />
          </div>
          <h2 className="text-5xl font-bold text-white tracking-tight">
            Rubik <span className="text-slate-400">View</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Real-time analytics, AI-driven predictions, and institutional-grade data at your fingertips.
          </p>
        </div>
      </div>
    </div>
  );
}
