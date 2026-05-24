# Athenaeum v2 — Sourced, Interactive, Expanded

Big upgrade across content sourcing, topic coverage, pedagogy, and interactivity. Doing this in one shot would balloon the chat — here's the scoped plan.

## 1. New topics (added to Library, Bloom-staged)

In addition to existing Singapore-focused topics, add:

- **UN Sustainable Development Goals** — all 17 goals, indicators, Singapore's VNR progress
- **Sustainability & Climate** — climate science basics → carbon markets → SG Green Plan 2030 → circular economy
- **Geopolitics** — IR theory (realism/liberalism/constructivism) → great power competition → ASEAN dynamics → SG's hedging strategy → flashpoints (Taiwan, South China Sea, Ukraine)
- **World Cultures & History** — general (civilisations, world religions, colonialism, Cold War) → regional (SEA, East Asia, South Asia, MENA, Europe, Africa, Americas) → country deep-dives (start with SG's top 10 partners: China, US, Malaysia, Indonesia, Japan, India, UK, Australia, Vietnam, Thailand)

Each topic gets 3–6 courses, each course 4–8 lessons, ladder L1 Remember → L6 Create.

## 2. Sourcing & anti-hallucination

- Every lesson stores a `sources` JSON array: `[{ title, url, publisher, accessed_at, excerpt }]`
- Content generated via Firecrawl (search + scrape authoritative domains: gov.sg, un.org, worldbank.org, imf.org, oecd.org, cfr.org, britannica.com, reuters.com, BBC, academic journals) → fed to Lovable AI with strict "only claim what's in sources, cite inline" prompt
- Inline citations rendered as `[1]`, `[2]` linking to a sources panel under each lesson
- A `content_tags` column (jsonb) per lesson: e.g. `["ministry:MFA", "region:SEA", "sdg:13", "difficulty:intro"]`
- A nightly/manual `refresh_lesson` edge function can re-scrape and bump `last_verified_at`

## 3. Bloom's taxonomy enforced

- Every lesson already has `bloom_level` 1–6. Course generator now ensures ladder coverage (no skipping).
- Quizzes per lesson scale to Bloom level: L1–2 = MCQ recall, L3 = apply scenario, L4 = compare/contrast, L5 = evaluate claim with evidence, L6 = open prompt graded by AI rubric.

## 4. Interactivity & images

New lesson blocks (stored as JSON in `lesson_blocks` table, rendered in order):

- `markdown` — narrative + inline citations
- `image` — hero/diagrams with caption + source link (generated or Firecrawl-scraped + cached to Storage)
- `hotspot_image` — click pins on a map/diagram to reveal facts (e.g. ASEAN map, ministry org chart)
- `timeline` — drag a slider through years (e.g. SG history, climate CO₂)
- `comparator` — A/B toggle (e.g. CPF vs 401k, realism vs liberalism)
- `data_chart` — small bar/line chart with cited dataset
- `quiz` — Bloom-tiered, with explanations
- `flashcards` — for L1 recall
- `debate_prompt` — launches the existing AI debate seeded with the lesson's claims

Plain-language layer: every lesson opens with a **TL;DR card** ("In one sentence…"), a **Nuances** callout box ("It's more complicated because…"), and a **Glossary** chip strip for jargon. Reading level targets ~grade 9 unless the lesson is explicitly advanced.

## 5. Technical sections

**DB migration** (new + altered tables):
- `lessons`: add `tl_dr text`, `nuances text`, `content_tags jsonb`, `last_verified_at timestamptz`
- `lesson_blocks (id, lesson_id, sort_order, kind, data jsonb)` — replaces single `content_md` over time; existing `content_md` kept as fallback
- `lesson_sources (id, lesson_id, idx, title, url, publisher, accessed_at, excerpt)`
- `lesson_assets (id, lesson_id, kind, storage_path, caption, source_url)` + new public `lesson-images` storage bucket
- Seed new topics + first wave of courses (placeholder lessons + a "Generate from sources" button for staff/me to fill)

**Edge functions**:
- `generate-lesson` — takes a topic/course/title + Bloom level → Firecrawl search → scrape top 5 → Lovable AI (gemini-2.5-pro) → returns blocks + sources + tl_dr + nuances + quiz; writes to DB
- `refresh-lesson` — re-runs sourcing for a lesson, flags drift
- `grade-open-response` — for Bloom L5/L6 open prompts

**Frontend**:
- `LessonPage` rewritten to render `lesson_blocks` in order, with `<Citation />`, `<TLDR />`, `<Nuances />`, `<Glossary />`, `<Hotspot />`, `<Timeline />`, `<Comparator />`, `<Chart />`, `<Flashcards />` components
- `LibraryPage` gets topic tabs + tag filters (SDG, region, ministry, difficulty)
- Sources panel collapsible at lesson bottom

**Connectors needed**: Firecrawl (web sourcing). Lovable AI already wired.

## 6. Rollout (so this ships, not stalls)

I'll do this in **3 chats**, each independently deployable:

1. **This chat** — schema migration, new topics+course shells seeded, Firecrawl wired, `generate-lesson` function, sources panel + TL;DR + Nuances + Glossary + inline citations in the lesson UI, refactored LessonPage to render blocks. Generate ~5 full sample lessons end-to-end to prove the loop.
2. **Next chat** — interactive blocks (hotspot, timeline, comparator, charts, flashcards), Bloom-tiered quiz generator, open-response grading.
3. **Chat 3** — bulk-generate the full catalogue (UNSDG × 17, sustainability, geopolitics, regions, countries), tag filters, search.

After step 1 you'll be able to add Firecrawl, hit "Generate" on any seeded course, and get a fully cited, plain-language lesson with TL;DR and nuances.

---

Confirm and I'll start with step 1: schema migration first (for your approval), then the rest.
