"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApiResponse, ScrapeLog } from "@/types";
import { formatDateTime } from "@/lib/utils";
import {
  Send,
  Bell,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [scrapeLogs, setScrapeLogs] = useState<ScrapeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchScrapeLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data: ApiResponse<Record<string, string>> = await response.json();

      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScrapeLogs = async () => {
    try {
      const response = await fetch("/api/scrape?limit=10");
      const data: ApiResponse<ScrapeLog[]> = await response.json();

      if (data.success && data.data) {
        setScrapeLogs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scrape logs:", error);
    }
  };

  const testTelegram = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/settings/test-telegram", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        alert("Test berhasil! Cek Telegram kamu.");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to test Telegram connection");
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "RUNNING":
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--muted-foreground)]">
          Konfigurasi sistem dan monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Telegram Notification
            </CardTitle>
            <CardDescription>
              Konfigurasi bot Telegram untuk menerima alert harian
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bot Token</label>
              <div className="flex gap-2">
                <Input
                  value={settings.telegram_bot_token || ""}
                  placeholder="Configured via .env"
                  disabled
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Set TELEGRAM_BOT_TOKEN di file .env
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Chat ID</label>
              <Input
                value={settings.telegram_chat_id || ""}
                placeholder="Configured via .env"
                disabled
                className="font-mono text-sm"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Set TELEGRAM_CHAT_ID di file .env
              </p>
            </div>

            <Button
              onClick={testTelegram}
              disabled={isTesting}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Cara Setup Telegram Bot:</h4>
              <ol className="text-sm text-[var(--muted-foreground)] space-y-1 list-decimal list-inside">
                <li>Buka @BotFather di Telegram</li>
                <li>Kirim /newbot dan ikuti instruksi</li>
                <li>Copy token yang diberikan</li>
                <li>Kirim pesan ke bot kamu</li>
                <li>Buka api.telegram.org/bot[TOKEN]/getUpdates</li>
                <li>Cari chat id di response</li>
                <li>Masukkan ke file .env</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Scheduler Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduler
            </CardTitle>
            <CardDescription>
              Jadwal otomatis scraping dan scoring harian
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[var(--muted)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Daily Job</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Setiap hari Senin-Jumat pukul 16:30 WIB
              </p>
              <ul className="text-sm text-[var(--muted-foreground)] mt-2 space-y-1">
                <li>1. Scrape data broker dari IDX</li>
                <li>2. Jalankan scoring engine</li>
                <li>3. Kirim Telegram alert</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Menjalankan Scheduler:</h4>
              <div className="bg-[var(--muted)] p-3 rounded-lg font-mono text-sm">
                npm run scheduler
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Jalankan di terminal terpisah atau gunakan PM2 untuk production
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrape Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Scrape History
          </CardTitle>
          <CardDescription>
            Log 10 proses scraping terakhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scrapeLogs.length === 0 ? (
            <p className="text-center py-8 text-[var(--muted-foreground)]">
              Belum ada history scraping
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[var(--muted)]/50">
                    <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-center py-3 px-4 font-medium">
                      Processed
                    </th>
                    <th className="text-center py-3 px-4 font-medium">Failed</th>
                    <th className="text-left py-3 px-4 font-medium">Waktu</th>
                    <th className="text-left py-3 px-4 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {scrapeLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-[var(--muted)]/30"
                    >
                      <td className="py-3 px-4">
                        {new Date(log.date).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.stocksProcessed}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {log.stocksFailed > 0 ? (
                          <span className="text-[var(--destructive)]">
                            {log.stocksFailed}
                          </span>
                        ) : (
                          log.stocksFailed
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {formatDateTime(log.startedAt)}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)] max-w-[200px] truncate">
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
