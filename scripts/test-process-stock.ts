import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { processStock } from "../src/lib/scoring.js";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetDate = new Date(Date.UTC(2024, 2, 15, 0, 0, 0, 0));

  console.log(`\nTesting processStock for BBCA on ${targetDate.toISOString().split('T')[0]}...\n`);

  const bbca = await prisma.stock.findUnique({ where: { ticker: "BBCA" } });
  if (!bbca) {
    console.log("BBCA not found!");
    return;
  }

  console.log(`Stock ID: ${bbca.id}\n`);

  try {
    const result = await processStock(bbca.id, targetDate);

    if (result) {
      console.log("✓ Processing successful!\n");
      console.log(`Ticker: ${result.ticker}`);
      console.log(`Foreign %: ${result.foreignPct.toFixed(2)}%`);
      console.log(`Local Fund %: ${result.localFundPct.toFixed(2)}%`);
      console.log(`Retail %: ${result.retailPct.toFixed(2)}%`);
      console.log(`Price Change: ${result.priceChangePct.toFixed(2)}%`);
      console.log(`Price Direction: ${result.priceDirection} (1=up, 0=flat, -1=down)`);
      console.log(`Score: ${result.score.total}`);
      console.log(`Is Signal: ${result.isSignal}`);
    } else {
      console.log("✗ No result (no data for this stock/date)");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  await prisma.$disconnect();
  await pool.end();
}

main();
