import { supabase } from '@/lib/supabase';

export async function uploadRecipeImage(file: File): Promise<string | null> {
  try {
    // ファイル名の重複を避けるため、タイムスタンプを付与したユニークなファイル名を生成
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 'recipes' バケットにファイルをアップロード
    const { error: uploadError } = await supabase.storage
      .from('recipes')
      .upload(filePath, file);

    if (uploadError) {
      console.error('画像のアップロードに失敗しました:', uploadError);
      return null;
    }

    // アップロードした画像の公開URLを取得
    const { data } = supabase.storage.from('recipes').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('画像アップロード処理中の予期せぬエラー:', error);
    return null;
  }
}
