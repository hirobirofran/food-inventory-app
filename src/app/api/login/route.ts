import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'auth';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const sitePassword = process.env.SITE_PASSWORD;
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!sitePassword || !secret) {
    return NextResponse.json(
      { ok: false, error: 'server_misconfigured' },
      { status: 500 }
    );
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!safeEqual(password, sitePassword)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieValue = createHmac('sha256', secret).update('ok').digest('hex');
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
  return response;
}
