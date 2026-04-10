"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Stock, ApiResponse } from "@/types";
import { Plus, Trash2, Search, RefreshCw, Upload } from "lucide-react";

export default function WatchlistPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState({ ticker: "", name: "", sector: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());

  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stocks?active=all&search=${search}`);
      const data: ApiResponse<Stock[]> = await response.json();

      if (data.success && data.data) {
        setStocks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.ticker || !newStock.name) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStock),
      });
      const data = await response.json();

      if (data.success) {
        setNewStock({ ticker: "", name: "", sector: "" });
        setShowAddForm(false);
        fetchStocks();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to add stock");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStock = async (id: string) => {
    if (!confirm("Yakin ingin menghapus saham ini?")) return;

    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        fetchStocks();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to delete stock");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStocks.size === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedStocks.size} saham?`)) return;

    try {
      const response = await fetch("/api/stocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedStocks) }),
      });
      const data = await response.json();

      if (data.success) {
        setSelectedStocks(new Set());
        fetchStocks();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to delete stocks");
    }
  };

  const toggleStockSelection = (id: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStocks(newSelected);
  };

  const handleToggleActive = async (stock: Stock) => {
    try {
      const response = await fetch(`/api/stocks/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !stock.isActive }),
      });
      const data = await response.json();

      if (data.success) {
        fetchStocks();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to update stock");
    }
  };

  const handleBulkImport = async () => {
    const input = prompt(
      "Masukkan daftar ticker (pisahkan dengan koma):\nContoh: BBCA, BMRI, TLKM"
    );
    if (!input) return;

    const tickers = input
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t);

    for (const ticker of tickers) {
      try {
        await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, name: ticker }),
        });
      } catch (error) {
        console.error(`Failed to add ${ticker}`);
      }
    }

    fetchStocks();
    alert(`Import selesai. ${tickers.length} ticker diproses.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-[var(--muted-foreground)]">
            Kelola daftar saham mid-cap yang akan di-track
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Saham
          </Button>
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Saham Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStock} className="flex flex-wrap gap-4">
              <Input
                placeholder="Ticker (e.g., BBCA)"
                value={newStock.ticker}
                onChange={(e) =>
                  setNewStock({ ...newStock, ticker: e.target.value.toUpperCase() })
                }
                className="w-32"
                required
              />
              <Input
                placeholder="Nama Perusahaan"
                value={newStock.name}
                onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                className="flex-1 min-w-[200px]"
                required
              />
              <Input
                placeholder="Sektor (optional)"
                value={newStock.sector}
                onChange={(e) =>
                  setNewStock({ ...newStock, sector: e.target.value })
                }
                className="w-48"
              />
              <Button type="submit" disabled={isAdding}>
                {isAdding ? "Adding..." : "Tambah"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Batal
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Cari ticker atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchStocks}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {selectedStocks.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus ({selectedStocks.size})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-[var(--muted-foreground)]">
        Total: {stocks.length} saham |
        Aktif: {stocks.filter((s) => s.isActive).length} |
        Non-aktif: {stocks.filter((s) => !s.isActive).length}
      </div>

      {/* Stocks Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p>Belum ada saham di watchlist.</p>
              <p className="text-sm mt-2">
                Klik &quot;Tambah Saham&quot; untuk menambahkan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[var(--muted)]/50">
                    <th className="w-12 py-3 px-4">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStocks(new Set(stocks.map((s) => s.id)));
                          } else {
                            setSelectedStocks(new Set());
                          }
                        }}
                        checked={
                          selectedStocks.size === stocks.length && stocks.length > 0
                        }
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Ticker</th>
                    <th className="text-left py-3 px-4 font-medium">Nama</th>
                    <th className="text-left py-3 px-4 font-medium">Sektor</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className="border-b hover:bg-[var(--muted)]/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedStocks.has(stock.id)}
                          onChange={() => toggleStockSelection(stock.id)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-[var(--primary)]">
                          {stock.ticker}
                        </span>
                      </td>
                      <td className="py-3 px-4">{stock.name}</td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {stock.sector || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={stock.isActive ? "success" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(stock)}
                        >
                          {stock.isActive ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStock(stock.id)}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
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
