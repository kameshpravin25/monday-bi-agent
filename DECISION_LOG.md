# Decision Log

## Tech Stack Choices

### Next.js 14 with App Router
Chose Next.js for three reasons:
1. API routes eliminate the need for a separate backend server
2. Zero-config Vercel deployment (meets the "testable without local setup" requirement)
3. React Server Components for efficient rendering

Alternative considered: Plain Express + React SPA. Rejected because it adds deployment complexity and requires CORS handling.

### Google Gemini 2.0 Flash
Selected over GPT-4 for:
- Faster response times (critical for conversational UX)
- Large context window (can fit entire board data in a single prompt)
- Cost-effective for this use case

### Vanilla CSS over Tailwind
The UI has a specific CRED-like design language — dark, minimal, typographic. Custom CSS gives precise control over the design system without framework overhead.

### Monday.com GraphQL API (direct)
Chose direct API over MCP because:
- Simpler deployment (no MCP server to host)
- Full control over pagination and error handling
- More reliable for production use

---

## Key Assumptions

1. **Board structure is unknown at build time.** The agent dynamically fetches column definitions and data, so it works with any board structure the user creates when importing the Excel files.

2. **All data fits in context.** For typical Monday.com boards (under 1000 items), the full dataset fits within Gemini's context window. For very large boards, this would need chunking/summarization.

3. **Read-only access is sufficient.** As specified, the agent only reads data. No writes or mutations to Monday.com boards.

4. **Data is messy by design.** The normalizer handles common issues (inconsistent dates, currency formats, empty fields) but cannot fix fundamentally wrong data (e.g., revenue stored in a text field with no numeric value).

---

## Leadership Updates Interpretation

"The agent should help prepare data for leadership updates" is interpreted as: when a user asks for a "leadership update" or "executive summary," the agent should produce a structured, presentation-ready output covering:

- **Key Metrics**: active work orders, deal pipeline value, conversion rates
- **Trends**: quarter-over-quarter comparisons, sector breakdowns
- **Attention Items**: overdue work orders, stalled deals, data quality issues
- **Recommendations**: brief, actionable next steps

The agent's system prompt includes instructions to format these responses with clear headers and bullet points suitable for copy-pasting into a presentation or email.

---

## Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Fetch all data on each query | Always fresh data, no stale cache | Slower responses for large boards |
| Single LLM call with full context | Simple architecture, accurate analysis | Token-heavy for large datasets |
| No database/caching layer | Zero infrastructure to manage | Cannot track historical trends |
| Client-side conversation state | No server-side storage needed | History lost on page refresh |

---

## What I'd Do With More Time

1. **Caching layer** — Cache Monday.com data for 5 minutes to reduce API calls and speed up responses
2. **Streaming responses** — Use Gemini's streaming API for real-time token output instead of waiting for the full response
3. **Chart generation** — Render simple bar/pie charts for metric-heavy responses
4. **Conversation persistence** — Store chat history in localStorage or a database
5. **Board auto-detection** — Automatically identify which boards are "Work Orders" vs "Deals" based on column structure instead of listing all boards
