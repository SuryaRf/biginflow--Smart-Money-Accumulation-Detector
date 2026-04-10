import { BrokerCategory } from "@prisma/client";

// Whitelist broker berdasarkan kategori
// Data dikumpulkan dari observasi pasar dan profil nasabah broker

export const BROKER_WHITELIST: Record<BrokerCategory, string[]> = {
  // Broker Asing - mayoritas klien institusi luar negeri
  FOREIGN: [
    "AK", // UBS Securities
    "BK", // JP Morgan Securities
    "KZ", // CLSA Indonesia
    "NI", // Morgan Stanley Asia
    "RX", // Macquarie Capital
    "DB", // Deutsche Securities
    "CS", // Credit Suisse Securities
    "ML", // Merrill Lynch Indonesia
    "GS", // Goldman Sachs
    "CG", // Citigroup Securities
    "LG", // Samsung Securities
    "MS", // Morgan Stanley
    "UB", // UBS AG
    "HS", // HSBC Securities
    "BP", // BNP Paribas
    "SC", // Standard Chartered
    "DBS", // DBS Vickers
    "MQ", // Macquarie Securities
    "NS", // Nomura Securities
    "DF", // Daiwa Securities
  ],

  // Broker Lokal Fund - mayoritas mengelola dana institusi domestik
  // (manajer investasi, BPJS, Taspen, dana pensiun, asuransi)
  LOCAL_FUND: [
    "CC", // Mandiri Sekuritas
    "OD", // BRI Danareksa Sekuritas
    "DX", // Bahana Sekuritas
    "ZP", // Maybank Sekuritas Indonesia
    "SQ", // BCA Sekuritas
    "NF", // Trimegah Sekuritas
    "AI", // Sinarmas Sekuritas
    "TP", // Henan Putihrai Sekuritas
    "PD", // Panin Sekuritas
    "GR", // CIMB Sekuritas
    "EP", // MNC Sekuritas
    "PG", // Panca Global Sekuritas
    "DR", // Danatama Makmur
    "IB", // Samuel Sekuritas
    "BS", // BNI Sekuritas
    "KI", // Kresna Sekuritas
    "FZ", // Valbury Sekuritas
    "AZ", // NH Korindo Sekuritas
    "BZ", // Credit Suisse Sekuritas (lokal arm)
    "AP", // Pacific Sekuritas
    "MI", // Mirae Asset Sekuritas
  ],

  // Broker Ritel - basis nasabah individu terbesar, frekuensi tinggi nilai kecil
  RETAIL: [
    "YP", // Indo Premier Sekuritas (IPOT)
    "XC", // PT Ajaib Sekuritas Asia
    "XL", // Stockbit (PT Bibit Tumbuh Bersama)
    "KK", // Phillip Sekuritas
    "YU", // CGS International Sekuritas
    "PF", // First Asia Capital
    "RF", // Reliance Sekuritas
    "AG", // Artha Sekuritas
    "GI", // Victoria Sekuritas
    "AO", // Aldiracita Corpotama
    "AR", // Binaartha Sekuritas
    "BW", // Buana Capital
    "EM", // Erdikha Elit Sekuritas
    "FK", // eTrading Securities
    "HG", // Jasa Utama Capital
    "IF", // Investindo Nusantara
    "IP", // Net Sekuritas
    "IS", // Sucor Sekuritas
    "KS", // Kisi Sekuritas
    "LP", // Lautandhana Sekuritas
    "MG", // Mega Capital Sekuritas
    "MT", // Bosowa Sekuritas
    "NW", // Nikko Sekuritas
    "PO", // Profindo Sekuritas
    "PS", // Danpac Sekuritas
    "RO", // Waterfront Sekuritas
    "SB", // Shinhan Sekuritas
    "SH", // Supra Sekuritas
    "TA", // Trust Sekuritas
    "TP", // Tifa Sekuritas
    "WW", // Wanteg Sekuritas
    "XA", // Pilarmas Sekuritas
    "YO", // Yulie Sekurindo
    "ZR", // Lotus Andalan Sekuritas
  ],

  // Broker lainnya - tidak dipakai dalam kalkulasi sinyal utama
  OTHER: [],
};

// Cache untuk lookup cepat
const categoryLookup = new Map<string, BrokerCategory>();

// Populate lookup cache
Object.entries(BROKER_WHITELIST).forEach(([category, codes]) => {
  codes.forEach((code) => {
    categoryLookup.set(code.toUpperCase(), category as BrokerCategory);
  });
});

/**
 * Klasifikasi broker berdasarkan kode
 * @param code Kode broker (2-3 huruf)
 * @returns Kategori broker
 */
export function classifyBroker(code: string): BrokerCategory {
  const upperCode = code.toUpperCase().trim();

  // Check whitelist first
  const category = categoryLookup.get(upperCode);
  if (category) {
    return category;
  }

  // Heuristik untuk broker yang tidak ada di whitelist:
  // Kode 2 huruf kapital yang belum terdaftar kemungkinan asing
  // Tapi ini risky, jadi default ke OTHER
  return BrokerCategory.OTHER;
}

/**
 * Get broker name by code (basic lookup)
 */
export const BROKER_NAMES: Record<string, string> = {
  // Foreign
  AK: "UBS Securities",
  BK: "JP Morgan Securities",
  KZ: "CLSA Indonesia",
  NI: "Morgan Stanley Asia",
  RX: "Macquarie Capital",
  DB: "Deutsche Securities",
  CS: "Credit Suisse Securities",
  ML: "Merrill Lynch Indonesia",
  GS: "Goldman Sachs",
  CG: "Citigroup Securities",
  LG: "Samsung Securities",

  // Local Fund
  CC: "Mandiri Sekuritas",
  OD: "BRI Danareksa Sekuritas",
  DX: "Bahana Sekuritas",
  ZP: "Maybank Sekuritas Indonesia",
  SQ: "BCA Sekuritas",
  NF: "Trimegah Sekuritas",
  AI: "Sinarmas Sekuritas",
  PD: "Panin Sekuritas",
  GR: "CIMB Sekuritas",
  EP: "MNC Sekuritas",
  MI: "Mirae Asset Sekuritas",

  // Retail
  YP: "Indo Premier Sekuritas",
  XC: "Ajaib Sekuritas",
  XL: "Stockbit Sekuritas",
  KK: "Phillip Sekuritas",
  YU: "CGS International Sekuritas",
  PF: "First Asia Capital",
  RF: "Reliance Sekuritas",
  AG: "Artha Sekuritas",
};

/**
 * Get broker name by code, or return code if not found
 */
export function getBrokerName(code: string): string {
  return BROKER_NAMES[code.toUpperCase()] || code;
}

/**
 * Check if broker is considered "smart money" (foreign or local fund)
 */
export function isSmartMoney(code: string): boolean {
  const category = classifyBroker(code);
  return category === BrokerCategory.FOREIGN || category === BrokerCategory.LOCAL_FUND;
}

/**
 * Get all broker codes for a category
 */
export function getBrokersByCategory(category: BrokerCategory): string[] {
  return BROKER_WHITELIST[category] || [];
}

/**
 * Get category display name in Indonesian
 */
export function getCategoryDisplayName(category: BrokerCategory): string {
  const names: Record<BrokerCategory, string> = {
    FOREIGN: "Asing",
    LOCAL_FUND: "Lokal Fund",
    RETAIL: "Ritel",
    OTHER: "Lainnya",
  };
  return names[category];
}
