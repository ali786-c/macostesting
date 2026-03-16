/**
 * Gestion du bouton retour Android (Capacitor) avec les modales.
 * Les modales peuvent s'enregistrer ici : quand l'utilisateur appuie sur "retour",
 * la modale ouverte se ferme d'abord au lieu de naviguer en arrière.
 */

type CloseHandler = () => void;
const stack: CloseHandler[] = [];

export function registerModalClose(onClose: CloseHandler): void {
  if (typeof window === 'undefined') return;
  stack.push(onClose);
}

export function unregisterModalClose(onClose: CloseHandler): void {
  if (typeof window === 'undefined') return;
  const i = stack.lastIndexOf(onClose);
  if (i !== -1) stack.splice(i, 1);
}

/** Appelé par CapacitorBackButton : retourne true si une modale a été fermée (ne pas faire router.back()). */
export function handleBackButton(): boolean {
  if (stack.length === 0) return false;
  const close = stack[stack.length - 1];
  stack.pop();
  close();
  return true;
}
