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
  // ログインの確認から外すもの: Next.js の静的ファイル、favicon、Auth.js のエンドポイント。
  // manifest と icon- で始まるアイコンは、PWA 化（handoff/ideas/launch-plan.md の Step 3）で置くファイル用に先に外してある。
  // ホーム画面に追加するとき、ブラウザはログイン前にこれらを取りに来るため
  matcher: ['/((?!_next/|favicon.ico|icon-|manifest|api/auth/).*)'],
};
