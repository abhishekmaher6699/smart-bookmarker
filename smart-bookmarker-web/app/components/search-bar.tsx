"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search bookmarks"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500 transition-colors"
      />
    </div>
  );
}
