"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../lib/api";
import type { Capture, Category, CaptureType } from "../lib/types";

type Props = {
  categories: Category[];
  onClose: () => void;
  onCreated: (capture: Capture) => void;
};

const CAPTURE_TYPES: CaptureType[] = ["article", "video", "pdf", "image", "github"];

export function AddCaptureModal({ categories, onClose, onCreated }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CaptureType | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = { url };
      if (title) body.title = title;
      if (type) body.type = type;
      // Note: captures don't have categoryId on create — assign via PATCH after
      // But we can PATCH right after creation if a category is chosen

      const created = await apiRequest<Capture>("/captures", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // If user selected a category, assign it
      if (categoryId) {
        const updated = await apiRequest<{ data: Capture }>(`/captures/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify({ categoryId }),
        });
        onCreated(updated.data);
      } else {
        onCreated(created);
      }

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
          <h2 className="text-base font-semibold text-white">Add Bookmark</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-300">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
              placeholder="https://example.com/article"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-300">
              Title <span className="text-zinc-600 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
              placeholder="Auto-detected if left empty"
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
                <option value="">Auto-detect</option>
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
              {loading ? "Saving…" : "Add Bookmark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
