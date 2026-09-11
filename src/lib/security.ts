/**
 * Client-Side Security Utilities
 * Defense-in-depth: sanitization, rate limiting, PII redaction
 */

/** Sanitizes a user-provided string to prevent XSS */
export function sanitizeString(input: string): string {
  // Strip HTML tags, encode special chars
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/** 
 * Client-side token-bucket rate limiter 
 * Used to prevent rapid-fire API calls from the browser.
 */
export class ClientRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens = 10, refillRate = 0.5) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  canProceed(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  getTimeUntilReady(): number {
    // returns ms until next token available
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate * 1000);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

/** Redacts PII from log strings (emails, IPs, phone numbers) */
export function redactPII(input: string): string {
  // Implement email, IP, phone number redaction
  return input
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]')
    .replace(/(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE_REDACTED]');
}

/** Generates Content-Security-Policy header value for the app */
export function getCSPHeaderValue(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",  // Tailwind needs inline
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Returns security headers object for API responses */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': getCSPHeaderValue(),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Modern browsers: CSP is preferred
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

/** 
 * Validates that external links use safe attributes.
 * Returns the required rel attribute string.
 */
export function getSafeExternalLinkAttrs(): {
  target: string;
  rel: string;
} {
  return {
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
  };
}
