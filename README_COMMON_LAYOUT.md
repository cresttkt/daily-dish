# 共通レイアウト（ヘッダー・フッター・背景）実装手順書 (デザイン調整・追加完全版)

## STEP 1: ヘッダーコンポーネントの作成

現在のURLパスを判定してタイトルとアイコンを切り替えます。文字サイズは20px、太字、中央寄せ、カラーは#669966です。アイコン高さ20px。
src/components/common/Header.tsx を新規作成し、以下のコードを記述してください。

'use client';

import { usePathname } from 'next/navigation';

export default function Header() {
const pathname = usePathname();

// パスごとのタイトルとアイコン画像パスを定義
const pageInfo = {
'/': { title: '献立カレンダー', icon: '/icons/icon_calendar.png' },
'/recipes': { title: 'レシピ登録', icon: '/icons/icon_recipes.png' },
'/tools': { title: '材料・道具', icon: '/icons/icon_tools.png' },
'/shopping': { title: '買い物リスト', icon: '/icons/icon_shopping.png' },
'/settings': { title: '設定', icon: '/icons/icon_settings.png' },
};

// 現在のパスに一致する情報がない場合は、デフォルトでカレンダーを表示
const currentInfo = pageInfo[pathname as keyof typeof pageInfo] || pageInfo['/'];

return (
<header className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-center text-[#669966]">
<img 
        src={currentInfo.icon} 
        alt="header icon" 
        className="h-[20px] w-auto mr-2 object-contain"
      />
<h1 className="text-[20px] font-bold tracking-wide">{currentInfo.title}</h1>
</header>
);
}

## STEP 2: ボトムナビゲーション（フッター）の作成

画面下部に固定されるナビゲーションです。メニュー間に薄いグレーの縦線（太さ1px）を追加。文字サイズ10px、太字(bold)、カラーは#669966、テキストは中央寄せです。アイコン高さ33px。
src/components/common/BottomNav.tsx を新規作成し、以下のコードを記述してください。

import Link from 'next/link';

export default function BottomNav() {
const navItems = [
{ href: '/', label: '献立カレンダー', iconSrc: '/icons/icon_calendar.png' },
{ href: '/recipes', label: 'レシピ登録', iconSrc: '/icons/icon_recipes.png' },
{ href: '/tools', label: '材料・道具', iconSrc: '/icons/icon_tools.png' },
{ href: '/shopping', label: '買い物リスト', iconSrc: '/icons/icon_shopping.png' },
{ href: '/settings', label: '設定', iconSrc: '/icons/icon_settings.png' },
];

return (
<nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50">
<div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
{navItems.map((item, index) => {
// 最後の要素以外に右側の区切り線を追加。
// 色は背景色#F5F5F5に対して目立つよう、薄いグレー(#E5E7EB)を指定。
const isLast = index === navItems.length - 1;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full text-[#669966] ${!isLast ? 'border-r border-[#E5E7EB]' : ''}`}
            >
              <img
                src={item.iconSrc}
                alt={item.label}
                className="h-[33px] w-auto mb-1 object-contain"
              />
              {/* テキスト単体でも確実に中央寄せにするため、w-fullとtext-centerを適用。文字サイズは10px。 */}
              <span className="w-full text-center text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>

);
}

## STEP 3: 共通レイアウトへの組み込みと背景色設定

作成したヘッダーとフッターを適用し、メインエリアの背景色（#F5F5F5）を設定します。
src/app/layout.tsx を以下の内容で上書きしてください。

import type { Metadata, Viewport } from "next";
import Header from "@/components/common/Header";
import BottomNav from "@/components/common/BottomNav";
import "./globals.scss";

export const metadata: Metadata = {
title: "Daily Dish",
manifest: "/manifest.json",
appleWebApp: { capable: true, statusBarStyle: "default", title: "Daily Dish" },
};

export const viewport: Viewport = {
width: "device-width",
initialScale: 1,
maximumScale: 1,
userScalable: false,
themeColor: "#22C55E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="ja">
<body className="antialiased bg-[#F5F5F5] text-gray-800">
<Header />

        {/* ヘッダー(14=56px)とフッター(16=64px+セーフエリア)の高さ分、メインコンテンツに余白を設定 */}
        <main className="pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] min-h-screen">
          {children}
        </main>

        <BottomNav />
      </body>
    </html>

);
}

## STEP 4: 動作確認

1. ターミナルで npm run dev を実行します。
2. ブラウザで http://localhost:3000 を開き、以下の点を確認します。
   - ヘッダーの文字が20px、フッターの文字が10pxの太字で中央に配置され、緑色（#669966）になっているか。
   - ナビゲーションメニューの間に薄いグレーの縦線（太さ1px）が表示されているか。
   - メニュー内のテキストが画像に対して完全に中央寄せになっているか。(以前左寄せに見えていた箇所の修正確認。)
   - 下部のメニューをタップした際、画面遷移（URL変更）と同時に上部のタイトル・アイコンが連動して切り替わるか。
