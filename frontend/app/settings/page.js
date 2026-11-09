'use client';

import { useEffect, useState } from 'react';
import { Gauge, HardDrive, Save } from 'lucide-react';
import WorkspaceShell from '../components/WorkspaceShell';
import { apiFetch, formatBytes, speedOptions } from '../lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [speed, setSpeed] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch('/api/users/me').then(({ user: account }) => {
      setUser(account);
      setSpeed(account.maxDownloadSpeed == null ? 'unlimited' : String(account.maxDownloadSpeed / (1024 ** 2)));
    }).catch((cause) => setError(cause.message));
  }, []);

  async function save() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await apiFetch('/api/users/me/speed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speedLimit: speed === 'unlimited' ? speed : Number(speed) })
      });
      setMessage('Speed preference saved and active downloads updated.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell title="Settings">
      {() => (
        <div className="max-w-3xl space-y-5">
          <section className="tc-card p-6 sm:p-8">
            <div className="flex items-start gap-3"><span className="tc-brand-mark"><Gauge size={19} /></span><div><h2 className="text-lg font-semibold">Maximum Download Speed</h2><p className="mt-1 text-sm text-muted">This limit is enforced by aria2 on the server and applies to active downloads.</p></div></div>
            <label className="tc-label mt-7 block">Default maximum speed
              <select className="tc-input mt-2 max-w-sm" value={speed} onChange={(event) => setSpeed(event.target.value)} disabled={!user}>
                {speedOptions(user?.maxAllowedDownloadSpeed, user?.allowUnlimitedDownloadSpeed).map((option) => (
                  <option key={option.value} value={String(option.value === 'unlimited' ? option.value : option.value)}>{option.label}</option>
                ))}
              </select>
            </label>
            <button disabled={busy || !user} onClick={save} className="tc-button mt-5"><Save size={16} />{busy ? 'Saving…' : 'Save speed limit'}</button>
            {message && <div role="status" className="mt-4 text-sm text-sage">{message}</div>}
            {error && <div role="alert" className="tc-error mt-4">{error}</div>}
          </section>
          <section className="tc-card p-6 sm:p-8">
            <div className="flex items-start gap-3"><span className="tc-brand-mark"><HardDrive size={19} /></span><div><h2 className="text-lg font-semibold">Storage quota</h2><p className="mt-1 text-sm text-muted">Downloads reserve space before they begin. Completed files release it after expiration or deletion.</p></div></div>
            <div className="mt-6 flex justify-between text-sm"><span>{formatBytes(user?.storageUsed)} used</span><span className="text-muted">{formatBytes(user?.storageLimit)} total</span></div>
            <div className="tc-progress mt-3 h-3"><span style={{ width: `${user?.storageLimit ? Math.min(100, (user.storageUsed / user.storageLimit) * 100) : 0}%` }} /></div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
