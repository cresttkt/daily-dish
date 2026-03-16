import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('❌ DIRECT_URL が設定されていません！');
}

// ② 認証エラー(P1000)を回避するため、SSL通信を強制的に有効化します
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ③ Prisma 7 の「アダプター必須」エラーを回避するため、アダプターを渡します
const adapter = new PrismaPg(pool as any);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // これがあることで今のエラーは消滅します
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
