import Link from 'next/link';

export default function BottomNav() {
  const navItems = [
    { href: '/', label: '献立カレンダー', iconSrc: '/icons/icon_calendar.png' },
    {
      href: '/recipes',
      label: 'レシピ登録',
      iconSrc: '/icons/icon_recipes.png',
    },
    { href: '/tools', label: '材料・道具', iconSrc: '/icons/icon_tools.png' },
    {
      href: '/shopping',
      label: '買い物リスト',
      iconSrc: '/icons/icon_shopping.png',
    },
    { href: '/settings', label: '設定', iconSrc: '/icons/icon_settings.png' },
  ];

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
      <div className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item, index) => {
          // 最後の要素以外に右側の区切り線を追加。
          // 色は背景色#F5F5F5に対して目立つよう、薄いグレー(#E5E7EB)を指定。
          const isLast = index === navItems.length - 1;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full w-full flex-col items-center justify-center text-[#669966] ${!isLast ? 'border-r border-[#E5E7EB]' : ''}`}
            >
              <img
                src={item.iconSrc}
                alt={item.label}
                className="mb-1 h-[33px] w-auto object-contain"
              />
              {/* テキスト単体でも確実に中央寄せにするため、w-fullとtext-centerを適用。文字サイズは10px。 */}
              <span className="w-full text-center text-[10px] font-bold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
