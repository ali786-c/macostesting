/**
 * Détection et helpers pour l'exécution dans une app Capacitor (Android/iOS).
 *
 * WEB : Aucun impact. Sur navigateur, isCapacitor() est false, donc tout le code ci-dessous
 * (capacitorNavigate, getCapacitorBaseUrl, etc.) n'est jamais exécuté. La navigation reste
 * celle de Next.js (Link, router.push) comme en usage normal.
 *
 * CAPACITOR (build statique, output: "export") :
 * Pour les routes dynamiques (/parking/[id], /host/my-places/[id], /reservations/[id]),
 * on utilise capacitorNavigate (window.location) pour éviter l'erreur RSC. Les routes
 * statiques utilisent router.push pour rester en SPA.
 */

export function isCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  // Méthode 1: isNativePlatform
  if (cap?.isNativePlatform?.()) return true;
  // Méthode 2: getPlatform retourne ios ou android
  const platform = cap?.getPlatform?.();
  if (platform === "ios" || platform === "android") return true;
  // Méthode 3: origine capacitor:// ou ionic:// (fallback si bridge pas encore prêt)
  const origin = window.location?.origin ?? "";
  if (origin.startsWith("capacitor://") || origin.startsWith("ionic://")) return true;
  return false;
}

/** Mobile viewport OU app native (iOS/Android). Utilisé pour masquer homepage, logo vers search, etc. */
export function isMobileOrCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || isCapacitor();
}

export function getPlatform(): "web" | "ios" | "android" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  return "web";
}

/**
 * URL de base pour capacitorNavigate.
 * En Capacitor : TOUJOURS window.location.origin (ex: capacitor://localhost sur iOS,
 * http://localhost sur Android). Ne jamais utiliser NEXT_PUBLIC_APP_URL ici car cela
 * ferait naviguer vers le serveur de production au lieu du bundle local.
 */
function getCapacitorBaseUrl(): string {
  if (typeof window === "undefined") return "";
  // En Capacitor on veut toujours naviguer dans le bundle local, jamais vers le serveur web
  return window.location.origin ?? "";
}

/** Construit l'URL complète pour une route (Capacitor). Utilisé pour le href des <a> afin qu'iOS traite le tap comme un lien. */
export function getCapacitorAppUrl(path: string): string {
  if (typeof window === "undefined") return path.startsWith("/") ? path : `/${path}`;
  const base = getCapacitorBaseUrl();
  let fullPath = path.startsWith("/") ? path : `/${path}`;
  const [pathOnly, query] = fullPath.includes("?") ? fullPath.split("?", 2) : [fullPath, ""];
  // Ne PAS ajouter de trailing slash : sur iOS Capacitor, "/messages/" génère une recherche
  // de fichier "messages//index.html" (double slash) → introuvable → SPA fallback vers index.html racine.
  // Sans trailing slash, Capacitor cherche "messages/index.html" → trouvé correctement.
  let finalPath = pathOnly.replace(/\/+/g, "/");
  // Retirer le trailing slash sauf pour la racine "/"
  if (finalPath.length > 1 && finalPath.endsWith("/")) {
    finalPath = finalPath.slice(0, -1);
  }
  return query ? `${base}${finalPath}?${query}` : `${base}${finalPath}`;
}

/**
 * Navigation full-page en Capacitor uniquement (no-op sur web).
 * Évite les erreurs RSC en utilisant window.location au lieu de router.push
 * pour les routes dynamiques.
 */
export function capacitorNavigate(path: string): void {
  if (typeof window === "undefined") return;
  if (!isCapacitor()) return;
  const url = getCapacitorAppUrl(path);
  const platform = getPlatform();
  console.log(`[NAV] capacitorNavigate | platform=${platform} | path=${path} | url=${url} | origin=${window.location.origin} | href=${window.location.href}`);
  window.location.href = url;
}

/**
 * Navigation push safe pour Capacitor.
 * En Capacitor, toujours utiliser capacitorNavigate (full page load via window.location)
 * car les payloads RSC (.txt) ne sont pas inclus dans le bundle statique.
 * Sur web : router.push normal (SPA).
 */
export function safePush(
  router: { push: (path: string) => void },
  path: string
): void {
  if (typeof window === "undefined") return;
  if (isCapacitor()) {
    console.log(`[NAV] safePush → capacitorNavigate | path=${path}`);
    capacitorNavigate(path);
  } else {
    router.push(path);
  }
}

/**
 * Handler onClick pour Link : navigation mobile-safe (iOS + Android).
 * Avec router : utilise handleMobileLinkClick (recommandé).
 * Sans router : fallback Capacitor-only (legacy).
 */
export function handleCapacitorLinkClick(
  e: React.MouseEvent,
  href: string,
  router?: { push: (path: string) => void }
): void {
  if (router) {
    handleMobileLinkClick(e, href, router);
  } else if (typeof window !== "undefined" && isCapacitor()) {
    e.preventDefault();
    e.stopPropagation();
    capacitorNavigate(href);
  }
}

/** Détecte iOS (Safari, WebView, Capacitor) */
export function isIOS(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Détecte Android (Chrome, WebView, Capacitor) */
export function isAndroid(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false;
  return /Android/i.test(window.navigator.userAgent || "");
}

/** Détecte un navigateur mobile (iOS ou Android) — pour navigation fiable hors Capacitor */
export function isMobileBrowser(): boolean {
  return isIOS() || isAndroid();
}

/** Routes dynamiques (avec [id]) : en build statique Capacitor, router.push déclenche une requête RSC qui échoue. */
export function isDynamicRoute(href: string): boolean {
  const path = href.startsWith("/") ? href : `/${href}`;
  const pathOnly = path.split("?")[0];
  // /host/my-places/123/, /parking/123/, /reservations/123/, /user/123/, /mes-annonces/123/
  return /^\/host\/my-places\/[\w-]+\/?(\?|$)/.test(pathOnly) ||
    /^\/parking\/[\w-]+\/?(\?|$)/.test(pathOnly) ||
    /^\/reservations\/[\w-]+\/?(\?|$)/.test(pathOnly) ||
    /^\/user\/[\w-]+\/?(\?|$)/.test(pathOnly) ||
    /^\/mes-annonces\/[\w-]+\/?(\?|$)/.test(pathOnly);
}

/**
 * Navigation fiable sur mobile (iOS + Android, Safari + Chrome + Capacitor).
 * En Capacitor : uniquement pour les routes dynamiques (avec id), on utilise window.location
 * pour éviter l'erreur RSC. Les onglets du footer et routes statiques utilisent router.push
 * pour rester en SPA et ne pas revenir au calendrier.
 */
/**
 * Navigation fiable sur mobile (iOS + Android, Safari + Chrome + Capacitor).
 * En Capacitor : TOUJOURS capacitorNavigate (full page load) car les payloads RSC .txt
 * ne sont pas inclus dans le bundle statique → router.push provoquerait une erreur 404
 * sur le payload RSC, avec fallback vers la racine → redirect calendrier.
 */
export function handleMobileLinkClick(
  e: React.MouseEvent,
  href: string,
  router: { push: (path: string) => void }
): void {
  if (typeof window === "undefined") return;
  e.preventDefault();
  e.stopPropagation();
  const cap = isCapacitor();
  console.log(`[NAV] handleMobileLinkClick | href=${href} | isCapacitor=${cap} | platform=${getPlatform()}`);
  if (cap) {
    // En Capacitor, full page load pour toutes les routes (pas de SPA)
    capacitorNavigate(href);
  } else if (isMobileBrowser()) {
    const target = `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;
    console.log(`[NAV] window.location (mobile browser) → ${target}`);
    window.location.href = target;
  } else {
    console.log(`[NAV] router.push (web) → ${href}`);
    router.push(href);
  }
}
