import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '../components/app-shell';

export const metadata: Metadata = {
  title: 'Жизнь в Эларионе',
  description: 'Летопись одной случайной жизни в фэнтезийном мире.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b1119' };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><AppShell>{children}</AppShell></body></html>;
}
