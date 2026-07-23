# Midnight Tarot

Midnight Tarot is a dark, cinematic tarot reading app for people who want to sit with a question after midnight.

It is not built to predict your life. It is built to slow the room down: choose a spread, set an intention, shuffle a full 78-card deck, draw from a moving fan, reveal each card, and receive an AI-assisted reading tied to the exact cards you pulled.

The app now supports **English and Chinese**. The language switch lives only on the first screen, so a reading keeps one clear voice from start to finish.

## Why It Feels Different

Most tarot apps feel like forms with card images attached.

Midnight Tarot tries to feel like a private table in a quiet room:

- a complete Rider-Waite-Smith deck
- animated shuffle, card fan, draw, and reveal flow
- six spreads for daily guidance, direction, relationships, career, choices, and deep reads
- structured AI readings powered by DeepSeek
- local fallback readings when the API is unavailable
- saved reading history in the browser
- shareable result images
- free follow-up questions for the same spread
- sound, mute, reduced-motion support, and keyboard-friendly card selection

## Reading Flow

```text
choose a language
  ↓
choose a spread
  ↓
write or silently hold a question
  ↓
shuffle the full deck
  ↓
connect with the question
  ↓
draw cards from the fan
  ↓
reveal the spread
  ↓
receive the reading
  ↓
ask follow-up questions
```

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- GSAP and `@gsap/react`
- Framer Motion
- DeepSeek-compatible OpenAI SDK calls
- Supabase REST API for optional reading/follow-up persistence

## Run It Locally

### 1. Clone the project

```bash
git clone https://github.com/Cynthia0209/midnight-tarot.git
cd midnight-tarot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your local environment file

```bash
cp .env.example .env.local
```

Open `.env.local` and add your own DeepSeek API key:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_TIMEOUT_MS=45000
DEEPSEEK_FOLLOWUP_TIMEOUT_MS=30000
```

You can get a DeepSeek API key from the DeepSeek platform. The app uses the OpenAI SDK with:

```text
https://api.deepseek.com
```

If `DEEPSEEK_API_KEY` is missing, invalid, times out, or returns malformed JSON, the app still works by generating a local card-based reading from the real cards selected in the session.

### 4. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Optional: Supabase Follow-Up History

The app can run without Supabase. Follow-up questions still work by sending the completed reading payload to the local API route, but cloud history may not survive refreshes.

If you want persistent follow-up history:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add these variables to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANON_CLIENT_HASH_SECRET=replace-me-with-a-long-random-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Yes for AI readings | Your DeepSeek API key. |
| `DEEPSEEK_TIMEOUT_MS` | No | Reading request timeout. |
| `DEEPSEEK_FOLLOWUP_TIMEOUT_MS` | No | Follow-up request timeout. |
| `NEXT_PUBLIC_SITE_URL` | No | Used when generating links or share context. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Browser-side Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Browser-side Supabase anon key. |
| `SUPABASE_URL` | Optional | Server-side Supabase project URL. |
| `SUPABASE_ANON_KEY` | Optional | Server-side anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-side service role key for persistence. |
| `ANON_CLIENT_HASH_SECRET` | Optional | Secret used to hash anonymous browser clients. |

## Scripts

```bash
npm run dev      # start local development server
npm run build    # production build
npx tsc --noEmit # type-check
```

Note: the current `npm run lint` script uses `next lint`, which is no longer supported the same way by this installed Next.js version.

## Card Assets

The tarot card images are from the Wikimedia Commons “Rider-Waite-Smith tarot deck (Geldard)” collection.

The original 1909 Rider-Waite-Smith artwork is public domain in the United States and in jurisdictions where protection ends 70 years after the artist’s death. Per-card source notes live in:

```text
public/cards/SOURCE.md
```

To download the card assets again:

```bash
node scripts/download-tarot-assets.mjs
```

## Safety Note

Midnight Tarot is for reflection, journaling, and self-inquiry. It is not medical, legal, financial, safety, or crisis advice.

Treat the cards as a mirror, not a command.
