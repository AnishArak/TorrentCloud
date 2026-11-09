'use client';

import { useEffect, useState } from 'react';
import WorkspaceShell from '../components/WorkspaceShell';
import { apiFetch, formatBytes, speedLabel } from '../lib/api';

function date(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch('/api/torrents/history').then(setItems).catch((cause) => setError(cause.message)); }, []);

  return (
    <WorkspaceShell title="Download history">
      {() => (
        <>
          {error && <div role="alert" className="tc-error mb-4">{error}</div>}
          <div className="tc-card tc-table-wrap">
            <table className="tc-table">
              <thead><tr><th>File</th><th>Size</th><th>Status</th><th>Speed limit</th><th>Created</th><th>Completed</th><th>Expires</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item._id}><td className="min-w-44 font-medium">{item.name}</td><td>{formatBytes(item.totalSize)}</td><td className="capitalize">{item.status}</td><td>{speedLabel(item.maxDownloadSpeed)}</td><td>{date(item.createdAt)}</td><td>{date(item.completedAt)}</td><td>{date(item.expiresAt)}</td></tr>)}</tbody>
            </table>
            {items.length === 0 && <div className="p-8 text-center text-sm text-muted">Your download history is empty.</div>}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
