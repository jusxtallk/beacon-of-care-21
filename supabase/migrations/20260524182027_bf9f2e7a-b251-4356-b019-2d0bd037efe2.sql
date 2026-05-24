-- 1. Extend lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS tl_dr text,
  ADD COLUMN IF NOT EXISTS nuances text,
  ADD COLUMN IF NOT EXISTS glossary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'draft';

-- 2. lesson_blocks
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_blocks_lesson_idx ON public.lesson_blocks(lesson_id, sort_order);
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read lesson_blocks" ON public.lesson_blocks;
CREATE POLICY "auth read lesson_blocks" ON public.lesson_blocks FOR SELECT TO authenticated USING (true);

-- 3. lesson_sources
CREATE TABLE IF NOT EXISTS public.lesson_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  idx integer NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  publisher text,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  excerpt text
);
CREATE INDEX IF NOT EXISTS lesson_sources_lesson_idx ON public.lesson_sources(lesson_id, idx);
ALTER TABLE public.lesson_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read lesson_sources" ON public.lesson_sources;
CREATE POLICY "auth read lesson_sources" ON public.lesson_sources FOR SELECT TO authenticated USING (true);

-- 4. lesson_assets
CREATE TABLE IF NOT EXISTS public.lesson_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'image',
  storage_path text NOT NULL,
  caption text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read lesson_assets" ON public.lesson_assets;
CREATE POLICY "auth read lesson_assets" ON public.lesson_assets FOR SELECT TO authenticated USING (true);

-- 5. Public storage bucket for lesson images
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-images', 'lesson-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "lesson images public read" ON storage.objects;
CREATE POLICY "lesson images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-images');

-- 6. Seed new topics (idempotent on slug)
INSERT INTO public.topics (slug, title, description, icon, sort_order) VALUES
  ('unsdg', 'UN Sustainable Development Goals', 'All 17 SDGs, their indicators, and how nations track progress.', 'Globe', 100),
  ('sustainability', 'Sustainability & Climate', 'Climate science, carbon markets, the Singapore Green Plan, and the circular economy.', 'Leaf', 110),
  ('geopolitics', 'Geopolitics', 'IR theory, great-power competition, ASEAN dynamics, and global flashpoints.', 'Compass', 120),
  ('world-history', 'World Cultures & History', 'Civilisations, religions, colonialism, the Cold War, then deep dives by region and country.', 'BookMarked', 130)
ON CONFLICT (slug) DO NOTHING;