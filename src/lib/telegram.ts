import { formatCurrency, formatDate } from "./utils";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface SignalData {
  ticker: string;
  name: string;
  score: number;
  foreignPct: number;
  localFundPct: number;
  retailPct: number;
  priceChangePct: number;
  streakDays: number;
  volumeRatio: number;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  if (!config.botToken || !config.chatId) {
    console.error("Telegram bot token or chat ID not configured");
    return false;
  }

  try {
    const url = `${TELEGRAM_API_BASE}${config.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

/**
 * Format signal data for Telegram notification
 */
export function formatSignalMessage(date: Date, signals: SignalData[]): string {
  const dateStr = formatDate(date);

  if (signals.length === 0) {
    return `📊 <b>Smart Money Alert - ${dateStr}</b>\n\nTidak ada sinyal akumulasi hari ini.`;
  }

  let message = `📊 <b>Smart Money Alert - ${dateStr}</b>\n`;
  message += `\n<b>${signals.length} saham</b> terdeteksi akumulasi smart money:\n`;

  // Sort by score descending
  const sortedSignals = [...signals].sort((a, b) => b.score - a.score);

  // Top signals (max 10)
  const topSignals = sortedSignals.slice(0, 10);

  for (const signal of topSignals) {
    const emoji = signal.score >= 70 ? "🔥" : signal.score >= 50 ? "⭐" : "📈";
    const streakEmoji = signal.streakDays >= 3 ? " 🔄" : "";
    const priceEmoji = signal.priceChangePct > 0 ? "📈" : "📉";

    message += `\n${emoji} <b>${signal.ticker}</b> - Skor: ${signal.score}${streakEmoji}`;
    message += `\n   Asing: ${signal.foreignPct.toFixed(1)}% | Fund: ${signal.localFundPct.toFixed(1)}%`;
    message += `\n   Ritel: ${signal.retailPct.toFixed(1)}% | ${priceEmoji} ${signal.priceChangePct > 0 ? '+' : ''}${signal.priceChangePct.toFixed(2)}%`;
  }

  if (signals.length > 10) {
    message += `\n\n... dan ${signals.length - 10} saham lainnya`;
  }

  message += `\n\n<i>Cek dashboard untuk detail lengkap</i>`;

  return message;
}

/**
 * Format net value with color indicator
 */
function formatNet(value: number): string {
  if (value > 0) {
    return `+${formatCurrency(value)}`;
  }
  return formatCurrency(value);
}

/**
 * Send daily signal alert
 */
export async function sendDailyAlert(
  config: TelegramConfig,
  date: Date,
  signals: SignalData[]
): Promise<boolean> {
  const message = formatSignalMessage(date, signals);
  return sendTelegramMessage(config, message);
}

/**
 * Send scraping status notification
 */
export async function sendScrapeStatus(
  config: TelegramConfig,
  status: "started" | "success" | "failed",
  details: {
    stocksProcessed?: number;
    stocksFailed?: number;
    errorMessage?: string;
  } = {}
): Promise<boolean> {
  let message = "";

  switch (status) {
    case "started":
      message = "🔄 <b>Scraping dimulai...</b>\n\nMengambil data broker summary dari IDX.";
      break;

    case "success":
      message = `✅ <b>Scraping selesai!</b>\n\n`;
      message += `📊 Saham diproses: ${details.stocksProcessed || 0}\n`;
      if (details.stocksFailed && details.stocksFailed > 0) {
        message += `⚠️ Gagal: ${details.stocksFailed}`;
      }
      break;

    case "failed":
      message = `❌ <b>Scraping gagal!</b>\n\n`;
      if (details.errorMessage) {
        message += `Error: ${details.errorMessage}`;
      }
      break;
  }

  return sendTelegramMessage(config, message);
}

/**
 * Test Telegram configuration
 */
export async function testTelegramConnection(
  config: TelegramConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${TELEGRAM_API_BASE}${config.botToken}/getMe`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    // Try sending a test message
    const testResult = await sendTelegramMessage(
      config,
      "✅ BigInflow - Test koneksi berhasil!"
    );

    if (!testResult) {
      return { success: false, error: "Failed to send test message" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Telegram config from environment or database
 */
export function getTelegramConfig(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  };
}
