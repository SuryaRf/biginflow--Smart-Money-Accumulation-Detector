import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import prisma from "@/lib/prisma";
import { ApiResponse, ScrapeLog, ScrapeResult } from "@/types";
import { toIDXDateFormat, getLastTradingDay } from "@/lib/utils";

// GET /api/scrape - Get scrape logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const logs = await prisma.scrapeLog.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json<ApiResponse<ScrapeLog[]>>({
      success: true,
      data: logs as ScrapeLog[],
    });
  } catch (error) {
    console.error("Failed to fetch scrape logs:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch scrape logs" },
      { status: 500 }
    );
  }
}

// POST /api/scrape - Trigger manual scrape
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dateParam = body.date as string | undefined;

    // Determine target date
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
    } else {
      targetDate = getLastTradingDay();
    }

    const dateStr = toIDXDateFormat(targetDate);

    // Check if scraping is already running
    const runningLog = await prisma.scrapeLog.findFirst({
      where: { status: "RUNNING" },
    });

    if (runningLog) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Scraping is already in progress" },
        { status: 409 }
      );
    }

    // Create log entry
    const log = await prisma.scrapeLog.create({
      data: {
        date: targetDate,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    // Spawn Python scraper as background process
    const scriptPath = path.join(process.cwd(), "scripts", "scraper.py");

    // Run scraper in background
    const pythonProcess = spawn("python", [scriptPath, "--date", dateStr], {
      detached: true,
      stdio: "ignore",
    });

    pythonProcess.unref();

    return NextResponse.json<ApiResponse<ScrapeResult>>({
      success: true,
      data: {
        success: true,
        log: log as ScrapeLog,
        message: `Scraping started for ${dateStr}`,
      },
    });
  } catch (error) {
    console.error("Failed to start scrape:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to start scrape" },
      { status: 500 }
    );
  }
}
