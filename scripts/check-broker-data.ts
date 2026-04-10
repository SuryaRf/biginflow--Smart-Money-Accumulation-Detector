import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetDate = new Date(Date.UTC(2024, 2, 15, 0, 0, 0, 0));

  console.log(`\nChecking broker data for ${targetDate.toISOString().split('T')[0]}...\n`);

  const txs = await prisma.brokerTransaction.findMany({
    where: { date: targetDate },
    include: { stock: true, broker: true },
    take: 10,
  });

  console.log(`Found ${txs.length} broker transactions:`);
  txs.forEach((tx) => {
    console.log(`  ${tx.stock.ticker} - ${tx.broker.code} (${tx.broker.category}): Vol ${tx.volume}, Val ${tx.value}`);
  });

  // Group by stock
  const byStock = await prisma.brokerTransaction.groupBy({
    by: ['stockId'],
    where: { date: targetDate },
    _count: { id: true },
  });

  console.log(`\nStocks with broker data: ${byStock.length}`);
  for (const group of byStock) {
    const stock = await prisma.stock.findUnique({ where: { id: group.stockId } });
    console.log(`  ${stock?.ticker}: ${group._count.id} brokers`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main();
