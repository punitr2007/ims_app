import crypto from 'crypto';

const SECRET_KEY = process.env.SESSION_SECRET || 'ims-session-stateless-secret-key-2026';

export interface SessionPayload {
  cookies: string[];
  hrandNum: string;
  encFy?: string;
  comp?: string;
  createdAt: number;
}

export function encodeSessionToken(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return `${iv.toString('base64')}.${encrypted}.${tag}`;
}

export function decodeSessionToken(token: string): SessionPayload | null {
  try {
    const [ivB64, encryptedB64, tagB64] = token.split('.');
    if (!ivB64 || !encryptedB64 || !tagB64) return null;

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const payload: SessionPayload = JSON.parse(decrypted);
    // Expire after 10 minutes
    if (Date.now() - payload.createdAt > 10 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
