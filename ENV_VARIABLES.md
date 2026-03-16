# Variables d'environnement pour le Chatbot RAG

Copiez ces variables dans votre fichier `.env.local` :

```env
# OpenAI API Key (required for chatbot)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITEMAP_URL=http://localhost:3000/sitemap.xml

# Indexing Parameters
MAX_INDEX_PAGES=50
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# RAG Search Parameters
TOP_K_CHUNKS=5
MIN_SIMILARITY_SCORE=0.7

# Security (optional - for /api/index endpoint)
INDEX_API_KEY=your-secret-key-here
```
