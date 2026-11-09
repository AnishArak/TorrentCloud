'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { API, setToken } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Sign in failed.');
      setToken(result.token);
      router.replace('/dashboard');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="tc-brand justify-center"><span className="tc-brand-mark"><Download size={20} /></span>TorrentCloud</Link>
        <form onSubmit={submit} className="tc-card mt-8 p-7 sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your download workspace.</p>
          <label className="tc-label mt-6">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="tc-input mt-2" /></label>
          <label className="tc-label mt-4">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="tc-input mt-2" /></label>
          <button disabled={busy} className="tc-button mt-6 w-full">{busy ? 'Signing in…' : 'Sign In'}</button>
          {error && <div role="alert" className="tc-error mt-4">{error}</div>}
          <p className="mt-6 text-center text-sm text-muted">Don’t have an account? <Link href="/register" className="font-semibold text-rust hover:underline">Create account</Link></p>
        </form>
        <Link href="/" className="mt-5 flex items-center justify-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={15} />Back to home</Link>
      </div>
    </main>
  );
}
