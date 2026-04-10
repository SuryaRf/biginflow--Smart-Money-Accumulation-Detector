/**
 * BigInflow Scheduler
 *
 * Menjalankan scraping dan scoring otomatis setiap hari Senin-Jumat jam 16:30 WIB.
 *
 * Usage:
 *   npx ts-node scheduler.ts
 *   atau
 *   npm run scheduler
 */

import cron from "node-cron";
import { spawn } from "child_process";
import path from "path";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Helper to format date for logging
function getTimestamp(): string {
  return new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

// Helper to log with timestamp
function log(message: string): void {
  console.log(`[${getTimestamp()}] ${message}`);
}

// Run Python scraper
async function runScraper(): Promise<boolean> {
  return new Promise((resolve) => {
    log("Starting Python scraper...");

    const scriptPath = path.join(__dirname, "scripts", "scraper.py");
    const pythonProcess = spawn("python", [scriptPath], {
      stdio: "inherit",
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        log("Scraper completed successfully");
        resolve(true);
      } else {
        log(`Scraper exited with code ${code}`);
        resolve(false);
      }
    });

    pythonProcess.on("error", (error) => {
      log(`Scraper error: ${error.message}`);
      resolve(false);
    });
  });
}

// Trigger scoring engine via API
async function runScoring(): Promise<boolean> {
  log("Running scoring engine...");

  try {
    const response = await fetch(`${APP_URL}/api/scoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sendNotification: true }),
    });

    const data = await response.json();

    if (data.success) {
      log(`Scoring completed: ${data.message}`);
      return true;
    } else {
      log(`Scoring failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    log(`Scoring error: ${error instanceof Error ? error.message : "Unknown"}`);
    return false;
  }
}

// Main daily job
async function runDailyJob(): Promise<void> {
  log("========================================");
  log("Starting daily job...");
  log("========================================");

  // Step 1: Run scraper
  const scrapeSuccess = await runScraper();

  if (!scrapeSuccess) {
    log("Scraping failed, skipping scoring");
    return;
  }

  // Wait a bit for data to settle
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 2: Run scoring
  await runScoring();

  log("========================================");
  log("Daily job completed");
  log("========================================");
}

// Schedule: Every weekday at 16:30 WIB (09:30 UTC)
// Cron format: minute hour day month weekday
// WIB = UTC+7, so 16:30 WIB = 09:30 UTC
const CRON_SCHEDULE = "30 16 * * 1-5"; // 16:30 every Mon-Fri

log("BigInflow Scheduler started");
log(`Schedule: ${CRON_SCHEDULE} (16:30 WIB, Mon-Fri)`);
log(`Next run: Use 'npm run scheduler' to keep this running`);

// Schedule the job
cron.schedule(
  CRON_SCHEDULE,
  async () => {
    await runDailyJob();
  },
  {
    timezone: "Asia/Jakarta",
  }
);

// Also run immediately if --now flag is passed
if (process.argv.includes("--now")) {
  log("Running immediately (--now flag detected)");
  runDailyJob();
}

// Keep process alive
process.on("SIGINT", () => {
  log("Scheduler stopped");
  process.exit(0);
});

// Heartbeat log every hour
setInterval(() => {
  log("Scheduler heartbeat - still running...");
}, 60 * 60 * 1000);
