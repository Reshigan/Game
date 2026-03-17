import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: 'user' | 'admin' | 'editor' | 'viewer';
  iat: number;
  exp: number;
  jti: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tenantId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
  jti: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate secrets are present at startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
}

// Token blacklist for revocation (in production, use Redis)
const revokedTokens = new Set<string>();

export function generateAccessToken(
  userId: string,
  tenantId: string,
  role: 'user' | 'admin' | 'editor' | 'viewer'
): string {
  const jti = randomBytes(16).toString('hex');
  
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId,
    tenantId,
    role,
    jti,
  };

  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'wordcloud-analytics',
    audience: 'wordcloud-api',
    subject: userId,
  });
}

export function generateRefreshToken(
  userId: string,
  tenantId: string,
  tokenVersion: number
): string {
  const jti = randomBytes(16).toString('hex');
  
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId,
    tenantId,
    tokenVersion,
    jti,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET!, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'wordcloud-analytics',
    audience: 'wordcloud-refresh',
    subject: userId,
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    // Check if token is revoked
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && revokedTokens.has(decoded.jti)) {
      return null;
    }

    const payload = jwt.verify(token, JWT_SECRET!, {
      issuer: 'wordcloud-analytics',
      audience: 'wordcloud-api',
    }) as JwtPayload;

    return payload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET!, {
      issuer: 'wordcloud-analytics',
      audience: 'wordcloud-refresh',
    }) as RefreshTokenPayload;

    return payload;
  } catch (error) {
    return null;
  }
}

export function revokeToken(jti: string): void {
  revokedTokens.add(jti);
  
  // In production, also add to Redis with TTL matching token expiry
  // await redis.setex(`revoked:${jti}`, expiresIn, '1');
}

export function isTokenRevoked(jti: string): boolean {
  return revokedTokens.has(jti);
}

export function clearRevokedTokens(): void {
  // Cleanup for testing
  revokedTokens.clear();
}