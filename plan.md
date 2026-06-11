# AI Companion App — Architecture & Implementation Plan

## Overview
A personal-use mobile/iPad PWA chat application where the user interacts with an AI companion that has persistent memory, dynamic personality, emotional state, and social features (朋友圈/Moments). Built with a Node.js+Express backend, Python FastAPI vector service, and React PWA frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (PWA)                        │
│            React + Vite + Tailwind CSS                   │
│    ┌──────────┬──────────────┬──────────────┐           │
│    │   Chat   │   Moments    │   Settings   │           │
│    └──────────┴──────────────┴──────────────┘           │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API + SSE
┌─────────────────────────┴───────────────────────────────┐
│                Backend (Node.js + Express)               │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Chat   │ │ Memory   │ │ Emotion  │ │  Moments    │ │
│  │ Routes │ │ System   │ │ Engine   │ │  + Cron     │ │
│  └────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ DeepSeek│ │ OpenRouter│ │  Mimo    │ │  Web Tools  │ │
│  │ (Chat) │ │ (Embed)  │ │ (Vision) │ │ (Search)    │ │
│  └────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │        SQLite (better-sqlite3) + FTS5        │      │
│  │  Messages | Summaries | Memory | Moments     │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP
┌─────────────────────────┴───────────────────────────────┐
│          Vector Service (Python FastAPI)                 │
│                  ChromaDB                               │
│          Store/Query memory embeddings                   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (PWA) |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3, FTS5 for full-text search |
| Vector DB | ChromaDB (Python FastAPI service) |
| Chat LLM | DeepSeek direct API — `deepseek-v4-flash` |
| Vision LLM | Mimo direct API — `mimo-v2.5` |
| Embeddings | OpenRouter — `baai/bge-m3` (1024 dims, $0.01/M, multilingual) |
| Process Mgmt | PM2 |
| Encryption | Node.js crypto (AES-256-GCM) |
| Exposure | Cloudflare Tunnel |

## Directory Structure

```
ai-gf/
├── plan.md
├── .gitignore
├── .env                          # credentials (gitignored)
├── creds.txt                     # original creds (gitignored)
├── ecosystem.config.js           # PM2 config
├── server/
│   ├── package.json
│   ├── index.js                  # Express entry point
│   ├── config.js                 # Centralized configuration
│   ├── db/
│   │   ├── schema.sql            # SQLite schema
│   │   ├── database.js           # DB connection + helpers
│   │   └── crypto.js             # AES-256-GCM field encryption
│   ├── ai/
│   │   ├── llm.js                # DeepSeek chat API (SSE streaming)
│   │   ├── embedding.js          # OpenRouter embedding API
│   │   ├── vision.js             # Mimo vision API
│   │   ├── memory.js             # Memory system (summary, RAG, extraction)
│   │   ├── emotion.js            # Dynamic emotion state engine
│   │   ├── personality.js        # Personality system (3-layer)
│   │   └── webtools.js           # Web search + fetch tools
│   ├── routes/
│   │   ├── chat.js               # Chat endpoints
│   │   ├── moments.js            # Moments/朋友圈 endpoints
│   │   └── agent.js              # Agent status/config endpoints
│   └── cron/
│       └── moments-cron.js       # 12 random daily moment checks
├── vector-service/
│   ├── requirements.txt
│   └── main.py                   # FastAPI + ChromaDB
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.json         # PWA manifest
    │   └── icons/                # PWA icons
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   └── client.js         # API client + SSE handler
        ├── components/
        │   ├── ChatView.jsx      # Chat conversation view
        │   ├── MessageBubble.jsx # Individual message
        │   ├── InputBar.jsx      # Message input
        │   ├── MomentsFeed.jsx   # Moments feed
        │   ├── MomentCard.jsx    # Individual moment
        │   ├── MomentComposer.jsx# Create new moment
        │   ├── Navigation.jsx    # Bottom nav bar
        │   └── SettingsView.jsx  # Settings page
        ├── pages/
        │   ├── ChatPage.jsx
        │   ├── MomentsPage.jsx
        │   └── SettingsPage.jsx
        └── styles/
            └── index.css         # Tailwind + custom styles
```

## Database Schema

### messages
Full retention of all messages (never physically deleted).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment ID |
| conversation_id | TEXT | Conversation UUID |
| role | TEXT | 'user' or 'assistant' |
| content | TEXT | Message content (encrypted if sensitive) |
| encrypted | INTEGER | 1 if content is encrypted |
| metadata | TEXT | JSON extra data |
| created_at | DATETIME | Timestamp |

### messages_fts (FTS5 Virtual Table)
Full-text search index on messages.content with unicode61 tokenizer.

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| title | TEXT | Conversation title |
| created_at | DATETIME | Created |
| updated_at | DATETIME | Last message time |

### summaries (Rolling Summaries)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| conversation_id | TEXT | FK to conversation |
| summary | TEXT | Generated summary |
| start_msg_id | INTEGER | First message ID in range |
| end_msg_id | INTEGER | Last message ID in range |
| created_at | DATETIME | When summary was generated |

### memory_fragments
Extracted facts, preferences, and emotion fragments.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| conversation_id | TEXT | Source conversation |
| type | TEXT | 'fact' / 'preference' / 'emotion' |
| content | TEXT | Fragment text |
| vector_id | TEXT | ChromaDB vector ID |
| entities | TEXT | JSON array of named entities |
| created_at | DATETIME | Extraction time |

### memory_fts (FTS5)
Full-text search on memory_fragments.content.

### emotion_state
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Always 1 (singleton) |
| emotions | TEXT | JSON: {happiness, sadness, anger, surprise, fear, disgust, affection} |
| last_updated | DATETIME | Last update time |

### moments (朋友圈 Posts)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| content | TEXT | Post text |
| images | TEXT | JSON array of image paths |
| ai_seen | INTEGER | 0=unseen, 1=seen by AI |
| created_at | DATETIME | Post time |

### moment_interactions
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| moment_id | INTEGER | FK to moments |
| type | TEXT | 'like' / 'comment' |
| content | TEXT | Comment text (if comment) |
| created_at | DATETIME | Interaction time |

## Three-Layer Memory System

### Layer 1: Full Retention
- Every message stored in SQLite `messages` table
- Never physically deleted
- Provides complete conversation history

### Layer 2: Rolling Summaries
- Every 50 messages, generate a summary using DeepSeek
- Summaries stored in `summaries` table
- When building context: load all summaries + last N messages
- Reduces token usage for long conversations

### Layer 3: RAG (Retrieval-Augmented Generation)
**Extraction Pipeline (async, after each conversation turn):**
1. Send recent messages to DeepSeek with extraction prompt
2. Extract: facts (factual info), preferences (likes/dislikes), emotions (emotional events)
3. Generate embeddings via OpenRouter (bge-m3)
4. Store in both SQLite (memory_fragments + FTS5) and ChromaDB

**Triple Recall + RRF Fusion:**
1. **FTS5 keyword search**: Search memory_fragments_fts for keyword matches
2. **Vector semantic search**: Query ChromaDB with embedded query for semantic matches
3. **Entity aggregation**: Search by named entities extracted from current message
4. **RRF Fusion**: Combine results using Reciprocal Rank Fusion:
   - `RRF_score(d) = Σ 1/(k + rank_i(d))` where k=60
   - Deduplicate and rank combined results
   - Take top-K results for context injection

## Three-Layer Personality System

### Layer 1: Fixed Personality
Base character prompt that is always included in system prompt:
- Name, age, personality traits, speaking style, background story
- Configurable via settings

### Layer 2: Dynamic Emotion State
Real-time emotion engine tracking emotional state:
- 7 dimensions: happiness, sadness, anger, surprise, fear, disgust, affection
- Updated after each conversation turn via LLM analysis
- Emotions decay over time (half-life: 2 hours)
- Affects response style and tone
- Included in system prompt as current emotional state

### Layer 3: Dynamic Memory Overlay
Recalled memory fragments dynamically injected:
- Results from RAG triple recall
- Formatted as "memories you recall" section
- Provides continuity and personalization

## System Prompt Assembly

```
[System Prompt] = Fixed Personality
                + "\n\n--- Current Emotional State ---\n" + Emotion State
                + "\n\n--- Memories You Recall ---\n" + Retrieved Memories
                + "\n\n--- Conversation Summary ---\n" + Rolling Summaries
                + [Recent Messages as conversation history]
```

## Moments (朋友圈) System

### User Actions
- Create posts with text + optional images
- View feed of own posts + AI interactions
- Delete posts

### AI Cron System
- 12 monitoring jobs per day, scheduled at random times
- Time range: 7:00 AM - 11:00 PM
- Each job:
  1. Check for unseen posts (`ai_seen = 0`)
  2. For posts with images: use Mimo vision to understand image content
  3. Generate AI reaction (like + optional comment) using DeepSeek
  4. Store interaction in `moment_interactions`
  5. Mark post as `ai_seen = 1`
- Schedule regenerated daily at midnight

### AI Response Strategy
- AI reacts as the companion character would
- Considers current emotion state
- References shared memories when relevant
- Comments are natural, supportive, in-character

## Web Tools

### web_search(query)
- DuckDuckGo lite HTML scraping (no API key needed)
- Returns top 5 results with title, URL, snippet
- Available as function call to the AI

### web_fetch(url)
- Fetches URL content
- Strips HTML to readable text (cheerio)
- Truncates to reasonable length
- Available as function call to the AI

### Integration
- DeepSeek function calling with tool definitions
- AI decides when to search/fetch
- Results injected into conversation context

## API Endpoints

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/chat/send | Send message, get streaming response (SSE) |
| GET | /api/chat/history/:conversationId | Get conversation history |
| GET | /api/chat/conversations | List all conversations |
| POST | /api/chat/conversations | Create new conversation |
| DELETE | /api/chat/conversations/:id | Delete conversation |

### Moments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/moments | Create a moment (text + images) |
| GET | /api/moments | Get all moments with interactions |
| GET | /api/moments/:id | Get specific moment |
| DELETE | /api/moments/:id | Delete a moment |
| POST | /api/moments/:id/image | Upload image for moment |

### Agent
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/agent/status | Get agent emotion state + stats |
| GET | /api/agent/personality | Get current personality config |
| PUT | /api/agent/personality | Update personality config |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | / | Serve frontend (static files) |

## Frontend Design

### UI Layout (Mobile-first, WeChat-inspired)
- **Bottom Navigation**: Chat | Moments | Settings
- **Chat Page**: Conversation list → tap → chat view with streaming
- **Moments Page**: Scrollable feed, compose button (FAB)
- **Settings Page**: Personality config, conversation management

### Color Scheme
- Primary: WeChat green (#07C160)
- Background: #F5F5F5 (light gray)
- User bubbles: #95EC69 (green)
- AI bubbles: #FFFFFF (white)
- Text: #1A1A1A / #666666

### PWA Features
- Installable to home screen
- Offline-capable (cached shell)
- Responsive (mobile + iPad)

## Deployment

### PM2 (ecosystem.config.js)
- Node.js server: `server/index.js`
- Python vector service: `uvicorn main:app`
- Auto-restart, log management

### Cloudflare Tunnel
- Configure via `cloudflared` CLI
- Map tunnel to localhost:3000
- Custom domain (optional)

### Environment Variables (.env)
```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

MIMO_API_KEY=sk-xxx
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5

OPENROUTER_API_KEY=sk-xxx
EMBEDDING_MODEL=baai/bge-m3

ENCRYPTION_KEY=auto-generated-32-byte-hex

VECTOR_SERVICE_URL=http://localhost:8000

PORT=3000
```
