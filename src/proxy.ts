import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'auth';

function expectedCookieValue(secret: string): string {
  return createHmac('sha256', secret).update('ok').digest('hex');
}

function isAuthed(request: NextRequest): boolean {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) return false;
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = expectedCookieValue(secret);
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function proxy(request: NextRequest) {
  if (isAuthed(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (isApi) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|icon-|manifest|login|api/login).*)'],
};
