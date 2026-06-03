"use client";

import { useState } from "react";
import { pixelLead } from "@/lib/pixel";

interface Props {
  onComplete: (data: { name: string; email: string; contactId: string }) => void;
}

export default function LeadCapture({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      // Determine source from URL params
      const params = new URLSearchParams(window.location.search);
      const source = (() => {
        const s = params.get("src") ?? "";
        if (s === "fb") return "Facebook Ad";
        if (s === "postcard") return "Postcard";
        if (s === "referral") return "Referral";
        return "Organic";
      })();

      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), source }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save lead");

      pixelLead();
      onComplete({ name: name.trim(), email: email.trim(), contactId: data.contactId });
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="get-quote" className="bg-bolt-black py-16 sm:py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-bolt-yellow/10 border border-bolt-yellow/30 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-bolt-yellow" />
            <span className="text-bolt-yellow text-sm font-medium">Step 1 of 5</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl uppercase text-white mb-4">
            Get Your <span className="text-bolt-yellow">Custom Quote</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Enter your info to unlock pricing and see your doors in any color.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bolt-gray rounded-2xl p-8 space-y-5">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              First Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bolt-yellow transition-colors"
              autoComplete="given-name"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bolt-yellow transition-colors"
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-60 text-black font-bold text-lg py-4 rounded-xl transition-colors"
          >
            {loading ? "Saving..." : "See My Pricing →"}
          </button>

          <p className="text-center text-gray-500 text-xs">
            No spam. Just your quote and how to book.
          </p>
        </form>
      </div>
    </section>
  );
}
