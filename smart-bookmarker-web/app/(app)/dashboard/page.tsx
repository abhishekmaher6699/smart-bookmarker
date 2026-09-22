"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookmarkPlus, Loader2, SlidersHorizontal } from "lucide-react";
import { AddCaptureModal } from "../../components/add-capture-modal";
import { CaptureCard } from "../../components/capture-card";
import { EditCaptureModal } from "../../components/edit-capture-modal";
import { Pagination } from "../../components/pagination";
import { SearchBar } from "../../components/search-bar";
import { apiRequest } from "../../lib/api";
import { useAppContext } from "../../lib/app-context";
import type { Capture, CaptureType, PaginatedResponse, SortOrder } from "../../lib/types";

const PAGE_SIZE = 12;

export default function DashboardPage() {
  const { categories, selectedCategoryId } = useAppContext();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<CaptureType | "">("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Capture | null>(null);
  const [notice, setNotice] = useState("");
  const latestRequestRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categoryName = categories.find((category) => category.id === selectedCategoryId)?.name;

  const loadCaptures = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      mode: "keyword",
      sort,
    });

    if (query.trim()) params.set("search", query.trim());
    if (selectedCategoryId) params.set("categoryIds", selectedCategoryId);
    if (type) params.set("type", type);

    try {
      const result = await apiRequest<PaginatedResponse<Capture>>(`/search?${params}`);
      if (requestId !== latestRequestRef.current) return;
      setCaptures(result.data);
      setTotal(result.pagination.total);
    } catch (requestError) {
      if (requestId !== latestRequestRef.current) return;
      setError(requestError instanceof Error ? requestError.message : "Could not load bookmarks.");
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, [page, query, selectedCategoryId, sort, type]);

  useEffect(() => {
    const timer = window.setTimeout(loadCaptures, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadCaptures, query]);

  const resultLabel = useMemo(() => {
    if (loading) return "Loading bookmarks";
    if (total === 0) return "No bookmarks found";
    return `${total} bookmark${total === 1 ? "" : "s"}`;
  }, [loading, total]);

  async function handleDelete(capture: Capture) {
    if (!window.confirm(`Delete “${capture.title ?? capture.url}”?`)) return;

    try {
      await apiRequest(`/captures/${capture.id}`, { method: "DELETE" });
      setCaptures((items) => items.filter((item) => item.id !== capture.id));
      setTotal((count) => Math.max(0, count - 1));
      setNotice("Bookmark deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete bookmark.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-5 sm:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Your library</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {categoryName ?? "All bookmarks"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{resultLabel}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
          <BookmarkPlus size={16} /> Add bookmark
        </button>
      </div>

      <div className="space-y-3">
        <SearchBar value={query} onChange={(value) => { setQuery(value); setPage(1); }} />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowFilters((visible) => !visible)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white">
            <SlidersHorizontal size={14} /> Filters
          </button>
          {(type || sort !== "newest") && <button onClick={() => { setType(""); setSort("newest"); setPage(1); }} className="text-xs text-zinc-500 hover:text-zinc-200">Clear filters</button>}
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <label className="text-xs text-zinc-400">Type
              <select value={type} onChange={(event) => { setType(event.target.value as CaptureType | ""); setPage(1); }} className="ml-2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200 outline-none">
                <option value="">All types</option>
                {(["article", "video", "pdf", "image", "github"] as CaptureType[]).map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-400">Order
              <select value={sort} onChange={(event) => { setSort(event.target.value as SortOrder); setPage(1); }} className="ml-2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-zinc-200 outline-none">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {notice && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">{notice}</p>}
      {error && <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"><AlertCircle size={16} />{error}</div>}

      {loading && captures.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
      ) : captures.length > 0 ? (
        <>
          <div className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-150 ${loading ? "opacity-60" : "opacity-100"}`} aria-busy={loading}>
            {captures.map((capture) => <CaptureCard key={capture.id} capture={capture} onEdit={setEditing} onDelete={handleDelete} />)}
          </div>
          <div className="mt-8"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
          <BookmarkPlus className="mx-auto mb-4 text-zinc-600" size={28} />
          <h2 className="text-base font-medium text-zinc-200">{query || type || selectedCategoryId ? "No matching bookmarks" : "Your library is empty"}</h2>
          <p className="mt-2 text-sm text-zinc-500">{query || type || selectedCategoryId ? "Try changing your search or filters." : "Save a link here or use the browser extension to begin."}</p>
          {!query && !type && !selectedCategoryId && <button onClick={() => setShowAdd(true)} className="mt-5 text-sm font-medium text-white underline underline-offset-4">Add your first bookmark</button>}
        </div>
      )}

      {showAdd && <AddCaptureModal categories={categories} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); setPage(1); void loadCaptures(); setNotice("Bookmark added. We’ll enrich it in the background."); }} />}
      {editing && <EditCaptureModal capture={editing} categories={categories} onClose={() => setEditing(null)} onUpdated={(updated) => { setCaptures((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditing(null); setNotice("Bookmark updated."); }} />}
    </div>
  );
}
