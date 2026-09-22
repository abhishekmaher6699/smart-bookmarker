"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "...")[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={15} />
      </button>

      {getPages().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-zinc-600">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
              p === page
                ? "bg-white text-black"
                : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
