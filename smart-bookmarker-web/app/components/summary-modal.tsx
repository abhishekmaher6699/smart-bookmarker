"use client";

import { FileText, Tag, X } from "lucide-react";

type Props = {
  title: string;
  summary: string;
  tags: string[] | null;
  onClose: () => void;
};

export function SummaryModal({ title, summary, tags, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="summary-title" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2"><FileText size={17} className="shrink-0 text-zinc-400" /><h2 id="summary-title" className="truncate text-sm font-semibold text-white">{title}</h2></div>
          <button aria-label="Close summary" onClick={onClose} className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <p className="text-sm leading-7 text-zinc-300">{summary}</p>
          {tags && tags.length > 0 && (
            <div className="mt-5 border-t border-zinc-800 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"><Tag size={10} />{tag}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
