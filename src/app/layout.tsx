import type { Metadata } from 'next';
import './globals.css';
import './design-system/design-system.css';
import '@/components/app-shell.css';
import './landing.css';
import './auth.css';

export const metadata: Metadata = {
  title: 'Northstar ACT — Prepare smarter. Raise your ACT score.',
  description:
    'A free, intelligent ACT coach that helps you diagnose, practice, learn, and improve your score.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
