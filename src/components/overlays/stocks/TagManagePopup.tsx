'use client';

import { useState, useEffect } from 'react';
import MiniButton from '@/components/ui/MiniButton';

type Tag = { id: number; name: string };
type Props = { onClose: () => void; onSuccess: () => void; isNested?: boolean };

export default function TagManagePopup({
  onClose,
  onSuccess,
  isNested = false,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/master');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCloseClick = () => {
    onSuccess();
    setIsClosing(true);
  };
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };

  const handleAdd = async () => {
    if (!newTagName.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stocks/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (res.ok) {
        setNewTagName('');
        await fetchTags();
      } else {
        alert('追加に失敗しました');
      }
    } catch (e) {
      alert('通信エラー');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSave = async (id: number) => {
    if (!editingTagName.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/stocks/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingTagName.trim() }),
      });
      if (res.ok) {
        setEditingTagId(null);
        await fetchTags();
      } else {
        alert('更新に失敗しました');
      }
    } catch (e) {
      alert('通信エラー');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/stocks/tags/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTags();
      } else {
        const errData = await res.json();
        alert(errData.error || '削除に失敗しました');
      }
    } catch (e) {
      alert('通信エラー');
    } finally {
      setIsProcessing(false);
    }
  };

  const bottomClass = isNested
    ? 'bottom-0'
    : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]';

  return (
    <div
      className={`fixed top-0 right-0 left-0 z-[90] flex flex-col bg-white shadow-lg ${bottomClass} ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex cursor-wait items-center justify-center bg-white/50"></div>
      )}
      <div className="border-normal-gray relative z-10 flex h-14 shrink-0 items-center border-b bg-white px-4">
        <button
          onClick={handleCloseClick}
          className="z-10 -ml-2 p-2 active:opacity-50"
        >
          <svg
            width="12"
            height="19"
            viewBox="0 0 12 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z"
              fill="#669966"
            />
          </svg>
        </button>
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
          タグを管理
        </h2>
      </div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex flex-col gap-6 rounded-md bg-white p-4 shadow-sm">
          <div>
            <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
              タグ名
            </h3>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="border-main-green text-main-font focus:ring-main-green w-full rounded-sm border px-3 py-2 text-[14px] outline-none focus:ring-1"
              />
              <button
                onClick={handleAdd}
                disabled={!newTagName.trim() || isProcessing}
                className="text-main-green border-main-green flex w-fit items-center gap-1 self-center rounded-md border bg-white px-6 py-2 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>
          </div>

          <div className="border-normal-gray border-t pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="border-normal-gray border-t-main-green h-6 w-6 animate-spin rounded-full border-4"></div>
              </div>
            ) : tags.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-gray-500">
                タグが登録されていません
              </p>
            ) : (
              <div className="flex flex-col">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="border-main-green flex items-center gap-2 border-b border-dotted py-3 last:border-none"
                  >
                    <span className="mr-1 shrink-0 text-[14px] font-bold text-gray-500">
                      ・
                    </span>
                    {editingTagId === tag.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          className="border-main-green flex-1 rounded-sm border px-2 py-1 text-[12px] outline-none"
                        />
                        <button
                          onClick={() => handleEditSave(tag.id)}
                          disabled={!editingTagName.trim()}
                          className="border-main-green text-main-green shrink-0 rounded-sm border bg-white px-3 py-1.5 text-[10px] font-bold disabled:opacity-50"
                        >
                          確定
                        </button>
                        <MiniButton
                          label="削除"
                          onClick={() => handleDelete(tag.id)}
                        />
                      </div>
                    ) : (
                      <>
                        <span className="text-main-font flex-1 text-[14px] break-all">
                          {tag.name}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <MiniButton
                            label="編集"
                            onClick={() => {
                              setEditingTagId(tag.id);
                              setEditingTagName(tag.name);
                            }}
                          />
                          <MiniButton
                            label="削除"
                            onClick={() => handleDelete(tag.id)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
