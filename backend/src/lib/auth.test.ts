import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

describe('password hashing (scrypt・ネイティブ依存なし)', () => {
  it('ハッシュは毎回異なり、正しいパスワードで検証成功', () => {
    const h1 = hashPassword('s3cret!');
    const h2 = hashPassword('s3cret!');
    expect(h1).not.toBe(h2); // ソルトが異なる
    expect(verifyPassword('s3cret!', h1)).toBe(true);
    expect(verifyPassword('s3cret!', h2)).toBe(true);
  });
  it('誤ったパスワードは検証失敗', () => {
    const h = hashPassword('correct');
    expect(verifyPassword('wrong', h)).toBe(false);
  });
  it('壊れたハッシュ文字列でも例外を投げず false', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });
});

describe('signed token (HMAC HS256)', () => {
  const secret = 'test-secret-key';
  it('署名・検証ラウンドトリップ', () => {
    const token = signToken({ sub: 42, email: 'a@b.com' }, secret, 3600);
    const payload = verifyToken(token, secret);
    expect(payload?.sub).toBe(42);
    expect(payload?.email).toBe('a@b.com');
  });
  it('改ざんトークンは null', () => {
    const token = signToken({ sub: 1 }, secret, 3600);
    const tampered = token.slice(0, -3) + 'xxx';
    expect(verifyToken(tampered, secret)).toBeNull();
  });
  it('別シークレットでは検証失敗', () => {
    const token = signToken({ sub: 1 }, secret, 3600);
    expect(verifyToken(token, 'other-secret')).toBeNull();
  });
  it('期限切れトークンは null', () => {
    const token = signToken({ sub: 1 }, secret, -10); // 既に期限切れ
    expect(verifyToken(token, secret)).toBeNull();
  });
  it('不正な形式は null', () => {
    expect(verifyToken('not.a.token', secret)).toBeNull();
    expect(verifyToken('', secret)).toBeNull();
  });
});
