import type { Metadata } from 'next';
import { Space_Grotesk, Manrope, Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const headingOceano = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading-oceano',
  display: 'swap',
});

const headingFloresta = Manrope({
  subsets: ['latin'],
  variable: '--font-heading-floresta',
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
    <html
      lang="pt-BR"
      data-theme-mode="dark"
      className={`${headingOceano.variable} ${headingFloresta.variable} ${body.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
