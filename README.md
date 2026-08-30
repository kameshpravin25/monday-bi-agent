# Monday.com Business Intelligence Agent

An AI-powered conversational agent that connects to Monday.com boards and answers business intelligence queries for founders and executives.

## Architecture

```
User Query
    |
    v
[Next.js Frontend]  -- Clean dark chat UI (React)
    |
    v (POST /api/chat)
[API Route]         -- Request validation, error handling
    |
    v
[Agent Layer]       -- Gemini 2.0 Flash for query interpretation
    |
    v
[Monday.com API]    -- GraphQL queries with pagination
    |
    v
[Data Normalizer]   -- Date/currency/text cleaning + quality reports
    |
    v
[Gemini LLM]        -- Contextual analysis with full board data
    |
    v
Response with insights + data quality caveats
```

### Key Components

| File | Purpose |
|------|---------|
| `src/lib/monday.ts` | Monday.com GraphQL API integration with cursor-based pagination |
| `src/lib/normalize.ts` | Data cleaning — dates, currencies, text normalization + quality tracking |
| `src/lib/agent.ts` | AI agent — orchestrates data fetching, sends context to Gemini for analysis |
| `src/app/api/chat/route.ts` | POST endpoint for chat messages |
| `src/app/page.tsx` | Conversational chat interface |
| `src/app/globals.css` | Dark theme design system |

## Setup

### Prerequisites
- Node.js 18+
- Monday.com account with API token
- Google Gemini API key

### Monday.com Board Setup

1. Log into monday.com
2. Import `Deal funnel Data.xlsx` as a new board
3. Import `Work_Order_Tracker Data.xlsx` as a new board
4. Set up appropriate column types (dates, numbers, text, status)

### Environment Variables

Create `.env.local` in the project root:

```
MONDAY_API_TOKEN=your_monday_api_token
GEMINI_API_KEY=your_gemini_api_key
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables (`MONDAY_API_TOKEN`, `GEMINI_API_KEY`)
4. Deploy

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI**: Google Gemini 2.0 Flash
- **Data Source**: Monday.com GraphQL API
- **Styling**: Vanilla CSS (dark theme)
- **Deployment**: Vercel
