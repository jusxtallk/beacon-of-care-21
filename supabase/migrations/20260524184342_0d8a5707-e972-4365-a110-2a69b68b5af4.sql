
INSERT INTO public.topics (slug, title, description, icon, sort_order)
VALUES ('biology', 'Biology & Medicine', 'From cells and systems to immunology and physiology — how the human body actually works.', 'Activity', 11)
ON CONFLICT (slug) DO NOTHING;

-- Auto-log knowledge gaps from wrong quiz answers
CREATE OR REPLACE FUNCTION public.log_gap_on_wrong_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_title text;
  lesson_topic uuid;
BEGIN
  IF NEW.is_correct THEN
    RETURN NEW;
  END IF;
  SELECT l.title, c.topic_id INTO lesson_title, lesson_topic
  FROM lessons l JOIN courses c ON c.id = l.course_id
  WHERE l.id = NEW.lesson_id;

  INSERT INTO public.knowledge_gaps (user_id, lesson_id, topic_id, concept, severity)
  VALUES (NEW.user_id, NEW.lesson_id, lesson_topic, COALESCE(lesson_title, 'concept'), NEW.bloom_level)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_gap_on_wrong_answer ON public.quiz_attempts;
CREATE TRIGGER trg_log_gap_on_wrong_answer
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.log_gap_on_wrong_answer();
