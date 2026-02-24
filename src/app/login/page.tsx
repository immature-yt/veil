"use client";
// src/app/login/page.tsx

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { VeilLogo } from "@/components/VeilLogo";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 gap-10 animate-fade-in">
      <VeilLogo />

      <div className="w-full">
        {/* Mode Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-veil-border mb-6 bg-veil-surface">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-mono tracking-widest uppercase transition-colors ${
                mode === m
                  ? "bg-veil-card text-veil-accent"
                  : "text-veil-textMuted hover:text-veil-text"
              }`}
            >
              {m === "login" ? "Sign In" : "Join"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <Input
              label="Your Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="How you'll appear after reveal"
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "register" ? "Min. 8 characters" : "••••••••"}
            required
          />

          {error && (
            <p className="text-veil-danger text-xs text-center animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-xl bg-veil-accent text-veil-black font-mono text-sm tracking-widest uppercase font-medium
                       hover:bg-veil-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-[0_0_20px_rgba(200,169,110,0.2)] hover:shadow-[0_0_30px_rgba(200,169,110,0.4)] transition-all"
          >
            {loading ? "···" : mode === "login" ? "Enter" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-[11px] text-veil-muted mt-6 leading-relaxed">
          By continuing, you agree to our (future) Terms of Service
          and acknowledge the anonymity rules.
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-[0.15em] uppercase text-veil-textMuted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-veil-card border border-veil-border rounded-xl px-4 py-3 text-sm text-veil-text
                   placeholder:text-veil-muted focus:outline-none focus:border-veil-accentDim
                   transition-colors font-body"
      />
    </div>
  );
}
