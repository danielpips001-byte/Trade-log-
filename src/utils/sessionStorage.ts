const WORKSPACE_ID_STORAGE_KEY = 'tradelog_workspace_id_v1';
const SIGNED_OUT_STORAGE_KEY = 'tradelog_signed_out_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'tradelog_has_session_v1';

const COOKIE_WORKSPACE_KEY = 'tradelog_ws_id';
const COOKIE_SIGNED_OUT_KEY = 'tradelog_signed_out';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const IDB_NAME = 'tradelog_session_db';
const IDB_STORE = 'session';
const IDB_VERSION = 1;

export function isValidWorkspaceId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(id.trim());
}

export function generateWorkspaceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TL-${suffix}`;
}

function readCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const prefix = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch {
    // ignore cookie errors
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS): void {
  try {
    if (typeof document === 'undefined') return;
    const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // ignore cookie errors
  }
}

function deleteCookie(name: string): void {
  writeCookie(name, '', 0);
}

function openSessionDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openSessionDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(typeof req.result === 'string' ? req.result : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch {
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve(null);
    }
  });
}

async function idbSet(entries: Array<[string, string | null]>): Promise<void> {
  const db = await openSessionDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      for (const [k, v] of entries) {
        if (v === null) {
          store.delete(k);
        } else {
          store.put(v, k);
        }
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {
        // ignore
      }
      resolve();
    }
  });
}

export interface SessionSnapshot {
  workspaceId: string | null;
  isSignedOut: boolean;
  hasActiveSession: boolean;
}

/**
 * Reads session state synchronously from localStorage with Cookie fallback.
 */
export function readSessionSync(): SessionSnapshot {
  let lsWorkspace: string | null = null;
  let lsSignedOut = false;
  let lsHasSession = false;

  try {
    const rawWs = localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
    if (isValidWorkspaceId(rawWs)) {
      lsWorkspace = rawWs.trim().toUpperCase();
    }
    lsSignedOut = localStorage.getItem(SIGNED_OUT_STORAGE_KEY) === 'true';
    lsHasSession = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) === 'true';
  } catch {
    // ignore storage errors
  }

  const cookieWsRaw = readCookie(COOKIE_WORKSPACE_KEY);
  const cookieWs = isValidWorkspaceId(cookieWsRaw) ? cookieWsRaw.trim().toUpperCase() : null;
  const cookieSignedOut = readCookie(COOKIE_SIGNED_OUT_KEY) === 'true';

  const isSignedOut = lsSignedOut || cookieSignedOut;
  const workspaceId = isSignedOut ? null : lsWorkspace || cookieWs;

  // Repair localStorage / cookie if one survived while the other was purged
  if (!isSignedOut && workspaceId) {
    try {
      if (!lsWorkspace) localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, workspaceId);
      if (!cookieWs) writeCookie(COOKIE_WORKSPACE_KEY, workspaceId);
    } catch {
      // ignore
    }
  }

  return {
    workspaceId,
    isSignedOut,
    hasActiveSession: Boolean(!isSignedOut && (lsHasSession || cookieWs || lsWorkspace))
  };
}

/**
 * Checks IndexedDB for durable session recovery in case localStorage/cookies were cleared.
 */
export async function recoverSessionFromIDB(): Promise<SessionSnapshot> {
  const [idbWsRaw, idbSignedOutRaw, idbHasSessionRaw] = await Promise.all([
    idbGet(WORKSPACE_ID_STORAGE_KEY),
    idbGet(SIGNED_OUT_STORAGE_KEY),
    idbGet(ACTIVE_SESSION_STORAGE_KEY)
  ]);

  const sync = readSessionSync();
  const isSignedOut = sync.isSignedOut || idbSignedOutRaw === 'true';
  const idbWs = isValidWorkspaceId(idbWsRaw) ? idbWsRaw.trim().toUpperCase() : null;
  const workspaceId = isSignedOut ? null : sync.workspaceId || idbWs;

  if (!isSignedOut && workspaceId) {
    try {
      localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, workspaceId);
      localStorage.setItem(SIGNED_OUT_STORAGE_KEY, 'false');
    } catch {
      // ignore
    }
    writeCookie(COOKIE_WORKSPACE_KEY, workspaceId);
    deleteCookie(COOKIE_SIGNED_OUT_KEY);
  }

  return {
    workspaceId,
    isSignedOut,
    hasActiveSession: Boolean(!isSignedOut && (sync.hasActiveSession || idbHasSessionRaw === 'true' || idbWs))
  };
}

/**
 * Persists an active workspace session redundantly to localStorage, Cookie, and IndexedDB.
 */
export function persistWorkspaceSession(workspaceId: string, hasActiveAccount = false): void {
  const clean = workspaceId.trim().toUpperCase();
  try {
    localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, clean);
    localStorage.setItem(SIGNED_OUT_STORAGE_KEY, 'false');
    if (hasActiveAccount) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, 'true');
    }
  } catch {
    // ignore
  }

  writeCookie(COOKIE_WORKSPACE_KEY, clean);
  deleteCookie(COOKIE_SIGNED_OUT_KEY);

  const idbEntries: Array<[string, string | null]> = [
    [WORKSPACE_ID_STORAGE_KEY, clean],
    [SIGNED_OUT_STORAGE_KEY, 'false']
  ];
  if (hasActiveAccount) {
    idbEntries.push([ACTIVE_SESSION_STORAGE_KEY, 'true']);
  }
  void idbSet(idbEntries);
}

/**
 * Persists explicit Sign Out state across all storage layers so the user is prompted to restore via Sync Key.
 */
export function persistSignedOutState(previousWorkspaceId?: string): void {
  try {
    localStorage.removeItem(WORKSPACE_ID_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    localStorage.setItem(SIGNED_OUT_STORAGE_KEY, 'true');
    if (previousWorkspaceId) {
      const prefix = `tradelog_ws_${previousWorkspaceId}_`;
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // ignore
  }

  deleteCookie(COOKIE_WORKSPACE_KEY);
  writeCookie(COOKIE_SIGNED_OUT_KEY, 'true');

  void idbSet([
    [WORKSPACE_ID_STORAGE_KEY, null],
    [ACTIVE_SESSION_STORAGE_KEY, null],
    [SIGNED_OUT_STORAGE_KEY, 'true']
  ]);
}
