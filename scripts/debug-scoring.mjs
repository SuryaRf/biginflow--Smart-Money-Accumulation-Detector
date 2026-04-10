/**
 * Debug scoring - manual step-by-step
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:%40Arekmindi123@localhost:5432/biginflow?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetDate = new Date(Date.UTC(2024, 2, 15, 0, 0, 0, 0));

  console.log(`\n=== Debug Scoring for ${targetDate.toISOString()} ===\n`);

  // 1. Get active stocks
  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
  });
  console.log(`1. Active stocks: ${stocks.length}`);

  // 2. Check BBCA specifically
  const bbca = stocks.find(s => s.ticker === 'BBCA');
  if (!bbca) {
    console.log("ERROR: BBCA not found!");
    return;
  }
  console.log(`2. Testing BBCA (ID: ${bbca.id})\n`);

  // 3. Get broker transactions for BBCA
  const transactions = await prisma.brokerTransaction.findMany({
    where: {
      stockId: bbca.id,
      date: targetDate,
    },
    include: {
      broker: true,
    },
  });
  console.log(`3. Broker transactions: ${transactions.length}`);
  if (transactions.length > 0) {
    console.log(`   Sample: ${transactions[0].broker.code} (${transactions[0].broker.category}) - ${Number(transactions[0].value).toLocaleString()}`);
  }

  // 4. Get price data for BBCA
  const priceData = await prisma.stockPrice.findUnique({
    where: {
      stockId_date: {
        stockId: bbca.id,
        date: targetDate,
      },
    },
  });
  console.log(`4. Price data: ${priceData ? 'Found' : 'NOT FOUND'}`);
  if (priceData) {
    console.log(`   Close: ${priceData.close}, Change: ${priceData.changePct}%`);
  }

  if (transactions.length === 0) {
    console.log("\n❌ No broker transactions - can't calculate signal");
    return;
  }

  // 5. Calculate aggregates by category
  const categoryData = {
    FOREIGN: { value: 0, volume: 0 },
    LOCAL_FUND: { value: 0, volume: 0 },
    RETAIL: { value: 0, volume: 0 },
    OTHER: { value: 0, volume: 0 },
  };

  let totalValue = 0;

  for (const tx of transactions) {
    const category = tx.broker.category;
    const value = Number(tx.value);
    const volume = Number(tx.volume);

    categoryData[category].value += value;
    categoryData[category].volume += volume;
    totalValue += value;
  }

  console.log(`\n5. Aggregated by category (Total: ${totalValue.toLocaleString()}):`);
  for (const [cat, data] of Object.entries(categoryData)) {
    const pct = totalValue > 0 ? (data.value / totalValue * 100) : 0;
    console.log(`   ${cat.padEnd(12)}: ${pct.toFixed(2).padStart(6)}% (${data.value.toLocaleString()})`);
  }

  // 6. Calculate percentages
  const foreignPct = totalValue > 0 ? (categoryData.FOREIGN.value / totalValue) * 100 : 0;
  const localFundPct = totalValue > 0 ? (categoryData.LOCAL_FUND.value / totalValue) * 100 : 0;
  const retailPct = totalValue > 0 ? (categoryData.RETAIL.value / totalValue) * 100 : 0;

  // 7. Get price direction
  const priceChangePct = priceData ? Number(priceData.changePct) : 0;
  const priceDirection = priceChangePct > 0.5 ? 1 : priceChangePct < -0.5 ? -1 : 0;

  console.log(`\n6. Price info:`);
  console.log(`   Change: ${priceChangePct.toFixed(2)}%`);
  console.log(`   Direction: ${priceDirection} (1=up, 0=flat, -1=down)`);

  // 8. Check signal criteria
  const smartMoneyPct = foreignPct + localFundPct;

  console.log(`\n7. Signal criteria check:`);
  console.log(`   Price up (> 0.5%)?        ${priceDirection === 1 ? '✓ YES' : '✗ NO'} (${priceChangePct.toFixed(2)}%)`);
  console.log(`   Foreign >= 10%?           ${foreignPct >= 10 ? '✓ YES' : '✗ NO'} (${foreignPct.toFixed(2)}%)`);
  console.log(`   Local Fund >= 5%?         ${localFundPct >= 5 ? '✗ NO' : '✗ NO'} (${localFundPct.toFixed(2)}%)`);
  console.log(`   Retail < Smart Money?     ${retailPct < smartMoneyPct ? '✓ YES' : '✗ NO'} (Retail ${retailPct.toFixed(2)}% vs SM ${smartMoneyPct.toFixed(2)}%)`);

  const isSignal = (
    priceDirection === 1 &&
    foreignPct >= 10 &&
    localFundPct >= 5 &&
    retailPct < smartMoneyPct
  );

  console.log(`\n   RESULT: ${isSignal ? '✓ SIGNAL!' : '✗ No signal'}\n`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
