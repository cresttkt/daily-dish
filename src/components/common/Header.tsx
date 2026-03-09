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
  const currentInfo =
    pageInfo[pathname as keyof typeof pageInfo] || pageInfo['/'];

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-center bg-white text-[#669966] shadow-sm">
      <img
        src={currentInfo.icon}
        alt="header icon"
        className="mr-2 h-[20px] w-auto object-contain"
      />
      <h1 className="text-[20px] font-bold tracking-wide">
        {currentInfo.title}
      </h1>
    </header>
  );
}
