import type { Metadata, Viewport } from 'next';
import Header from '@/components/common/Header';
import BottomNav from '@/components/common/BottomNav';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Daily Dish',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Daily Dish',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22C55E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#F5F5F5] text-gray-800 antialiased">
        <Header />

        {/* ヘッダー(14=56px)とフッター(16=64px+セーフエリア)の高さ分、メインコンテンツに余白を設定 */}
        <main className="min-h-screen pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        <BottomNav />
      </body>
    </html>
  );
}
