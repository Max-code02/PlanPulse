/**
 * Google reCAPTCHA Enterprise Integration
 * Site Key: 6LcUELYtAAAAAHVamZOSKKAHYFVZ_5iryknn4Jlf
 */

export const RECAPTCHA_SITE_KEY = "6LcUELYtAAAAAHVamZOSKKAHYFVZ_5iryknn4Jlf";

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void | Promise<void>) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
      ready?: (callback: () => void | Promise<void>) => void;
      execute?: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Executes reCAPTCHA Enterprise for a given user action (e.g. 'LOGIN', 'REGISTER', 'RESET_PASSWORD').
 * Returns the response token (valid for 2 minutes) or null if reCAPTCHA is not loaded or failed.
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const grecaptcha = window.grecaptcha;
    const enterprise = grecaptcha?.enterprise || (grecaptcha as any);

    if (!enterprise || typeof enterprise.ready !== "function") {
      console.warn("[reCAPTCHA] Google reCAPTCHA Enterprise ist noch nicht geladen.");
      return null;
    }

    return await new Promise<string | null>((resolve) => {
      // Timeout fallback after 3 seconds so form submission is never blocked
      const timer = setTimeout(() => {
        console.warn("[reCAPTCHA] Timeout beim Abrufen des Tokens.");
        resolve(null);
      }, 3000);

      try {
        enterprise.ready(async () => {
          try {
            const token = await enterprise.execute(RECAPTCHA_SITE_KEY, { action });
            clearTimeout(timer);
            resolve(token);
          } catch (execErr) {
            clearTimeout(timer);
            console.warn("[reCAPTCHA] Fehler bei enterprise.execute:", execErr);
            resolve(null);
          }
        });
      } catch (err) {
        clearTimeout(timer);
        console.warn("[reCAPTCHA] Fehler bei enterprise.ready:", err);
        resolve(null);
      }
    });
  } catch (error) {
    console.warn("[reCAPTCHA] Allgemeiner Ausführungsfehler:", error);
    return null;
  }
}

/**
 * Sends the reCAPTCHA response token to the backend for verification/logging.
 */
export async function verifyRecaptchaWithBackend(token: string, action: string): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const res = await fetch("/api/recaptcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    console.warn("[reCAPTCHA] Backend-Verifizierung fehlgeschlagen:", err);
    return { success: false, error: err.message };
  }
}
