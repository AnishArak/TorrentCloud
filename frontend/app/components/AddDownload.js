'use client';

import { useRef, useState } from 'react';
import { FileUp, Link2, Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';

const MAX_METADATA_SIZE = 100 * 1024 * 1024;

export default function AddDownload({ onAdded }) {
  const [file, setFile] = useState(null);
  const [magnet, setMagnet] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function submitFile() {
    setError('');
    if (!file) return;
    if (file.size > MAX_METADATA_SIZE) {
      setError('Torrent metadata file exceeds the 100 MB upload limit.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('torrent', file);
      await apiFetch('/api/torrents/upload', { method: 'POST', body });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onAdded();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitMagnet() {
    setError('');
    setBusy(true);
    try {
      await apiFetch('/api/torrents/magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      });
      setMagnet('');
      onAdded();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="add-download" className="tc-card p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="tc-brand-mark"><Upload size={19} /></span>
        <div>
          <h2 className="text-xl font-semibold">Add a download</h2>
          <p className="mt-1 text-sm text-muted">Choose a torrent file or paste a magnet link.</p>
        </div>
      </div>
      <button
        type="button"
        className="tc-dropzone mt-6 w-full p-5 text-center"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); event.currentTarget.dataset.dragging = 'true'; }}
        onDragLeave={(event) => { delete event.currentTarget.dataset.dragging; }}
        onDrop={(event) => { event.preventDefault(); delete event.currentTarget.dataset.dragging; setFile(event.dataTransfer.files?.[0] || null); }}
      >
        <span className="grid justify-items-center gap-2">
          <FileUp size={25} className="text-rust" />
          <span className="font-medium">{file?.name || 'Drop .torrent file here'}</span>
          <span className="text-sm text-muted">or browse your computer</span>
          <span className="tc-button tc-button-secondary mt-2"><Upload size={15} />Choose file</span>
        </span>
      </button>
      <input ref={inputRef} className="hidden" type="file" accept=".torrent" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      {file && <button disabled={busy} onClick={submitFile} className="tc-button mt-3">{busy ? 'Adding…' : 'Upload torrent'}</button>}
      <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[.16em] text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <label className="tc-label">
        <span className="mb-2 inline-flex items-center gap-2"><Link2 size={15} /> Paste magnet link</span>
        <textarea value={magnet} onChange={(event) => setMagnet(event.target.value)} placeholder="magnet:?xt=urn:btih:…" className="tc-input min-h-24 resize-y" />
      </label>
      <button disabled={busy || !magnet} onClick={submitMagnet} className="tc-button mt-3">{busy ? 'Adding…' : 'Start download'}</button>
      <p className="mt-5 text-xs leading-5 text-muted">Maximum torrent metadata: 100 MB · Maximum downloadable content: 5 GB · Default speed limit: 10 MB/s</p>
      {error && <div role="alert" className="tc-error mt-4">{error}</div>}
    </section>
  );
}
