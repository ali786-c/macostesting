/**
 * URL de base pour les return URLs (paiement Stripe, OAuth, etc.).
 * En Web = origin. En Capacitor il faut que les return URLs rouvrent l'app :
 * - Soit l'app est servie depuis le même domaine (server.url) → origin = ce domaine, Universal Links / App Links requis.
 * - Soit utiliser un schéma custom (myapp://) si configuré côté natif.
 */
import { isCapacitor } from './capacitor';

const APP_URL_ENV = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL : undefined;

/**
 * Retourne l'URL de base pour les redirections (success/cancel payment, Stripe Connect return, etc.).
 * En production Capacitor, définir NEXT_PUBLIC_APP_URL vers le domaine qui a Universal Links / App Links
 * (ex: https://rentoall.fr) pour que le retour Stripe rouvre l'app.
 */
export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') {
    return APP_URL_ENV || '';
  }
  if (APP_URL_ENV) return APP_URL_ENV;
  if (isCapacitor()) {
    // En app embarquée (webDir), origin peut être capacitor://localhost ou file. Utiliser l'URL publique.
    const origin = window.location.origin || '';
    if (origin.startsWith('http') && !origin.includes('localhost')) return origin;
    return APP_URL_ENV || origin || 'https://rentoall.fr';
  }
  return window.location.origin || '';
}
