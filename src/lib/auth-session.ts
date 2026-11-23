import { PortalRole } from "../types/portal";

export interface ActiveSession {
  token: string;
  role: PortalRole;
  restaurant_id: string;
  restaurant_name: string;
  user_id?: string;
  available_restaurants: Array<{
    restaurant_id: string;
    name: string;
  }>;
}

const SESSION_KEY = "escal_ai_portal_session_v1";

export function getStoredSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed.token || !parsed.restaurant_id || !parsed.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: ActiveSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // LocalStorage quota or private mode
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignored
  }
}
