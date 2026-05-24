
-- ============ DROP OLD ELDER-CARE SCHEMA ============
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.check_ins CASCADE;
DROP TABLE IF EXISTS public.check_in_schedules CASCADE;
DROP TABLE IF EXISTS public.elder_notes CASCADE;
DROP TABLE IF EXISTS public.health_conditions CASCADE;
DROP TABLE IF EXISTS public.care_relationships CASCADE;
DROP TABLE IF EXISTS public.data_preferences CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

DROP FUNCTION IF EXISTS public.generate_link_code() CASCADE;
DROP FUNCTION IF EXISTS public.lookup_elder_by_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============ SIMPLIFY PROFILES ============
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS emergency_contact_phone,
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS nric_last4,
  DROP COLUMN IF EXISTS link_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS setup_completed,
  DROP COLUMN IF EXISTS preferred_language;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_goal_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- ============ NEW HANDLE_NEW_USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ LEARNING SCHEMA ============
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'BookOpen',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  level text NOT NULL DEFAULT 'beginner', -- beginner | intermediate | advanced
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic_id, slug)
);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  bloom_level smallint NOT NULL CHECK (bloom_level BETWEEN 1 AND 6),
  bloom_label text NOT NULL, -- Remember, Understand, Apply, Analyze, Evaluate, Create
  content_md text NOT NULL,
  est_minutes integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  choices jsonb NOT NULL,
  correct_index smallint NOT NULL,
  explanation text,
  bloom_level smallint NOT NULL CHECK (bloom_level BETWEEN 1 AND 6),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.user_interests (
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  minutes_spent integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  selected_index smallint NOT NULL,
  is_correct boolean NOT NULL,
  bloom_level smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_activity (
  user_id uuid NOT NULL,
  activity_date date NOT NULL DEFAULT current_date,
  minutes integer NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, activity_date)
);

CREATE TABLE public.knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  concept text NOT NULL,
  severity smallint NOT NULL DEFAULT 2 CHECK (severity BETWEEN 1 AND 3),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.debate_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  topic_title text NOT NULL,
  stance text, -- the position the AI is taking
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE public.debate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.debate_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ RLS ============
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_messages ENABLE ROW LEVEL SECURITY;

-- Public library content: any authenticated user can read
CREATE POLICY "auth read topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read quiz" ON public.quiz_questions FOR SELECT TO authenticated USING (true);

-- Per-user tables
CREATE POLICY "own interests select" ON public.user_interests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own interests insert" ON public.user_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own interests delete" ON public.user_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own progress all" ON public.lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attempts all" ON public.quiz_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own activity all" ON public.daily_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own gaps all" ON public.knowledge_gaps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own debate sessions all" ON public.debate_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own debate messages select" ON public.debate_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.debate_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);
CREATE POLICY "own debate messages insert" ON public.debate_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.debate_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

-- ============ SEED CONTENT ============
INSERT INTO public.topics (slug, title, description, icon, sort_order) VALUES
('economy', 'How the Economy Works', 'Markets, money, GDP, trade, and Singapore''s economic model.', 'TrendingUp', 1),
('governance', 'Governance & Policy', 'How Singapore is governed, the role of each ministry, and how policy is made.', 'Landmark', 2),
('law', 'Law & the Constitution', 'Rule of law, the Constitution, courts, and citizen rights.', 'Scale', 3),
('tripartism', 'NTUC & Tripartism', 'Unions, employers, and government working together — Singapore''s tripartite model.', 'Users', 4),
('diplomacy', 'Diplomacy & Foreign Policy', 'Small-state survival, ASEAN, and Singapore''s place in the world.', 'Globe', 5),
('ministries', 'Inside the Ministries', 'What each ministry actually does and the policies they own.', 'Building2', 6);

-- Helper: insert courses + lessons + quiz
DO $$
DECLARE
  t_econ uuid; t_gov uuid; t_law uuid; t_tri uuid; t_dip uuid; t_min uuid;
  c_id uuid; l_id uuid;
BEGIN
  SELECT id INTO t_econ FROM public.topics WHERE slug='economy';
  SELECT id INTO t_gov  FROM public.topics WHERE slug='governance';
  SELECT id INTO t_law  FROM public.topics WHERE slug='law';
  SELECT id INTO t_tri  FROM public.topics WHERE slug='tripartism';
  SELECT id INTO t_dip  FROM public.topics WHERE slug='diplomacy';
  SELECT id INTO t_min  FROM public.topics WHERE slug='ministries';

  -- ===== ECONOMY =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_econ, 'foundations', 'Economy from Ground Zero', 'Start with markets, money, and trade — then see how Singapore''s open economy actually works.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'What is an economy?', 1, 'Remember',
'# What is an economy?

An **economy** is the system a society uses to decide:
1. **What** to produce
2. **How** to produce it
3. **Who** gets what is produced

Every economy answers these questions differently. A **market economy** lets prices and private choice do most of the answering. A **command economy** lets the state decide. Most real countries — Singapore included — are **mixed economies**: markets do most of the work, but the government shapes the rules, invests in infrastructure, and steps in where markets fail.

## Key vocabulary
- **Scarcity** — limited resources, unlimited wants. The reason economics exists.
- **Opportunity cost** — what you give up to get something else.
- **GDP** — total value of goods & services produced in a country in a year.
- **Inflation** — a general rise in prices over time.

## Singapore in one paragraph
Singapore has no natural resources, a small domestic market, and ~6M people. It survives by being radically **open** — trade is ~3x its GDP — and by investing heavily in human capital, infrastructure, and a stable rule of law that attracts global capital.', 4, 1)
  RETURNING id INTO l_id;

  INSERT INTO public.quiz_questions (lesson_id, prompt, choices, correct_index, explanation, bloom_level, sort_order) VALUES
  (l_id, 'Which best describes Singapore''s economic system?',
   '["Pure free market","Command economy","Mixed economy with strong state role","Subsistence economy"]'::jsonb,
   2, 'Singapore is market-driven but the state actively shapes outcomes via Temasek, GIC, EDB, HDB and CPF.', 2, 1),
  (l_id, 'Opportunity cost means…',
   '["The price tag of an item","What you give up to choose something else","The cost of doing nothing","A government subsidy"]'::jsonb,
   1, 'Every choice has a next-best alternative you forgo. That is its opportunity cost.', 1, 2);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Supply, demand, and price', 2, 'Understand',
'# Supply, demand, and price

Prices are **signals**. They coordinate millions of strangers without anyone in charge.

- **Demand** falls as price rises (mostly).
- **Supply** rises as price rises (mostly).
- Where the two meet is the **equilibrium price**.

When demand jumps (say, COE bidders during a strong year), prices rise until enough buyers drop out. When supply falls (chip shortage, war disrupting wheat), the same thing happens. Governments can override prices — rent controls, COE quotas, GST — but every override creates winners, losers, and side effects.

## Why this matters for policy
HDB pricing, ERP, COE, water tariffs, electricity OEM — every one of these is the government choosing where to let the market clear and where to intervene.', 5, 2);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Why Singapore is so open', 3, 'Apply',
'# Why Singapore is so open

Trade-to-GDP ratio: ~320%. For comparison, the US is ~25%, China ~37%.

## The logic
- Tiny domestic market → you must sell to the world to achieve scale.
- No natural resources → you must import almost everything physical.
- Strategic location at the Malacca Strait → ~30% of global trade passes by.

## How it''s engineered
- **Free Trade Agreements**: 27+ FTAs covering most major partners.
- **Port & airport**: world-class logistics, Changi + PSA.
- **Tax**: low corporate tax (17%), territorial system, broad treaty network.
- **Talent**: aggressive recruitment of global skills.

## The tradeoff
Openness makes Singapore prosperous **and** exposed. A US-China decoupling, a Strait closure, or a regional recession hits hard. Hence: diversified partners, strong reserves, defence spending ~3% of GDP.', 6, 3);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Critique: the cost of openness', 5, 'Evaluate',
'# Critique: the cost of openness

Openness is not free. Honest evaluation:

## Wins
- Per-capita GDP among the world''s highest.
- Deep capital markets, full employment most years.
- Resilience through diversification.

## Costs & tensions
- **Inequality** — a globalised top tier; locals competing with global talent.
- **Cost of living** — imported food, energy, housing land scarcity.
- **Vulnerability** — external shocks transmit instantly.
- **Identity** — high foreign workforce share raises social cohesion questions.

## The policy response
- CPF, Workfare, ComCare — redistribution without killing incentives.
- SkillsFuture — keep workers globally competitive.
- HDB — decouple shelter from the global property market.
- Population White Paper debates — calibrating foreign inflow.

**Your turn**: Is the model sustainable for the next 30 years? What would you change first?', 7, 4);

  -- ===== GOVERNANCE =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_gov, 'singapore-system', 'How Singapore is Governed', 'Parliament, Cabinet, Civil Service, and the policy-making loop.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The three branches', 1, 'Remember',
'# The three branches

Singapore inherits the **Westminster** model, adapted:

- **Legislature** — Parliament. 93 elected MPs + NCMPs + NMPs. Passes laws and the Budget.
- **Executive** — Cabinet, led by the Prime Minister. Runs ministries and the civil service.
- **Judiciary** — Supreme Court (Court of Appeal + High Court) and the State Courts. Interprets the law independently.

The **President** is the elected head of state with custodial powers over reserves and key appointments — a second key, not an executive.', 4, 1);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'How a policy is actually made', 3, 'Apply',
'# How a policy is actually made

A simplified loop (in reality much messier):

1. **Signal** — data, public feedback, ministerial directive, or crisis.
2. **Ministry study** — civil servants research options, model costs, consult.
3. **Inter-ministry coordination** — most policies cross ministries (e.g. housing = MND + MOF + MAS).
4. **Cabinet decision** — Cabinet endorses the direction.
5. **Parliament** — if it needs a law or money, it goes to Parliament.
6. **Implementation** — statutory boards (HDB, CPF, MAS, etc.) execute.
7. **Review** — KPIs, public reaction, adjustments.

## Where you can push
- REACH portal, MP meet-the-people sessions, public consultations, op-eds, civil society groups.
- Voting matters even in "safe" seats — it shifts vote share and signals priorities.', 6, 2);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Strengths and critiques', 5, 'Evaluate',
'# Strengths and critiques

## Strengths often cited
- Long-term planning, low corruption (CPI top 5 globally).
- High-capacity civil service.
- Fast execution.

## Critiques worth engaging
- **Dominant-party system** — PAP has governed since 1959. Critics argue this weakens opposition scrutiny.
- **GRC system** — designed to ensure minority representation; critics see a high entry barrier.
- **POFMA, contempt laws** — government says they protect against falsehoods; critics worry about chilling effects.
- **Media landscape** — concentrated; alternative voices exist mostly online.

A serious learner holds **both** truths: a uniquely effective state **and** real democratic tensions worth debating.', 6, 3);

  -- ===== LAW =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_law, 'rule-of-law', 'Rule of Law in Singapore', 'Constitution, courts, and your rights as a citizen.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'What "rule of law" actually means', 2, 'Understand',
'# What "rule of law" actually means

Rule of law ≠ rule **by** law. The thicker version requires:

1. **Laws are public, clear, prospective** — you can know them in advance.
2. **Equal application** — same rules for the powerful and the ordinary.
3. **Independent judiciary** — disputes decided by judges insulated from political pressure.
4. **Due process** — fair procedures before the state deprives you of liberty or property.
5. **Limited government** — even the state must obey the law.

Singapore scores extremely high on contract enforcement, low corruption, and predictability. Debate centres on civil-political dimensions: assembly, speech, defamation.', 5, 1);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The Constitution & fundamental liberties', 2, 'Understand',
'# The Constitution & fundamental liberties

Part IV of the Constitution lists fundamental liberties:
- Art 9 — liberty of the person
- Art 12 — equality before the law
- Art 14 — speech, assembly, association (subject to Parliament-imposed restrictions)
- Art 15 — freedom of religion
- Art 16 — equal access to education

These are **not absolute**. Parliament can restrict them for public order, morality, security, etc. The courts interpret the limits. The constant question: where is the right balance?', 5, 2);

  -- ===== TRIPARTISM =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_tri, 'ntuc-tripartism', 'NTUC & the Tripartite Model', 'Why Singapore''s labour relations look nothing like anywhere else.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The three partners', 1, 'Remember',
'# The three partners

**Tripartism** = government + employers + unions, working together rather than through strikes and confrontation.

- **MOM** — Ministry of Manpower (government)
- **SNEF** — Singapore National Employers Federation
- **NTUC** — National Trades Union Congress (the labour movement)

They jointly run bodies like the **National Wages Council** (annual wage guidelines), Workplace Safety & Health Council, and the Tripartite Alliance for Fair & Progressive Employment Practices (TAFEP).

This is unusual globally. Most countries have adversarial labour relations. Singapore traded militant unionism (1950s–60s) for a corporatist bargain in the 1970s.', 4, 1);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'How NTUC actually works', 3, 'Apply',
'# How NTUC actually works

NTUC is a federation of ~60 affiliated unions plus social enterprises:
- **FairPrice** (supermarkets) — moderates cost of living
- **NTUC Income** (insurance, now Income Insurance)
- **NTUC LearningHub** — skills upgrading
- **NTUC First Campus** — childcare
- **e2i** — employment & employability

The Secretary-General has typically sat in Cabinet — a structural link to government. Critics say this compromises independence; defenders say it gives workers a real seat at the table.', 5, 2);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Tradeoffs of the tripartite bargain', 5, 'Evaluate',
'# Tradeoffs of the tripartite bargain

## What it buys
- Industrial peace — almost zero strikes since the 1980s.
- Faster, calibrated wage adjustments (NWC).
- Coordinated response to shocks (2009 GFC Jobs Credit, COVID Job Support Scheme).

## What it costs
- Wage growth in some sectors lags productivity.
- Lower-wage workers historically under-represented (recent push: Progressive Wage Model).
- Union militancy as a worker tool is effectively off the table.

The Progressive Wage Model + Local Qualifying Salary are recent attempts to address the lower end. Worth tracking how they evolve.', 6, 3);

  -- ===== DIPLOMACY =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_dip, 'small-state', 'Small-State Diplomacy', 'How Singapore punches above its weight.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The small-state predicament', 2, 'Understand',
'# The small-state predicament

A small state cannot rely on hard power. It must:
1. **Be relevant** — economically, logistically, diplomatically.
2. **Be principled** — predictable behaviour earns trust.
3. **Be friends with as many as possible** — never become anyone''s pawn.
4. **Maintain a credible deterrent** — SAF + total defence.

S. Rajaratnam''s formulation: "Singapore is a friend of all, ally of none." Modern reality is more nuanced — deep ties with the US, careful balance with China, anchor role in ASEAN.', 5, 1);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'ASEAN: why it matters', 3, 'Apply',
'# ASEAN: why it matters

10 member states, ~680M people, combined GDP ~$3.6T. ASEAN gives small members:
- A multilateral platform that great powers must engage.
- Norms (non-interference, consensus) that protect sovereignty.
- A regional market via the ASEAN Economic Community.

Limits: consensus = slow; non-interference = weak on internal crises (Myanmar). Singapore''s play is to make ASEAN as economically integrated and externally relevant as possible while accepting its political limits.', 5, 2);

  -- ===== MINISTRIES =====
  INSERT INTO public.courses (topic_id, slug, title, summary, level, sort_order)
  VALUES (t_min, 'tour', 'A Tour of the Ministries', 'What each ministry owns and the big policy levers they pull.', 'beginner', 1)
  RETURNING id INTO c_id;

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The economic ministries', 1, 'Remember',
'# The economic ministries

- **MOF** (Finance) — Budget, GST, fiscal policy, reserves framework (with the President).
- **MTI** (Trade & Industry) — EDB, Enterprise SG, FTAs, industry transformation maps.
- **MAS** (Monetary Authority, statutory board but central) — monetary policy (via exchange rate), banking & insurance regulation.
- **MOM** (Manpower) — labour policy, foreign workforce, CPF policy direction.

Together they own the "growth + jobs + macro stability" stack.', 4, 1);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'The social ministries', 1, 'Remember',
'# The social ministries

- **MOE** (Education) — schools, IHLs, SkillsFuture (with MOM).
- **MOH** (Health) — public hospitals, MediShield Life, Healthier SG.
- **MND** (National Development) — HDB, URA, BCA — housing and the built environment.
- **MSF** (Social & Family Development) — ComCare, family services, early childhood.
- **MCCY** (Culture, Community, Youth) — sport, arts, community engagement.

These shape daily life — schools, clinics, flats, support when things go wrong.', 4, 2);

  INSERT INTO public.lessons (course_id, title, bloom_level, bloom_label, content_md, est_minutes, sort_order)
  VALUES (c_id, 'Security, law, foreign affairs', 1, 'Remember',
'# Security, law, foreign affairs

- **MINDEF** — SAF, total defence, defence procurement.
- **MHA** (Home Affairs) — SPF, ICA, SCDF, prisons, narcotics.
- **MinLaw** (Law) — legal industry, legislation drafting, IPOS.
- **MFA** (Foreign Affairs) — bilateral relations, ASEAN, UN.
- **MDDI** (Digital Development & Information) — IMDA, GovTech, cyber, media.
- **MSE** (Sustainability & Environment) — NEA, PUB, climate policy.
- **MOT** (Transport) — LTA, CAAS, MPA.

Use this map when reading the news: "which ministry owns this problem?" sharpens analysis instantly.', 5, 3);

END $$;
