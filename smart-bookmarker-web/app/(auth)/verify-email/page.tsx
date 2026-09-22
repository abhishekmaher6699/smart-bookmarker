"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiRequest } from "../../lib/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email address…");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("error");
      setMessage("This verification link is invalid or incomplete.");
      return;
    }

    apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => {
        setStatus("success");
        setMessage("Your email address has been verified.");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "This verification link is invalid or expired.");
      });
  }, []);

  const Icon = status === "verifying" ? Loader2 : status === "success" ? CheckCircle2 : XCircle;
  const iconClass = status === "verifying" ? "animate-spin text-zinc-400" : status === "success" ? "text-emerald-400" : "text-red-400";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
      <Icon size={32} className={`mx-auto ${iconClass}`} />
      <h2 className="mt-4 text-xl font-semibold text-white">{status === "verifying" ? "Verifying email" : status === "success" ? "Email verified" : "Verification failed"}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
      {status !== "verifying" && <Link href="/login" className="mt-6 inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">Go to login</Link>}
    </div>
  );
}
