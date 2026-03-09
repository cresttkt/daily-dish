# 共通レイアウト（ヘッダー・フッター・背景）実装手順書

## STEP 1: ヘッダーコンポーネントの作成

現在のURLパスを判定して、タイトルとアイコン（高さ20px固定、横幅可変）を自動で切り替えるヘッダーを作成します。
`src/components/common/Header.tsx` を新規作成し、以下のコードを記述してください。

import { usePathname } from 'next/navigation';

export default function Header() {
const pathname = usePathname();
// パスごとのタイトルとアイコン画像パスを定義
const pageInfo = {
'/': { title: '献立カレンダー', icon: '/icons/header-calendar.png' },
'/recipes': { title: 'レシピ登録', icon: '/icons/header-recipe.png' },
'/tools': { title: '材料・道具', icon: '/icons/header-tools.png' },
'/shopping': { title: '買い物リスト', icon: '/icons/header-shopping.png' },
'/settings': { title: '設定', icon: '/icons/header-settings.png' },
};

// 現在のパスに一致する情報がない場合は、デフォルトでカレンダーを表示
const currentInfo = pageInfo[pathname as keyof typeof pageInfo] || pageInfo['/'];

return (
<header className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-center text-[#648E59]">
<img
        src={currentInfo.icon}
        alt="header icon"
        className="h-[20px] w-auto mr-2 object-contain"
      />
<h1 className="text-lg font-bold tracking-wide">{currentInfo.title}</h1>
</header>
);
}

## STEP 2: ボトムナビゲーション（フッター）の作成

画面下部に固定され、各画面へSPA遷移するナビゲーションを作成します。アイコンは高さ33px固定・横幅可変です。
`src/components/common/BottomNav.tsx` を新規作成し、以下のコードを記述してください。

import Link from 'next/link';

export default function BottomNav() {
const navItems = [
{ href: '/', label: '献立カレンダー', iconSrc: '/icons/nav-calendar.png' },
{ href: '/recipes', label: 'レシピ登録', iconSrc: '/icons/nav-recipe.png' },
{ href: '/tools', label: '材料・道具', iconSrc: '/icons/nav-tools.png' },
{ href: '/shopping', label: '買い物リスト', iconSrc: '/icons/nav-shopping.png' },
{ href: '/settings', label: '設定', iconSrc: '/icons/nav-settings.png' },
];

return (
<nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-50">
<div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
{navItems.map((item) => (
<Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center w-full h-full text-[10px] font-medium text-[#648E59]"
          >
<img
            src={item.iconSrc}
            alt={item.label}
            className="h-[33px] w-auto mb-1 object-contain"
          />
<span>{item.label}</span>
</Link>
))}
</div>
</nav>
);
}

## STEP 3: 共通レイアウトへの組み込みと背景色設定

作成したヘッダーとフッターを適用し、メインエリアの背景色（#F5F5F5）を設定します。
`src/app/layout.tsx` を以下の内容で上書きしてください。

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

1. 用意したPNG画像を `public/icons/` フォルダに配置します（ファイル名がコード内の指定と一致しているか確認してください）。
2. ターミナルで `npm run dev` を実行します。
3. ブラウザで `http://localhost:3000` を開き、以下の点を確認します。
   - 上下の固定レイアウトがデザイン通りになっているか
   - アイコンの比率が崩れることなく、指定の高さで表示されているか
   - 下部のメニューをタップした際、画面遷移（URL変更）と同時に上部のタイトル・アイコンが切り替わるか
