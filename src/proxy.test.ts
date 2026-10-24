import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({ auth: (handler: unknown) => handler }));

import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from './proxy';

const handler = proxy as unknown as (req: NextRequest) => Response | Promise<Response>;
const run = (url: string, auth: unknown) =>
  handler(Object.assign(new NextRequest(new URL(url, 'https://app.example')), { auth }));

describe('proxy', () => {
  it('ログイン済みなら通す', async () => {
    const res = await run('/foods', { user: { email: 'a@example.com' }, expires: '' });
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
  it('未ログインの /api/* は 401 JSON', async () => {
    const res = await run('/api/foods', null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
  it('未ログインのページは組み込みサインイン画面へ、元の path+query を callbackUrl に', async () => {
    const res = await run('/?x=1', null);
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/api/auth/signin');
    expect(loc.searchParams.get('callbackUrl')).toBe('/?x=1');
  });
  it('user の無いセッションは未ログイン扱い', async () => {
    const res = await run('/api/foods', { expires: '' });
    expect(res.status).toBe(401);
  });
});

describe('proxy matcher', () => {
  it.each(['/api/auth/signin', '/api/auth/callback/google'])('%s は対象外（Auth.js のエンドポイント）', (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(false);
  });
  it.each(['/api/foods', '/api/authors', '/'])('%s は対象（認証が要る）', (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(true);
  });
});
