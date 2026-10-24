import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

const norm = (s: string) => s.trim().toLowerCase();

function isListedEmail(
  email: string | null | undefined,
  allowlist: string | undefined,
): boolean {
  const normalized = norm(email ?? '');
  if (!normalized) return false;
  return (allowlist ?? '').split(/[,，、;\s]+/).map(norm).includes(normalized);
}

export const authConfig = {
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && isListedEmail(profile.email, process.env.AUTH_ALLOWED_EMAILS);
    },
    // セッション確認のたびに許可リストを見直す。null を返すと Auth.js がセッション cookie を消す
    jwt({ token }) {
      return isListedEmail(token.email, process.env.AUTH_ALLOWED_EMAILS) ? token : null;
    },
  },
} satisfies NextAuthConfig;
