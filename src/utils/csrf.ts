/**
 * CSRF Protection Utilities
 * 
 * Provides CSRF token generation and validation for forms and API calls.
 * Works in conjunction with origin validation in edge functions.
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'csrf_token_expiry';
const TOKEN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generates a cryptographically secure random token
 */
function generateRandomToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets the current CSRF token, generating a new one if expired or missing
 */
export function getCsrfToken(): string {
  const existingToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
  
  // Check if token exists and is not expired
  if (existingToken && expiry && Date.now() < parseInt(expiry, 10)) {
    return existingToken;
  }
  
  // Generate new token
  const newToken = generateRandomToken();
  const newExpiry = Date.now() + TOKEN_VALIDITY_MS;
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
  sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, newExpiry.toString());
  
  return newToken;
}

/**
 * Refreshes the CSRF token (call after sensitive operations)
 */
export function refreshCsrfToken(): string {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
  return getCsrfToken();
}

/**
 * Gets headers with CSRF token for API calls
 */
export function getCsrfHeaders(): Record<string, string> {
  return {
    'X-CSRF-Token': getCsrfToken(),
  };
}

/**
 * Validates that the request origin matches allowed origins
 */
export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.some(allowed => {
    // Handle wildcard subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
    }
    return origin === allowed;
  });
}
