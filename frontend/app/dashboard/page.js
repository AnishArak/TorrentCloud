'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, Archive, HardDrive, Waves } from 'lucide-react';
import WorkspaceShell from '../components/WorkspaceShell';
import AddDownload from '../components/AddDownload';
import DownloadCard from '../components/DownloadCard';
import { API, apiFetch, formatBytes, formatSpeed, getToken } from '../lib/api';

export default function DashboardPage() {
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [downloads, account] = await Promise.all([apiFetch('/api/torrents'), apiFetch('/api/users/me')]);
      setItems(downloads);
      setProfile(account);
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const socket = io(API, { auth: { token: getToken() } });
    socket.on('download:update', (updated) => setItems((current) => {
      const index = current.findIndex((item) => item._id === updated._id);
      if (index < 0) return [updated, ...current];
      const next = [...current];
      next[index] = updated;
      return next;
    }));
    const timer = setInterval(refresh, 10000);
    return () => { socket.close(); clearInterval(timer); };
  }, [refresh]);

  const active = useMemo(() => items.filter((item) => ['queued', 'starting', 'downloading', 'paused'].includes(item.status)), [items]);
  const completed = useMemo(() => items.filter((item) => item.status === 'completed'), [items]);
  const bandwidth = active.reduce((sum, item) => sum + Number(item.downloadSpeed || 0), 0);
  const storagePercent = profile?.user?.storageLimit ? Math.min(100, (profile.user.storageUsed / profile.user.storageLimit) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <WorkspaceShell title="Dashboard">
      {({ user }) => (
        <div className="space-y-7">
          {error && <div role="alert" className="tc-error">{error}</div>}
          <section className="tc-card flex flex-wrap items-end justify-between gap-5 p-6 sm:p-8">
            <div><div className="text-sm text-muted">A little more room for what matters</div><h2 className="mt-2 text-3xl font-semibold tracking-tight">{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h2><p className="mt-2 text-sm text-muted">Here’s a quiet overview of your workspace.</p></div>
            <div className="rounded-full bg-sand px-4 py-2 text-xs text-muted">Private workspace</div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={HardDrive} label="Storage" value={`${formatBytes(profile?.user?.storageUsed)} / ${formatBytes(profile?.user?.storageLimit)}`} />
            <Stat icon={Waves} label="Active Downloads" value={String(profile?.stats?.activeDownloads ?? active.length)} />
            <Stat icon={Archive} label="Completed" value={String(profile?.stats?.completedDownloads ?? completed.length)} />
            <Stat icon={Activity} label="Current Bandwidth" value={formatSpeed(bandwidth)} />
          </section>
          <section className="tc-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Storage</div><div className="mt-1 text-sm text-muted">{formatBytes(profile?.user?.storageUsed)} used of {formatBytes(profile?.user?.storageLimit)}</div></div><div className="text-sm font-semibold">{storagePercent.toFixed(0)}%</div></div>
            <div className="tc-progress mt-4 h-3"><span style={{ width: `${storagePercent}%` }} /></div>
          </section>
          <div className="grid items-start gap-7 xl:grid-cols-[1.05fr_.95fr]">
            <AddDownload onAdded={refresh} />
            <section>
              <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Downloads</h2><p className="mt-1 text-sm text-muted">Your recent jobs, updated live.</p></div><button onClick={refresh} className="tc-button tc-button-quiet">Refresh</button></div>
              <div className="space-y-3">{items.length === 0 ? <div className="tc-card p-8 text-center text-sm text-muted">No downloads yet. Add a torrent or magnet to get started.</div> : items.map((item) => <DownloadCard key={item._id} item={item} maxSpeed={profile?.user?.maxDownloadSpeed} onChange={(message) => { if (typeof message === 'string') setError(message); else refresh(); }} />)}</div>
            </section>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <article className="tc-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><Icon size={18} className="text-rust" /></div><div className="tc-stat-value">{value}</div></article>;
}
