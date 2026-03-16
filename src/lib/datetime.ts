/**
 * Convention dates/heures avec le backend :
 * - Le backend envoie et reçoit toujours des instants en UTC (ISO 8601, ex. "2026-03-15T09:00:00.000Z").
 * - À l'affichage : convertir UTC → heure locale (toLocaleDateString / toLocaleTimeString ou helpers ci-dessous).
 * - À l'envoi : toujours envoyer en UTC via toApiDateTime (Date construite en heure locale → ISO UTC).
 *
 * Utilisation :
 * - Reçu du back (résa, créneaux, disponibilités) → fromApiDateTime(iso) puis afficher avec toLocaleDateString/toLocaleTimeString.
 * - Heures seules UTC (ex. availability.startTime "08:00") → utcTimeToLocalTimeString(dateStr, timeUtc) pour affichage.
 * - Envoi au back → construire Date en local (setHours, etc.) puis toApiDateTime(date).
 */

/** Convertit une Date (heure locale utilisateur) en chaîne ISO UTC pour l'API. */
export function toApiDateTime(date: Date): string {
  return date.toISOString();
}

/** Parse une chaîne ISO UTC reçue de l'API. Si pas de 'Z' ni offset, on suppose UTC. */
export function fromApiDateTime(iso: string): Date {
  if (!iso) return new Date(NaN);
  const s = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
  return new Date(s);
}

/** Date en YYYY-MM-DD en heure locale (évite le décalage UTC de toISOString). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convertit une heure UTC (HH:mm ou HH:mm:ss) pour une date donnée (YYYY-MM-DD) en heure locale "HH:mm".
 * Utilisé pour les disponibilités (availabilities) envoyées en UTC par le back.
 */
export function utcTimeToLocalTimeString(dateStr: string, timeUtc: string): string {
  if (!dateStr || !timeUtc) return timeUtc.slice(0, 5) || '00:00';
  const [h, m] = timeUtc.split(':').map(Number);
  const iso = `${dateStr}T${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeUtc.slice(0, 5) || '00:00';
  const lh = d.getHours();
  const lm = d.getMinutes();
  return `${String(lh).padStart(2, '0')}:${String(lm).padStart(2, '0')}`;
}
