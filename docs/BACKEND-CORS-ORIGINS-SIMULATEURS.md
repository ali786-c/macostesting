# Backend : CORS, URL API et simulateurs iOS / Android

> Documentation de référence pour la configuration backend (Spring Boot) et les appels depuis l’app mobile Capacitor.

---

## Table des matières

1. [URL de l’API](#1-url-de-lapi)
2. [Configuration CORS](#2-configuration-cors)
3. [Exemple Spring (SecurityConfig)](#3-exemple-spring-securityconfig)
4. [Broken Pipe côté serveur](#4-broken-pipe-côté-serveur)
5. [Erreurs côté app (iOS)](#5-erreurs-côté-app-ios)
6. [Récapitulatif](#6-récapitulatif)

---

## 1. URL de l’API

Depuis l’app (Xcode, Android Emulator, devices réels), **toutes les requêtes API** ciblent :

```
https://rentoall.onrender.com/api
```

| Composant      | Valeur                         |
|----------------|--------------------------------|
| Base backend   | `https://rentoall.onrender.com` |
| Préfixe routes | `/api`                         |

Côté frontend, `NEXT_PUBLIC_API_URL` et la config prod pointent déjà vers cette URL.

---

## 2. Configuration CORS

### Pourquoi c’est important

Les requêtes depuis l’app Capacitor partent d’origines non standard (`capacitor://localhost`, `https://localhost`). Sans CORS adapté, le navigateur/WebView bloque les appels.

### Origines selon l’environnement

| Origine                 | Contexte                                      |
|-------------------------|-----------------------------------------------|
| `https://localhost`     | App Capacitor iOS avec `iosScheme: "https"` (recommandé) |
| `capacitor://localhost` | App Capacitor iOS par défaut                  |
| `ionic://localhost`     | Anciennes versions Capacitor / Ionic          |
| `https://rentoall.fr`   | Site web en production                        |
| `http://localhost:3000` | Dev local Next.js                             |

### Deux approches possibles

| Approche           | Config Spring                          | Usage                          |
|--------------------|----------------------------------------|--------------------------------|
| Toutes les origines | `setAllowedOriginPatterns(List.of("*"))` | Rapide, accepte toutes les origines |
| Origines explicites | Liste d’URLs précises                   | Plus sécurisé en production    |

---

## 3. Exemple Spring (SecurityConfig)

### Option A : Toutes les origines (configuration actuelle)

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(List.of("*"));  // Accepte toutes les origines
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setExposedHeaders(List.of("Authorization", "Link", "X-Total-Count"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

### Option B : Origines explicites (pour la prod)

```java
configuration.setAllowedOriginPatterns(List.of(
    "https://rentoall.fr",
    "https://rentoall.onrender.com",
    "https://localhost",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost:3000"
));
```

### Routes publiques (exemple)

Les routes suivantes sont typiquement en `permitAll()` :

- `/api/auth/**`
- `/api/users/register`
- `/api/locations/search`
- `/api/locations/by-postal-code/**`
- `/api/geocoding/**`
- `/api/stripe/webhook`
- `/h2-console/**`

---

## 4. Broken Pipe côté serveur

Si le backend log « Broken pipe », le client a fermé la connexion avant la fin de la réponse.

| Cause                | Solution |
|----------------------|----------|
| **Render cold start** | Free tier : le service dort après ~15 min. Premier appel lent (30–60 s). → Côté front : timeout 60 s sur les requêtes sensibles. |
| **CORS mal configuré** | Vérifier les origines autorisées (voir §2). |
| **Requête annulée**   | Vérifier les `useEffect` et dépendances pour éviter les doubles requêtes. |
| **HTTP sur iOS**      | L’API est en HTTPS → OK. Pour du HTTP local : `cleartext: true` dans Capacitor + exception ATS dans Info.plist. |

---

## 5. Erreurs côté app (iOS)

| Erreur | Signification | Que faire |
|--------|---------------|-----------|
| **Network Error / ERR_NETWORK** (Axios) | Le WebView bloque les requêtes vers l’API (CORS, ATS, restriction origin). | **Fix** : Activer `CapacitorHttp` dans `capacitor.config.ts` → `plugins.CapacitorHttp.enabled: true`. Cela patch `fetch` et `XMLHttpRequest` pour utiliser le HTTP natif (bypass WebView). |
| **Failed to fetch RSC payload… Falling back to browser navigation** | Avec `output: "export"`, Next.js ne peut pas servir le payload RSC. Ou l’origin est encore `capacitor://localhost` (iosScheme non appliqué). | **Fix** : `prefetch={false}` sur les Links vers `/parking/[id]`. Vérifier l’origin : `console.log(window.location.origin)` dans l’app. Si toujours `capacitor://localhost` → **rebuild + sync** : `npm run build:capacitor && npx cap sync ios` puis supprimer l’app du simulateur et réinstaller. |
| **AJAXError: Load failed (0) — api.maptiler.com** | Les tuiles MapTiler bloquées par CORS. | Mettre `iosScheme: "https"` dans `capacitor.config.ts` pour utiliser `https://localhost`. |
| **404 sur POST /api/users/{id}/device-tokens** | L’endpoint n’est pas encore implémenté côté backend. | Le front gère le 404 sans crasher. Implémenter `POST /api/users/{userId}/device-tokens` côté backend pour activer les push notifications. |

---

## 6. Récapitulatif

| Question | Réponse |
|----------|---------|
| **URL API utilisée par l’app ?** | `https://rentoall.onrender.com/api` |
| **CORS nécessaire ?** | Oui, pour l'app mobile (Capacitor) et le site web. |
| **Config actuelle OK ?** | Oui, `allowedOriginPatterns("*")` accepte toutes les origines. |
| **Origines principales à considérer ?** | `https://localhost`, `capacitor://localhost`, `ionic://localhost`, `https://rentoall.fr` |

---

*Rentoall — Configuration backend (CORS, simulateurs iOS & Android)*
