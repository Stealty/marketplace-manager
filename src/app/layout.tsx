import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const heading = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Marketplace Command Center',
  description: 'Centralizador de operações de marketplaces',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme-mode="dark" className={`${heading.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
