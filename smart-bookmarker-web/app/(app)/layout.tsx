"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { AppProvider, useAppContext } from "../lib/app-context";
import { Sidebar } from "../components/sidebar";
import type { Category } from "../lib/types";

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { categories, setCategories, selectedCategoryId, setSelectedCategoryId } =
    useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      apiRequest<{ data: Category[] }>("/categories")
        .then((res) => setCategories(res.data))
        .catch(() => {});
    }
  }, [user, setCategories]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
      <Sidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onCategoriesChange={setCategories}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <button aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} onClick={() => setSidebarOpen((open) => !open)} className="fixed bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 shadow-lg lg:hidden">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
