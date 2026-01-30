/**
 * CSRF Protection for Edge Functions
 * 
 * Validates request origin and CSRF tokens to prevent cross-site request forgery.
 */

// Allowed origins for API requests
const ALLOWED_ORIGINS = [
  'https://money-notes-app.lovable.app',
  'https://id-preview--d3f67cbd-2ac3-486f-9426-e11ffb211abd.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Also allow any Lovable preview URLs
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/;

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates the origin header against allowed origins
 */
export function validateOrigin(origin: string | null): CsrfValidationResult {
  if (!origin) {
    // Reject requests without origin header for security
    return { valid: false, error: 'Missing origin header' };
  }

  // Check explicit allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { valid: true };
  }

  // Check Lovable preview pattern
  if (LOVABLE_PREVIEW_PATTERN.test(origin)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Origin '${origin}' is not allowed`,
  };
}

/**
 * Validates the referer header as a fallback
 */
export function validateReferer(referer: string | null): CsrfValidationResult {
  if (!referer) {
    return { valid: true }; // Referer can be stripped by browsers
  }

  try {
    const url = new URL(referer);
    return validateOrigin(url.origin);
  } catch {
    return { valid: false, error: 'Invalid referer URL' };
  }
}

/**
 * Validates CSRF token from header
 * For stateless validation, we verify the token format and presence
 */
export function validateCsrfToken(token: string | null): CsrfValidationResult {
  if (!token) {
    // CSRF token is required for state-changing operations
    return { valid: false, error: 'Missing CSRF token' };
  }

  // Validate token format (64 hex characters)
  const tokenPattern = /^[a-f0-9]{64}$/;
  if (!tokenPattern.test(token)) {
    return { valid: false, error: 'Invalid CSRF token format' };
  }

  return { valid: true };
}

/**
 * Full CSRF validation for requests
 * Validates origin, referer, and CSRF token
 */
export function validateCsrfRequest(req: Request): CsrfValidationResult {
  const origin = req.headers.get('Origin');
  const referer = req.headers.get('Referer');
  const csrfToken = req.headers.get('X-CSRF-Token');

  // Validate origin
  const originResult = validateOrigin(origin);
  if (!originResult.valid) {
    // Try referer as fallback
    const refererResult = validateReferer(referer);
    if (!refererResult.valid) {
      return {
        valid: false,
        error: `CSRF validation failed: ${originResult.error}`,
      };
    }
  }

  // Validate CSRF token if present
  const tokenResult = validateCsrfToken(csrfToken);
  if (!tokenResult.valid) {
    return tokenResult;
  }

  return { valid: true };
}

/**
 * Middleware helper to validate CSRF on mutable requests
 */
export function requireCsrfValidation(req: Request): Response | null {
  // Skip validation for safe methods
  const safeMethodsArray = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethodsArray.includes(req.method)) {
    return null;
  }

  const result = validateCsrfRequest(req);
  if (!result.valid) {
    return new Response(
      JSON.stringify({ error: 'CSRF validation failed', details: result.error }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
}
