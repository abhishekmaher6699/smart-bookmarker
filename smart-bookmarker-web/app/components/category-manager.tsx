"use client";

import { useState } from "react";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import type { Category } from "../lib/types";

type Props = {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCategoriesChange: (categories: Category[]) => void;
};

export function CategoryManager({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const result = await apiRequest<{ data: Category }>("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      onCategoriesChange([...categories, result.data]);
      setNewName("");
      setCreating(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      const result = await apiRequest<{ data: Category }>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      onCategoriesChange(categories.map((c) => (c.id === id ? result.data : c)));
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      await apiRequest(`/categories/${id}`, { method: "DELETE" });
      onCategoriesChange(categories.filter((c) => c.id !== id));
      if (selectedCategoryId === id) onSelectCategory(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-0.5">
      {/* "All" option */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          selectedCategoryId === null
            ? "bg-zinc-700 text-white"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        }`}
      >
        <FolderOpen size={14} />
        All bookmarks
      </button>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.id} className="group relative">
          {editingId === cat.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate(cat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 rounded-md border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white outline-none"
              />
              <button
                onClick={() => handleUpdate(cat.id)}
                disabled={loading}
                className="rounded p-1 text-green-400 hover:text-green-300"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded p-1 text-zinc-500 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectCategory(cat.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedCategoryId === cat.id
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <FolderOpen size={14} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{cat.name}</span>

              {/* Edit/Delete buttons — visible on hover */}
              <span className="ml-auto hidden shrink-0 items-center gap-1 group-hover:flex">
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(cat.id);
                    setEditName(cat.name);
                  }}
                  className="rounded p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                >
                  <Pencil size={11} />
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(cat.id);
                  }}
                  className="rounded p-0.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={11} />
                </span>
              </span>
            </button>
          )}
        </div>
      ))}

      {/* Create new */}
      {creating ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="Category name"
            className="flex-1 rounded-md border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white outline-none placeholder:text-zinc-500"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            className="rounded p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <Plus size={13} />
          New category
        </button>
      )}
    </div>
  );
}
