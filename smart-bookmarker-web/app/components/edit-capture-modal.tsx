"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../lib/api";
import type { Capture, Category, CaptureType } from "../lib/types";

type Props = {
  capture: Capture;
  categories: Category[];
  onClose: () => void;
  onUpdated: (capture: Capture) => void;
};

const CAPTURE_TYPES: CaptureType[] = ["article", "video", "pdf", "image", "github"];

export function EditCaptureModal({ capture, categories, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(capture.title ?? "");
  const [type, setType] = useState<CaptureType | "">(capture.type ?? "");
  const [categoryId, setCategoryId] = useState(capture.category_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = {};
      if (title !== (capture.title ?? "")) body.title = title || null;
      if (type !== (capture.type ?? "")) body.type = type || null;
      if (categoryId !== (capture.category_id ?? "")) {
        body.categoryId = categoryId || null;
      }

      // Always send at least one field
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const result = await apiRequest<{ data: Capture }>(`/captures/${capture.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      onUpdated(result.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Edit Bookmark</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* URL (read-only) */}
        <div className="border-b border-zinc-800 px-6 py-3">
          <p className="truncate text-xs text-zinc-500">{capture.url}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
              placeholder="Bookmark title"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CaptureType | "")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors"
              >
                <option value="">None</option>
                {CAPTURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
