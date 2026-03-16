import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retourne uniquement le prénom pour l'affichage (vie privée - pas de nom de famille).
 * Accepte un objet utilisateur { firstName?, lastName?, email? } ou une chaîne (nom complet).
 */
export function getDisplayFirstName(
  user: { firstName?: string | null; lastName?: string | null; email?: string | null } | string | null | undefined,
  fallback: string = 'Utilisateur'
): string {
  if (!user) return fallback;
  if (typeof user === 'string') {
    const firstWord = user.trim().split(/\s+/)[0];
    return firstWord || fallback;
  }
  if (user.firstName && user.firstName.trim()) return user.firstName.trim();
  if (user.email) return user.email.split('@')[0] || fallback;
  return fallback;
}

/**
 * Met une majuscule au début de chaque ligne (titre / description d'un bien).
 * Ex: "cave titre" → "Cave titre", "ligne un\nligne deux" → "Ligne un\nLigne deux"
 */
export function capitalizeFirstPerLine(str: string | null | undefined): string {
  if (str == null || typeof str !== 'string') return '';
  return str
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      return t.charAt(0).toUpperCase() + t.slice(1);
    })
    .join('\n');
}

/**
 * Épure une adresse verbose (ex: retour API géocodage) en format court.
 * Ex: "43, Rue Léon Blum, Cité Claveau, Bordeaux Maritime, Bordeaux, Gironde, Nouvelle-Aquitaine, France métropolitaine, 33300, France"
 * → "43 Rue Léon Blum, 33300 Bordeaux"
 */
export function epureAddress(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ').trim() || trimmed; // Déjà court

  const exclude = new Set([
    'france', 'fr',
    'france métropolitaine', 'metropole', 'métropole',
    'nouvelle-aquitaine', 'auvergne-rhône-alpes', 'bourgogne-franche-comté', 'bretagne', 'centre-val de loire',
    'corse', 'grand est', 'hauts-de-france', 'île-de-france', 'normandie', 'occitanie', 'pays de la loire',
    'provence-alpes-côte d\'azur', 'guadeloupe', 'martinique', 'guyane', 'la réunion', 'mayotte',
    'gironde', 'finistère', 'morbihan', 'loire-atlantique', 'indre-et-loire', 'haute-garonne',
    'rhône', 'nord', 'bouches-du-rhône', 'var', 'seine-maritime', 'isère', 'essonne', 'val-d\'oise'
  ]);

  const filtered: string[] = [];
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (exclude.has(lower)) continue;
    if (lower.includes('cité ') || lower.endsWith(' maritime') || lower.includes('métropolitaine')) continue;
    if (/^\d{5}$/.test(p)) continue; // postal code - handled separately
    filtered.push(p);
  }

  const postal = parts.find(p => /^\d{5}$/.test(p));
  const streetParts: string[] = [];
  let city = '';

  for (const p of filtered) {
    if (/^\d{5}$/.test(p)) continue;
    if (/^\d+\s*$/.test(p) && streetParts.length === 0) {
      streetParts.push(p);
    } else if (
      streetParts.length < 2 &&
      (/^(rue|avenue|av\.|bd|boulevard|place|pl\.|impasse|chemin|cours|allée|square|quai)\s/i.test(p) ||
       (streetParts.length === 1 && /^\d+$/.test(streetParts[0])))
    ) {
      streetParts.push(p);
    } else if (!city && streetParts.length >= 1 && p.length >= 2 && p.length <= 50 && !/^\d+$/.test(p)) {
      city = p;
    }
  }

  const street = streetParts.length > 0
    ? streetParts.join(' ').replace(/\s+/g, ' ')
    : filtered[0] || parts[0];
  const hasPostal = !!postal;
  const hasCity = !!city;

  if (hasPostal && hasCity) return `${street}, ${postal} ${city}`;
  if (hasPostal) return `${street}, ${postal}`;
  if (hasCity) return `${street}, ${city}`;
  return street || trimmed;
}

// Fonction pour convertir le délai d'annulation en texte lisible
// Peut utiliser cancellationPolicy (FLEXIBLE, MODERATE, STRICT) ou cancellationDeadlineDays
export function getCancellationPolicyText(
  days?: number, 
  policy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT'
): string {
  // Si une politique est fournie, l'utiliser en priorité
  if (policy) {
    switch (policy) {
      case 'FLEXIBLE':
        return 'Annulation gratuite jusqu\'à 24h avant';
      case 'MODERATE':
        return 'Annulation gratuite jusqu\'à 5 jours avant';
      case 'STRICT':
        return 'Annulation gratuite jusqu\'à 14 jours avant';
      default:
        break;
    }
  }
  
  // Sinon, utiliser cancellationDeadlineDays
  if (days === undefined || days === null || days === 0) {
    return 'Annulation gratuite';
  } else if (days === -1) {
    return 'Non annulable';
  } else if (days === 1) {
    return 'Annulation gratuite jusqu\'à 1 jour avant';
  } else {
    return `Annulation gratuite jusqu'à ${days} jours avant`;
  }
}

/** Constantes des frais de service (même calcul partout : réservation, modification, fiche bien). */
export const SERVICE_FEE_PERCENT = 8;
export const SERVICE_FEE_MIN_EUR = 1.5;

/**
 * Frais de service : 8 % du montant de base, avec minimum 1,50 €.
 * Si 8 % du montant est inférieur à 1,50 €, on applique 1,50 €.
 */
export function getServiceFee(baseAmount: number, percent: number = SERVICE_FEE_PERCENT, minFee: number = SERVICE_FEE_MIN_EUR): number {
  return Math.max(baseAmount * (percent / 100), minFee);
}

/**
 * Montant total TTC avec frais de service : base + frais (8 %, min 1,50 €).
 */
export function addServiceFee(baseAmount: number, percent: number = SERVICE_FEE_PERCENT, minFee: number = SERVICE_FEE_MIN_EUR): number {
  return baseAmount + getServiceFee(baseAmount, percent, minFee);
}

/**
 * Pour une différence de prix (modification de résa) : si > 0, retourne (différence + frais de service),
 * les frais étant 8 % de la différence avec minimum 1,50 €. Si différence ≤ 0 (remboursement), retourne la valeur telle quelle.
 */
export function priceDifferenceWithServiceFee(priceDifference: number, percent: number = SERVICE_FEE_PERCENT, minFee: number = SERVICE_FEE_MIN_EUR): number {
  if (priceDifference > 0) return addServiceFee(priceDifference, percent, minFee);
  return priceDifference;
}

/**
 * Retourne l'image par défaut d'un bien selon son type.
 * Utilisé quand un bien n'a pas encore de photos.
 *   - parking / voiture  → /parking.png
 *   - storage / stockage → /stockage.png
 *   - cave / box         → /cave.png
 */
export function getDefaultPlaceImage(type?: string | null): string {
  const t = (type ?? '').toLowerCase();
  if (t === 'parking' || t === 'voiture' || t === 'car') return '/parking.png';
  if (t === 'storage' || t === 'stockage' || t === 'warehouse' || t === 'entrepôt' || t === 'entrepot') return '/stockage.png';
  if (t === 'cave' || t === 'box' || t === 'box/cave') return '/cave.png';
  // fallback générique : parking (type le plus courant)
  return '/parking.png';
}

/**
 * Retourne la première photo valide d'un bien, ou l'image par défaut selon son type.
 *
 * "Valide" = URL absolue (http/https). Les chemins relatifs comme "/fond.jpg" sont des
 * placeholders du backend qui n'existent pas dans le bundle Capacitor → on les ignore.
 */
export function getValidPhoto(photos: string[] | null | undefined, type?: string | null): string {
  if (Array.isArray(photos)) {
    const valid = photos.find(p => typeof p === 'string' && p.startsWith('http'));
    if (valid) return valid;
  }
  return getDefaultPlaceImage(type);
}

/**
 * Retrouve le montant de base (hors frais) à partir du total TTC payé (base + frais 8 %, min 1,50 €).
 * Utilisé pour calculer l'ancienne base lors d'une modification de résa.
 */
export function baseFromTotal(total: number, percent: number = SERVICE_FEE_PERCENT, minFee: number = SERVICE_FEE_MIN_EUR): number {
  if (total <= 0) return 0;
  const candidateMinFee = total - minFee; // base si les frais étaient le minimum
  const threshold = minFee / (percent / 100); // base au-dessus de laquelle les frais = percent%
  if (candidateMinFee < threshold) return Math.round(candidateMinFee * 100) / 100;
  return Math.round((total / (1 + percent / 100)) * 100) / 100;
}
