"use client";

import { SignalWithStock } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Star,
  ArrowUpDown,
} from "lucide-react";

interface SignalTableProps {
  signals: SignalWithStock[];
  isLoading?: boolean;
}

export function SignalTable({ signals, isLoading }: SignalTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted-foreground)]">
        <p>Tidak ada sinyal untuk tanggal ini.</p>
        <p className="text-sm mt-2">
          Pastikan data sudah di-scrape terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[var(--muted)]/50">
            <th className="text-left py-3 px-4 font-medium">Ticker</th>
            <th className="text-left py-3 px-4 font-medium">Nama</th>
            <th className="text-center py-3 px-4 font-medium">Skor</th>
            <th className="text-right py-3 px-4 font-medium">Asing %</th>
            <th className="text-right py-3 px-4 font-medium">Fund %</th>
            <th className="text-right py-3 px-4 font-medium">Ritel %</th>
            <th className="text-center py-3 px-4 font-medium">Streak</th>
            <th className="text-center py-3 px-4 font-medium">Vol Ratio</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignalRow({ signal }: { signal: SignalWithStock }) {
  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return (
        <Badge variant="success" className="gap-1">
          <Flame className="h-3 w-3" />
          {score}
        </Badge>
      );
    }
    if (score >= 50) {
      return (
        <Badge variant="warning" className="gap-1">
          <Star className="h-3 w-3" />
          {score}
        </Badge>
      );
    }
    return <Badge variant="secondary">{score}</Badge>;
  };

  const formatNet = (value: number) => {
    const isPositive = value > 0;
    const color = isPositive ? "text-green-600" : "text-red-600";
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <span className={`flex items-center justify-end gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        {formatCurrency(Math.abs(value))}
      </span>
    );
  };

  return (
    <tr className="border-b hover:bg-[var(--muted)]/30 transition-colors">
      <td className="py-3 px-4">
        <span className="font-mono font-semibold text-[var(--primary)]">
          {signal.stock.ticker}
        </span>
      </td>
      <td className="py-3 px-4 max-w-[200px] truncate" title={signal.stock.name}>
        {signal.stock.name}
      </td>
      <td className="py-3 px-4 text-center">{getScoreBadge(signal.score)}</td>
      <td className="py-3 px-4">
        <span className="text-green-600 font-semibold">{signal.foreignPct.toFixed(1)}%</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-blue-600 font-semibold">{signal.localFundPct.toFixed(1)}%</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-orange-600">{signal.retailPct.toFixed(1)}%</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={signal.streakDays >= 3 ? "font-bold text-[var(--primary)]" : ""}>
          {signal.streakDays}d
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={signal.volumeRatio >= 1.5 ? "font-bold text-[var(--warning)]" : ""}>
          {signal.volumeRatio.toFixed(1)}x
        </span>
      </td>
    </tr>
  );
}
