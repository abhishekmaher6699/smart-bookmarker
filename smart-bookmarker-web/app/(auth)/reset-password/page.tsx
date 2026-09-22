"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "../../lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl text-center">
        <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-zinc-400 hover:text-white">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-white">Set new password</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-zinc-300">
            New Password
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
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl border border-zinc-800 bg-zinc-900 animate-pulse" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
