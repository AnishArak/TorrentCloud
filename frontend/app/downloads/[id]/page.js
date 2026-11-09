'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WorkspaceShell from '../../components/WorkspaceShell';
import DownloadCard from '../../components/DownloadCard';
import { apiFetch } from '../../lib/api';

export default function DownloadDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const refresh = () => apiFetch(`/api/torrents/${id}`).then(setItem).catch((cause) => setError(cause.message));
  useEffect(() => { if (id) { refresh(); apiFetch(`/api/torrents/${id}/analyze`).then(setAnalysis).catch((cause) => setError(cause.message)); } }, [id]);

  return (
    <WorkspaceShell title="Download details">
      {({ user }) => (
        <div className="max-w-3xl space-y-5">
          {error && <div role="alert" className="tc-error">{error}</div>}
          {item && <DownloadCard item={item} maxSpeed={user?.maxDownloadSpeed} onChange={(message) => typeof message === 'string' ? setError(message) : refresh()} />}
          {analysis && <section className="tc-card p-6"><h2 className="font-semibold">Metadata analysis</h2><div className="mt-4 text-sm text-muted">Category: <span className="font-medium text-ink">{analysis.category}</span></div><p className="mt-2 text-sm leading-6 text-muted">{analysis.summary}</p><div className="mt-3 flex flex-wrap gap-2">{analysis.detectedFileTypes.map((type) => <span key={type} className="rounded-full bg-sand px-3 py-1 text-xs">{type}</span>)}</div><div className="mt-3 text-xs text-muted">Confidence: {Math.round(analysis.confidence * 100)}%</div></section>}
        </div>
      )}
    </WorkspaceShell>
  );
}
