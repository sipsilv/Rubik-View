"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Lock, Mail, ArrowRight, X, User, Phone, MapPin, MessageSquare } from "lucide-react";
import RubikCube from "@/components/RubikCube";
import SimpleSpinner from "@/components/SimpleSpinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    age: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    message: "",
  });
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
                    type="text"
                    placeholder="Email, UserID, or Phone Number"
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
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setShowContactForm(true)}
                className="text-sky-400 cursor-pointer hover:underline"
              >
                Contact Admin
              </button>
            </p>
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

      {/* Contact Admin Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/50 p-6 space-y-6 bg-slate-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-sky-400" />
                <h2 className="text-2xl font-bold text-white">Team will contact you</h2>
              </div>
              <button
                onClick={() => {
                  setShowContactForm(false);
                  setContactMessage(null);
                  setContactForm({
                    full_name: "",
                    email: "",
                    phone_number: "",
                    age: "",
                    address_line1: "",
                    address_line2: "",
                    city: "",
                    state: "",
                    postal_code: "",
                    country: "",
                    message: "",
                  });
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {contactMessage && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  contactMessage.type === "success"
                    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                    : "border-red-500/40 text-red-300 bg-red-500/10"
                }`}
              >
                {contactMessage.text}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setContactLoading(true);
                setContactMessage(null);
                try {
                  const payload = {
                    ...contactForm,
                    age: contactForm.age ? Number(contactForm.age) : undefined,
                  };
                  const response = await api.post("/auth/contact-admin", payload);
                  setContactMessage({
                    type: "success",
                    text: `Request submitted successfully! Your UserID is: ${response.data.userid}. An admin will review your request and enable your account.`,
                  });
                  setTimeout(() => {
                    setShowContactForm(false);
                    setContactForm({
                      full_name: "",
                      email: "",
                      phone_number: "",
                      age: "",
                      address_line1: "",
                      address_line2: "",
                      city: "",
                      state: "",
                      postal_code: "",
                      country: "",
                      message: "",
                    });
                    setContactMessage(null);
                  }, 5000);
                } catch (err: any) {
                  setContactMessage({
                    type: "error",
                    text: err.response?.data?.detail || "Failed to submit request. Please try again.",
                  });
                } finally {
                  setContactLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Full Name <span className="text-rose-400">*</span></label>
                  <Input
                    required
                    value={contactForm.full_name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Email <span className="text-rose-400">*</span></label>
                  <Input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Phone Number <span className="text-rose-400">*</span></label>
                  <Input
                    required
                    value={contactForm.phone_number}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="+91 90000 00000"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Age <span className="text-rose-400">*</span></label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={contactForm.age}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, age: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">City</label>
                  <Input
                    value={contactForm.city}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">State</label>
                  <Input
                    value={contactForm.state}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, state: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Country</label>
                  <Input
                    value={contactForm.country}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, country: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 mb-1 block">Postal Code</label>
                  <Input
                    value={contactForm.postal_code}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    placeholder="560001"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 mb-1 block">Address</label>
                <Input
                  value={contactForm.address_line1}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                  className="bg-slate-900/50 border-slate-700 text-white mb-2"
                  placeholder="Street / Building"
                />
                <Input
                  value={contactForm.address_line2}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                  className="bg-slate-900/50 border-slate-700 text-white"
                  placeholder="Apartment / Landmark"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 mb-1 block">Message (Optional)</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
                  rows={3}
                  placeholder="Any additional information..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={contactLoading}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 text-white"
                >
                  {contactLoading ? <SimpleSpinner size={16} /> : "Submit Request"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowContactForm(false);
                    setContactMessage(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
