// CSRF Protection Implementation
import { randomBytes } from 'crypto';

// Store for CSRF tokens (should use Redis or database in production)
const csrfTokenStore = new Map<string, { token: string; timestamp: number }>();
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Clean expired tokens
function cleanExpiredTokens() {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now - data.timestamp > TOKEN_EXPIRY) {
      csrfTokenStore.delete(sessionId);
    }
  }
}

// Generate CSRF token
export function generateCSRFToken(sessionId: string): string {
  cleanExpiredTokens();
  
  // Generate secure random token
  const token = randomBytes(32).toString('hex');
  
  // Store with timestamp
  csrfTokenStore.set(sessionId, {
    token,
    timestamp: Date.now()
  });
  
  return token;
}

// Validate CSRF token
export function validateCSRFToken(sessionId: string, token: string): boolean {
  cleanExpiredTokens();
  
  const storedData = csrfTokenStore.get(sessionId);
  
  if (!storedData) {
    return false;
  }
  
  // Check if token matches and hasn't expired
  const isValid = storedData.token === token && 
                  (Date.now() - storedData.timestamp) <= TOKEN_EXPIRY;
  
  // Remove token after validation (single use)
  if (isValid) {
    csrfTokenStore.delete(sessionId);
  }
  
  return isValid;
}

// React hook for CSRF protection
export function useCSRFToken(): { token: string; refreshToken: () => void } {
  // This should be integrated with your session management
  // For now, using a placeholder
  const sessionId = typeof window !== 'undefined' 
    ? window.crypto.randomUUID() 
    : 'server-render';
  
  const token = generateCSRFToken(sessionId);
  
  const refreshToken = () => {
    return generateCSRFToken(sessionId);
  };
  
  return { token, refreshToken };
}

// Middleware helper for server actions
export function withCSRFProtection<T extends (...args: any[]) => any>(
  action: T,
  getSessionId: (request: any) => string
): T {
  return (async (...args: Parameters<T>) => {
    // Extract CSRF token from headers or form data
    const request = args[0];
    const csrfToken = request.headers?.get('X-CSRF-Token') || 
                     request.formData?.get('_csrf');
    
    if (!csrfToken) {
      throw new Error('CSRF token missing');
    }
    
    const sessionId = getSessionId(request);
    
    if (!validateCSRFToken(sessionId, csrfToken as string)) {
      throw new Error('Invalid CSRF token');
    }
    
    // Execute original action
    return action(...args);
  }) as T;
}