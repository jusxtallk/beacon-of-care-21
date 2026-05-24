
INSERT INTO public.topics (id, slug, title, description, icon, sort_order)
VALUES (
  'bb000000-0000-0000-0000-000000000001'::uuid,
  'books', 'From Great Books',
  'Concepts, mental models, and applications drawn from books worth re-reading.',
  'BookMarked', 50
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, topic_id, slug, title, summary, level, sort_order) VALUES
('bbcc0000-0000-0000-0000-000000000001'::uuid, 'bb000000-0000-0000-0000-000000000001'::uuid,
 'stoicism-ryan-holiday', 'Stoicism with Ryan Holiday',
 'The Obstacle Is the Way, Ego Is the Enemy, The Daily Stoic — the operating system of Marcus Aurelius and Seneca, made practical.',
 'beginner', 1),
('bbcc0000-0000-0000-0000-000000000002'::uuid, 'bb000000-0000-0000-0000-000000000001'::uuid,
 'art-of-thinking-clearly', 'The Art of Thinking Clearly — Rolf Dobelli',
 '99 cognitive biases (errors in judgement) you fall for daily, and how to spot them in yourself before they cost you.',
 'beginner', 2),
('bbcc0000-0000-0000-0000-000000000003'::uuid, 'bb000000-0000-0000-0000-000000000001'::uuid,
 'lee-kuan-yew-statecraft', 'Lee Kuan Yew on Statecraft',
 'From Third World to First, Hard Truths, One Man''s View of the World — pragmatism (results over ideology) as a governing instinct.',
 'intermediate', 3),
('bbcc0000-0000-0000-0000-000000000004'::uuid, 'bb000000-0000-0000-0000-000000000001'::uuid,
 'men-in-white-pap', 'Men in White — Singapore''s PAP, Unvarnished',
 'The Straits Times'' inside account of the People''s Action Party: how a cadre (selected core members) party kept power for 60+ years.',
 'intermediate', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order, tl_dr, nuances, glossary, content_tags, generation_status) VALUES
('bbdd0000-0000-0000-0000-000000000001'::uuid, 'bbcc0000-0000-0000-0000-000000000001'::uuid,
 'The Obstacle Is the Way: turning friction into fuel', 2, 'Understand',
 E'## The core move\n\nMarcus Aurelius wrote: *"The impediment to action advances action. What stands in the way becomes the way."* Ryan Holiday builds an entire book around this one line.\n\nThe Stoic claim is not that obstacles are good. It is that the **obstacle itself contains the instructions** for how to get around it. A blocked road forces a better route. A harsh boss forces you to build skills you would never have trained voluntarily.\n\n## Three disciplines\n\n1. **Perception** — control how you *frame* the event. The event is neutral; your reaction is not.\n2. **Action** — move on what is in your control, ignore what is not (this is the *dichotomy of control* — splitting things into "up to me" and "not up to me").\n3. **Will** — accept what cannot be changed without resentment (*amor fati* — "love of fate").\n\n## Where most people fail\n\nThey collapse all three into *perception only* — they "reframe" the bad event and stop there. Stoicism is not positive thinking. It demands that after the reframe, you **act**, then **endure** the part you cannot fix.',
 6, 1,
 'The obstacle is not a detour from your path — examined closely, it shows you the next step on it.',
 'Stoicism is often confused with suppressing emotion. It is not. Marcus and Seneca felt grief, rage, and fear — they trained themselves to act well *despite* those feelings, not to pretend the feelings did not exist.',
 '[{"term":"Stoicism","definition":"Greco-Roman school of philosophy (300 BC onwards) teaching that virtue and reason produce a good life regardless of external circumstance."},{"term":"Dichotomy of control","definition":"Epictetus''s split of the world into things you control (your judgement, action) and things you do not (events, others, outcomes)."},{"term":"Amor fati","definition":"Latin: ''love of fate''. Not just accepting what happens, but willing it."},{"term":"Memento mori","definition":"Latin: ''remember you must die''. A prompt to use mortality as a clarifier of priorities, not a depressant."}]'::jsonb,
 '["philosophy","stoicism","mental-models"]'::jsonb, 'published'),
('bbdd0000-0000-0000-0000-000000000002'::uuid, 'bbcc0000-0000-0000-0000-000000000002'::uuid,
 'Survivorship bias: why winners'' advice is mostly noise', 2, 'Understand',
 E'## The error\n\nDobelli''s opening chapter. You read the biographies of billionaires and find shared traits — drop out of college, sleep 4 hours, trust your gut. You conclude: do these things and become a billionaire.\n\nYou are looking at **survivors only**. The graveyard of dropouts who slept 4 hours and trusted their gut is enormous and silent. It does not write biographies.\n\n## The shape of the bias\n\n- **Bombers in WWII** — Abraham Wald was asked where to add armour. Officers pointed at the bullet holes on returning planes. Wald said: armour the spots *without* holes. Planes hit there did not come back.\n- **Startup advice** — "follow your passion" works for the founders you have heard of, because the ones whose passion bankrupted them quietly disappeared.\n- **Trading** — fund managers who beat the market for ten years straight are paraded on TV. Statistically, with enough managers, this happens by pure chance.\n\n## The correction\n\nBefore trusting a pattern from successful cases, ask:\n1. **Where is the comparison group of failures?**\n2. **What is the base rate** (the underlying probability before you filter)?\n3. **Could chance alone produce this many "winners"?**\n\nIf you cannot answer these, you do not have evidence — you have a flattering story.',
 8, 1,
 'You only hear from the survivors. Their playbook may have nothing to do with why they survived.',
 'Survivorship bias is not the same as confirmation bias. Confirmation bias is filtering evidence to support a held belief. Survivorship bias is the *data itself* being filtered before you ever see it.',
 '[{"term":"Survivorship bias","definition":"Drawing conclusions only from cases that ''made it'' through some selection, while invisible failures distort the pattern."},{"term":"Base rate","definition":"The background probability of an outcome before adding specific evidence. Ignoring it is ''base rate neglect''."},{"term":"Confirmation bias","definition":"The tendency to seek and weight evidence that supports what you already believe."}]'::jsonb,
 '["biases","critical-thinking","statistics"]'::jsonb, 'published'),
('bbdd0000-0000-0000-0000-000000000003'::uuid, 'bbcc0000-0000-0000-0000-000000000003'::uuid,
 'Pragmatism over ideology: the LKY operating principle', 2, 'Understand',
 E'## The instinct\n\nAsked whether Singapore was capitalist or socialist, Lee Kuan Yew refused the question. *"Does it work?"* was the only test he respected. This is **pragmatism** — judging an idea by its consequences, not by which tribe it comes from.\n\n## Where it shows up\n\n- **CPF** (Central Provident Fund, a forced retirement-savings scheme) — borrowed from a colonial-era British design, kept because it produced high savings rates and home ownership.\n- **HDB public housing** — socialist in form (state-built), capitalist in ownership (90%+ owned by occupants). LKY did not care about the label; he cared that voters had a stake in the country.\n- **Bilingualism** — English for the economy, mother tongue for identity. Not chosen for ideological purity; chosen because Singapore is small and could not afford to pick one.\n\n## The limits of the principle\n\nPragmatism without a value floor becomes opportunism (whatever wins the next vote). LKY anchored his pragmatism in a small set of non-negotiables: meritocracy, multi-racialism, no corruption, survival of the nation. Inside those rails, anything was up for revision.\n\n## What to take from it\n\nWhen you hold a strong opinion, ask: *what evidence would change my mind?* If the answer is "nothing", you are holding an ideology, not a position.',
 9, 1,
 'LKY''s rule: ideas are tools. Pick the one that works for the country in front of you, not the one your tribe applauds.',
 'Pragmatism is not the same as having no principles. LKY had hard principles (meritocracy, multi-racialism, anti-corruption); pragmatism was the *method* he used inside those principles, not a replacement for them.',
 '[{"term":"Pragmatism","definition":"A philosophy (William James, John Dewey) that judges beliefs and policies by their practical consequences, not by abstract correctness."},{"term":"Meritocracy","definition":"A system where reward and authority track demonstrated ability, not birth or wealth. A founding tenet of the PAP."},{"term":"CPF","definition":"Central Provident Fund — Singapore''s compulsory savings system funding retirement, housing, and healthcare."}]'::jsonb,
 '["singapore","governance","mental-models"]'::jsonb, 'published'),
('bbdd0000-0000-0000-0000-000000000004'::uuid, 'bbcc0000-0000-0000-0000-000000000004'::uuid,
 'The cadre system: how the PAP renews itself', 2, 'Understand',
 E'## What Men in White documents\n\nThe People''s Action Party has won every general election since 1959. The book — researched by Straits Times journalists with rare PAP cooperation — argues the longevity is not luck. It is a **cadre system** copied, ironically, from Leninist party design but bent to Singapore''s ends.\n\n## How the cadre system works\n\n1. **Only cadres elect the Central Executive Committee (CEC).** Cadres are vetted, invited members — perhaps a few hundred. Ordinary party members do not vote for the leadership.\n2. **The CEC then approves new cadres.** A closed loop: leadership picks the people who pick the leadership.\n3. **Talent is hunted, not volunteered.** "Tea sessions" identify high-performers in the civil service, military, and private sector. Most are persuaded; few apply.\n\n## Why it matters\n\nThe design solves one problem brutally well — **succession**. The PAP has had only four prime ministers in 65 years, each handpicked years in advance. It also creates a problem — **insularity**. A leadership that selects its successors tends to select people who look and think like itself.\n\n## The trade-off, in plain terms\n\nYou get stability and continuity. You give up the corrective shock of an unexpected leader rising from below. Whether that trade is worth it is the real Singapore political debate — not "PAP vs opposition", but "is the cadre filter still selecting the right people for *this* era?"',
 9, 1,
 'The PAP outlasts its rivals because of an internal selection machine, not because Singaporeans love it forever.',
 'The cadre system is often described as "Leninist". The structure is borrowed; the goals are not. Lenin used cadres to enforce ideological purity. The PAP uses them to enforce competence and continuity, which are different things.',
 '[{"term":"Cadre","definition":"A core, vetted member of a political party with voting rights over leadership. In the PAP, only cadres elect the CEC."},{"term":"CEC","definition":"Central Executive Committee — the PAP''s highest decision-making body, elected by cadres."},{"term":"Tea session","definition":"PAP''s informal vetting interview used to identify and recruit potential MPs and ministers."}]'::jsonb,
 '["singapore","politics","governance"]'::jsonb, 'published')
ON CONFLICT (id) DO NOTHING;
