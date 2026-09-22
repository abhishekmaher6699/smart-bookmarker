"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl text-center">
        <div className="mb-4 text-4xl">📬</div>
        <h2 className="mb-2 text-xl font-semibold text-white">Check your inbox</h2>
        <p className="text-sm text-zinc-400">
          If an account with that email exists, we&apos;ve sent a password reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-white">Forgot password?</h2>
      <p className="mb-6 text-sm text-zinc-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-white py-2.5 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        <Link href="/login" className="hover:text-white transition-colors">
          ← Back to login
        </Link>
      </p>
    </div>
  );
}
