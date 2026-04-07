'use client';

import { useState, useEffect } from 'react';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';
// ★追加: フェーズ1で作成した画像アップロード関数をインポート
import { uploadRecipeImage } from '@/utils/uploadImage';

type MasterData = {
  ingredients: { id: number; name: string }[];
  tools: { id: number; name: string }[];
  tags: { id: number; name: string }[];
};

type Props = {
  recipeId?: string;
  onClose: () => void;
  onSuccess: (type: 'add' | 'edit', newId?: string) => void;
};

const CAT_TO_ID: Record<string, string> = {
  主食: '1',
  主菜: '2',
  副菜: '3',
  汁物: '4',
  その他: '5',
};
const ID_TO_CAT: Record<string, string> = {
  '1': '主食',
  '2': '主菜',
  '3': '副菜',
  '4': '汁物',
  '5': 'その他',
};

// 共通ボタンクラス（幅をフィットさせ、中央寄せで配置するためのスタイル）
const actionButtonClass =
  'w-fit text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex justify-center items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function RecipeEditPopup({
  recipeId,
  onClose,
  onSuccess,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [masters, setMasters] = useState<MasterData>({
    ingredients: [],
    tools: [],
    tags: [],
  });

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const [ingredients, setIngredients] = useState<
    { id: string; amount: string }[]
  >([]);
  const [tools, setTools] = useState<{ id: string }[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  const [newIngId, setNewIngId] = useState('');
  const [newIngAmount, setNewIngAmount] = useState('');
  const [newToolId, setNewToolId] = useState('');
  const [newStep, setNewStep] = useState('');
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagExpanded, setIsTagExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const masterRes = await fetch('/api/master');
        if (masterRes.ok) setMasters(await masterRes.json());

        if (recipeId) {
          const detailRes = await fetch(`/api/recipes/${recipeId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setName(data.name);
            setImage(data.image);
            setCategoryName(ID_TO_CAT[data.category] || '');
            if (data.ingredients?.length)
              setIngredients(
                data.ingredients.map((i: any) => ({
                  id: String(i.id),
                  amount: i.amount,
                })),
              );
            if (data.tools?.length)
              setTools(data.tools.map((t: any) => ({ id: String(t.id) })));
            if (data.how_to_make?.length) setSteps(data.how_to_make);
            if (data.tags?.length)
              setSelectedTags(data.tags.map((t: any) => String(t.id)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [recipeId]);

  const handleCloseClick = () => setIsClosing(true);
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };

  // ★修正: Supabase Storageへのアップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const publicUrl = await uploadRecipeImage(file);
      if (publicUrl) {
        setImage(publicUrl);
      } else {
        alert('画像のアップロードに失敗しました');
      }
    } catch (error) {
      console.error(error);
      alert('画像アップロード中にエラーが発生しました');
    } finally {
      setIsUploadingImage(false);
      e.target.value = ''; // 同じ画像を再度選べるようにリセット
    }
  };

  const handleAddIngredient = () => {
    if (!newIngId) return;
    setIngredients([...ingredients, { id: newIngId, amount: newIngAmount }]);
    setNewIngId('');
    setNewIngAmount('');
  };
  const removeIngredient = (idx: number) =>
    setIngredients(ingredients.filter((_, i) => i !== idx));

  const handleAddTool = () => {
    if (!newToolId) return;
    setTools([...tools, { id: newToolId }]);
    setNewToolId('');
  };
  const removeTool = (idx: number) =>
    setTools(tools.filter((_, i) => i !== idx));

  const handleAddStep = () => {
    if (newStep.trim() === '') return;
    setSteps([...steps, newStep.trim()]);
    setNewStep('');
  };
  const removeStep = (idx: number) =>
    setSteps(steps.filter((_, i) => i !== idx));
  const saveEditedStep = (idx: number, value: string) => {
    const newArr = [...steps];
    newArr[idx] = value;
    setSteps(newArr);
  };

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleMasterAlert = () =>
    alert('マスタ管理画面への遷移は後続フェーズで実装します');

  const handleSave = async () => {
    if (!name.trim() || !categoryName) {
      alert('レシピ名と分類は必須項目です');
      return;
    }

    setIsSaving(true);
    const validTools = tools.map((t) => t.id);
    const categoryId = CAT_TO_ID[categoryName];

    const payload = {
      name,
      category: categoryId,
      image,
      ingredients,
      tools: validTools,
      how_to_make: steps,
      tags: selectedTags,
    };

    try {
      const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes';
      const method = recipeId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(recipeId ? 'edit' : 'add', recipeId || data.id);
      } else {
        alert('保存に失敗しました');
        setIsSaving(false);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      setIsSaving(false);
    }
  };

  const ingredientOptions = masters.ingredients.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));
  const toolOptions = masters.tools.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));

  return (
    <div
      className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[80] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
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
          {recipeId ? `${name}を編集` : 'レシピを新規追加'}
        </h2>
      </div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="border-normal-gray border-t-main-green h-8 w-8 animate-spin rounded-full border-4"></div>
          </div>
        ) : (
          <div className="mb-4 flex flex-col gap-6 rounded-md bg-white p-4 shadow-sm">
            {/* レシピ名 */}
            <div>
              <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
                レシピ名 <span className="text-[10px] text-red-500">※必須</span>
              </h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-main-green text-main-font focus:ring-main-green w-full rounded-sm border px-3 py-2 text-[14px] outline-none focus:ring-1"
                placeholder="例: 美味しいカレー"
              />
            </div>

            {/* レシピ画像 */}
            <div>
              <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
                レシピ画像
              </h3>
              <div className="flex flex-col items-start gap-2">
                {/* ★修正: ローディング状態を追加した画像アップロードボタン */}
                <label
                  className={`${actionButtonClass} ${isUploadingImage ? 'cursor-wait opacity-50' : ''}`}
                >
                  {isUploadingImage ? (
                    <span className="py-[1px] text-[14px] leading-none">
                      アップロード中...
                    </span>
                  ) : (
                    <>
                      <span className="text-[16px] leading-none">+</span>{' '}
                      アップロード
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                </label>
                {image && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-sm bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                      ✓ 画像選択済み
                    </span>
                    <button
                      onClick={() => setImage('')}
                      className="rounded-sm border border-red-500 px-2 py-1 text-[10px] text-red-500"
                    >
                      クリア
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 分類 */}
            <div>
              <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
                分類 <span className="text-[10px] text-red-500">※必須</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {['主食', '主菜', '副菜', '汁物', 'その他'].map((cat) => (
                  <RadioButton
                    key={cat}
                    label={cat}
                    isSelected={categoryName === cat}
                    onClick={() => setCategoryName(cat)}
                  />
                ))}
              </div>
            </div>

            {/* 材料 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="border-main-green border-l-[4px] pl-2 text-[14px] font-bold">
                  材料
                </h3>
                <button
                  onClick={handleMasterAlert}
                  className="bg-main-green rounded-sm px-2 py-1 text-[10px] font-bold text-white"
                >
                  ＋ 新規追加
                </button>
              </div>
              <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SelectBox
                      value={newIngId}
                      onChange={setNewIngId}
                      options={ingredientOptions}
                      placeholder="選択してください"
                    />
                  </div>
                  <input
                    type="text"
                    value={newIngAmount}
                    onChange={(e) => setNewIngAmount(e.target.value)}
                    placeholder="分量"
                    className="border-main-green text-main-font focus:ring-main-green w-20 rounded-sm border px-2 py-1.5 text-[12px] outline-none focus:ring-1"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleAddIngredient}
                    disabled={!newIngId}
                    className={actionButtonClass}
                  >
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="mt-2 flex flex-col">
                    {ingredients.map((ing, idx) => {
                      const mName =
                        masters.ingredients.find((m) => String(m.id) === ing.id)
                          ?.name || '';
                      return (
                        <div
                          key={idx}
                          className="border-main-green flex items-center justify-between border-b border-dotted py-2 last:border-none"
                        >
                          <span className="text-main-font text-[12px] font-bold">
                            {mName} {ing.amount ? `（${ing.amount}）` : ''}
                          </span>
                          <MiniButton
                            label="削除"
                            onClick={() => removeIngredient(idx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 道具 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="border-main-green border-l-[4px] pl-2 text-[14px] font-bold">
                  道具
                </h3>
                <button
                  onClick={handleMasterAlert}
                  className="bg-main-green rounded-sm px-2 py-1 text-[10px] font-bold text-white"
                >
                  ＋ 新規追加
                </button>
              </div>
              <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
              <div className="flex flex-col gap-3">
                <div>
                  <SelectBox
                    value={newToolId}
                    onChange={setNewToolId}
                    options={toolOptions}
                    placeholder="選択してください"
                  />
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={handleAddTool}
                    disabled={!newToolId}
                    className={actionButtonClass}
                  >
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>

                {tools.length > 0 && (
                  <div className="mt-2 flex flex-col">
                    {tools.map((tool, idx) => {
                      const mName =
                        masters.tools.find((m) => String(m.id) === tool.id)
                          ?.name || '';
                      return (
                        <div
                          key={idx}
                          className="border-main-green flex items-center justify-between border-b border-dotted py-2 last:border-none"
                        >
                          <span className="text-main-font text-[12px] font-bold">
                            {mName}
                          </span>
                          <MiniButton
                            label="削除"
                            onClick={() => removeTool(idx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 作り方 */}
            <div>
              <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
                作り方 <span className="text-[10px] text-red-500">※必須</span>
              </h3>
              <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />

              <div className="flex flex-col gap-3">
                <textarea
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  className="border-main-green text-main-font focus:ring-main-green w-full rounded-sm border px-3 py-2 text-[14px] outline-none focus:ring-1"
                  rows={3}
                  placeholder="作り方を入力"
                ></textarea>
                <div className="flex justify-center">
                  <button
                    onClick={handleAddStep}
                    disabled={!newStep.trim()}
                    className={actionButtonClass}
                  >
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>
              </div>

              {steps.length > 0 && (
                <div className="border-main-green mt-4 flex flex-col gap-0 border-t border-dotted">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="border-main-green flex min-h-[44px] items-start gap-2 border-b border-dotted py-3"
                    >
                      <span className="mt-1 shrink-0 text-[12px] font-bold">
                        {idx + 1}.
                      </span>
                      {editingStepIndex === idx ? (
                        <div className="flex flex-1 items-start gap-2">
                          <textarea
                            value={step}
                            onChange={(e) =>
                              saveEditedStep(idx, e.target.value)
                            }
                            className="border-main-green text-main-font focus:ring-main-green flex-1 resize-none overflow-hidden rounded-sm border px-2 py-1 text-[12px] outline-none focus:ring-1"
                            rows={step.split('\n').length || 1}
                          />
                          <button
                            onClick={() => setEditingStepIndex(null)}
                            disabled={step.trim() === ''}
                            className="border-main-green text-main-green shrink-0 rounded-sm border bg-white px-3 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            完了
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-main-font mt-1 flex-1 text-[12px] leading-relaxed break-words whitespace-pre-wrap">
                            {step}
                          </span>
                          <div className="mt-1 flex shrink-0 gap-1">
                            <MiniButton
                              label="編集"
                              onClick={() => setEditingStepIndex(idx)}
                            />
                            <MiniButton
                              label="削除"
                              onClick={() => removeStep(idx)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* タグ */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="border-main-green border-l-[4px] pl-2 text-[14px] font-bold">
                  タグ
                </h3>
                <button
                  onClick={handleMasterAlert}
                  className="bg-main-green rounded-sm px-2 py-1 text-[10px] font-bold text-white"
                >
                  ＋ 新規追加
                </button>
              </div>
              <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
              <div className="flex flex-col gap-2">
                {masters.tags.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-gray-500">
                    タグが登録されていません
                  </p>
                ) : (
                  <>
                    <div
                      className={`flex flex-wrap gap-2 overflow-hidden ${isTagExpanded ? '' : 'max-h-[68px]'}`}
                    >
                      {masters.tags.map((t) => (
                        <CheckboxButton
                          key={t.id}
                          label={t.name}
                          isSelected={selectedTags.includes(String(t.id))}
                          onClick={() => toggleTag(String(t.id))}
                        />
                      ))}
                    </div>
                    {masters.tags.length > 5 && (
                      <button
                        onClick={() => setIsTagExpanded(!isTagExpanded)}
                        className="text-main-green mt-3 flex w-full items-center justify-center gap-1 text-[12px] font-bold"
                      >
                        {isTagExpanded ? 'タグを隠す' : '更にタグを表示する'}
                        {isTagExpanded ? (
                          <svg
                            width="10"
                            height="8"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path d="M5 0L10 8H0L5 0Z" fill="#669966" />
                          </svg>
                        ) : (
                          <svg
                            width="10"
                            height="8"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path d="M5 8L0 0H10L5 8Z" fill="#669966" />
                          </svg>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-thin-gray relative z-10 shrink-0 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-main-green flex w-full items-center justify-center rounded-md py-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {isSaving ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            '保存する'
          )}
        </button>
      </div>
    </div>
  );
}
