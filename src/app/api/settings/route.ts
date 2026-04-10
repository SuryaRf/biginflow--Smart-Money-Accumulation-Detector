import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/types";
import { testTelegramConnection } from "@/lib/telegram";

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany();

    // Convert to key-value object
    const settingsMap = settings.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>
    );

    // Add env-based settings (masked)
    if (process.env.TELEGRAM_BOT_TOKEN) {
      settingsMap.telegram_bot_token = "***configured***";
    }
    if (process.env.TELEGRAM_CHAT_ID) {
      settingsMap.telegram_chat_id = process.env.TELEGRAM_CHAT_ID;
    }

    return NextResponse.json<ApiResponse<Record<string, string>>>({
      success: true,
      data: settingsMap,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body as { key: string; value: string };

    if (!key) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Key is required" },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value || "" },
      update: { value: value || "" },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Setting updated successfully",
    });
  } catch (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
