# Daily Dish 開発環境構築マニュアル (完全版：ローカル＆本番確認網羅)

## 1. プロジェクトの初期化

Next.js 15+ (App Router) をベースに、必要なパッケージをインストールします。

npx create-next-app@latest daily-dish --typescript --tailwind --eslint --src-dir --import-alias "@/\*"
cd daily-dish

npm install sass prisma @prisma/client next-pwa clsx tailwind-merge
npm install -D @prisma/config prettier prettier-plugin-tailwindcss stylelint stylelint-config-standard-scss stylelint-config-recess-order stylelint-prettier @eslint/eslintrc eslint-config-prettier postcss-scss

## 2. 詳細ディレクトリ構造の構築

要件に基づいた各画面、ポップアップ、API、共通ロジックのフォルダを一括作成します。

mkdir -p src/{app/{recipes,tools,shopping,api/{menus,recipes,stocks/{ingredients,tools},generate}},components/{common,overlays/{calendar,recipes,stocks,common},stocks,ui},hooks,lib,services,styles,types,utils}
mkdir -p public/icons

### ディレクトリ構成イメージ

src/
├── app/
│ ├── layout.tsx
│ ├── globals.scss
│ ├── page.tsx
│ ├── recipes/
│ ├── tools/
│ ├── shopping/
│ └── api/
│ ├── menus/
│ ├── recipes/
│ ├── stocks/
│ └── generate/
├── components/
│ ├── common/
│ ├── overlays/
│ ├── stocks/
│ └── ui/
├── hooks/
├── lib/
├── services/
├── styles/
├── types/
└── utils/

## 3. スタイル設定 (src/app/globals.scss)

Tailwind v4 形式で、PWAに最適なモバイル表示設定を記述します。

@import "tailwindcss";

@layer base {
html, body {
@apply h-full overflow-hidden bg-gray-50 text-gray-900;
overscroll-behavior: none;
-webkit-tap-highlight-color: transparent;
-webkit-touch-callout: none;
user-select: none;
}
body {
padding-bottom: env(safe-area-inset-bottom);
}
}

## 4. データベース設定 (Supabase & Prisma)

### .env

DATABASE_URL="postgres://postgres.[ID]:[PASS]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://postgres.[ID]:[PASS]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

### prisma.config.ts

import { defineConfig } from "@prisma/config"
export default defineConfig({
schema: "prisma/schema.prisma",
datasource: { url: process.env.DATABASE_URL },
})

### prisma/schema.prisma

generator client {
provider = "prisma-client-js"
previewFeatures = ["driverAdapters"]
}
datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
}
model Menu {
date String @db.Char(8)
meals_id Int
recipes_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
@@id([date, meals_id, recipes_id])
@@map("menus")
}
model Recipe {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
category String @db.Char(1)
image String? @db.VarChar(255)
how_to_make Json?
tags RecipeTag[]
ingredients RecipeIngredient[]
tools RecipeTool[]
menus Menu[]
@@map("recipes")
}
model Tag {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
recipes RecipeTag[]
@@map("tags")
}
model Tool {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
quantity String @default("0") @db.Char(1)
recipes RecipeTool[]
@@map("tools")
}
model Ingredient {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
quantity String @default("0") @db.Char(1)
recipes RecipeIngredient[]
@@map("ingredients")
}
model RecipeTag {
recipes_id Int
tags_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
tag Tag @relation(fields: [tags_id], references: [id])
@@id([recipes_id, tags_id])
@@map("recipes_tags")
}
model RecipeIngredient {
recipes_id Int
ingredients_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
ingredient Ingredient @relation(fields: [ingredients_id], references: [id])
@@id([recipes_id, ingredients_id])
@@map("recipes_ingredients")
}
model RecipeTool {
recipes_id Int
tools_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
tool Tool @relation(fields: [tools_id], references: [id])
@@id([recipes_id, tools_id])
@@map("recipes_tools")
}

### 反映コマンド

export $(grep -v '^#' .env | xargs) && DATABASE_URL=$DIRECT_URL npx prisma db push
npx prisma generate

## 5. Prismaクライアント設定 (src/lib/prisma.ts)

import { PrismaClient } from '@prisma/client'
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['query'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

## 6. ビルド設定とPWA設定

### package.json (scriptsの修正)

"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"postinstall": "prisma generate"
}

### public/icons への画像配置

public/icons/ ディレクトリ内に以下を用意してください。

- icon-192x192.png
- icon-512x512.png

### public/manifest.json

{
"name": "Daily Dish",
"short_name": "Daily Dish",
"start_url": "/",
"display": "standalone",
"orientation": "portrait",
"background_color": "#F9FAFB",
"theme_color": "#22C55E",
"icons": [
{ "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
{ "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
]
}

### next.config.ts

import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
dest: "public",
disable: process.env.NODE_ENV === "development",
register: true,
skipWaiting: true,
});
const nextConfig: NextConfig = {
turbopack: {}
};
export default withPWA(nextConfig);

### src/app/layout.tsx

import type { Metadata, Viewport } from "next";
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
<body className="antialiased">
{children}
</body>
</html>
);
}

## 7. ESLint / Stylelint / VS Code 連携

### eslint.config.mjs

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })
const eslintConfig = [
...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
{ ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] },
]
export default eslintConfig

### .stylelintrc.json

{
"extends": [
"stylelint-config-standard-scss",
"stylelint-config-recess-order",
"stylelint-prettier/recommended"
],
"customSyntax": "postcss-scss",
"rules": {
"at-rule-no-unknown": null,
"scss/at-rule-no-unknown": null,
"prettier/prettier": true
}
}

### .prettierrc

{
"semi": false,
"singleQuote": true,
"tabWidth": 2,
"plugins": ["prettier-plugin-tailwindcss"]
}

### .vscode/settings.json

{
"editor.formatOnSave": true,
"editor.defaultFormatter": "esbenp.prettier-vscode",
"editor.codeActionsOnSave": {
"source.fixAll.eslint": "explicit",
"source.fixAll.stylelint": "explicit"
},
"[scss]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
"[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
"files.associations": { "\*.css": "scss" },
"prettier.requireConfig": true,
"stylelint.validate": ["css", "scss", "postcss"]
}

## 8. ローカル環境の確認事項

1. DB閲覧の確認:
   ターミナルで以下を実行し、ブラウザでPrisma Studioが開いてテーブル一覧が見れるか確認します。
   export $(grep -v '^#' .env | xargs) && DATABASE_URL=$DIRECT_URL npx prisma studio

2. 起動と自動修正の確認:
   ターミナルで npm run dev を実行し、ブラウザで http://localhost:3000 にアクセスして画面が表示されるか確認します。また、VS Codeでファイルを保存した際にPrettier/Stylelintが機能しているか確認します。

## 9. Vercel デプロイと本番DB疎通確認

### 9.1 GitHubへのプッシュとVercel設定

1. GitHubへプッシュし、Vercelのダッシュボードからリポジトリをインポートします。
2. Environment Variablesに以下を設定します。

- DATABASE_URL: postgres://... (ポート6543)
- DIRECT_URL: postgres://... (ポート5432)

### 9.2 デプロイと本番での確認

1. VercelでDeployを実行します。(ビルドコマンドはデフォルトのままでOKです)
2. デプロイ完了後、発行されたURLにアクセスして画面が表示されるか確認します。
3. インストールアイコンの確認: URLバー右側にPWAのインストールアイコンが出ているか確認します。
4. 本番DB疎通確認: Vercelのプロジェクトダッシュボードの「Logs」タブを開き、ランタイムエラーが出ていないか確認します。画面が正常に表示されていれば、ビルド時のPrisma GenerateおよびDB接続は成功しています。(今後のAPI実装完了時に、実際のデータ取得テストを行います)
