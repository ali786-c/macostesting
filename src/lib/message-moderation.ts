/**
 * Modération locale des messages (coordonnées, liens, réseaux sociaux, insultes).
 * Utilisée avant envoi pour bloquer le bouton et afficher un message d'erreur.
 */

export interface LocalModerationOptions {
  /** Si true (réservation confirmée), on n'interdit pas email/téléphone, mais on garde liens + réseaux + insultes */
  allowEmailPhone?: boolean;
}

export interface LocalModerationResult {
  allowed: boolean;
  reason?: 'EMAIL' | 'PHONE' | 'LINK' | 'SOCIAL' | 'INSULT';
}

// Patterns pour email (simple mais couvrant la majorité des cas)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Téléphone : français (0X XX XX XX XX, +33, 06, 07…) et formats internationaux
const PHONE_REGEX = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}|(?:\+\d{1,4}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){3,}\d{2,4}/g;

// Liens : http, https, www.
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

// Réseaux sociaux (noms de domaines / patterns courants)
const SOCIAL_PATTERNS = [
  /\bfacebook\.com\b/i,
  /\bfb\.me\b/i,
  /\binstagram\.com\b/i,
  /\binstagr\.am\b/i,
  /\btwitter\.com\b/i,
  /\bx\.com\b/i,
  /\blinkedin\.com\b/i,
  /\btiktok\.com\b/i,
  /\bsnapchat\.com\b/i,
  /\bwa\.me\b/i,
  /\bwhatsapp\b/i,
  /\btelegram\.me\b/i,
  /\btelegram\.org\b/i,
  /\bmessenger\.com\b/i,
  /\bt\.me\b/i,
  /\byoutube\.com\b/i,
  /\byoutu\.be\b/i,
];

// Liste minimale d'insultes (à compléter si besoin) — utilisée quand allowEmailPhone est true
const INSULT_WORDS = [
  'connard', 'connasse', 'salope', 'pute', 'putain', 'merde', 'enculé', 'enculer',
  'nique', 'niquer', 'fdp', 'pd', 'enfoiré', 'enfoirée', 'idiot', 'debile', 'débile',
  'stupide', 'imbecile', 'imbécile', 'batard', 'bâtard', 'fils de pute', 'fdp',
];

function hasMatch(text: string, regex: RegExp): boolean {
  regex.lastIndex = 0;
  return regex.test(text);
}

function hasSocial(content: string): boolean {
  const lower = content.toLowerCase();
  return SOCIAL_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(lower);
  });
}

function hasInsult(content: string): boolean {
  const normalized = content
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ');
  const words = normalized.split(/\s+/);
  return INSULT_WORDS.some((word) => {
    const w = word.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return words.some((x) => x === w || x.includes(w));
  });
}

/**
 * Vérifie si le contenu du message est autorisé avant envoi.
 * - email, téléphone, liens, réseaux sociaux : bloqués sauf si allowEmailPhone et résa confirmée.
 * - insultes : toujours bloquées.
 */
export function localModeration(
  content: string,
  options: LocalModerationOptions = {}
): LocalModerationResult {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return { allowed: true };
  }

  const { allowEmailPhone = false } = options;

  // Insultes : toujours bloqué
  if (hasInsult(trimmed)) {
    return { allowed: false, reason: 'INSULT' };
  }

  // Liens : toujours bloqué (hors résa confirmée on garde la règle stricte)
  if (hasMatch(trimmed, LINK_REGEX)) {
    return { allowed: false, reason: 'LINK' };
  }

  // Réseaux sociaux : toujours bloqué
  if (hasSocial(trimmed)) {
    return { allowed: false, reason: 'SOCIAL' };
  }

  // Email et téléphone : bloqués sauf si réservation confirmée
  if (!allowEmailPhone) {
    if (hasMatch(trimmed, EMAIL_REGEX)) {
      return { allowed: false, reason: 'EMAIL' };
    }
    if (hasMatch(trimmed, PHONE_REGEX)) {
      return { allowed: false, reason: 'PHONE' };
    }
  }

  return { allowed: true };
}

/** Message d'erreur générique affiché à l'utilisateur quand la modération bloque. */
export const MODERATION_ERROR_MESSAGE =
  'Votre message contient des coordonnées ou un contenu non autorisé. Merci de communiquer uniquement via la messagerie de la plateforme.';

/** Message d'aide affiché sous la zone de saisie. */
export const MODERATION_HELP_MESSAGE =
  "Les coordonnées (email, téléphone, réseaux sociaux) ne peuvent être échangées avant la confirmation d'une réservation.";

/** Longueur max d'un message (caractères). */
export const MAX_MESSAGE_LENGTH = 2000;

/** Limite anti-spam : max nombre de messages dans la fenêtre de temps. */
export const SPAM_MESSAGE_LIMIT = 5;

/** Fenêtre anti-spam en millisecondes (10 secondes). */
export const SPAM_WINDOW_MS = 10_000;

/** Détecte si le contenu a été modéré par le backend (mots masqués par des astérisques). Ne pas afficher ce contenu dans la preview / bulles. */
export function isContentModeratedByBackend(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  return /\*{2,}/.test(content);
}

/** Texte affiché à la place d'un message modéré par le back (preview et bulle). */
export const MODERATED_CONTENT_PLACEHOLDER = 'Message modéré';
