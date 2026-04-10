import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\nChecking all dates in database...\n");

  // Get unique dates from broker_transactions
  const txDates = await prisma.brokerTransaction.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });

  console.log("Broker transaction dates:");
  txDates.forEach((tx) => {
    console.log(`  - ${tx.date.toISOString().split('T')[0]}`);
  });
  console.log(`  Total: ${txDates.length}`);

  // Get unique dates from stock_prices
  const priceDates = await prisma.stockPrice.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });

  console.log("\nStock price dates:");
  priceDates.forEach((p) => {
    console.log(`  - ${p.date.toISOString().split('T')[0]}`);
  });
  console.log(`  Total: ${priceDates.length}\n`);

  await prisma.$disconnect();
  await pool.end();
}

main();
