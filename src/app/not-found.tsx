import Link from 'next/link';

/**
 * Page 404 pour export statique (Capacitor + web).
 * Exportée dans out/ pour les routes inconnues.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 overflow-x-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)',
      }}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page introuvable</h1>
      <p className="text-gray-600 mb-6 text-center">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#2D5016] text-white rounded-lg font-medium hover:opacity-90 min-h-[44px] flex items-center justify-center touch-manipulation"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
