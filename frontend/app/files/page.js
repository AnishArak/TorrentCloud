'use client';

import { useEffect, useState } from 'react';
import { apiFetch, formatBytes, speedLabel } from '../lib/api';
import WorkspaceShell from '../components/WorkspaceShell';

function expiryLabel(expiresAt) {
  if (!expiresAt) return '—';
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expiring';
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `Expires in ${hours}h ${minutes}m`;
}

export default function FilesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch('/api/torrents/files').then(setItems).catch((cause) => setError(cause.message)); }, []);

  return (
    <WorkspaceShell title="Files">
      {() => (
        <div className="space-y-3">
          {error && <div role="alert" className="tc-error">{error}</div>}
          {items.map((item) => <article key={item._id} className="tc-card flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="font-semibold">{item.name}</div><div className="mt-1 text-xs text-muted">{formatBytes(item.totalSize)} · {speedLabel(item.maxDownloadSpeed)} · {expiryLabel(item.expiresAt)}</div></div><CompletedDownload item={item} /></article>)}
          {items.length === 0 && <div className="tc-card p-8 text-center text-sm text-muted">Completed downloads appear here until they expire.</div>}
        </div>
      )}
    </WorkspaceShell>
  );
}

function CompletedDownload({ item }) {
  async function download() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/downloads/file/${item.downloadToken}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('torrentcloud-token') || ''}` }
      });
      if (!response.ok) throw new Error('Download link unavailable.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.name || 'download';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Could not download this file. It may have expired.');
    }
  }
  return <button onClick={download} className="tc-button tc-button-secondary">Download</button>;
}
