"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pixelLead } from "@/lib/pixel";

export default function LandingLeadCapture() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !email.trim()) {
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
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          source,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save lead");

      pixelLead();

      localStorage.setItem(
        "bolt_lead",
        JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          contactId: data.contactId,
        })
      );

      router.push("/quote");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="get-quote" className="bg-bolt-black py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left: form */}
          <div>
            <h2 className="font-display text-4xl sm:text-5xl uppercase text-white mb-3">
              Get Your <span className="text-bolt-yellow">Custom Quote</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              See your exact price, preview your color on your home, and book online — takes less than 10 minutes.
            </p>

            <form onSubmit={handleSubmit} className="bg-[#111111] border border-white/10 rounded-2xl p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sarah"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bolt-yellow transition-colors"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Johnson"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bolt-yellow transition-colors"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-bolt-yellow transition-colors"
                  autoComplete="email"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bolt-yellow hover:bg-bolt-yellow-dark disabled:opacity-60 text-black font-bold text-lg py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : (
                  <>
                    Get My Quote
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-xs">No spam. Just your quote and how to book.</p>
            </form>
          </div>

          {/* Right: mini proof strip */}
          <div className="lg:pt-24">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-bolt-yellow" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-white text-lg leading-snug mb-3">
                &ldquo;Best decision we made for our curb appeal. The color we picked looks incredible and the whole process took maybe 15 minutes.&rdquo;
              </p>
              <p className="text-gray-400 text-sm">— Sarah M., Haslet</p>
            </div>

            <div className="mt-6 bg-[#111111] border border-white/10 rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-bolt-yellow" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-white text-lg leading-snug mb-3">
                &ldquo;From quote to completion in one week. Professional crew, no mess left behind.&rdquo;
              </p>
              <p className="text-gray-400 text-sm">— David R., Keller</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
