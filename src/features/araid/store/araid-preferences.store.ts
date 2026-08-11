import { create } from "zustand";

const STORAGE_KEY = "araid_display_language";

export type AraIdLanguage = "th" | "en";

interface AraIdPreferencesState {
  language: AraIdLanguage;
  setLanguage: (language: AraIdLanguage) => void;
}

function readLanguage(): AraIdLanguage {
  if (typeof window === "undefined") return "th";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "th";
}

export const useAraIdPreferencesStore = create<AraIdPreferencesState>((set) => ({
  language: readLanguage(),
  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    set({ language });
  },
}));
