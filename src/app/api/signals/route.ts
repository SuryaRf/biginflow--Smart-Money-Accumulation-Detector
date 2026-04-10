import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiResponse, SignalWithStock, SignalsQueryParams } from "@/types";
import { getLastTradingDay } from "@/lib/utils";

// GET /api/signals - Get signals with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const dateParam = searchParams.get("date");
    const onlySignals = searchParams.get("onlySignals") !== "false";
    const minScore = parseInt(searchParams.get("minScore") || "0");
    const sector = searchParams.get("sector") || undefined;
    const sortBy = (searchParams.get("sortBy") || "score") as SignalsQueryParams["sortBy"];
    const sortOrder = (searchParams.get("sortOrder") || "desc") as SignalsQueryParams["sortOrder"];
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Determine target date
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
    } else {
      targetDate = getLastTradingDay();
    }

    // Set time to start of day for consistent comparison
    targetDate.setHours(0, 0, 0, 0);

    // Build where clause
    const where: Prisma.DailySignalWhereInput = {
      date: targetDate,
    };

    if (onlySignals) {
      where.isSignal = true;
    }

    if (minScore > 0) {
      where.score = { gte: minScore };
    }

    // Build orderBy
    const orderByMap: Record<string, Prisma.DailySignalOrderByWithRelationInput> = {
      score: { score: sortOrder },
      foreignPct: { foreignPct: sortOrder },
      streak: { streakDays: sortOrder },
      date: { date: sortOrder },
    };

    const signals = await prisma.dailySignal.findMany({
      where,
      include: {
        stock: true,
      },
      orderBy: orderByMap[sortBy || "score"],
      take: limit,
      skip: offset,
    });

    // Filter by sector if specified (post-query filter)
    let filteredSignals = signals;
    if (sector) {
      filteredSignals = signals.filter((s) => s.stock.sector === sector);
    }

    // Get total count for pagination
    const total = await prisma.dailySignal.count({
      where,
    });

    // Transform to match our types
    const data: SignalWithStock[] = filteredSignals.map((s) => ({
      id: s.id,
      stockId: s.stockId,
      date: s.date,
      foreignPct: Number(s.foreignPct),
      localFundPct: Number(s.localFundPct),
      retailPct: Number(s.retailPct),
      foreignValue: Number(s.foreignValue),
      localFundValue: Number(s.localFundValue),
      retailValue: Number(s.retailValue),
      totalValue: Number(s.totalValue),
      priceChange: Number(s.priceChange),
      priceChangePct: Number(s.priceChangePct),
      priceDirection: s.priceDirection,
      score: s.score,
      scoreForeign: s.scoreForeign,
      scoreFund: s.scoreFund,
      scoreRetail: s.scoreRetail,
      scoreStreak: s.scoreStreak,
      scoreVolume: s.scoreVolume,
      streakDays: s.streakDays,
      volumeRatio: Number(s.volumeRatio),
      isSignal: s.isSignal,
      createdAt: s.createdAt,
      stock: {
        id: s.stock.id,
        ticker: s.stock.ticker,
        name: s.stock.name,
        marketCap: s.stock.marketCap ? Number(s.stock.marketCap) : null,
        sector: s.stock.sector,
        isActive: s.stock.isActive,
        createdAt: s.stock.createdAt,
        updatedAt: s.stock.updatedAt,
      },
    }));

    return NextResponse.json<ApiResponse<{ signals: SignalWithStock[]; total: number; date: string }>>({
      success: true,
      data: {
        signals: data,
        total,
        date: targetDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Failed to fetch signals:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
