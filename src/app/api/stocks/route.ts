import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiResponse, Stock, CreateStockInput } from "@/types";

// GET /api/stocks - List all stocks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";
    const search = searchParams.get("search") || "";

    const where: Prisma.StockWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy: { ticker: "asc" },
    });

    return NextResponse.json<ApiResponse<Stock[]>>({
      success: true,
      data: stocks as Stock[],
    });
  } catch (error) {
    console.error("Failed to fetch stocks:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch stocks" },
      { status: 500 }
    );
  }
}

// POST /api/stocks - Add new stock
export async function POST(request: NextRequest) {
  try {
    const body: CreateStockInput = await request.json();

    if (!body.ticker || !body.name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ticker and name are required" },
        { status: 400 }
      );
    }

    // Check if ticker already exists
    const existing = await prisma.stock.findUnique({
      where: { ticker: body.ticker.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Stock already exists" },
        { status: 409 }
      );
    }

    const stock = await prisma.stock.create({
      data: {
        ticker: body.ticker.toUpperCase(),
        name: body.name,
        marketCap: body.marketCap,
        sector: body.sector,
      },
    });

    return NextResponse.json<ApiResponse<Stock>>({
      success: true,
      data: stock as Stock,
      message: "Stock added successfully",
    });
  } catch (error) {
    console.error("Failed to create stock:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create stock" },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks - Bulk delete stocks
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || ids.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No stock IDs provided" },
        { status: 400 }
      );
    }

    await prisma.stock.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Deleted ${ids.length} stocks`,
    });
  } catch (error) {
    console.error("Failed to delete stocks:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to delete stocks" },
      { status: 500 }
    );
  }
}
