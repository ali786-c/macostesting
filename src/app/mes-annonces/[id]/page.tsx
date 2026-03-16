import { redirect } from 'next/navigation';

/** Requis pour output: export — pré-rendre au moins une page pour la route dynamique */
export function generateStaticParams() {
  return [{ id: '0' }];
}

/**
 * Route legacy mes-annonces/[id] : redirection vers /host/my-places.
 * Évite les appels aux APIs /announcements qui n'existent pas sur le backend.
 */
export default function MesAnnoncesIdRedirectPage() {
  redirect('/host/my-places');
}
