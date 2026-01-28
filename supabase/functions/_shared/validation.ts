// Input validation and sanitization utilities for edge functions

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Safe string sanitization - removes potential XSS and SQL injection patterns
export function sanitizeString(input: unknown, maxLength = 1000): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;
  
  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  
  // Escape HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  
  return sanitized;
}

// Validate and sanitize a required string
export function validateRequiredString(
  input: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 1000
): { valid: true; value: string } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  
  const sanitized = sanitizeString(trimmed, maxLength);
  if (sanitized === null) {
    return { valid: false, error: `${fieldName} contains invalid characters` };
  }
  
  return { valid: true, value: sanitized };
}

// Validate UUID format
export function validateUUID(
  input: unknown,
  fieldName: string
): { valid: true; value: string } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = input.trim().toLowerCase();
  
  if (!UUID_REGEX.test(trimmed)) {
    return { valid: false, error: `${fieldName} is not a valid UUID` };
  }
  
  return { valid: true, value: trimmed };
}

// Validate array of UUIDs
export function validateUUIDArray(
  input: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 100
): { valid: true; value: string[] } | { valid: false; error: string } {
  if (!Array.isArray(input)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }
  
  if (input.length < minLength) {
    return { valid: false, error: `${fieldName} must contain at least ${minLength} item(s)` };
  }
  
  if (input.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} items` };
  }
  
  const validatedIds: string[] = [];
  
  for (let i = 0; i < input.length; i++) {
    const result = validateUUID(input[i], `${fieldName}[${i}]`);
    if (!result.valid) {
      return result;
    }
    validatedIds.push(result.value);
  }
  
  return { valid: true, value: validatedIds };
}

// Validate positive number
export function validatePositiveNumber(
  input: unknown,
  fieldName: string,
  maxValue = Number.MAX_SAFE_INTEGER
): { valid: true; value: number } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const num = typeof input === "string" ? parseFloat(input) : input;
  
  if (typeof num !== "number" || isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (num <= 0) {
    return { valid: false, error: `${fieldName} must be positive` };
  }
  
  if (num > maxValue) {
    return { valid: false, error: `${fieldName} exceeds maximum allowed value` };
  }
  
  // Round to 2 decimal places for currency values
  const rounded = Math.round(num * 100) / 100;
  
  return { valid: true, value: rounded };
}

// Validate optional positive number
export function validateOptionalPositiveNumber(
  input: unknown,
  fieldName: string,
  maxValue = Number.MAX_SAFE_INTEGER
): { valid: true; value: number | null } | { valid: false; error: string } {
  if (input === null || input === undefined || input === "") {
    return { valid: true, value: null };
  }
  
  const result = validatePositiveNumber(input, fieldName, maxValue);
  if (!result.valid) return result;
  
  return { valid: true, value: result.value };
}

// Validate base64 image data
export function validateBase64Image(
  input: unknown,
  fieldName: string,
  maxSizeBytes = 10 * 1024 * 1024 // 10MB default
): { valid: true; value: string } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  // Check for data URL format
  const dataUrlMatch = input.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i);
  if (!dataUrlMatch) {
    return { valid: false, error: `${fieldName} must be a valid image data URL (png, jpeg, gif, or webp)` };
  }
  
  // Extract and validate base64 content
  const base64Content = input.slice(dataUrlMatch[0].length);
  
  // Check if it's valid base64
  try {
    // Basic base64 validation - check characters
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Content)) {
      return { valid: false, error: `${fieldName} contains invalid base64 characters` };
    }
    
    // Estimate size (base64 is ~4/3 larger than original)
    const estimatedSize = (base64Content.length * 3) / 4;
    if (estimatedSize > maxSizeBytes) {
      return { valid: false, error: `${fieldName} exceeds maximum size of ${Math.round(maxSizeBytes / 1024 / 1024)}MB` };
    }
  } catch {
    return { valid: false, error: `${fieldName} is not valid base64` };
  }
  
  return { valid: true, value: input };
}

// Validate URL
export function validateURL(
  input: unknown,
  fieldName: string,
  allowedProtocols = ["https:"]
): { valid: true; value: string } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  try {
    const url = new URL(input);
    
    if (!allowedProtocols.includes(url.protocol)) {
      return { valid: false, error: `${fieldName} must use ${allowedProtocols.join(" or ")} protocol` };
    }
    
    return { valid: true, value: url.href };
  } catch {
    return { valid: false, error: `${fieldName} is not a valid URL` };
  }
}

// Validate optional URL
export function validateOptionalURL(
  input: unknown,
  fieldName: string,
  allowedProtocols = ["https:"]
): { valid: true; value: string | null } | { valid: false; error: string } {
  if (input === null || input === undefined || input === "") {
    return { valid: true, value: null };
  }
  
  return validateURL(input, fieldName, allowedProtocols);
}

// Validate enum value
export function validateEnum<T extends string>(
  input: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): { valid: true; value: T } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = input.trim();
  
  if (!allowedValues.includes(trimmed as T)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(", ")}` };
  }
  
  return { valid: true, value: trimmed as T };
}

// Validate optional enum value
export function validateOptionalEnum<T extends string>(
  input: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): { valid: true; value: T | null } | { valid: false; error: string } {
  if (input === null || input === undefined || input === "") {
    return { valid: true, value: null };
  }
  
  const result = validateEnum(input, fieldName, allowedValues);
  if (!result.valid) return result;
  
  return { valid: true, value: result.value };
}

// Validate date string (YYYY-MM-DD format)
export function validateDateString(
  input: unknown,
  fieldName: string
): { valid: true; value: string } | { valid: false; error: string } {
  if (input === null || input === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (typeof input !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = input.trim();
  
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, error: `${fieldName} must be in YYYY-MM-DD format` };
  }
  
  // Check if it's a valid date
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  
  // Check if the parsed date matches the input (catches invalid dates like 2024-02-30)
  const [year, month, day] = trimmed.split("-").map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return { valid: false, error: `${fieldName} is not a valid date` };
  }
  
  return { valid: true, value: trimmed };
}

// Validate optional date string
export function validateOptionalDateString(
  input: unknown,
  fieldName: string
): { valid: true; value: string | null } | { valid: false; error: string } {
  if (input === null || input === undefined || input === "") {
    return { valid: true, value: null };
  }
  
  return validateDateString(input, fieldName);
}

// Create validation error response
export function validationErrorResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error, validationError: true }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Parse JSON body safely
export async function parseJSONBody(
  req: Request
): Promise<{ valid: true; data: unknown } | { valid: false; error: string }> {
  try {
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      return { valid: false, error: "Content-Type must be application/json" };
    }
    
    const text = await req.text();
    
    // Check for reasonable body size (1MB max for JSON)
    if (text.length > 1024 * 1024) {
      return { valid: false, error: "Request body too large" };
    }
    
    const data = JSON.parse(text);
    return { valid: true, data };
  } catch {
    return { valid: false, error: "Invalid JSON body" };
  }
}
