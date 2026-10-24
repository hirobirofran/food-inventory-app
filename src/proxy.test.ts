import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// auth((req) => handler) を、handler をそのまま返す関数に差し替える
vi.mock('@/auth', () => ({ auth: (handler: unknown) => handler }));

import { proxy } from './proxy';

type Authed = NextRequest & { auth: unknown };
function request(url: string, auth: unknown): Authed {
  const req = new NextRequest(new URL(url, 'https://app.example')) as Authed;
  req.auth = auth;
  return req;
}
const run = (url: string, auth: unknown) =>
  (proxy as unknown as (req: Authed) => Response | Promise<Response>)(request(url, auth));

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
