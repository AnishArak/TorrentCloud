'use client';

import Link from 'next/link';
import { ArrowDownToLine, Pause, Play, X } from 'lucide-react';
import { apiFetch, API, formatBytes, formatSpeed, getToken } from '../lib/api';

export default function DownloadCard({ item, onChange, maxSpeed }) {
  async function action(path, options = {}) {
    try {
      await apiFetch(path, options);
      onChange();
    } catch (error) {
      onChange(error.message);
    }
  }

  async function downloadFile() {
    try {
      const response = await fetch(`${API}/api/downloads/file/${item.downloadToken}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Download link unavailable.');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.name || 'download';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onChange(error.message);
    }
  }

  return (
    <article className="tc-card tc-fade-in p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/downloads/${item._id}`} className="truncate text-base font-semibold hover:text-rust">{item.name}</Link>
          <div className="mt-1 text-xs capitalize text-muted">{item.status} · {formatBytes(item.completedSize)} / {formatBytes(item.totalSize)}</div>
        </div>
        <div className="text-sm font-semibold">{Number(item.progress || 0).toFixed(1)}%</div>
      </div>
      <div className="tc-progress mt-4"><span style={{ width: `${Math.min(100, item.progress || 0)}%` }} /></div>
      {item.status === 'LIMIT_EXCEEDED' && <div role="alert" className="mt-3 text-sm text-rust">This torrent contains more than the allowed 5 GB.</div>}
      {item.errorMessage && item.status !== 'LIMIT_EXCEEDED' && <div role="alert" className="mt-3 text-sm text-rust">{item.errorMessage}</div>}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
        <span>Speed: {formatSpeed(item.downloadSpeed)}</span>
        <span>Max speed: {maxSpeed === undefined ? '—' : maxSpeed === null ? 'Unlimited' : formatSpeed(maxSpeed)}</span>
        <span>ETA: {item.eta ? `${Math.floor(Number(item.eta) / 60).toString().padStart(2, '0')}:${(Number(item.eta) % 60).toString().padStart(2, '0')}` : '—'}</span>
        <div className="ml-auto flex gap-2">
          {item.status === 'downloading' && <button aria-label="Pause" onClick={() => action(`/api/downloads/${item._id}/pause`, { method: 'POST' })} className="tc-button tc-button-secondary px-3"><Pause size={15} />Pause</button>}
          {item.status === 'paused' && <button aria-label="Resume" onClick={() => action(`/api/downloads/${item._id}/resume`, { method: 'POST' })} className="tc-button tc-button-secondary px-3"><Play size={15} />Resume</button>}
          {['queued', 'starting', 'downloading', 'paused'].includes(item.status) && <button aria-label="Cancel" onClick={() => action(`/api/downloads/${item._id}`, { method: 'DELETE' })} className="tc-button tc-button-quiet px-3"><X size={15} />Cancel</button>}
          {item.status === 'completed' && <button className="tc-button tc-button-secondary px-3" onClick={downloadFile}><ArrowDownToLine size={15} />Download</button>}
        </div>
      </div>
    </article>
  );
}
