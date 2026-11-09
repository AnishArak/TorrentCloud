import './globals.css';

export const metadata = {
  title: 'TorrentCloud',
  description: 'Your personal cloud download workspace'
};

export default function Layout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
