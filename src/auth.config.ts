import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export function isListedEmail(
  email: string | null | undefined,
  allowlist: string | undefined,
): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const allowed = (allowlist ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== '');
  return allowed.includes(normalized);
}

export function isAllowedEmail(
  profile: { email?: string | null; email_verified?: boolean | null } | undefined,
  allowlist: string | undefined,
): boolean {
  return profile?.email_verified === true && isListedEmail(profile.email, allowlist);
}

export const authConfig = {
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return isAllowedEmail(profile, process.env.AUTH_ALLOWED_EMAILS);
    },
    // セッション確認のたびに許可リストを見直す。null を返すと Auth.js がセッション cookie を消す
    jwt({ token }) {
      return isListedEmail(token.email, process.env.AUTH_ALLOWED_EMAILS) ? token : null;
    },
  },
} satisfies NextAuthConfig;
