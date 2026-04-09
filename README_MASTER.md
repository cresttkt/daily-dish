# レシピ管理機能 実装手順書（フェーズ5: 材料・道具・タグ管理機能）

## 概要

材料、道具、タグといった「マスタデータ」を管理（追加・編集・削除）する画面およびポップアップを作成します。
マスタデータがすでにレシピで使用されている場合は、削除できないようエラーでブロックする安全対策を実装し、レシピ編集ポップアップからのシームレスな呼び出し（親のボタンが透けない対策済み）にも対応します。

## STEP 1: マスタデータ操作APIの作成 (src/app/api/stocks/[type]/route.ts & [id]/route.ts)

① 追加API (src/app/api/stocks/[type]/route.ts)
src/app/api/ 内に stocks フォルダを作成し、その中に [type] フォルダを作成して、以下の route.ts を記述してください。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
try {
const resolvedParams = await params;
const type = resolvedParams.type; // 'ingredients' | 'tools' | 'tags'
const body = await request.json();

    let result;
    if (type === 'ingredients') {
      result = await prisma.ingredient.create({ data: { name: body.name, quantity: body.quantity || '0' } });
    } else if (type === 'tools') {
      result = await prisma.tool.create({ data: { name: body.name, quantity: body.quantity || '0' } });
    } else if (type === 'tags') {
      result = await prisma.tag.create({ data: { name: body.name } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

} catch (error) {
console.error('Stocks POST Error:', error);
return NextResponse.json({ error: '追加に失敗しました' }, { status: 500 });
}
}

② 更新・削除API (src/app/api/stocks/[type]/[id]/route.ts)
[type] フォルダの中に [id] フォルダを作成し、以下の route.ts を記述してください。
※ここで、削除時にレシピで使用されている場合（P2003エラー）はブロックする処理を入れています。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ type: string, id: string }> }) {
try {
const resolvedParams = await params;
const type = resolvedParams.type;
const id = parseInt(resolvedParams.id, 10);
const body = await request.json();

    let result;
    if (type === 'ingredients') {
      result = await prisma.ingredient.update({ where: { id }, data: { name: body.name, quantity: body.quantity } });
    } else if (type === 'tools') {
      result = await prisma.tool.update({ where: { id }, data: { name: body.name, quantity: body.quantity } });
    } else if (type === 'tags') {
      result = await prisma.tag.update({ where: { id }, data: { name: body.name } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result });

} catch (error) {
return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ type: string, id: string }> }) {
try {
const resolvedParams = await params;
const type = resolvedParams.type;
const id = parseInt(resolvedParams.id, 10);

    if (type === 'ingredients') {
      await prisma.ingredient.delete({ where: { id } });
    } else if (type === 'tools') {
      await prisma.tool.delete({ where: { id } });
    } else if (type === 'tags') {
      await prisma.tag.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ success: true });

} catch (error: any) {
// 外部キー制約エラー（レシピで使用中）の場合のキャッチ
if (error.code === 'P2003') {
return NextResponse.json({ error: 'このデータはレシピで使用されているため削除できません。' }, { status: 400 });
}
return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
}
}

## STEP 2: 材料・道具の追加・編集ポップアップ (src/components/overlays/stocks/MasterEditPopup.tsx)

src/components/overlays/ 内に stocks フォルダを作成し、MasterEditPopup.tsx を作成して以下のコードを記述してください。
（保存ボタンの二重見え防止機能付き）

'use client';

import { useState, useEffect } from 'react';
import SelectBox from '@/components/ui/SelectBox';

type Props = {
type: 'ingredients' | 'tools';
initialData?: { id: number; name: string; quantity: string } | null;
onClose: () => void;
onSuccess: () => void;
isNested?: boolean;
};

const ING_QTY_OPTIONS = [
{ value: '0', label: '無し' }, { value: '1', label: '少ない' }, { value: '2', label: '普通' }, { value: '3', label: '多い' }
];
const TOOL_QTY_OPTIONS = [
{ value: '0', label: '無し' }, { value: '1', label: '有り' }
];

export default function MasterEditPopup({ type, initialData, onClose, onSuccess, isNested = false }: Props) {
const [isClosing, setIsClosing] = useState(false);
const [isSaving, setIsSaving] = useState(false);

const [name, setName] = useState('');
const [quantity, setQuantity] = useState('0');

useEffect(() => {
if (initialData) {
setName(initialData.name);
setQuantity(initialData.quantity);
}
}, [initialData]);

const title = `${type === 'ingredients' ? '材料' : '道具'}を${initialData ? '編集' : '新規追加'}`;
const options = type === 'ingredients' ? ING_QTY_OPTIONS : TOOL_QTY_OPTIONS;

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if (isClosing) onClose(); };

const handleSave = async () => {
if (!name.trim()) {
alert('名前を入力してください');
return;
}

    setIsSaving(true);
    try {
      const url = initialData ? `/api/stocks/${type}/${initialData.id}` : `/api/stocks/${type}`;
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), quantity })
      });

      if (res.ok) {
        setIsClosing(true);
        onSuccess();
      } else {
        const errorData = await res.json();
        alert(errorData.error || '保存に失敗しました');
        setIsSaving(false);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      setIsSaving(false);
    }

};

const bottomClass = isNested ? 'bottom-0' : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]';

return (
<div
className={`fixed top-0 right-0 left-0 z-[90] flex flex-col bg-white shadow-lg ${bottomClass} ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
<div className="border-b border-normal-gray relative z-10 flex h-14 shrink-0 items-center bg-white px-4">
<button onClick={handleCloseClick} className="z-10 -ml-2 p-2 active:opacity-50">
<svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z" fill="#669966"/>
</svg>
</button>
<h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
{title}
</h2>
</div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4 pb-24">
        <div className="bg-white rounded-md p-4 shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">{type === 'ingredients' ? '材料名' : '道具名'}</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-main-green rounded-sm px-3 py-2 text-[14px] text-main-font outline-none focus:ring-1 focus:ring-main-green"
              placeholder="名前を入力"
            />
          </div>

          <div>
            <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">在庫量</h3>
            <SelectBox value={quantity} onChange={setQuantity} options={options} placeholder="選択してください" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px] flex justify-center items-center disabled:opacity-50"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '保存する'}
        </button>
      </div>
    </div>

);
}

## STEP 3: タグ管理ポップアップ (src/components/overlays/stocks/TagManagePopup.tsx)

src/components/overlays/stocks/ 内に TagManagePopup.tsx を作成し、以下のコードを記述してください。

'use client';

import { useState, useEffect } from 'react';
import MiniButton from '@/components/ui/MiniButton';

type Tag = { id: number; name: string };
type Props = { onClose: () => void; onSuccess: () => void; isNested?: boolean; };

export default function TagManagePopup({ onClose, onSuccess, isNested = false }: Props) {
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

useEffect(() => { fetchTags(); }, []);

const handleCloseClick = () => {
onSuccess();
setIsClosing(true);
};
const handleAnimationEnd = () => { if (isClosing) onClose(); };

const handleAdd = async () => {
if (!newTagName.trim()) return;
setIsProcessing(true);
try {
const res = await fetch('/api/stocks/tags', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ name: newTagName.trim() })
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
body: JSON.stringify({ name: editingTagName.trim() })
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

const bottomClass = isNested ? 'bottom-0' : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]';

return (
<div
className={`fixed top-0 right-0 left-0 z-[90] flex flex-col bg-white shadow-lg ${bottomClass} ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{isProcessing && (
<div className="absolute inset-0 z-50 bg-white/50 flex justify-center items-center cursor-wait"></div>
)}
<div className="border-b border-normal-gray relative z-10 flex h-14 shrink-0 items-center bg-white px-4">
<button onClick={handleCloseClick} className="z-10 -ml-2 p-2 active:opacity-50">
<svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z" fill="#669966"/>
</svg>
</button>
<h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
タグを管理
</h2>
</div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4 pb-24">
        <div className="bg-white rounded-md p-4 shadow-sm flex flex-col gap-6">
          <div>
            <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">タグ名</h3>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full border border-main-green rounded-sm px-3 py-2 text-[14px] text-main-font outline-none focus:ring-1 focus:ring-main-green"
              />
              <button
                onClick={handleAdd}
                disabled={!newTagName.trim() || isProcessing}
                className="w-fit self-center text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>
          </div>

          <div className="border-t border-normal-gray pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-4"><div className="w-6 h-6 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div></div>
            ) : tags.length === 0 ? (
              <p className="text-[12px] text-gray-500 text-center py-4">タグが登録されていません</p>
            ) : (
              <div className="flex flex-col">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center py-3 border-b border-dotted border-main-green last:border-none gap-2">
                    <span className="font-bold text-[14px] shrink-0 text-gray-500 mr-1">・</span>
                    {editingTagId === tag.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          className="flex-1 border border-main-green rounded-sm px-2 py-1 text-[12px] outline-none"
                        />
                        <button
                          onClick={() => handleEditSave(tag.id)}
                          disabled={!editingTagName.trim()}
                          className="border border-main-green text-main-green text-[10px] font-bold px-3 py-1.5 rounded-sm bg-white shrink-0 disabled:opacity-50"
                        >
                          確定
                        </button>
                        <MiniButton label="削除" onClick={() => handleDelete(tag.id)} />
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-[14px] text-main-font break-all">{tag.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <MiniButton label="編集" onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); }} />
                          <MiniButton label="削除" onClick={() => handleDelete(tag.id)} />
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

## STEP 4: 材料・道具の一覧画面 (src/app/tools/page.tsx)

共通ヘッダーを使用し、タブ切り替えと一覧表示を備えたメイン画面です。下部余白の被りも解消済みです。
src/app/tools/page.tsx を作成し、以下のコードを記述してください。

'use client';

import { useState, useEffect, useMemo } from 'react';
import MiniButton from '@/components/ui/MiniButton';
import MasterEditPopup from '@/components/overlays/stocks/MasterEditPopup';

type MasterItem = { id: number; name: string; quantity: string };

const ING_QTY: Record<string, string> = { '0': '無し', '1': '少ない', '2': '普通', '3': '多い' };
const TOOL_QTY: Record<string, string> = { '0': '無し', '1': '有り' };

export default function ToolsPage() {
const [activeTab, setActiveTab] = useState<'ingredients' | 'tools'>('ingredients');
const [searchQuery, setSearchQuery] = useState('');

const [ingredients, setIngredients] = useState<MasterItem[]>([]);
const [tools, setTools] = useState<MasterItem[]>([]);
const [isLoading, setIsLoading] = useState(true);

const [editPopupConfig, setEditPopupConfig] = useState<{ isOpen: boolean, type: 'ingredients' | 'tools', data?: MasterItem | null } | null>(null);
const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: number, type: 'ingredients' | 'tools' } | null>(null);

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

useEffect(() => { fetchMasters(); }, []);

const currentList = activeTab === 'ingredients' ? ingredients : tools;
const filteredList = useMemo(() => {
return currentList.filter(item => item.name.includes(searchQuery));
}, [currentList, searchQuery]);

const handleDelete = async () => {
if (!deleteConfirmTarget) return;
const { id, type } = deleteConfirmTarget;

    try {
      const res = await fetch(`/api/stocks/${type}/${id}`, { method: 'DELETE' });
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
<div className="flex flex-col h-[100dvh] bg-thin-gray relative pb-[calc(4rem+env(safe-area-inset-bottom))]">
{deleteConfirmTarget && (
<div className="absolute inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
<div className="bg-white rounded-md p-6 w-full max-w-sm flex flex-col items-center shadow-xl animate-scale-in-center">
<p className="text-main-font font-bold mb-6 text-[14px]">本当に削除しますか？</p>
<div className="flex gap-4 w-full">
<button onClick={() => setDeleteConfirmTarget(null)} className="flex-1 py-2 border border-normal-gray rounded-md text-gray-500 font-bold active:bg-gray-100">いいえ</button>
<button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-md font-bold active:bg-red-600 flex justify-center items-center">はい</button>
</div>
</div>
</div>
)}

      {/* ★ pb-32 を設定して一番下のアイテムがボタンに隠れないようにする */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 relative">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前で検索"
            className="flex-1 bg-white border border-main-green rounded-sm px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-main-green text-main-font"
          />
          <button className="bg-main-green text-white px-5 py-2 rounded-sm font-bold text-[14px] shadow-sm active:translate-y-[1px]">検索</button>
        </div>

        <div className="flex mb-4 border-b border-main-green">
          <button onClick={() => setActiveTab('ingredients')} className={`flex-1 py-2 text-[14px] font-bold ${activeTab === 'ingredients' ? 'bg-main-green text-white' : 'bg-white text-main-green'}`}>材料</button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 py-2 text-[14px] font-bold ${activeTab === 'tools' ? 'bg-main-green text-white' : 'bg-white text-main-green'}`}>道具</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredList.length === 0 ? (
              <p className="text-center text-gray-400 text-[12px] py-10">登録データがありません</p>
            ) : (
              filteredList.map(item => {
                const qtyText = activeTab === 'ingredients' ? (ING_QTY[item.quantity] || '無し') : (TOOL_QTY[item.quantity] || '無し');
                return (
                  <div key={item.id} className="bg-white rounded-md p-3 shadow-sm flex items-center justify-between border border-thin-gray">
                    <div className="flex flex-col gap-1 min-w-0 flex-1 mr-2">
                      <span className="text-[14px] font-bold text-main-font truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-500 font-bold">在庫: {qtyText}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <MiniButton label="編集" onClick={() => setEditPopupConfig({ isOpen: true, type: activeTab, data: item })} />
                      <MiniButton label="削除" onClick={() => setDeleteConfirmTarget({ id: item.id, type: activeTab })} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-gradient-to-t from-thin-gray via-thin-gray to-transparent z-30 pointer-events-none">
        <button
          onClick={() => setEditPopupConfig({ isOpen: true, type: activeTab, data: null })}
          className="w-full bg-main-green text-white font-bold py-3.5 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[15px] pointer-events-auto"
        >
          ＋ 追加
        </button>
      </div>

      {editPopupConfig?.isOpen && (
        <MasterEditPopup
          type={editPopupConfig.type}
          initialData={editPopupConfig.data}
          onClose={() => setEditPopupConfig(null)}
          onSuccess={() => { setEditPopupConfig(null); fetchMasters(); }}
        />
      )}
    </div>

);
}

## STEP 5: レシピ編集ポップアップからの呼び出し連携 (src/components/overlays/recipes/RecipeEditPopup.tsx)

前回のフェーズ4で仮置きしていた handleMasterAlert を削除し、本物のポップアップを呼び出せるようにします。
RecipeEditPopup.tsx を開き、以下の【2箇所】を修正してください。

① インポートとステートの追加（ファイル上部）

import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';
import { uploadRecipeImage } from '@/utils/uploadImage';

// ▼ これを追加（2つ）▼
import MasterEditPopup from '@/components/overlays/stocks/MasterEditPopup';
import TagManagePopup from '@/components/overlays/stocks/TagManagePopup';

// ...（中略）...
export default function RecipeEditPopup({ recipeId, onClose, onSuccess }: Props) {
// ...既存のステート...

// ▼ これを追加（ポップアップ制御用ステート）▼
const [masterPopupConfig, setMasterPopupConfig] = useState<{isOpen: boolean, type: 'ingredients'|'tools'} | null>(null);
const [isTagPopupOpen, setIsTagPopupOpen] = useState(false);

② ボタンのonClickの書き換えと、ポップアップの呼び出し記述（ファイル下部）
handleMasterAlert という関数を完全に削除し、return内の「＋ 新規追加」ボタンのonClickを以下のようにすべて書き換えます。

// 1. 材料の「＋新規追加」ボタン
<button onClick={() => setMasterPopupConfig({ isOpen: true, type: 'ingredients' })} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>

// 2. 道具の「＋新規追加」ボタン
<button onClick={() => setMasterPopupConfig({ isOpen: true, type: 'tools' })} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>

// 3. タグの「＋新規追加」ボタン
<button onClick={() => setIsTagPopupOpen(true)} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>

そして、ファイルの一番最後（ </div> の直前）にポップアップ本体を呼び出すコードを追加します。

      {/* （既存コード）下部固定の保存するボタン */}
      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
        <button onClick={handleSave} ...>...</button>
      </div>

      {/* ▼ ここに追加 ▼ */}
      {masterPopupConfig?.isOpen && (
        <MasterEditPopup
          type={masterPopupConfig.type}
          initialData={null}
          onClose={() => setMasterPopupConfig(null)}
          onSuccess={() => {
            setMasterPopupConfig(null);
            // マスタ追加後は、プルダウンの選択肢を最新化するためにAPIを再実行
            fetch('/api/master').then(r => r.json()).then(setMasters);
          }}
          isNested={true} // ★親のボタンを覆い隠すための指定
        />
      )}

      {isTagPopupOpen && (
        <TagManagePopup
          onClose={() => setIsTagPopupOpen(false)}
          onSuccess={() => {
            fetch('/api/master').then(r => r.json()).then(setMasters);
          }}
          isNested={true} // ★親のボタンを覆い隠すための指定
        />
      )}
      {/* ▲ ここまで ▲ */}
    </div>

);
}

## STEP 6: 動作確認

1. フッターナビゲーションから「材料・道具」画面を開きます。
2. 材料・道具のタブ切り替えができ、登録済みのデータ（にんじん、包丁など）が表示されていることを確認します。また、一番下までスクロールした際に、最後のアイテムが「＋追加」ボタンに被っていないことを確認します。
3. 一番下の「＋追加」ボタンを押し、ポップアップが開いて新しい材料や道具を追加できることを確認します（在庫の選択肢も材料/道具で切り替わります）。
4. リスト上の「編集」ボタンから、既存の名前や在庫量が変更できることを確認します。
5. 安全機能のテスト: すでにレシピに登録されている材料（例: にんじん）の「削除」ボタンを押し、「はい」を選択した際に「このデータはレシピで使用されているため削除できません。」というエラーが出て守られることを確認します。
6. レシピ追加画面（または編集画面）を開き、材料・道具・タグの「＋新規追加」ボタンから、今回作ったポップアップがシームレスに開くことを確認します。
7. 開いた子ポップアップが画面の一番下（bottom-0）まで広がり、背後の「保存する」ボタンが透けて見えないことを確認します。
8. ポップアップでデータ（タグなど）を追加して閉じた後、レシピ画面側のプルダウン等に即座に選択肢として追加されていることを確認します。
