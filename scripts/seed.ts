/**
 * Seed script untuk BigInflow
 *
 * Mengisi database dengan:
 * 1. Data broker default dengan kategori
 * 2. Contoh watchlist saham mid-cap
 *
 * Usage: npm run db:seed
 */

import "dotenv/config";
import { PrismaClient, BrokerCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Daftar broker dengan kategori
const brokers: Array<{ code: string; name: string; category: BrokerCategory }> = [
  // Foreign
  { code: "AK", name: "UBS Securities", category: "FOREIGN" },
  { code: "BK", name: "JP Morgan Securities", category: "FOREIGN" },
  { code: "KZ", name: "CLSA Indonesia", category: "FOREIGN" },
  { code: "NI", name: "Morgan Stanley Asia", category: "FOREIGN" },
  { code: "RX", name: "Macquarie Capital", category: "FOREIGN" },
  { code: "DB", name: "Deutsche Securities", category: "FOREIGN" },
  { code: "CS", name: "Credit Suisse Securities", category: "FOREIGN" },
  { code: "ML", name: "Merrill Lynch Indonesia", category: "FOREIGN" },
  { code: "GS", name: "Goldman Sachs", category: "FOREIGN" },
  { code: "CG", name: "Citigroup Securities", category: "FOREIGN" },

  // Local Fund
  { code: "CC", name: "Mandiri Sekuritas", category: "LOCAL_FUND" },
  { code: "OD", name: "BRI Danareksa Sekuritas", category: "LOCAL_FUND" },
  { code: "DX", name: "Bahana Sekuritas", category: "LOCAL_FUND" },
  { code: "ZP", name: "Maybank Sekuritas Indonesia", category: "LOCAL_FUND" },
  { code: "SQ", name: "BCA Sekuritas", category: "LOCAL_FUND" },
  { code: "NF", name: "Trimegah Sekuritas", category: "LOCAL_FUND" },
  { code: "AI", name: "Sinarmas Sekuritas", category: "LOCAL_FUND" },
  { code: "PD", name: "Panin Sekuritas", category: "LOCAL_FUND" },
  { code: "GR", name: "CIMB Sekuritas", category: "LOCAL_FUND" },
  { code: "MI", name: "Mirae Asset Sekuritas", category: "LOCAL_FUND" },

  // Retail
  { code: "YP", name: "Indo Premier Sekuritas", category: "RETAIL" },
  { code: "XC", name: "Ajaib Sekuritas", category: "RETAIL" },
  { code: "XL", name: "Stockbit Sekuritas", category: "RETAIL" },
  { code: "KK", name: "Phillip Sekuritas", category: "RETAIL" },
  { code: "YU", name: "CGS International Sekuritas", category: "RETAIL" },
  { code: "PF", name: "First Asia Capital", category: "RETAIL" },
  { code: "RF", name: "Reliance Sekuritas", category: "RETAIL" },
  { code: "AG", name: "Artha Sekuritas", category: "RETAIL" },
];

// Contoh saham mid-cap (market cap > 1T)
const stocks: Array<{ ticker: string; name: string; sector: string }> = [
  // Banking
  { ticker: "BBCA", name: "Bank Central Asia Tbk", sector: "Banking" },
  { ticker: "BMRI", name: "Bank Mandiri Tbk", sector: "Banking" },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk", sector: "Banking" },
  { ticker: "BBNI", name: "Bank Negara Indonesia Tbk", sector: "Banking" },
  { ticker: "BRIS", name: "Bank Syariah Indonesia Tbk", sector: "Banking" },

  // Telco
  { ticker: "TLKM", name: "Telkom Indonesia Tbk", sector: "Telecommunication" },
  { ticker: "EXCL", name: "XL Axiata Tbk", sector: "Telecommunication" },
  { ticker: "ISAT", name: "Indosat Tbk", sector: "Telecommunication" },

  // Consumer
  { ticker: "UNVR", name: "Unilever Indonesia Tbk", sector: "Consumer Goods" },
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Goods" },
  { ticker: "INDF", name: "Indofood Sukses Makmur Tbk", sector: "Consumer Goods" },
  { ticker: "MYOR", name: "Mayora Indah Tbk", sector: "Consumer Goods" },

  // Mining
  { ticker: "ADRO", name: "Adaro Energy Indonesia Tbk", sector: "Mining" },
  { ticker: "PTBA", name: "Bukit Asam Tbk", sector: "Mining" },
  { ticker: "ITMG", name: "Indo Tambangraya Megah Tbk", sector: "Mining" },
  { ticker: "ANTM", name: "Aneka Tambang Tbk", sector: "Mining" },
  { ticker: "INCO", name: "Vale Indonesia Tbk", sector: "Mining" },
  { ticker: "MDKA", name: "Merdeka Copper Gold Tbk", sector: "Mining" },

  // Property
  { ticker: "BSDE", name: "Bumi Serpong Damai Tbk", sector: "Property" },
  { ticker: "SMRA", name: "Summarecon Agung Tbk", sector: "Property" },
  { ticker: "CTRA", name: "Ciputra Development Tbk", sector: "Property" },

  // Infrastructure
  { ticker: "JSMR", name: "Jasa Marga Tbk", sector: "Infrastructure" },
  { ticker: "WIKA", name: "Wijaya Karya Tbk", sector: "Infrastructure" },
  { ticker: "PTPP", name: "PP (Persero) Tbk", sector: "Infrastructure" },

  // Automotive
  { ticker: "ASII", name: "Astra International Tbk", sector: "Automotive" },
  { ticker: "AUTO", name: "Astra Otoparts Tbk", sector: "Automotive" },

  // Healthcare
  { ticker: "SIDO", name: "Industri Jamu dan Farmasi Sido Muncul Tbk", sector: "Healthcare" },
  { ticker: "KLBF", name: "Kalbe Farma Tbk", sector: "Healthcare" },

  // Cement
  { ticker: "SMGR", name: "Semen Indonesia Tbk", sector: "Cement" },
  { ticker: "INTP", name: "Indocement Tunggal Prakarsa Tbk", sector: "Cement" },

  // Retail
  { ticker: "ACES", name: "Ace Hardware Indonesia Tbk", sector: "Retail" },
  { ticker: "MAPI", name: "Mitra Adiperkasa Tbk", sector: "Retail" },
  { ticker: "ERAA", name: "Erajaya Swasembada Tbk", sector: "Retail" },

  // Poultry
  { ticker: "CPIN", name: "Charoen Pokphand Indonesia Tbk", sector: "Poultry" },
  { ticker: "JPFA", name: "Japfa Comfeed Indonesia Tbk", sector: "Poultry" },

  // Cigarette
  { ticker: "HMSP", name: "HM Sampoerna Tbk", sector: "Cigarette" },
  { ticker: "GGRM", name: "Gudang Garam Tbk", sector: "Cigarette" },

  // Tech
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia Tbk", sector: "Technology" },
  { ticker: "BUKA", name: "Bukalapak.com Tbk", sector: "Technology" },

  // Media
  { ticker: "SCMA", name: "Surya Citra Media Tbk", sector: "Media" },
  { ticker: "MNCN", name: "Media Nusantara Citra Tbk", sector: "Media" },
];

async function main() {
  console.log("Seeding database...");

  // Seed brokers
  console.log("Seeding brokers...");
  for (const broker of brokers) {
    await prisma.broker.upsert({
      where: { code: broker.code },
      update: { name: broker.name, category: broker.category },
      create: broker,
    });
  }
  console.log(`Seeded ${brokers.length} brokers`);

  // Seed stocks
  console.log("Seeding stocks...");
  for (const stock of stocks) {
    await prisma.stock.upsert({
      where: { ticker: stock.ticker },
      update: { name: stock.name, sector: stock.sector },
      create: { ...stock, isActive: true },
    });
  }
  console.log(`Seeded ${stocks.length} stocks`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
