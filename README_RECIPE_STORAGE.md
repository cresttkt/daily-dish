# レシピ管理機能 実装手順書（フェーズ1: 画像アップロード基盤）

## STEP 1: Supabase Storage（バケット）の作成と権限設定

画像を保存するための専用フォルダ（バケット）をSupabase上に作成し、アプリから画像をアップロードできるように権限（ポリシー）を設定します。

1. Supabaseのダッシュボードを開き、左側メニューの「Storage」をクリックします。
2. 「New Bucket」ボタンをクリックします。
3. Name に recipes と入力します。
4. 「Public bucket」のトグルをON にします。（※URLを知っていれば画像が表示される状態になります）
5. 「Save」をクリックしてバケットを作成します。
6. Storage画面の左側メニューから「Policies」をクリックします。
7. 作成した recipes バケットの行にある「New policy」をクリックします。
8. 「For full customization」を選択します。
9. Policy Name: Allow public upload (わかりやすい名前でOKです)
10. Allowed operation: INSERT、SELECT、UPDATE、DELETE の4つすべてにチェックを入れます。
11. Target roles: anon と authenticated を選択します。
12. 「Review」→「Save policy」をクリックして保存します。

## STEP 2: Supabaseクライアントパッケージのインストール

ターミナルを開き、以下のコマンドを実行してSupabaseの公式パッケージをインストールします。

npm install @supabase/supabase-js

## STEP 3: 環境変数の追加 (.env)

Supabaseダッシュボードの左側メニューの下部にある歯車アイコン（Settings）を開き、以下の2箇所から情報を取得してプロジェクト直下の .env に追記してください。
※追記後、ターミナルで Ctrl + C を押してサーバーを止め、再度 npm run dev で再起動してください。

1. URLの取得: 「INTEGRATIONS」の下にある「Data API」（または「General」）を開き、「Project URL」をコピーします。
2. Anon Keyの取得: 「CONFIGURATION」の下にある「API Keys」を開き、anon public と書かれたキーをコピーします。

# 既存の DATABASE_URL と DIRECT_URL はそのまま残し、以下の2行を追加します

NEXT_PUBLIC_SUPABASE_URL="https://[あなたのプロジェクトID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[あなたの anon key を貼り付け]"

## STEP 4: Supabaseクライアントの作成 (src/lib/supabase.ts)

src/lib/ フォルダ内に supabase.ts を新規作成し、以下のコードを記述して保存してください。

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
throw new Error('Supabaseの環境変数が設定されていません。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

## STEP 5: 画像アップロード用関数の作成 (src/utils/uploadImage.ts)

src/ フォルダ内に utils フォルダを新規作成し、その中に uploadImage.ts を作成して以下のコードを記述してください。

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
    const { data } = supabase.storage
      .from('recipes')
      .getPublicUrl(filePath);

    return data.publicUrl;

} catch (error) {
console.error('画像アップロード処理中の予期せぬエラー:', error);
return null;
}
}
