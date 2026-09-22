"use client";

import { useState } from "react";
import { Bookmark, Calendar, ExternalLink, FileText, FolderOpen, GitFork, Image as ImageIcon, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import type { Capture } from "../lib/types";
import { SummaryModal } from "./summary-modal";
import { TypeBadge } from "./type-badge";

type Props = {
  capture: Capture;
  onEdit: (capture: Capture) => void;
  onDelete: (capture: Capture) => void;
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CapturePlaceholder({ type }: { type: Capture["type"] }) {
  const Icon = type === "video" ? Play : type === "image" ? ImageIcon : type === "github" ? GitFork : type === "pdf" || type === "article" ? FileText : Bookmark;

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-800">
      <Icon size={34} strokeWidth={1.5} className="text-zinc-500" />
    </div>
  );
}

export function CaptureCard({ capture, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const domain = getDomain(capture.url);
  const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
  const hasThumbnail = Boolean(capture.thumbnail_url && !imgError);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700 hover:shadow-lg hover:shadow-black/10">
      <div className="h-28 w-full shrink-0 overflow-hidden bg-zinc-800 sm:h-32">
        {hasThumbnail ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capture.thumbnail_url!} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
          </>
        ) : <CapturePlaceholder type={capture.type} />}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="" width={16} height={16} className="shrink-0 rounded-sm" />
            <a href={capture.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-xs text-zinc-400 transition-colors hover:text-zinc-200">{domain}</a>
            <ExternalLink size={11} className="shrink-0 text-zinc-600" />
          </div>

          <div className="relative shrink-0">
            <button onClick={() => setMenuOpen((open) => !open)} aria-label="Bookmark actions" className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={15} /></button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 min-w-36 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                  <button onClick={() => { setMenuOpen(false); onEdit(capture); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"><Pencil size={13} /> Edit</button>
                  <button onClick={() => { setMenuOpen(false); onDelete(capture); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-zinc-700 hover:text-red-300"><Trash2 size={13} /> Delete</button>
                </div>
              </>
            )}
          </div>
        </div>

        <a href={capture.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors hover:text-zinc-200">{capture.title ?? capture.url}</a>

        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={capture.type} />
          {capture.category && <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"><FolderOpen size={10} />{capture.category}</span>}
        </div>

        {capture.summary ? (
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <p className="min-w-0 flex-1 truncate leading-relaxed text-zinc-400">{capture.summary}</p>
            <button onClick={() => setSummaryOpen(true)} className="shrink-0 font-medium text-zinc-300 transition hover:text-white">Read more</button>
          </div>
        ) : capture.description ? (
          <p className="truncate text-xs leading-relaxed text-zinc-400">{capture.description}</p>
        ) : null}

        <div className="mt-auto flex items-center gap-1 text-[11px] text-zinc-600"><Calendar size={10} />{formatDate(capture.created_at)}</div>
      </div>

      {summaryOpen && capture.summary && <SummaryModal title={capture.title ?? capture.url} summary={capture.summary} tags={capture.tags} onClose={() => setSummaryOpen(false)} />}
    </div>
  );
}
