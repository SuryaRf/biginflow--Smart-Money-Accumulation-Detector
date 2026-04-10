/**
 * Run scoring engine from command line
 */

import "dotenv/config";
import { runScoringEngine } from "../src/lib/scoring.js";

async function main() {
  const dateArg = process.argv[2];
  const targetDate = dateArg ? new Date(dateArg) : new Date("2024-03-15");
  targetDate.setHours(0, 0, 0, 0);

  console.log(`\nRunning scoring engine for ${targetDate.toISOString().split('T')[0]}...\n`);

  const results = await runScoringEngine(targetDate);

  console.log(`\nScoring completed!`);
  console.log(`Total stocks processed: ${results.length}`);

  const signals = results.filter((r) => r.isSignal);
  console.log(`Signals found: ${signals.length}\n`);

  if (signals.length > 0) {
    console.log("Top signals:");
    signals
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 10)
      .forEach((s, i) => {
        console.log(`${i + 1}. ${s.ticker.padEnd(6)} - Score: ${s.score.total}`);
        console.log(`   Foreign: ${s.foreignPct.toFixed(1)}% | Fund: ${s.localFundPct.toFixed(1)}% | Retail: ${s.retailPct.toFixed(1)}%`);
        console.log(`   Price: ${s.priceChangePct > 0 ? '+' : ''}${s.priceChangePct.toFixed(2)}% | Streak: ${s.streakDays}d\n`);
      });
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
