'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { API, setToken } from '../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(event) { setForm((value) => ({ ...value, [event.target.name]: event.target.value })); }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Account creation failed.');
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
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted">Your personal space for cloud downloads.</p>
          <label className="tc-label mt-6">Name<input required name="name" autoComplete="name" maxLength={80} value={form.name} onChange={update} className="tc-input mt-2" /></label>
          <label className="tc-label mt-4">Email<input required type="email" name="email" autoComplete="email" value={form.email} onChange={update} className="tc-input mt-2" /></label>
          <label className="tc-label mt-4">Password<input required type="password" name="password" minLength={8} autoComplete="new-password" value={form.password} onChange={update} className="tc-input mt-2" /></label>
          <label className="tc-label mt-4">Confirm Password<input required type="password" name="confirmPassword" minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={update} className="tc-input mt-2" /></label>
          <button disabled={busy} className="tc-button mt-6 w-full">{busy ? 'Creating account…' : 'Create Account'}</button>
          {error && <div role="alert" className="tc-error mt-4">{error}</div>}
          <p className="mt-6 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-rust hover:underline">Sign in</Link></p>
        </form>
      </div>
    </main>
  );
}
