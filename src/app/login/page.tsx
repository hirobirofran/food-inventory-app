'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setError('パスワードが違います');
        setSubmitting(false);
      }
    } catch {
      setError('通信エラーが発生しました');
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 flex flex-col gap-4"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="text-5xl">🥬</div>
        <h1 className="text-xl font-bold">食材管理</h1>
        <p className="text-sm text-gray-500">家族専用ページ</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">パスワード</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || password.length === 0}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg transition-colors"
      >
        {submitting ? '確認中…' : 'ログイン'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 bg-gray-50">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
