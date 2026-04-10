"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignalTable } from "@/components/SignalTable";
import { SignalWithStock, ApiResponse, ScrapeLog } from "@/types";
import { formatDate, getDateString } from "@/lib/utils";
import {
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  ShoppingCart,
  Calendar,
  Play,
} from "lucide-react";

export default function DashboardPage() {
  const [signals, setSignals] = useState<SignalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(getDateString());
  const [stats, setStats] = useState({
    totalSignals: 0,
    avgScore: 0,
    topForeignPct: 0,
  });
  const [lastScrape, setLastScrape] = useState<ScrapeLog | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/signals?date=${date}&onlySignals=true`);
      const data: ApiResponse<{ signals: SignalWithStock[]; total: number }> =
        await response.json();

      if (data.success && data.data) {
        setSignals(data.data.signals);

        // Calculate stats
        const avgScore =
          data.data.signals.length > 0
            ? Math.round(
                data.data.signals.reduce((sum, s) => sum + s.score, 0) /
                  data.data.signals.length
              )
            : 0;

        const topForeignPct =
          data.data.signals.length > 0
            ? Math.max(...data.data.signals.map((s) => s.foreignPct))
            : 0;

        setStats({
          totalSignals: data.data.signals.length,
          avgScore,
          topForeignPct,
        });
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  const fetchLastScrape = useCallback(async () => {
    try {
      const response = await fetch("/api/scrape?limit=1");
      const data: ApiResponse<ScrapeLog[]> = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        setLastScrape(data.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch scrape log:", error);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    fetchLastScrape();
  }, [fetchSignals, fetchLastScrape]);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await response.json();

      if (data.success) {
        alert("Scraping dimulai! Proses akan berjalan di background.");
        fetchLastScrape();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to start scraping");
    } finally {
      setIsScraping(false);
    }
  };

  const handleScoring = async () => {
    setIsScoring(true);
    try {
      const response = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, sendNotification: true }),
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchSignals();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to run scoring");
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Smart Money Signals</h1>
          <p className="text-[var(--muted-foreground)]">
            Saham dengan akumulasi smart money (asing + fund beli, ritel jual)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSignals}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sinyal</CardTitle>
            <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSignals}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Saham terdeteksi hari ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Skor</CardTitle>
            <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
            <p className="text-xs text-[var(--muted-foreground)]">dari 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Foreign Net</CardTitle>
            <Building2 className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.topForeignPct.toFixed(1)}%
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Partisipasi asing tertinggi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Scrape</CardTitle>
            <ShoppingCart className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastScrape ? lastScrape.status : "-"}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {lastScrape
                ? formatDate(lastScrape.startedAt)
                : "Belum pernah scrape"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleScrape} disabled={isScraping} variant="outline">
          <Play className="h-4 w-4 mr-2" />
          {isScraping ? "Scraping..." : "Manual Scrape"}
        </Button>
        <Button onClick={handleScoring} disabled={isScoring}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isScoring ? "animate-spin" : ""}`} />
          {isScoring ? "Processing..." : "Run Scoring"}
        </Button>
      </div>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Sinyal - {formatDate(date)}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignalTable signals={signals} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
