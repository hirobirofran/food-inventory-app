import { afterEach, describe, expect, it, vi } from 'vitest';
import { authConfig } from './auth.config';

type SignInParams = Parameters<NonNullable<typeof authConfig.callbacks.signIn>>[0];
function signIn(profile: SignInParams['profile']) {
  return authConfig.callbacks.signIn({ user: { id: 'u' }, account: null, profile } as SignInParams);
}
const verified = (email: string) => ({ email, email_verified: true });

afterEach(() => vi.unstubAllEnvs());

describe('authConfig.callbacks.signIn（許可リスト）', () => {
  it('許可リストにある検証済みメールは許可', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com,b@example.com');
    expect(await signIn(verified('b@example.com'))).toBe(true);
  });
  it('大小文字と前後の空白を無視する', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', ' b@example.com , a@example.com ');
    expect(await signIn(verified('A@Example.com'))).toBe(true);
  });
  it('許可リストに無いメールは拒否', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com');
    expect(await signIn(verified('c@example.com'))).toBe(false);
  });
  it('部分一致・ドメイン一致では許可しない', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com,example.com');
    expect(await signIn(verified('xa@example.com'))).toBe(false);
    expect(await signIn(verified('z@example.com'))).toBe(false);
  });
  it('email_verified が true でなければ拒否', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com');
    expect(await signIn({ email: 'a@example.com', email_verified: false })).toBe(false);
    expect(await signIn({ email: 'a@example.com' })).toBe(false);
  });
  it('email が無ければ拒否', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com');
    expect(await signIn({ email_verified: true })).toBe(false);
    expect(await signIn(undefined)).toBe(false);
  });
  it.each([undefined, '', ' , '])('許可リストが %j なら全員拒否', async (list) => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', list);
    expect(await signIn(verified('a@example.com'))).toBe(false);
  });
});

type JwtParams = Parameters<NonNullable<typeof authConfig.callbacks.jwt>>[0];
function jwt(token: JwtParams['token']) {
  return authConfig.callbacks.jwt({ token, user: { id: 'u' }, account: null } as JwtParams);
}

describe('authConfig.callbacks.jwt（許可リストの再確認）', () => {
  it('許可リストにあるメールならトークンをそのまま返す', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com');
    const token = { email: 'A@Example.com' };
    expect(await jwt(token)).toBe(token);
  });
  it('許可リストから外れたメールは null（セッション破棄）', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'b@example.com');
    expect(await jwt({ email: 'a@example.com' })).toBeNull();
  });
  it('許可リストが未設定なら null', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', undefined);
    expect(await jwt({ email: 'a@example.com' })).toBeNull();
  });
  it('email の無いトークンは null', async () => {
    vi.stubEnv('AUTH_ALLOWED_EMAILS', 'a@example.com');
    expect(await jwt({})).toBeNull();
    expect(await jwt({ email: null })).toBeNull();
  });
});
