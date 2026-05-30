# 🎙️ Standup Whisperer

> Paste messy daily notes → get a clean standup (Yesterday / Today / Blockers) in seconds.

**Live demo:** https://attached-assets--natyralbeauty01.replit.app/  
**Built with:** Node.js · TypeScript · Express · Claude API (claude-sonnet-4)  
**Deployed on:** Replit

---

## What it does

You paste raw, chaotic notes about your day — any language, any format, stream of consciousness.  
Standup Whisperer uses Claude to extract and structure them into a clean standup with three sections:

- **Yesterday** — what you completed
- **Today** — what you're working on
- **Blockers** — anything blocking progress, including implicit ones ("waiting on X" = blocker)

Output formats: plain text · Slack markdown · GitHub markdown  
One-click **Copy for Slack** button included.

---

## Run it locally in under 5 minutes

```bash
git clone https://github.com/natyralbeauty01-hub/Standup_Whisperer.git
cd Standup_Whisperer
pnpm install
```

Create a `.env` file in the root:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then start the server:

```bash
pnpm --filter @workspace/api-server run dev
```

Open `http://localhost:5000`

> Get an Anthropic API key at https://console.anthropic.com

---

## The prompt I settled on — and what I tried first

This is the most important part of the project. The README exists partly to show this.

### Attempt 1 — "Just ask nicely"

```
"Convert these notes into a standup with Yesterday, Today, Blockers."
```

**What failed:**
- Model invented tasks not mentioned in the notes
- "Waiting on Agron for DB schema" was NOT extracted as a blocker
- Output structure varied every run — sometimes dashes, sometimes bullets, sometimes numbers
- Added preamble text: "Here is your standup update:"

**Root cause:** No identity + no semantic rules = model defaults to "helpful assistant" mode,
which means elaborating and being thorough rather than extracting precisely.

---

### Attempt 2 — "Force JSON output"

```
"Return only JSON: { yesterday: [], today: [], blockers: [] }"
```

**Improvements:**
- Consistent structure
- No preamble

**New failures:**
- Meetings classified inconsistently (sometimes blocker, sometimes today)
- Implicit blockers like "waiting for X" still missed
- Items were single words ("auth", "testing") instead of readable bullets
- JSON parsing broke when notes contained apostrophes or quotes

**Root cause:** JSON format solved structure but not semantics.
The model still didn't know WHAT counts as a blocker.

---

### Attempt 3 — Final version (what's in the code)

**Two key insights that changed everything:**

**Insight 1 — Professional identity over generic instructions.**  
`"You are a senior engineering team member"` behaves fundamentally differently from
`"You are an assistant that formats text"`. The former draws on implicit domain knowledge
about what standups are FOR — concise, scannable, factually accurate.

**Insight 2 — Implicit blockers need explicit rules.**  
In real standups, ~60% of blockers are never written as "blocker: X".
They appear as "waiting for Y", "need approval from Z", "can't proceed until W".
Without an explicit rule for each pattern, the model misses them every time.

**The final prompt structure (4 layers):**

```
Layer 1 │ System identity     → Who the model IS and what it values
Layer 2 │ Semantic rules      → What counts as blocker vs task vs meeting
Layer 3 │ Format contract     → Exact output template per format (plain/slack/markdown)
Layer 4 │ Edge case handlers  → Injected conditionally when input triggers them
```

The full prompt is in `lib/prompts.ts` with comments explaining each decision.

**Result:** Consistent output on chaotic input, zero hallucinated tasks,
implicit blockers correctly extracted across 20+ test cases.

---

## What I would do with more time

- **Persistent history** — save previous standups with date stamps (localStorage or lightweight DB)
- **Team context** — let users save teammate names so the model recognizes recurring dependencies
- **Voice input** — dictate notes on mobile instead of typing
- **Tone selector** — casual vs formal standup style (async Slack team vs live scrum)
- **Rate limiting** — per-IP throttling to protect the API key in production

---

## What surprised me

The hardest problem wasn't the LLM call — it was **implicit blocker detection**.

"Waiting on Agron for the DB schema decision" is obviously a blocker to any engineer.
But a naive prompt extracts it as a Yesterday item (past tense — "waiting") or ignores it entirely.

The fix required writing explicit semantic classification rules in the prompt, not just
better general instructions. This was the core prompt engineering challenge of the project,
and it took three iterations to get right.

The second surprise: showing the model the exact output template (format injection) works
significantly better than describing the format in prose. The model fills the template
rather than interpreting a description of one.

---

## Project structure

```
Standup_Whisperer/
├── lib/
│   ├── prompts.ts        ← All prompt logic — 4-layer system, fully documented
│   └── ...
├── scripts/
├── replit.md             ← Replit agent notes
├── package.json
└── README.md             ← You are here
```

---

## Tech choices

| Decision | Choice | Why |
|---|---|---|
| Runtime | Node.js 24 + TypeScript | Type safety, Replit native support |
| Framework | Express 5 | Minimal, no overhead for this scope |
| LLM | Claude claude-sonnet-4 | Best instruction-following for structured extraction |
| Package manager | pnpm workspaces | Replit Agent default, faster installs |
| Deploy | Replit | Instant public URL, zero config |

---

*Built for the solution25 Applied AI Engineer internship task — May 2025*
