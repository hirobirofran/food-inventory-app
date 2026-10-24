import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const proxy = auth((req) => {
  if (req.auth?.user) {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const signInUrl = new URL('/api/auth/signin', req.url);
  signInUrl.searchParams.set('callbackUrl', pathname + search);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ['/((?!_next/|favicon.ico|icon-|manifest|api/auth/).*)'],
};
