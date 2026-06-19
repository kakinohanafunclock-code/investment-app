import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

// ===== パスワードハッシュ（scrypt・Node 組み込み。bcrypt 等のネイティブ依存を避ける）=====

const SCRYPT_KEYLEN = 64;

/** パスワードをハッシュ化。形式: scrypt$<saltHex>$<hashHex> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** パスワードを検証（タイミング安全比較）。壊れた入力でも例外を投げない。 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false;
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ===== 署名トークン（JWT 互換の HS256。ライブラリ非依存で実装・テスト可能）=====

export interface TokenPayload {
  sub: number; // user id
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** トークン発行。expiresInSec 後に失効。 */
export function signToken(payload: TokenPayload, secret: string, expiresInSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: TokenPayload = { ...payload, iat: now, exp: now + expiresInSec };
  const encHeader = b64url(JSON.stringify(header));
  const encBody = b64url(JSON.stringify(body));
  const data = `${encHeader}.${encBody}`;
  return `${data}.${sign(data, secret)}`;
}

/** トークン検証。署名不一致・期限切れ・不正形式は null。 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encHeader, encBody, sig] = parts;
    const data = `${encHeader}.${encBody}`;
    const expectedSig = sign(data, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encBody, 'base64url').toString()) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
