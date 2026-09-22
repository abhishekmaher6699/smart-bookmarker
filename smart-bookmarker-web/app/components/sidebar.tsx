"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Settings, LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";
import { CategoryManager } from "./category-manager";
import type { Category } from "../lib/types";

type Props = {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCategoriesChange: (categories: Category[]) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
  isOpen,
  onClose,
}: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-zinc-800 bg-zinc-900 transition-transform lg:static lg:w-60 lg:translate-x-0 ${isOpen ? "translate-x-0" : ""}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
          <Bookmark size={14} className="text-black" fill="black" />
        </div>
        <span className="text-sm font-semibold text-white">Smart Bookmarker</span>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/dashboard"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          <Bookmark size={14} />
          Bookmarks
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          <Settings size={14} />
          Settings
        </Link>
      </nav>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Categories
        </p>
        <CategoryManager
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
          onCategoriesChange={onCategoriesChange}
        />
      </div>

      {/* User + Logout */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-300">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
