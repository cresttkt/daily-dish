import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error('⚠️ .env ファイルに DIRECT_URL が設定されていません！');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.menu.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeTool.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.tool.deleteMany();

  const tags = await Promise.all(
    [
      'ヘルシー',
      '簡単',
      '時短',
      '肉',
      '魚',
      '野菜',
      '汁物',
      'お弁当',
      '和食',
      '中華',
    ].map((name) => prisma.tag.create({ data: { name } })),
  );
  const ingredients = await Promise.all(
    [
      'にんじん',
      '玉ねぎ',
      'じゃがいも',
      '豚肉',
      '鶏肉',
      '鮭',
      'ほうれん草',
      '豆腐',
      'わかめ',
      'ご飯',
    ].map((name) => prisma.ingredient.create({ data: { name } })),
  );
  const tools = await Promise.all(
    [
      '包丁',
      'まな板',
      'フライパン',
      '鍋',
      'ボウル',
      'ざる',
      '計量スプーン',
      '炊飯器',
    ].map((name) => prisma.tool.create({ data: { name } })),
  );

  console.log('✅ テスト用マスタデータの投入が完了しました！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
