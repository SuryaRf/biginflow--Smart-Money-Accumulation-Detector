import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse, Stock, UpdateStockInput } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/stocks/[id] - Get single stock
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        signals: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!stock) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Stock not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Stock>>({
      success: true,
      data: stock as unknown as Stock,
    });
  } catch (error) {
    console.error("Failed to fetch stock:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch stock" },
      { status: 500 }
    );
  }
}

// PATCH /api/stocks/[id] - Update stock
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateStockInput = await request.json();

    const stock = await prisma.stock.update({
      where: { id },
      data: body,
    });

    return NextResponse.json<ApiResponse<Stock>>({
      success: true,
      data: stock as Stock,
      message: "Stock updated successfully",
    });
  } catch (error) {
    console.error("Failed to update stock:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update stock" },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks/[id] - Delete stock
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.stock.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete stock:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to delete stock" },
      { status: 500 }
    );
  }
}
