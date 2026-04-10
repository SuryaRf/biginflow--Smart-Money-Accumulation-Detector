import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";
import { getTelegramConfig, testTelegramConnection } from "@/lib/telegram";

// POST /api/settings/test-telegram - Test Telegram connection
export async function POST() {
  try {
    const config = getTelegramConfig();

    if (!config.botToken || !config.chatId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Telegram bot token and chat ID must be configured in .env",
        },
        { status: 400 }
      );
    }

    const result = await testTelegramConnection(config);

    if (result.success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Telegram connection successful! Test message sent.",
      });
    } else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to test Telegram:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to test Telegram connection" },
      { status: 500 }
    );
  }
}
