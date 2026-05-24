CREATE POLICY "own debate messages delete"
ON public.debate_messages
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.debate_sessions s
  WHERE s.id = debate_messages.session_id AND s.user_id = auth.uid()
));