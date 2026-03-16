/** Capacitor: 5001 pages pour export statique. Vercel: 1 seule pour limiter la taille du déploiement. */
export function generateStaticParams() {
  if (process.env.CAPACITOR_BUILD === '1') {
    return Array.from({ length: 300 }, (_, i) => ({ id: String(i) }));
  }
  return [{ id: '0' }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
