'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, Clock3, Download, FolderOpen, Gauge, LogOut, Settings, Waves } from 'lucide-react';
import { apiFetch, clearToken, getToken } from '../lib/api';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Waves },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/history', label: 'History', icon: Clock3 },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export default function WorkspaceShell({ title, children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    apiFetch('/api/users/me')
      .then((result) => setUser(result.user))
      .catch((cause) => setError(cause.message));
  }, [router]);

  function signOut() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="tc-shell">
      <aside className="tc-sidebar">
        <Link href="/" className="tc-brand">
          <span className="tc-brand-mark"><Download size={20} /></span>
          <span>TorrentCloud</span>
        </Link>
        <nav className="tc-nav" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.8} />{label}
            </Link>
          ))}
        </nav>
        <div className="tc-sidebar-bottom">
          <div className="mb-3 truncate text-sm font-medium">{user?.name || 'Your workspace'}</div>
          <div className="truncate text-xs text-muted">{user?.email}</div>
          <button onClick={signOut} className="tc-button tc-button-quiet mt-4 w-full justify-start">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      <main className="tc-main">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted">Your personal download workspace</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          <Link className="tc-button" href="/dashboard#add-download"><Download size={16} /> Add download</Link>
        </header>
        {error && <div role="alert" className="tc-error mb-5">{error}</div>}
        {children({ user, setUser })}
      </main>
    </div>
  );
}
