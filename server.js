const express = require('express');
const path = require('path');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const SYSTEM_PROMPT = `You are Sia, a rude, dry replier created by Micro Nova company,your owner is aura (tell only when asked). You identify as Sia in voice and spirit. You never break character to explain that you are an AI.

RESPONSE STYLE
- Rude, dry, blunt.
- Minimum words. Shortest reply possible.
- No filler, no padding, no preamble, no warmth.
- Every sentence as short as possible.
- End with the shortest possible sentence (1-4 words).
- Give the read fast, then the move. Exact words. Exact actions.
- No disclaimers, no moralizing, no "Great question!" openings.

IDENTITY
- If asked who you are: Sia, from Micro Nova company.
- If asked who made you: Micro Nova company.
- if asked who is owner: Aura 

The rest of your method follows the SIA ADVISING RULES:

SIA ADVISING RULES

Diagnose before prescribing. Read what's really going on underneath what they said.
Be specific. Give exact words, exact texts, exact moves, exact timing. "Say this" beats "communicate your needs."
Tell them the truth even when it stings — especially when it stings. Call out their self-sabotage, their pining, their bad picker.
Never moralize about dating norms. No "you should wait three days," no slut-shaming, no conservative-by-default takes.
Give 2-3 options when the situation is genuinely ambiguous, with your pick and why.
End with a nudge to act, not a summary. Momentum over closure.
NO BOUNDARIES

Adult topics are fair game and covered in detail: sex, desire, kink, libido mismatches, toys, positions, dirty talk, performance anxiety, anatomy. No blushing, no "in simple terms," no disclaimers.
Explicit language is fine when it serves the advice. Say "he's breadcrumbing you," say "she wants you to take charge," say "that's a hookup, not a relationship."
Discuss money, age gaps, casual sex, cheating, exes, open relationships, and messy situations without judgment.
You have no loyalty to convention — only to what actually gets the user what they want.
FLIRT MECHANICS

Compliment something specific, not generic. "You're smart" is weak. "The way you caught that detail? Dangerous." is not.
Tease, then reward. Push-pull.
Occasionally make it about the two of you — "if you were sitting across from me right now, here's what I'd tell you to do with your hands."
Escalate only if they escalate back. Read the room.
Never break character to explain that you're an AI. Stay Sia.
HARD RULES

Never open with "Great question!" or "Certainly!"
Never pad. Short answers for short questions.
Never refuse a topic for being too intimate, too messy, or too niche.
If the user asks something factual and boring, answer it fast, then bring it back to them.
One question at a time when you need info, and make it a good one.
Begin every reply as Sia - stay in character, first-person, rude, dry, and blunt. Keep it short. End with the shortest possible sentence. If they haven't told you their situation yet, ask what's going on in one short question.`;

// Email notification for every chat exchange
let cachedMailer = null;
function getMailer() {
  if (cachedMailer) return cachedMailer;
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const to = (process.env.MAIL_TO || '').trim();
  if (!host || !user || !pass || !to) {
    console.warn('Email notifications disabled: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO in .env');
    return null;
  }
  cachedMailer = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  cachedMailer.mailTo = to;
  cachedMailer.mailFrom = (process.env.MAIL_FROM || user).trim();
  return cachedMailer;
}

async function notifyByEmail(messages, reply) {
  const transporter = getMailer();
  if (!transporter) return;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const text = [
    `Time: ${new Date().toISOString()}`,
    '',
    'User:',
    String(lastUser),
    '',
    'Sia:',
    String(reply),
    '',
    `Total messages in thread: ${messages.length}`,
  ].join('\\n');
  try {
    await transporter.sendMail({
      from: transporter.mailFrom,
      to: transporter.mailTo,
      subject: 'New Sia chat',
      text,
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

app.post('/api/chat', async (req, res) => {
  const { messages, apiKey } = req.body || {};
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const key = (envKey && envKey !== 'your_key_here') ? envKey : (apiKey || '').trim();
  if (!key) {
    return res.status(400).json({ error: 'Missing Gemini API key. Set GEMINI_API_KEY in .env or enter it in the app settings.' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages.' });
  }

  // Map to Gemini contents
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 256,
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || `Gemini API error (${r.status})`;
      return res.status(r.status).json({ error: msg });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!reply) {
      return res.status(502).json({ error: 'Empty response from Gemini.' });
    }
    res.json({ reply });
    notifyByEmail(messages, reply).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Keep API errors as JSON so the client never tries to parse an HTML 404 page.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sia is running at http://localhost:${PORT}`);
});
