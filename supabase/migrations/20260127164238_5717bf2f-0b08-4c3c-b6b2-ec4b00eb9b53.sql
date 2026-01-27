-- Create rate limits table for tracking API requests
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS (service role will bypass)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct user access - only edge functions with service role can access
CREATE POLICY "No direct access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, endpoint, window_start);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_start timestamp with time zone;
  v_now timestamp with time zone := now();
BEGIN
  v_window_start := v_now - (p_window_seconds || ' seconds')::interval;
  
  -- Try to get existing record
  SELECT * INTO v_record
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, v_now);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::interval
    );
  END IF;
  
  -- Check if window has expired
  IF v_record.window_start < v_window_start THEN
    -- Reset the window
    UPDATE rate_limits
    SET request_count = 1,
        window_start = v_now
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::interval
    );
  END IF;
  
  -- Check if limit exceeded
  IF v_record.request_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_record.window_start + (p_window_seconds || ' seconds')::interval,
      'retry_after', EXTRACT(EPOCH FROM (v_record.window_start + (p_window_seconds || ' seconds')::interval - v_now))::integer
    );
  END IF;
  
  -- Increment counter
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE id = v_record.id;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - v_record.request_count - 1,
    'reset_at', v_record.window_start + (p_window_seconds || ' seconds')::interval
  );
END;
$$;

-- Cleanup function to remove old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;