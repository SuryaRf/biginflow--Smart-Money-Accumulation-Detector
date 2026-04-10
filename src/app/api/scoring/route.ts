import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse, SignalWithStock } from "@/types";
import { runScoringEngine, SignalResult } from "@/lib/scoring";
import { getLastTradingDay } from "@/lib/utils";
import { getTelegramConfig, sendDailyAlert } from "@/lib/telegram";

// GET /api/scoring - Get scoring status
export async function GET() {
  try {
    // Get latest signals with stats
    const lastDate = await prisma.dailySignal.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });

    const stats = lastDate
      ? await prisma.dailySignal.aggregate({
          where: { date: lastDate.date },
          _count: { id: true },
          _avg: { score: true },
        })
      : null;

    const signalCount = lastDate
      ? await prisma.dailySignal.count({
          where: { date: lastDate.date, isSignal: true },
        })
      : 0;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        lastScoringDate: lastDate?.date || null,
        totalStocks: stats?._count.id || 0,
        avgScore: stats?._avg.score || 0,
        signalCount,
      },
    });
  } catch (error) {
    console.error("Failed to get scoring status:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to get scoring status" },
      { status: 500 }
    );
  }
}

// POST /api/scoring - Trigger scoring engine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date as string | undefined;
    const sendNotification = body.sendNotification !== false;

    // Determine target date
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
    } else {
      targetDate = getLastTradingDay();
    }

    // Set time to start of day
    targetDate.setHours(0, 0, 0, 0);

    // Run scoring engine
    const results = await runScoringEngine(targetDate);

    // Filter signals only
    const signals = results.filter((r) => r.isSignal);

    // Send Telegram notification if enabled
    if (sendNotification && signals.length > 0) {
      const config = getTelegramConfig();
      if (config.botToken && config.chatId) {
        // Get stock names for notification
        const stockIds = signals.map((s) => s.stockId);
        const stocks = await prisma.stock.findMany({
          where: { id: { in: stockIds } },
        });

        const stockMap = new Map(stocks.map((s) => [s.id, s]));

        const signalData = signals.map((s) => ({
          ticker: s.ticker,
          name: stockMap.get(s.stockId)?.name || s.ticker,
          score: s.score.total,
          foreignPct: s.foreignPct,
          localFundPct: s.localFundPct,
          retailPct: s.retailPct,
          priceChangePct: s.priceChangePct,
          streakDays: s.streakDays,
          volumeRatio: s.volumeRatio,
        }));

        await sendDailyAlert(config, targetDate, signalData);
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        date: targetDate.toISOString().split("T")[0],
        totalProcessed: results.length,
        signalsFound: signals.length,
        notificationSent: sendNotification && signals.length > 0,
      },
      message: `Scoring completed. ${signals.length} signals found.`,
    });
  } catch (error) {
    console.error("Failed to run scoring:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to run scoring" },
      { status: 500 }
    );
  }
}
