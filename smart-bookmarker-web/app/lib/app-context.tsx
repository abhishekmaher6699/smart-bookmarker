"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Category } from "./types";

type AppContextType = {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{ categories, setCategories, selectedCategoryId, setSelectedCategoryId }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be inside AppProvider");
  return ctx;
}
