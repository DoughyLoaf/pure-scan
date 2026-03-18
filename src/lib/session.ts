import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "pure_session_id";
const APP_VERSION = "1.0.0";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}

export function getAppVersion(): string {
  return APP_VERSION;
}

export async function initSession(): Promise<void> {
  try {
    const sessionId = getSessionId();
    const platform = getPlatform();
    const prefs: string[] = JSON.parse(localStorage.getItem("pure_dietary_prefs") || "[]");

    await supabase.from("sessions").upsert(
      {
        session_id: sessionId,
        last_active_at: new Date().toISOString(),
        platform,
        dietary_preferences: prefs,
      },
      { onConflict: "session_id" }
    );
  } catch {
    // Fire and forget
  }
}
