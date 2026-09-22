"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-5 sm:p-8">
      <p className="text-sm text-zinc-500">Account</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Settings</h1>

      <section className="mt-7 rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-800 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800"><UserRound size={17} className="text-zinc-300" /></div>
          <div><h2 className="font-medium text-white">Profile</h2><p className="text-sm text-zinc-500">Your signed-in account</p></div>
        </div>
        <div className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Email address</p><p className="mt-1 text-sm text-zinc-200">{user?.email}</p></div>
      </section>

      <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3 p-5"><ShieldCheck size={20} className="text-zinc-400" /><div><h2 className="font-medium text-white">Privacy</h2><p className="mt-1 text-sm text-zinc-500">Bookmarks are private to your account.</p></div></div>
      </section>

      <section className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3 border-b border-zinc-800 p-5"><KeyRound size={20} className="text-zinc-400" /><div><h2 className="font-medium text-white">Change password</h2><p className="mt-1 text-sm text-zinc-500">Use at least 8 characters and keep it unique.</p></div></div>
        <form onSubmit={handleChangePassword} className="space-y-4 p-5">
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-sm text-zinc-300">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm text-zinc-300">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-zinc-300">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500" />
            </div>
          </div>
          {passwordError && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">{passwordError}</p>}
          {passwordSuccess && <p className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-400">{passwordSuccess}</p>}
          <button type="submit" disabled={changingPassword} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">{changingPassword && <Loader2 size={15} className="animate-spin" />}{changingPassword ? "Changing password" : "Change password"}</button>
        </form>
      </section>

      <section className="mt-5 rounded-xl border border-red-950 bg-zinc-900 p-5">
        <h2 className="font-medium text-white">Sign out</h2>
        <p className="mt-1 text-sm text-zinc-500">End this session on this browser.</p>
        <button onClick={() => void logout()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:bg-red-950 hover:text-red-300"><LogOut size={15} /> Sign out</button>
      </section>
    </div>
  );
}
