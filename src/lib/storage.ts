/**
 * Abstraction stockage : Web = localStorage, Capacitor = Preferences (persistant) + copie dans localStorage pour lecture sync.
 * Utiliser setItem/removeItem pour les tokens pour qu'ils soient sauvegardés en natif et restaurés au cold start.
 */

import { isCapacitor } from './capacitor';

const AUTH_KEYS = ['authToken', 'userId', 'userName', 'userEmail', 'finalIsLoggedIn', 'finalUserType'] as const;

async function getPreferences() {
  if (typeof window === 'undefined') return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

/**
 * Écrit une valeur. Sur Capacitor, écrit aussi dans Preferences (sauvegarde persistante).
 */
export function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
  if (isCapacitor()) {
    getPreferences().then((Prefs) => {
      Prefs?.set({ key, value }).catch(() => {});
    });
  }
  // Après login/signup, l'app doit enregistrer le token push ; on notifie le composant push.
  if (key === 'userId' && value && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { userId: value } }));
  }
}

/**
 * Supprime une valeur. Sur Capacitor, supprime aussi de Preferences.
 */
export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (_) {}
  if (isCapacitor()) {
    getPreferences().then((Prefs) => {
      Prefs?.remove({ key }).catch(() => {});
    });
  }
}

/**
 * Lecture synchrone (localStorage). Après initFromNative(), les valeurs restaurées depuis Preferences sont dans localStorage.
 */
export function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * À appeler au démarrage de l'app en Capacitor : restaure depuis Preferences vers localStorage
 * pour que les lectures sync (intercepteur API, etc.) retrouvent les tokens après cold start.
 */
export async function initFromNative(): Promise<void> {
  if (!isCapacitor() || typeof window === 'undefined') return;
  const Prefs = await getPreferences();
  if (!Prefs) return;
  try {
    for (const key of AUTH_KEYS) {
      const { value } = await Prefs.get({ key });
      if (value != null) {
        try {
          localStorage.setItem(key, value);
        } catch (_) {}
      }
    }
  } catch (_) {}
}
