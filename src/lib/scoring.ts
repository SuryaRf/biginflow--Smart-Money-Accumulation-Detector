import { BrokerCategory, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { getDateString } from "./utils";

// Type definitions
export interface CategoryAggregateData {
  value: number;          // Total value traded
  volume: number;         // Total volume traded
  percentOfTotal: number; // % of total trading value
}

export interface DailyStockData {
  stockId: string;
  ticker: string;
  date: Date;
  foreign: CategoryAggregateData;
  localFund: CategoryAggregateData;
  retail: CategoryAggregateData;
  other: CategoryAggregateData;
  totalValue: number;
  totalVolume: number;
  priceChange: number;      // Price change in rupiah
  priceChangePct: number;   // Price change in %
  priceDirection: number;   // 1=up, 0=flat, -1=down
}

export interface ScoreBreakdown {
  total: number;
  foreign: number;   // max 30
  fund: number;      // max 20
  retail: number;    // max 20
  streak: number;    // max 20
  volume: number;    // max 10
}

export interface SignalResult {
  stockId: string;
  ticker: string;
  date: Date;
  foreignPct: number;
  localFundPct: number;
  retailPct: number;
  foreignValue: number;
  localFundValue: number;
  retailValue: number;
  totalValue: number;
  priceChange: number;
  priceChangePct: number;
  priceDirection: number;
  score: ScoreBreakdown;
  streakDays: number;
  volumeRatio: number;
  isSignal: boolean;
}

/**
 * Aggregate broker transactions by category for a specific stock and date
 */
export async function aggregateByCategory(
  stockId: string,
  date: Date
): Promise<DailyStockData | null> {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
  });

  if (!stock) return null;

  // Get broker transactions
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

  // Get price data
  const priceData = await prisma.stockPrice.findUnique({
    where: {
      stockId_date: {
        stockId,
        date,
      },
    },
  });

  // Initialize category data
  const categoryData: Record<BrokerCategory, CategoryAggregateData> = {
    FOREIGN: { value: 0, volume: 0, percentOfTotal: 0 },
    LOCAL_FUND: { value: 0, volume: 0, percentOfTotal: 0 },
    RETAIL: { value: 0, volume: 0, percentOfTotal: 0 },
    OTHER: { value: 0, volume: 0, percentOfTotal: 0 },
  };

  let totalValue = 0;
  let totalVolume = 0;

  // Aggregate by category
  for (const tx of transactions) {
    const category = tx.broker.category;
    const value = Number(tx.value);
    const volume = Number(tx.volume);

    categoryData[category].value += value;
    categoryData[category].volume += volume;

    totalValue += value;
    totalVolume += volume;
  }

  // Calculate percentages
  for (const category of Object.keys(categoryData) as BrokerCategory[]) {
    categoryData[category].percentOfTotal =
      totalValue > 0 ? (categoryData[category].value / totalValue) * 100 : 0;
  }

  // Extract price info
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

/**
 * Check if a stock meets signal criteria (smart money accumulation):
 * 1. Price trending up (positive direction)
 * 2. High foreign participation (>= 10%)
 * 3. High local fund participation (>= 5%)
 * 4. Lower retail participation than smart money combined
 *
 * Logic: When price is rising AND foreign+funds are heavily participating,
 * it suggests they're accumulating (buying). If retail participation is lower,
 * it means retail is likely selling to them.
 */
export function meetsSignalCriteria(data: DailyStockData): boolean {
  const smartMoneyPct = data.foreign.percentOfTotal + data.localFund.percentOfTotal;
  const retailPct = data.retail.percentOfTotal;

  return (
    data.priceDirection === 1 &&           // Price rising
    data.foreign.percentOfTotal >= 10 &&    // Foreign active (>= 10%)
    data.localFund.percentOfTotal >= 5 &&   // Local funds active (>= 5%)
    retailPct < smartMoneyPct               // Retail less active than smart money
  );
}

/**
 * Calculate streak days - consecutive days with the same signal pattern
 */
export async function calculateStreak(stockId: string, date: Date): Promise<number> {
  // Get last 10 days of signals to check streak
  const signals = await prisma.dailySignal.findMany({
    where: {
      stockId,
      date: {
        lt: date,
      },
      isSignal: true,
    },
    orderBy: {
      date: "desc",
    },
    take: 10,
  });

  if (signals.length === 0) return 1;

  let streak = 1;
  let expectedDate = new Date(date);
  expectedDate.setDate(expectedDate.getDate() - 1);

  // Skip weekends
  while (expectedDate.getDay() === 0 || expectedDate.getDay() === 6) {
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  for (const signal of signals) {
    const signalDate = new Date(signal.date);
    const signalDateStr = getDateString(signalDate);
    const expectedDateStr = getDateString(expectedDate);

    if (signalDateStr === expectedDateStr) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
      // Skip weekends
      while (expectedDate.getDay() === 0 || expectedDate.getDay() === 6) {
        expectedDate.setDate(expectedDate.getDate() - 1);
      }
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate volume ratio compared to 10-day average
 */
export async function calculateVolumeRatio(
  stockId: string,
  date: Date,
  todayVolume: number
): Promise<number> {
  const tenDaysAgo = new Date(date);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 14); // 14 calendar days to get ~10 trading days

  const pastSignals = await prisma.dailySignal.findMany({
    where: {
      stockId,
      date: {
        gte: tenDaysAgo,
        lt: date,
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 10,
  });

  if (pastSignals.length === 0) return 1;

  const avgVolume =
    pastSignals.reduce((sum, s) => sum + Number(s.totalValue), 0) /
    pastSignals.length;

  if (avgVolume === 0) return 1;

  return todayVolume / avgVolume;
}

/**
 * Calculate score breakdown for a stock
 * Total: 100 points
 * - Foreign participation: 30 points (higher % = higher score)
 * - Fund participation: 20 points (higher % = higher score)
 * - Retail divergence: 20 points (lower retail when smart money high = higher score)
 * - Streak: 20 points
 * - Volume anomaly: 10 points
 */
export function calculateScore(
  data: DailyStockData,
  streakDays: number,
  volumeRatio: number
): ScoreBreakdown {
  // 1. Foreign participation (30 points max)
  // 10% = 15 points, 20% = 22 points, 30%+ = 30 points
  const scoreForeign = Math.min(30, Math.round(data.foreign.percentOfTotal));

  // 2. Fund participation (20 points max)
  // 5% = 10 points, 10% = 15 points, 20%+ = 20 points
  const scoreFund = Math.min(20, Math.round(data.localFund.percentOfTotal));

  // 3. Retail divergence (20 points max)
  // When smart money high but retail low, score high
  // Retail < 10% = 20 points, Retail 10-20% = 10 points, Retail > 20% = 0 points
  const scoreRetail = Math.min(
    20,
    Math.max(0, Math.round(20 - data.retail.percentOfTotal))
  );

  // 4. Streak (20 points max)
  // 1 day = 4 points, 2 days = 8 points, ..., 5+ days = 20 points
  const scoreStreak = Math.min(20, streakDays * 4);

  // 5. Volume anomaly (10 points max)
  // ratio 1.0 = 0 points, 1.5x = 5 points, 2x+ = 10 points
  const scoreVolume = Math.min(10, Math.max(0, Math.round((volumeRatio - 1) * 10)));

  return {
    total: scoreForeign + scoreFund + scoreRetail + scoreStreak + scoreVolume,
    foreign: scoreForeign,
    fund: scoreFund,
    retail: scoreRetail,
    streak: scoreStreak,
    volume: scoreVolume,
  };
}

/**
 * Process a single stock for a given date
 */
export async function processStock(
  stockId: string,
  date: Date
): Promise<SignalResult | null> {
  const data = await aggregateByCategory(stockId, date);
  if (!data) return null;

  const isSignal = meetsSignalCriteria(data);
  const streakDays = isSignal ? await calculateStreak(stockId, date) : 0;
  const volumeRatio = await calculateVolumeRatio(stockId, date, data.totalValue);
  const score = calculateScore(data, streakDays, volumeRatio);

  return {
    stockId,
    ticker: data.ticker,
    date,
    foreignPct: data.foreign.percentOfTotal,
    localFundPct: data.localFund.percentOfTotal,
    retailPct: data.retail.percentOfTotal,
    foreignValue: data.foreign.value,
    localFundValue: data.localFund.value,
    retailValue: data.retail.value,
    totalValue: data.totalValue,
    priceChange: data.priceChange,
    priceChangePct: data.priceChangePct,
    priceDirection: data.priceDirection,
    score,
    streakDays,
    volumeRatio,
    isSignal,
  };
}

/**
 * Run scoring engine for all active stocks on a given date
 */
export async function runScoringEngine(date: Date): Promise<SignalResult[]> {
  const stocks = await prisma.stock.findMany({
    where: { isActive: true },
  });

  const results: SignalResult[] = [];

  for (const stock of stocks) {
    const result = await processStock(stock.id, date);
    if (result) {
      // Upsert to daily_signals
      await prisma.dailySignal.upsert({
        where: {
          stockId_date: {
            stockId: stock.id,
            date,
          },
        },
        create: {
          stockId: stock.id,
          date,
          foreignPct: result.foreignPct,
          localFundPct: result.localFundPct,
          retailPct: result.retailPct,
          foreignValue: result.foreignValue,
          localFundValue: result.localFundValue,
          retailValue: result.retailValue,
          totalValue: result.totalValue,
          priceChange: result.priceChange,
          priceChangePct: result.priceChangePct,
          priceDirection: result.priceDirection,
          score: result.score.total,
          scoreForeign: result.score.foreign,
          scoreFund: result.score.fund,
          scoreRetail: result.score.retail,
          scoreStreak: result.score.streak,
          scoreVolume: result.score.volume,
          streakDays: result.streakDays,
          volumeRatio: result.volumeRatio,
          isSignal: result.isSignal,
        },
        update: {
          foreignPct: result.foreignPct,
          localFundPct: result.localFundPct,
          retailPct: result.retailPct,
          foreignValue: result.foreignValue,
          localFundValue: result.localFundValue,
          retailValue: result.retailValue,
          totalValue: result.totalValue,
          priceChange: result.priceChange,
          priceChangePct: result.priceChangePct,
          priceDirection: result.priceDirection,
          score: result.score.total,
          scoreForeign: result.score.foreign,
          scoreFund: result.score.fund,
          scoreRetail: result.score.retail,
          scoreStreak: result.score.streak,
          scoreVolume: result.score.volume,
          streakDays: result.streakDays,
          volumeRatio: result.volumeRatio,
          isSignal: result.isSignal,
        },
      });

      results.push(result);
    }
  }

  return results;
}

/**
 * Get signals for a specific date, optionally filtered
 */
export async function getSignals(
  date: Date,
  options: {
    onlySignals?: boolean;
    minScore?: number;
    sector?: string;
  } = {}
) {
  const { onlySignals = true, minScore = 0, sector } = options;

  const where: Prisma.DailySignalWhereInput = {
    date,
  };

  if (onlySignals) {
    where.isSignal = true;
  }

  if (minScore > 0) {
    where.score = { gte: minScore };
  }

  const signals = await prisma.dailySignal.findMany({
    where,
    include: {
      stock: true,
    },
    orderBy: {
      score: "desc",
    },
  });

  // Filter by sector if specified
  if (sector) {
    return signals.filter((s) => s.stock.sector === sector);
  }

  return signals;
}
