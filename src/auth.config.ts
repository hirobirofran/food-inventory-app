import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export function isAllowedEmail(
  profile: { email?: string | null; email_verified?: boolean | null } | undefined,
  allowlist: string | undefined,
): boolean {
  const email = profile?.email?.trim().toLowerCase();
  if (!email || profile?.email_verified !== true) return false;
  const allowed = (allowlist ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== '');
  return allowed.includes(email);
}

export const authConfig = {
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return isAllowedEmail(profile, process.env.AUTH_ALLOWED_EMAILS);
    },
  },
} satisfies NextAuthConfig;
