'use client';

import { useState, useEffect, useMemo } from 'react';
import MiniButton from '@/components/ui/MiniButton';
import MasterEditPopup from '@/components/overlays/stocks/MasterEditPopup';

type MasterItem = { id: number; name: string; quantity: string };

const ING_QTY: Record<string, string> = {
  '0': '無し',
  '1': '少ない',
  '2': '普通',
  '3': '多い',
};
const TOOL_QTY: Record<string, string> = { '0': '無し', '1': '有り' };

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'tools'>(
    'ingredients',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [ingredients, setIngredients] = useState<MasterItem[]>([]);
  const [tools, setTools] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editPopupConfig, setEditPopupConfig] = useState<{
    isOpen: boolean;
    type: 'ingredients' | 'tools';
    data?: MasterItem | null;
  } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: number;
    type: 'ingredients' | 'tools';
  } | null>(null);

  const fetchMasters = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/master');
      if (res.ok) {
        const data = await res.json();
        setIngredients(data.ingredients);
        setTools(data.tools);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const currentList = activeTab === 'ingredients' ? ingredients : tools;
  const filteredList = useMemo(() => {
    return currentList.filter((item) => item.name.includes(searchQuery));
  }, [currentList, searchQuery]);

  const handleDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { id, type } = deleteConfirmTarget;

    try {
      const res = await fetch(`/api/stocks/${type}/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmTarget(null);
        fetchMasters();
      } else {
        const errData = await res.json();
        alert(errData.error || '削除に失敗しました');
        setDeleteConfirmTarget(null);
      }
    } catch (e) {
      alert('通信エラーが発生しました');
      setDeleteConfirmTarget(null);
    }
  };

  return (
    <div className="bg-thin-gray relative flex h-[100dvh] flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {deleteConfirmTarget && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="animate-scale-in-center flex w-full max-w-sm flex-col items-center rounded-md bg-white p-6 shadow-xl">
            <p className="text-main-font mb-6 text-[14px] font-bold">
              本当に削除しますか？
            </p>
            <div className="flex w-full gap-4">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="border-normal-gray flex-1 rounded-md border py-2 font-bold text-gray-500 active:bg-gray-100"
              >
                いいえ
              </button>
              <button
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center rounded-md bg-red-500 py-2 font-bold text-white active:bg-red-600"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前で検索"
            className="border-main-green focus:ring-main-green text-main-font flex-1 rounded-sm border bg-white px-3 py-2 text-[14px] outline-none focus:ring-1"
          />
          <button className="bg-main-green rounded-sm px-5 py-2 text-[14px] font-bold text-white shadow-sm active:translate-y-[1px]">
            検索
          </button>
        </div>

        <div className="border-main-green mb-4 flex border-b">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 py-2 text-[14px] font-bold ${activeTab === 'ingredients' ? 'bg-main-green text-white' : 'text-main-green bg-white'}`}
          >
            材料
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-2 text-[14px] font-bold ${activeTab === 'tools' ? 'bg-main-green text-white' : 'text-main-green bg-white'}`}
          >
            道具
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="border-normal-gray border-t-main-green h-8 w-8 animate-spin rounded-full border-4"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredList.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-gray-400">
                登録データがありません
              </p>
            ) : (
              filteredList.map((item) => {
                const qtyText =
                  activeTab === 'ingredients'
                    ? ING_QTY[item.quantity] || '無し'
                    : TOOL_QTY[item.quantity] || '無し';
                return (
                  <div
                    key={item.id}
                    className="border-thin-gray flex items-center justify-between rounded-md border bg-white p-3 shadow-sm"
                  >
                    <div className="mr-2 flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-main-font truncate text-[14px] font-bold">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">
                        在庫: {qtyText}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <MiniButton
                        label="編集"
                        onClick={() =>
                          setEditPopupConfig({
                            isOpen: true,
                            type: activeTab,
                            data: item,
                          })
                        }
                      />
                      <MiniButton
                        label="削除"
                        onClick={() =>
                          setDeleteConfirmTarget({
                            id: item.id,
                            type: activeTab,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="from-thin-gray via-thin-gray pointer-events-none fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-30 bg-gradient-to-t to-transparent p-4">
        <button
          onClick={() =>
            setEditPopupConfig({ isOpen: true, type: activeTab, data: null })
          }
          className="bg-main-green pointer-events-auto w-full rounded-md py-3.5 text-[15px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none"
        >
          ＋ 追加
        </button>
      </div>

      {editPopupConfig?.isOpen && (
        <MasterEditPopup
          type={editPopupConfig.type}
          initialData={editPopupConfig.data}
          onClose={() => setEditPopupConfig(null)}
          onSuccess={() => {
            setEditPopupConfig(null);
            fetchMasters();
          }}
        />
      )}
    </div>
  );
}
