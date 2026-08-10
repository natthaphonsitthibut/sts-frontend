import { create } from "zustand";

const STORAGE_KEY = "sts_teacher_link_session";

export interface TeacherLinkCredential {
  /** Raw link token, taken from the URL fragment once and kept tab-scoped. */
  token: string;
  /** OTP-verified session token; absent until the teacher passes the code. */
  sessionToken: string | null;
}

interface TeacherLinkSessionState extends TeacherLinkCredential {
  setToken: (token: string) => void;
  setSessionToken: (sessionToken: string) => void;
  clear: () => void;
}

function readStored(): TeacherLinkCredential {
  if (typeof window === "undefined") return { token: "", sessionToken: null };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: "", sessionToken: null };
    const parsed = JSON.parse(raw) as Partial<TeacherLinkCredential>;
    return {
      token: typeof parsed.token === "string" ? parsed.token : "",
      sessionToken:
        typeof parsed.sessionToken === "string" ? parsed.sessionToken : null,
    };
  } catch {
    return { token: "", sessionToken: null };
  }
}

function persist(credential: TeacherLinkCredential): void {
  if (typeof window === "undefined") return;
  if (!credential.token) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
}

/**
 * The teacher link is opened once and then navigated across several pages
 * (ห้องเรียนของฉัน → ห้อง → ประวัติ), so the credential cannot live in a single
 * page's state. sessionStorage keeps it to the tab that opened the link and
 * drops it when that tab closes; the URL fragment is cleared immediately.
 */
export const useTeacherLinkSessionStore = create<TeacherLinkSessionState>(
  (set, get) => ({
    ...readStored(),
    setToken: (token) => {
      // A different link replaces any previously verified session.
      const sessionToken = get().token === token ? get().sessionToken : null;
      persist({ token, sessionToken });
      set({ token, sessionToken });
    },
    setSessionToken: (sessionToken) => {
      persist({ token: get().token, sessionToken });
      set({ sessionToken });
    },
    clear: () => {
      persist({ token: "", sessionToken: null });
      set({ token: "", sessionToken: null });
    },
  }),
);
