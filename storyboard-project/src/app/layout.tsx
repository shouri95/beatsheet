import React, { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import ThemeToggle from '@/components/ui/ThemeToggle';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Minimal Storyboard',
  description: 'A sleek and minimal storyboard interface',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Storyboard</h1>
          <ThemeToggle />
        </header>
        <main className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl w-full p-4">{children}</div>
        </main>
      </body>
    </html>
  );
}
