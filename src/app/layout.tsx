import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { LanguageProvider } from "../contexts/LanguageContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { SearchProvider } from "../contexts/SearchContext";
import ChatWidget from "../components/chatbot/ChatWidget";
import MobileFooterContainer from "../components/MobileFooterContainer";
import CapacitorBackButton from "../components/CapacitorBackButton";
import SwipeBackGesture from "../components/SwipeBackGesture";
import PullToRefresh from "../components/PullToRefresh";
import CapacitorStorageInit from "../components/CapacitorStorageInit";
import CapacitorPushNotifications from "../components/CapacitorPushNotifications";
import CapacitorAppUrlListener from "../components/CapacitorAppUrlListener";
import CapacitorPlatformRoot from "../components/CapacitorPlatformRoot";
import CapacitorLayoutWrapper from "../components/CapacitorLayoutWrapper";
import OfflineScreen from "../components/OfflineScreen";
import ApiErrorToast from "../components/ui/api-error-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : new URL("http://localhost:3000"),
  title: "Rentoall - Locations de caves, parking et bien plus",
  description: "Trouvez un parking, box ou cave ou annexes près de chez vous.",
  icons: {
    icon: [
      { url: '/logoren.png?v=2', sizes: 'any', type: 'image/png' },
      { url: '/logoren.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/logoren.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/icon.png?v=2', sizes: 'any', type: 'image/png' },
    ],
    apple: [
      { url: '/logoren.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logoren.png?v=2',
  },
  openGraph: {
    title: "Rentoall - Locations de caves, parking et bien plus",
    description: "Trouvez un parking, box ou cave ou annexes près de chez vous.",
    images: [
      {
        url: "/fond.jpg",
        width: 1200,
        height: 630,
        alt: "Rentoall - Parking, box, cave près de chez vous",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rentoall - Locations de caves, parking et bien plus",
    description: "Trouvez un parking, box ou cave ou annexes près de chez vous.",
    images: [
      {
        url: "/fond.jpg",
        width: 1200,
        height: 630,
        alt: "Rentoall - Parking, box, cave près de chez vous",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/logoren.png?v=2" type="image/png" sizes="any" />
        <link rel="icon" href="/logoren.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/logoren.png?v=2" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/logoren.png?v=2" type="image/png" />
        <link rel="apple-touch-icon" href="/logoren.png?v=2" />
        <link rel="icon" type="image/png" href="/icon.png?v=2" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rentoall" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Forcer le rafraîchissement du favicon
                if (typeof document !== 'undefined') {
                  const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
                  link.type = 'image/png';
                  link.rel = 'shortcut icon';
                  link.href = '/logoren.png?v=' + new Date().getTime();
                  document.getElementsByTagName('head')[0].appendChild(link);
                }
                
                if (typeof window !== 'undefined') {
                  const storedIsLoggedIn = localStorage.getItem('finalIsLoggedIn') === 'true';
                  const storedUserType = localStorage.getItem('finalUserType');
                  const storedAuthToken = localStorage.getItem('authToken');
                  const isActuallyLoggedIn = storedIsLoggedIn || !!storedAuthToken;
                  window.__INITIAL_AUTH_STATE__ = {
                    isLoggedIn: isActuallyLoggedIn,
                    userType: storedUserType,
                    userName: localStorage.getItem('userName') || ''
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased font-sans`} suppressHydrationWarning>
        <LanguageProvider>
          <FavoritesProvider>
            <SearchProvider>
              <CapacitorPlatformRoot>
              <CapacitorStorageInit />
              <CapacitorPushNotifications />
              <CapacitorBackButton />
              <SwipeBackGesture />
              <PullToRefresh />
              <CapacitorAppUrlListener />
              <OfflineScreen />
              {/* Contenu : sur mobile pas de bandeau blanc, uniquement safe-area (notch) ; desktop = place pour le header */}
              <CapacitorLayoutWrapper className="layout-content-wrapper min-h-screen pb-mobile-footer md:pb-0">
                {children}
              </CapacitorLayoutWrapper>
              {/* Bot FAQ - Caché sur mobile (footer) pour éviter la superposition */}
              <div className="hidden md:block">
                <ChatWidget />
              </div>
              {/* Menu en bas - visible sur mobile et iOS/Android (Capacitor) */}
              <MobileFooterContainer />
              {/* Toast discret pour erreurs 500 du backend */}
              <ApiErrorToast />
            </CapacitorPlatformRoot>
            </SearchProvider>
          </FavoritesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
