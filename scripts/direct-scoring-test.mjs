/**
 * Direct test of scoring - import and run function
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Set env
process.env.DATABASE_URL = "postgresql://postgres:%40Arekmindi123@localhost:5432/biginflow?schema=public";

// Import Prisma
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const pg = await import("pg");
const { Pool } = pg.default;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Manual aggregate function
async function aggregateByCategory(stockId, date) {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
  });

  if (!stock) return null;

  const transactions = await prisma.brokerTransaction.findMany({
    where: {
      stockId,
      date,
    },
    include: {
      broker: true,
    },
  });

  if (transactions.length === 0) return null;

  const priceData = await prisma.stockPrice.findUnique({
    where: {
      stockId_date: {
        stockId,
        date,
      },
    },
  });

  const categoryData = {
    FOREIGN: { value: 0, volume: 0, percentOfTotal: 0 },
    LOCAL_FUND: { value: 0, volume: 0, percentOfTotal: 0 },
    RETAIL: { value: 0, volume: 0, percentOfTotal: 0 },
    OTHER: { value: 0, volume: 0, percentOfTotal: 0 },
  };

  let totalValue = 0;
  let totalVolume = 0;

  for (const tx of transactions) {
    const category = tx.broker.category;
    const value = Number(tx.value);
    const volume = Number(tx.volume);

    categoryData[category].value += value;
    categoryData[category].volume += volume;

    totalValue += value;
    totalVolume += volume;
  }

  for (const category of Object.keys(categoryData)) {
    categoryData[category].percentOfTotal =
      totalValue > 0 ? (categoryData[category].value / totalValue) * 100 : 0;
  }

  const priceChange = priceData ? Number(priceData.change) : 0;
  const priceChangePct = priceData ? Number(priceData.changePct) : 0;
  const priceDirection = priceChangePct > 0.5 ? 1 : priceChangePct < -0.5 ? -1 : 0;

  return {
    stockId,
    ticker: stock.ticker,
    date,
    foreign: categoryData.FOREIGN,
    localFund: categoryData.LOCAL_FUND,
    retail: categoryData.RETAIL,
    other: categoryData.OTHER,
    totalValue,
    totalVolume,
    priceChange,
    priceChangePct,
    priceDirection,
  };
}

function meetsSignalCriteria(data) {
  const smartMoneyPct = data.foreign.percentOfTotal + data.localFund.percentOfTotal;
  const retailPct = data.retail.percentOfTotal;

  return (
    data.priceDirection === 1 &&
    data.foreign.percentOfTotal >= 10 &&
    data.localFund.percentOfTotal >= 5 &&
    retailPct < smartMoneyPct
  );
}

async function main() {
  const targetDate = new Date(Date.UTC(2024, 2, 15, 0, 0, 0, 0));

  console.log(`\nTesting scoring for ${targetDate.toISOString().split('T')[0]}...\n`);

  const stocks = await prisma.stock.findMany({
    where: { isActive: true, ticker: { in: ['BBCA', 'ADRO', 'PTBA', 'UNVR', 'BBRI'] } },
  });

  console.log(`Processing ${stocks.length} stocks...\n`);

  let signalCount = 0;

  for (const stock of stocks) {
    const data = await aggregateByCategory(stock.id, targetDate);

    if (!data) {
      console.log(`${stock.ticker}: No data`);
      continue;
    }

    const isSignal = meetsSignalCriteria(data);

    console.log(`${stock.ticker}:`);
    console.log(`  Foreign: ${data.foreign.percentOfTotal.toFixed(2)}%`);
    console.log(`  Fund: ${data.localFund.percentOfTotal.toFixed(2)}%`);
    console.log(`  Retail: ${data.retail.percentOfTotal.toFixed(2)}%`);
    console.log(`  Price: ${data.priceChangePct > 0 ? '+' : ''}${data.priceChangePct.toFixed(2)}%`);
    console.log(`  Signal: ${isSignal ? '✓ YES' : '✗ No'}\n`);

    if (isSignal) signalCount++;
  }

  console.log(`\nTotal signals: ${signalCount}/${stocks.length}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
