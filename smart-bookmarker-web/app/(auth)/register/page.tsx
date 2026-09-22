"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await register(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-white">Create an account</h2>

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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-zinc-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
            placeholder="Min. 8 characters"
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
