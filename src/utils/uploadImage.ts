import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

export async function uploadRecipeImage(file: File): Promise<string | null> {
  try {
    // --- 1. 画像の圧縮処理 ---
    const options = {
      maxSizeMB: 1, // 最大ファイルサイズ (1MB)
      maxWidthOrHeight: 1024, // 最大の幅または高さ (1024px)
      useWebWorker: true, // ブラウザのUIをブロックしないようにWebWorkerを使用
    };

    // 圧縮の実行
    const compressedFile = await imageCompression(file, options);

    // --- 2. ファイル名の生成 ---
    // 重複を避けるため、タイムスタンプを付与したユニークなファイル名を生成
    const fileExt = compressedFile.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    // --- 3. Supabaseへアップロード ---
    // 'recipes' バケットに圧縮後のファイルをアップロード
    const { error: uploadError } = await supabase.storage
      .from('recipes')
      .upload(filePath, compressedFile);

    if (uploadError) {
      console.error('画像のアップロードに失敗しました:', uploadError);
      return null;
    }

    // --- 4. 公開URLの取得 ---
    const { data } = supabase.storage.from('recipes').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('画像アップロード・圧縮処理中の予期せぬエラー:', error);
    return null;
  }
}
