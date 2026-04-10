import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetDate = new Date("2024-03-15");
  targetDate.setHours(0, 0, 0, 0);

  console.log(`\nChecking data for ${targetDate.toISOString().split('T')[0]}...\n`);

  // Check broker transactions
  const txCount = await prisma.brokerTransaction.count({
    where: { date: targetDate },
  });
  console.log(`Broker transactions: ${txCount}`);

  if (txCount > 0) {
    const sampleTx = await prisma.brokerTransaction.findFirst({
      where: { date: targetDate },
      include: { stock: true, broker: true },
    });
    console.log(`  Sample: ${sampleTx?.stock.ticker} - ${sampleTx?.broker.code}`);
  }

  // Check stock prices
  const priceCount = await prisma.stockPrice.count({
    where: { date: targetDate },
  });
  console.log(`Stock prices: ${priceCount}`);

  if (priceCount > 0) {
    const samplePrice = await prisma.stockPrice.findFirst({
      where: { date: targetDate },
      include: { stock: true },
    });
    console.log(`  Sample: ${samplePrice?.stock.ticker} - ${samplePrice?.close}`);
  }

  // Check stocks
  const stockCount = await prisma.stock.count({
    where: { isActive: true },
  });
  console.log(`Active stocks: ${stockCount}\n`);

  await prisma.$disconnect();
  await pool.end();
}

main();
