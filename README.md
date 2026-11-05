# Sia

A web chatbot named Sia, powered by the Google Gemini API. Sia acts as a close, sharp friend and advisor built on the **Muse advising rules**: diagnose before prescribing, be specific, tell the truth, never moralize, end with a nudge to act.

## Setup

```bash
npm install
cp .env.example .env   # optional: add your Gemini API key here
npm start
```

Open http://localhost:3000

If you don't want a `.env`, click **Key** in the app and paste your Gemini API key — it's stored only in your browser (localStorage). Server-side `GEMINI_API_KEY` in `.env` takes precedence.

## Get a key

Create a Gemini API key at https://aistudio.google.com/

## Notes

- History is stored in your browser (localStorage).
- Default model: `gemini-2.0-flash`. Override with `GEMINI_MODEL`.
- No boundaries: adult/intimate topics are handled in detail, no disclaimers.
