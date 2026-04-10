import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = "IDR"): string {
  if (currency === "IDR") {
    // Format dalam juta rupiah
    if (Math.abs(value) >= 1000) {
      return `Rp${(value / 1000).toFixed(1)}M`;
    }
    return `Rp${value.toFixed(1)}Jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function parseIDXDate(dateStr: string): Date {
  // IDX uses YYYYMMDD format
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

export function toIDXDateFormat(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function getLastTradingDay(): Date {
  const now = new Date();
  let date = new Date(now);

  // If it's before 16:30, use yesterday
  const hours = now.getHours();
  const minutes = now.getMinutes();
  if (hours < 16 || (hours === 16 && minutes < 30)) {
    date.setDate(date.getDate() - 1);
  }

  // Go back to last weekday
  while (!isWeekday(date)) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}
