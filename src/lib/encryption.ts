// Data Encryption and Security Utilities

// Check if running in browser or server
const isBrowser = typeof window !== 'undefined';

// Browser-safe encryption key generation
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-me!!!' // Must be 32 chars
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Encrypt sensitive data (browser-safe)
export function encryptData(text: string): string {
  // In browser, use base64 encoding for simple obfuscation
  // For production, use Web Crypto API
  if (isBrowser) {
    return btoa(encodeURIComponent(text));
  }
  
  // Server-side encryption (Node.js)
  const crypto = require('crypto');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt sensitive data (browser-safe)
export function decryptData(encryptedData: string): string {
  // In browser, decode from base64
  if (isBrowser) {
    try {
      return decodeURIComponent(atob(encryptedData));
    } catch {
      return encryptedData; // Return as-is if decoding fails
    }
  }
  
  // Server-side decryption (Node.js)
  const crypto = require('crypto');
  const parts = encryptedData.split(':');
  if (parts.length !== 2) return encryptedData;
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Hash sensitive data (one-way, browser-safe)
export function hashData(data: string): string {
  if (isBrowser) {
    // Simple browser-safe hash using built-in JS
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  // Server-side hashing (Node.js)
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Mask sensitive data for logging
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const masked = '*'.repeat(Math.max(4, data.length - visibleChars * 2));
  
  return `${start}${masked}${end}`;
}

// Validate and sanitize phone numbers
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Validate Saudi phone number format
  if (cleaned.startsWith('966')) {
    return cleaned.substring(0, 12); // 966 + 9 digits
  } else if (cleaned.startsWith('05')) {
    return '966' + cleaned.substring(1, 10); // Convert to international
  }
  
  throw new Error('Invalid Saudi phone number format');
}

// Generate secure random tokens (browser-safe)
export function generateSecureToken(length: number = 32): string {
  if (isBrowser) {
    // Browser-safe random token generation
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Server-side token generation (Node.js)
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64url');
}

// Time-based OTP for 2FA (browser-safe)
export function generateTOTP(secret: string, window: number = 30): string {
  if (isBrowser) {
    // Simple browser-safe OTP generation
    const counter = Math.floor(Date.now() / 1000 / window);
    const hash = hashData(secret + counter.toString());
    const code = parseInt(hash.substring(0, 6), 16) % 1000000;
    return code.toString().padStart(6, '0');
  }
  
  // Server-side TOTP generation (Node.js)
  const crypto = require('crypto');
  const counter = Math.floor(Date.now() / 1000 / window);
  
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  hmac.update(Buffer.from(counter.toString(16).padStart(16, '0'), 'hex'));
  
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  
  return code.toString().padStart(6, '0');
}

// Secure session token generation
export interface SessionToken {
  token: string;
  expiresAt: Date;
  fingerprint: string;
}

export function generateSessionToken(userId: string, userAgent: string): SessionToken {
  const token = generateSecureToken(48);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const fingerprint = hashData(`${userId}:${userAgent}:${token}`);
  
  return { token, expiresAt, fingerprint };
}

// Validate session token
export function validateSessionToken(
  token: SessionToken, 
  userId: string, 
  userAgent: string
): boolean {
  // Check expiration
  if (new Date() > token.expiresAt) {
    return false;
  }
  
  // Validate fingerprint
  const expectedFingerprint = hashData(`${userId}:${userAgent}:${token.token}`);
  return token.fingerprint === expectedFingerprint;
}

// Rate limiting with exponential backoff
interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; retriesLeft: number; blockedUntil?: Date } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  // Clean old entries
  if (entry && now - entry.lastAttempt > windowMs) {
    rateLimitStore.delete(identifier);
  }
  
  if (!entry) {
    rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
    return { allowed: true, retriesLeft: maxAttempts - 1 };
  }
  
  // Check if blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { 
      allowed: false, 
      retriesLeft: 0, 
      blockedUntil: new Date(entry.blockedUntil) 
    };
  }
  
  // Increment attempts
  entry.attempts++;
  entry.lastAttempt = now;
  
  if (entry.attempts >= maxAttempts) {
    // Apply exponential backoff
    const blockDuration = Math.min(
      windowMs * Math.pow(2, entry.attempts - maxAttempts),
      24 * 60 * 60 * 1000 // Max 24 hours
    );
    entry.blockedUntil = now + blockDuration;
    
    return { 
      allowed: false, 
      retriesLeft: 0, 
      blockedUntil: new Date(entry.blockedUntil) 
    };
  }
  
  return { allowed: true, retriesLeft: maxAttempts - entry.attempts };
}