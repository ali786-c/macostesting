# Modifications OAuth2 Google - Résumé des changements

## 📋 Vue d'ensemble

Modifications effectuées pour respecter les spécifications OAuth2 Google :
1. Le frontend redirige vers le backend Spring (pas d'appel direct à Google)
2. Le frontend ne gère pas le `redirect_uri` (géré par Spring)
3. Création de la route de callback `/auth/google/callback` pour recevoir le token/code

## ✅ Modifications effectuées

### 1. Configuration des URLs backend (`src/services/api.ts`)

**Avant** : URL de production forcée même en local
```typescript
export const getBaseURLForOAuth2 = (): string => {
  const productionURL = "https://rentoall.onrender.com";
  return productionURL; // Toujours production
};
```

**Après** : URL selon l'environnement
```typescript
export const getBaseURLForOAuth2 = (): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const backendURL = isProduction 
    ? "https://rentoall.onrender.com" 
    : "http://localhost:8080";
  return backendURL;
};
```

### 2. Page de login (`src/app/auth/login/page.tsx`)

**Modification** : Utilisation de `getBaseURLForOAuth2()` pour obtenir l'URL du backend selon l'environnement.

- **Local** : `http://localhost:8080/oauth2/authorization/google`
- **Production** : `https://rentoall.onrender.com/oauth2/authorization/google`

### 3. Page de signup (`src/app/auth/signup/page.tsx`)

**Modification** : Même changement que pour la page de login.

### 4. Route de callback principale (`src/app/auth/callback/page.tsx`)

**Création** : Route `/auth/callback` qui correspond à la redirection du backend :
- ✅ Réception du **token JWT** dans l'URL (`?token=xxx`)
- ✅ Extraction du token depuis les query parameters
- ✅ Stockage du token dans `localStorage` avec la clé `authToken`
- ✅ Récupération des informations utilisateur via l'API
- ✅ Stockage des informations utilisateur dans `localStorage`
- ✅ Gestion des erreurs
- ✅ Redirection vers `/search-parkings` après succès

⚠️ **Note** : Le backend redirige vers `/auth/callback` (pas `/auth/google/callback`). Cette route est la route principale à utiliser.

## 📝 Points importants pour le backend

Le backend Spring doit :

1. **Upsert l'utilisateur en DB** après authentification Google réussie (email + google sub)

2. **Rediriger vers** : `{FRONTEND_URL}/auth/callback?token={JWT_TOKEN}`
   - ⚠️ **IMPORTANT** : La route est `/auth/callback` (pas `/auth/google/callback` ni `/auth/oauth2/callback`)
   - Le token JWT est passé dans les query parameters
   - Le frontend extrait le token et le stocke dans `localStorage`

3. **Gérer le redirect_uri** : `/login/oauth2/code/google` (géré automatiquement par Spring Security)

## 🔍 Fichiers modifiés

- ✅ `src/services/api.ts` - Fonction `getBaseURLForOAuth2()` mise à jour
- ✅ `src/app/auth/login/page.tsx` - Utilisation de la fonction pour l'URL backend
- ✅ `src/app/auth/signup/page.tsx` - Utilisation de la fonction pour l'URL backend
- ✅ `src/app/auth/callback/page.tsx` - **NOUVEAU** - Route de callback principale (correspond à la redirection du backend)

## 📚 Documentation

- `GOOGLE_OAUTH_SPECS.md` - Spécifications complètes OAuth2 Google
- `FRONTEND_OAUTH2_GUIDE.md` - Guide pratique avec checklist et dépannage

## ⚠️ Notes importantes

1. **Route de callback** : Le backend redirige vers `/auth/callback?token=xxx` (cette route a été créée)
2. **Anciennes routes** : Les routes `/auth/oauth2/callback` et `/auth/google/callback` existent toujours mais ne sont pas utilisées par le backend actuel
3. **Token JWT** : Le token est passé directement dans l'URL par le backend, pas besoin d'échanger un code
