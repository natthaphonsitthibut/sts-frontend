import { create } from "zustand";
import { authService } from "../api/auth.service";
import type {
  AuthSessionSnapshot,
  AuthStorageTarget,
  AuthUser,
  ResolvedAuthStorageTarget,
} from "../types/auth.types";

const AUTH_USER_STORAGE_KEY = "sts_user";
const ADMIN_ACCESS_STORAGE_KEY = "admin_access";
const MAGIC_SESSION_STORAGE_PREFIX = "magic_session_";

interface AuthSessionState extends AuthSessionSnapshot {
  clearSession: () => void;
  isLoggedIn: () => boolean;
  loadSession: () => AuthSessionSnapshot;
  persistAdminAccessFlag: (target: ResolvedAuthStorageTarget) => void;
  persistUser: (
    userData: AuthUser,
    target?: AuthStorageTarget,
  ) => ResolvedAuthStorageTarget;
  readMagicToken: (token: string, target?: AuthStorageTarget) => string;
  refreshUserProfile: () => Promise<boolean>;
  saveSession: (
    userData: AuthUser,
    options?: {
      target?: AuthStorageTarget;
      hasAdminAccess?: boolean;
    },
  ) => ResolvedAuthStorageTarget;
  writeMagicToken: (
    token: string,
    sessionToken: string,
    target?: ResolvedAuthStorageTarget,
  ) => void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorage(target: ResolvedAuthStorageTarget): Storage | null {
  if (!isBrowser()) {
    return null;
  }

  return target === "session" ? window.sessionStorage : window.localStorage;
}

function getInactiveStorage(
  target: ResolvedAuthStorageTarget,
): Storage | null {
  return getStorage(target === "session" ? "local" : "session");
}

function hasStoredAuthData(storage: Storage | null): boolean {
  if (!storage) {
    return false;
  }

  return Boolean(
    storage.getItem(AUTH_USER_STORAGE_KEY) ||
      storage.getItem(ADMIN_ACCESS_STORAGE_KEY) === "true",
  );
}

function parseStoredUser(userData: string | null): AuthUser | null {
  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(userData) as AuthUser;
  } catch {
    return null;
  }
}

function readStoredUser(storage: Storage | null): AuthUser | null {
  return parseStoredUser(storage?.getItem(AUTH_USER_STORAGE_KEY) ?? null);
}

function resolveStoredAuthTarget(): ResolvedAuthStorageTarget | null {
  const sessionStorageRef = getStorage("session");
  if (hasStoredAuthData(sessionStorageRef)) {
    return "session";
  }

  const localStorageRef = getStorage("local");
  if (hasStoredAuthData(localStorageRef)) {
    return "local";
  }

  return null;
}

function resolvePersistTarget(
  target: AuthStorageTarget = "auto",
): ResolvedAuthStorageTarget {
  return target === "auto" ? resolveStoredAuthTarget() ?? "local" : target;
}

function syncAuthSessionState(): AuthSessionSnapshot {
  const target = resolveStoredAuthTarget();
  const storage = target ? getStorage(target) : null;

  return {
    user: readStoredUser(storage),
    hasAdminAccess: storage?.getItem(ADMIN_ACCESS_STORAGE_KEY) === "true",
    storageTarget: target,
  };
}

function persistAuthUser(
  userData: AuthUser,
  target: AuthStorageTarget = "auto",
): ResolvedAuthStorageTarget {
  const resolvedTarget = resolvePersistTarget(target);
  const storage = getStorage(resolvedTarget);
  const inactiveStorage = getInactiveStorage(resolvedTarget);

  storage?.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userData));
  inactiveStorage?.removeItem(AUTH_USER_STORAGE_KEY);

  return resolvedTarget;
}

function persistAdminAccess(target: ResolvedAuthStorageTarget): void {
  const storage = getStorage(target);
  const inactiveStorage = getInactiveStorage(target);

  storage?.setItem(ADMIN_ACCESS_STORAGE_KEY, "true");
  inactiveStorage?.removeItem(ADMIN_ACCESS_STORAGE_KEY);
}

function saveAuthSession(
  userData: AuthUser,
  options: {
    target?: AuthStorageTarget;
    hasAdminAccess?: boolean;
  } = {},
): ResolvedAuthStorageTarget {
  const resolvedTarget = resolvePersistTarget(options.target ?? "auto");
  const storage = getStorage(resolvedTarget);
  const inactiveStorage = getInactiveStorage(resolvedTarget);

  storage?.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userData));
  inactiveStorage?.removeItem(AUTH_USER_STORAGE_KEY);

  if (options.hasAdminAccess ?? true) {
    storage?.setItem(ADMIN_ACCESS_STORAGE_KEY, "true");
    inactiveStorage?.removeItem(ADMIN_ACCESS_STORAGE_KEY);
  } else {
    storage?.removeItem(ADMIN_ACCESS_STORAGE_KEY);
  }

  return resolvedTarget;
}

function clearStoredAuthSession(): void {
  getStorage("session")?.removeItem(AUTH_USER_STORAGE_KEY);
  getStorage("session")?.removeItem(ADMIN_ACCESS_STORAGE_KEY);
  getStorage("local")?.removeItem(AUTH_USER_STORAGE_KEY);
  getStorage("local")?.removeItem(ADMIN_ACCESS_STORAGE_KEY);
}

function getMagicSessionKey(token: string): string {
  return `${MAGIC_SESSION_STORAGE_PREFIX}${token}`;
}

function readMagicSessionToken(
  token: string,
  target: AuthStorageTarget = "auto",
): string {
  const key = getMagicSessionKey(token);

  if (!isBrowser()) {
    return "";
  }

  if (target === "auto") {
    return (
      window.sessionStorage.getItem(key) ||
      window.localStorage.getItem(key) ||
      ""
    );
  }

  return getStorage(target)?.getItem(key) || "";
}

function writeMagicSessionToken(
  token: string,
  sessionToken: string,
  target: ResolvedAuthStorageTarget = "session",
): void {
  getStorage(target)?.setItem(getMagicSessionKey(token), sessionToken);
}

const initialSession = syncAuthSessionState();

export const useAuthSessionStore = create<AuthSessionState>((set, get) => ({
  ...initialSession,
  clearSession: () => {
    clearStoredAuthSession();
    set(syncAuthSessionState());
  },
  isLoggedIn: () => Boolean(get().user),
  loadSession: () => {
    const session = syncAuthSessionState();
    set(session);
    return session;
  },
  persistAdminAccessFlag: (target) => {
    persistAdminAccess(target);
    set(syncAuthSessionState());
  },
  persistUser: (userData, target = "auto") => {
    const resolvedTarget = persistAuthUser(userData, target);
    set(syncAuthSessionState());
    return resolvedTarget;
  },
  readMagicToken: (token, target = "auto") =>
    readMagicSessionToken(token, target),
  refreshUserProfile: async () => {
    const session = get().loadSession();
    const currentUser = session.user;
    const target = session.storageTarget;

    if (!currentUser?.id || currentUser.virtual_login || !target) {
      return false;
    }

    try {
      const refreshedUser = await authService.getUserProfile(currentUser.id);
      saveAuthSession(refreshedUser, {
        target,
        hasAdminAccess: session.hasAdminAccess,
      });
      set(syncAuthSessionState());
      return true;
    } catch {
      return false;
    }
  },
  saveSession: (userData, options = {}) => {
    const resolvedTarget = saveAuthSession(userData, options);
    set(syncAuthSessionState());
    return resolvedTarget;
  },
  writeMagicToken: (token, sessionToken, target = "session") => {
    writeMagicSessionToken(token, sessionToken, target);
  },
}));
