// API Response types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Stock types
export interface Stock {
  id: string;
  ticker: string;
  name: string;
  marketCap?: number | null;
  sector?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStockInput {
  ticker: string;
  name: string;
  marketCap?: number;
  sector?: string;
}

export interface UpdateStockInput {
  name?: string;
  marketCap?: number;
  sector?: string;
  isActive?: boolean;
}

// Broker types
export interface Broker {
  id: string;
  code: string;
  name: string;
  category: BrokerCategory;
}

export type BrokerCategory = "FOREIGN" | "LOCAL_FUND" | "RETAIL" | "OTHER";

// Signal types
export interface DailySignal {
  id: string;
  stockId: string;
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
  score: number;
  scoreForeign: number;
  scoreFund: number;
  scoreRetail: number;
  scoreStreak: number;
  scoreVolume: number;
  streakDays: number;
  volumeRatio: number;
  isSignal: boolean;
  createdAt: Date;
  stock?: Stock;
}

export interface SignalWithStock extends DailySignal {
  stock: Stock;
}

export interface SignalsQueryParams {
  date?: string;
  onlySignals?: boolean;
  minScore?: number;
  sector?: string;
  sortBy?: "score" | "foreignPct" | "streak" | "date";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

// Scrape types
export interface ScrapeLog {
  id: string;
  date: Date;
  status: ScrapeStatus;
  stocksProcessed: number;
  stocksFailed: number;
  startedAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
}

export type ScrapeStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface ScrapeResult {
  success: boolean;
  log: ScrapeLog;
  message: string;
}

// Dashboard types
export interface DashboardStats {
  totalStocks: number;
  activeSignals: number;
  avgScore: number;
  lastScrapeDate?: Date;
  lastScrapeStatus?: ScrapeStatus;
}

// Chart data types
export interface SignalTrend {
  date: string;
  signalCount: number;
  avgScore: number;
}

export interface CategoryFlow {
  date: string;
  foreignPct: number;
  localFundPct: number;
  retailPct: number;
}
