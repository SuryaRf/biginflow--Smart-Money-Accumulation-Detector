/**
 * Manual price data seeder for testing
 * Since IDX price API is not available, we'll seed some realistic price data
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Sample price data for March 15, 2024
const priceData = [
  // Banking - mostly up
  { ticker: "BBCA", open: 9500, high: 9625, low: 9475, close: 9600, volume: 52000000, change: 100, changePct: 1.05 },
  { ticker: "BMRI", open: 6200, high: 6275, low: 6175, close: 6250, volume: 45000000, change: 50, changePct: 0.81 },
  { ticker: "BBRI", open: 5100, high: 5150, low: 5075, close: 5125, volume: 48000000, change: 25, changePct: 0.49 },
  { ticker: "BBNI", open: 5400, high: 5475, low: 5375, close: 5450, volume: 38000000, change: 50, changePct: 0.93 },
  { ticker: "BRIS", open: 2800, high: 2850, low: 2775, close: 2825, volume: 28000000, change: 25, changePct: 0.89 },

  // Telco - mixed
  { ticker: "TLKM", open: 3500, high: 3525, low: 3475, close: 3510, volume: 35000000, change: 10, changePct: 0.29 },
  { ticker: "EXCL", open: 2800, high: 2825, low: 2775, close: 2790, volume: 22000000, change: -10, changePct: -0.36 },
  { ticker: "ISAT", open: 3200, high: 3250, low: 3175, close: 3225, volume: 18000000, change: 25, changePct: 0.78 },

  // Consumer - up
  { ticker: "UNVR", open: 4200, high: 4275, low: 4175, close: 4250, volume: 12000000, change: 50, changePct: 1.19 },
  { ticker: "ICBP", open: 9800, high: 9950, low: 9775, close: 9900, volume: 8000000, change: 100, changePct: 1.02 },
  { ticker: "INDF", open: 6500, high: 6575, low: 6475, close: 6550, volume: 15000000, change: 50, changePct: 0.77 },
  { ticker: "MYOR", open: 2400, high: 2450, low: 2375, close: 2425, volume: 18000000, change: 25, changePct: 1.04 },

  // Mining - strong up
  { ticker: "ADRO", open: 2900, high: 2975, low: 2875, close: 2950, volume: 95000000, change: 50, changePct: 1.72 },
  { ticker: "PTBA", open: 3100, high: 3200, low: 3075, close: 3175, volume: 42000000, change: 75, changePct: 2.42 },
  { ticker: "ITMG", open: 28000, high: 28500, low: 27800, close: 28400, volume: 1200000, change: 400, changePct: 1.43 },
  { ticker: "ANTM", open: 1800, high: 1850, low: 1775, close: 1825, volume: 68000000, change: 25, changePct: 1.39 },
  { ticker: "INCO", open: 4800, high: 4900, low: 4750, close: 4875, volume: 25000000, change: 75, changePct: 1.56 },
  { ticker: "MDKA", open: 1600, high: 1650, low: 1575, close: 1625, volume: 38000000, change: 25, changePct: 1.56 },
];

async function main() {
  console.log("Seeding price data for 2024-03-15...");

  // Use UTC to avoid timezone issues
  const targetDate = new Date(Date.UTC(2024, 2, 15, 0, 0, 0, 0)); // March is month 2 (0-indexed)

  let seeded = 0;
  let skipped = 0;

  for (const price of priceData) {
    // Find stock
    const stock = await prisma.stock.findUnique({
      where: { ticker: price.ticker },
    });

    if (!stock) {
      console.log(`  ⚠ Stock ${price.ticker} not found, skipping`);
      skipped++;
      continue;
    }

    // Upsert price data
    await prisma.stockPrice.upsert({
      where: {
        stockId_date: {
          stockId: stock.id,
          date: targetDate,
        },
      },
      create: {
        stockId: stock.id,
        date: targetDate,
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        change: price.change,
        changePct: price.changePct,
      },
      update: {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        change: price.change,
        changePct: price.changePct,
      },
    });

    console.log(`  ✓ ${price.ticker}: ${price.close} (${price.changePct > 0 ? '+' : ''}${price.changePct}%)`);
    seeded++;
  }

  console.log(`\nCompleted! Seeded ${seeded} prices, skipped ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
