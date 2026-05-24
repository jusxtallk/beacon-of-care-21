
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approval_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_requests_token ON public.signup_requests(approval_token);
CREATE INDEX idx_signup_requests_status ON public.signup_requests(status);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit a signup request
CREATE POLICY "anyone can request signup"
  ON public.signup_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public read/update — only service role (edge functions) touches the row otherwise
