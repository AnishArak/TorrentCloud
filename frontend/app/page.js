'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Download, ShieldCheck, Waves } from 'lucide-react';
import { getToken } from './lib/api';

const features = [
  { icon: Waves, title: 'Fast Downloads', text: 'Let your server do the work, with speed controls that suit you.' },
  { icon: Download, title: 'Real-time Progress', text: 'Follow every download as it moves, with live speed and ETA.' },
  { icon: ShieldCheck, title: 'Secure File Storage', text: 'Your files and download history stay within your account.' },
  { icon: Clock3, title: 'Automatic Expiration', text: 'Completed files expire automatically to keep storage tidy.' }
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(getToken())), []);
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="tc-brand"><span className="tc-brand-mark"><Download size={20} /></span>TorrentCloud</Link>
        <Link href={signedIn ? '/dashboard' : '/login'} className="tc-button tc-button-secondary">{signedIn ? 'Open workspace' : 'Sign in'}<ArrowRight size={16} /></Link>
      </nav>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_.95fr] md:items-center md:pb-28 md:pt-24">
        <div className="tc-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1.5 text-xs font-medium text-muted"><span className="h-2 w-2 rounded-full bg-sage" />Your files, on your terms</div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl">Your personal cloud download workspace.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">Upload a torrent or paste a magnet link, then manage your downloads from one simple dashboard.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signedIn ? '/dashboard#add-download' : '/register'} className="tc-button"><Download size={17} />Upload Torrent</Link>
            <Link href={signedIn ? '/dashboard#add-download' : '/register'} className="tc-button tc-button-secondary">Paste Magnet</Link>
          </div>
          <div className="mt-7 text-xs text-muted">Private by account · 5 GB maximum content · Files expire automatically</div>
        </div>
        <div className="tc-card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rust-soft/40 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between"><div><div className="text-sm font-semibold">Your workspace</div><div className="mt-1 text-xs text-muted">A calmer way to manage downloads</div></div><span className="rounded-full bg-sand px-3 py-1 text-xs text-muted">Preview</span></div>
            <div className="tc-card-soft p-5"><div className="flex items-center justify-between text-sm font-medium"><span>Ubuntu desktop image</span><span className="text-rust">72%</span></div><div className="tc-progress mt-4"><span style={{ width: '72%' }} /></div><div className="mt-4 flex justify-between text-xs text-muted"><span>8.6 MB/s</span><span>04:21 remaining</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="tc-card-soft p-4"><div className="text-xs text-muted">Storage</div><div className="mt-2 text-lg font-semibold">4.2 GB <span className="text-sm font-normal text-muted">/ 10 GB</span></div></div><div className="tc-card-soft p-4"><div className="text-xs text-muted">Active downloads</div><div className="mt-2 text-lg font-semibold">02</div></div></div>
          </div>
        </div>
      </section>
      <section className="border-y border-border bg-paper/70"><div className="mx-auto max-w-6xl px-6 py-16"><div className="mb-8 max-w-lg"><div className="text-xs font-semibold uppercase tracking-[.18em] text-rust">Made for focus</div><h2 className="mt-3 text-3xl font-semibold tracking-tight">Everything you need. Nothing noisy.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, text }) => <article key={title} className="tc-card p-5"><Icon size={20} className="text-rust" /><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p></article>)}</div></div></section>
      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted">TorrentCloud · Use only content you’re authorized to download.</footer>
    </main>
  );
}
