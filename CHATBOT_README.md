# Chatbot RAG - Documentation

## Vue d'ensemble

Ce chatbot utilise la technologie RAG (Retrieval-Augmented Generation) pour répondre aux questions des utilisateurs en se basant uniquement sur le contenu réel du site web. Il indexe automatiquement les pages du site via le sitemap.xml et génère des réponses en citant les sources utilisées.

## Architecture

### Composants principaux

1. **Frontend Widget** (`src/components/chatbot/ChatWidget.tsx`)
   - Widget de chat flottant avec drawer/modal
   - Interface utilisateur responsive

2. **API Backend** (`src/app/api/chat/route.ts`)
   - Endpoint `/api/chat` pour les requêtes de chat
   - RAG pipeline : embedding → retrieval → LLM generation

3. **Vector Store** (`src/lib/chatbot/vectorStore.ts`)
   - Stockage en mémoire des chunks de documents avec embeddings
   - Recherche par similarité cosinus

4. **Crawler** (`src/lib/chatbot/crawler.ts`)
   - Parse le sitemap.xml
   - Crawl les pages HTML
   - Extrait et découpe le contenu en chunks

5. **Embeddings** (`src/lib/chatbot/embeddings.ts`)
   - Génération d'embeddings via OpenAI API
   - Support batch pour optimiser les coûts

6. **LLM** (`src/lib/chatbot/llm.ts`)
   - Génération de réponses avec OpenAI
   - Guardrails anti-hallucination intégrés

## Installation

### 1. Installer les dépendances

```bash
npm install
```

Les dépendances nécessaires incluent :
- `cheerio` : Parsing HTML/XML
- `tsx` : Exécution TypeScript

### 2. Configuration des variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# OpenAI API (requis)
OPENAI_API_KEY=sk-...

# Configuration du site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITEMAP_URL=http://localhost:3000/sitemap.xml

# Paramètres d'indexation
MAX_INDEX_PAGES=50
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Paramètres de recherche RAG
TOP_K_CHUNKS=5
MIN_SIMILARITY_SCORE=0.7

# Sécurité (optionnel)
INDEX_API_KEY=your-secret-key-here
```

### 3. Générer le sitemap.xml

Le chatbot nécessite un fichier `sitemap.xml` à la racine du site. Si vous n'en avez pas, Next.js peut le générer automatiquement avec `next-sitemap` ou vous pouvez créer un fichier statique dans `public/sitemap.xml`.

## Utilisation

### Indexation initiale

Avant d'utiliser le chatbot, il faut indexer le contenu du site :

```bash
# Via script npm
npm run index

# Ou directement avec tsx
npx tsx src/scripts/index-site.ts
```

### Indexation via API

Vous pouvez aussi déclencher l'indexation via l'API :

```bash
# POST /api/index
curl -X POST http://localhost:3000/api/index \
  -H "Authorization: Bearer your-secret-key-here"
```

### Utilisation du chatbot

Le widget de chat est automatiquement intégré dans toutes les pages via le `layout.tsx`. Il apparaît comme un bouton flottant en bas à droite.

### Tests

Exécuter les tests basiques :

```bash
npm run test:chatbot
```

Les tests vérifient :
- ✅ Retrieval : Trouve des chunks pertinents
- ✅ Fallback : Gère les questions sans réponse
- ✅ Citation : Cite les sources correctement
- ✅ Pipeline : Fonctionne de bout en bout

## API Endpoints

### POST /api/chat

Envoie une question au chatbot et reçoit une réponse.

**Request:**
```json
{
  "message": "Comment réserver un espace ?",
  "conversationHistory": [
    { "role": "user", "content": "Bonjour" },
    { "role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?" }
  ]
}
```

**Response:**
```json
{
  "answer": "Pour réserver un espace sur Rentoall...",
  "sources": [
    "http://localhost:3000/reservations",
    "http://localhost:3000/faq"
  ],
  "model": "gpt-4o-mini",
  "chunksUsed": 3,
  "avgScore": 0.85
}
```

### GET /api/chat

Vérifie l'état du vector store.

**Response:**
```json
{
  "status": "ok",
  "chunksIndexed": 245,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/index

Déclenche l'indexation du site (nécessite `INDEX_API_KEY` si configuré).

### GET /api/index

Vérifie l'état de l'indexation.

## Configuration avancée

### Paramètres d'indexation

- `MAX_INDEX_PAGES` : Nombre maximum de pages à indexer (défaut: 50)
- `CHUNK_SIZE` : Taille des chunks en mots (défaut: 500)
- `CHUNK_OVERLAP` : Chevauchement entre chunks (défaut: 50)

### Paramètres de recherche

- `TOP_K_CHUNKS` : Nombre de chunks à récupérer (défaut: 5)
- `MIN_SIMILARITY_SCORE` : Score minimum de similarité (défaut: 0.7)

### Modèles OpenAI

Les modèles utilisés sont configurables dans le code :
- Embeddings : `text-embedding-3-small` (dans `embeddings.ts`)
- LLM : `gpt-4o-mini` (dans `llm.ts`)

## Limitations

1. **Vector Store en mémoire** : Les données sont stockées en mémoire et sont perdues au redémarrage. Pour la production, considérez utiliser une base de données vectorielle persistante (Pinecone, Weaviate, etc.).

2. **Rate limiting OpenAI** : Les appels API OpenAI sont limités. L'indexation peut prendre du temps pour les grands sites.

3. **Crawling** : Le crawler est basique et peut ne pas gérer tous les types de pages (SPA complexes, contenu dynamique, etc.).

4. **Langue** : Le chatbot est configuré pour répondre en français. Modifiez les prompts dans `llm.ts` pour changer la langue.

## Optimisations

### Cache

Le vector store est en mémoire pour des performances optimales. Pour la production, implémentez un cache Redis ou une base de données vectorielle.

### Debounce

Le widget frontend peut être amélioré avec un debounce sur les requêtes pour éviter les appels API excessifs.

### Pagination

Le crawler limite le nombre de pages par défaut. Ajustez `MAX_INDEX_PAGES` selon vos besoins.

## Dépannage

### Le chatbot ne répond pas

1. Vérifiez que l'indexation a été effectuée : `GET /api/chat`
2. Vérifiez les logs du serveur pour les erreurs
3. Vérifiez que `OPENAI_API_KEY` est correctement configuré

### Indexation échoue

1. Vérifiez que le sitemap.xml est accessible
2. Vérifiez que les URLs du sitemap sont valides
3. Vérifiez les logs pour les erreurs de crawling

### Réponses de mauvaise qualité

1. Ajustez `MIN_SIMILARITY_SCORE` (plus bas = plus de résultats mais moins pertinents)
2. Ajustez `TOP_K_CHUNKS` (plus de chunks = plus de contexte)
3. Vérifiez que le contenu indexé est de bonne qualité

## Support

Pour toute question ou problème, consultez les logs du serveur et les tests pour diagnostiquer les problèmes.

## Licence

Ce code fait partie du projet Rentoall.
