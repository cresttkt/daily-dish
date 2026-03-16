import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// シード投入などのコマンド実行時は、ポート5432の DIRECT_URL を使用します
const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('⚠️ .env ファイルに DIRECT_URL が設定されていません！');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

// 空っぽだった PrismaClient() に、接続用のアダプターを渡します！
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.menu.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeTool.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();

  const tagHealthy = await prisma.tag.create({ data: { name: 'ヘルシー' } });
  const tagEasy = await prisma.tag.create({ data: { name: '簡単' } });
  const tagFast = await prisma.tag.create({ data: { name: '時短' } });
  const tagMeat = await prisma.tag.create({ data: { name: '肉' } });
  const tagFish = await prisma.tag.create({ data: { name: '魚' } });
  const tagVeg = await prisma.tag.create({ data: { name: '野菜' } });
  const tagSoup = await prisma.tag.create({ data: { name: '汁物' } });
  const tagBento = await prisma.tag.create({ data: { name: 'お弁当' } });
  const tagJapanese = await prisma.tag.create({ data: { name: '和食' } });
  const tagChinese = await prisma.tag.create({ data: { name: '中華' } });

  await prisma.recipe.create({
    data: {
      name: '鶏胸肉のオイマヨ炒め',
      category: '2',
      tags: { create: [{ tags_id: tagFast.id }, { tags_id: tagMeat.id }] },
    },
  });

  await prisma.recipe.create({
    data: {
      name: '白ご飯',
      category: '1',
      tags: { create: [{ tags_id: tagEasy.id }, { tags_id: tagJapanese.id }] },
    },
  });

  await prisma.recipe.create({
    data: {
      name: 'ほうれん草の胡麻和え',
      category: '3',
      tags: {
        create: [
          { tags_id: tagHealthy.id },
          { tags_id: tagVeg.id },
          { tags_id: tagEasy.id },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      name: '豆腐とわかめの味噌汁',
      category: '4',
      tags: {
        create: [
          { tags_id: tagEasy.id },
          { tags_id: tagJapanese.id },
          { tags_id: tagHealthy.id },
          { tags_id: tagSoup.id },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      name: '鮭の塩焼き',
      category: '2',
      tags: {
        create: [
          { tags_id: tagEasy.id },
          { tags_id: tagFish.id },
          { tags_id: tagJapanese.id },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      name: 'チャーハン',
      category: '1',
      tags: { create: [{ tags_id: tagFast.id }, { tags_id: tagChinese.id }] },
    },
  });

  console.log('✅ テスト用レシピ・タグの投入が完了しました！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
