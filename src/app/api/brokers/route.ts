import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ApiResponse, Broker, BrokerCategory } from "@/types";
import { BROKER_WHITELIST, getBrokerName } from "@/lib/broker-classifier";

// GET /api/brokers - List all brokers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as BrokerCategory | null;

    const where: Prisma.BrokerWhereInput = {};

    if (category) {
      where.category = category;
    }

    const brokers = await prisma.broker.findMany({
      where,
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    return NextResponse.json<ApiResponse<Broker[]>>({
      success: true,
      data: brokers as Broker[],
    });
  } catch (error) {
    console.error("Failed to fetch brokers:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch brokers" },
      { status: 500 }
    );
  }
}

// POST /api/brokers - Update broker category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, category } = body as { code: string; category: BrokerCategory };

    if (!code || !category) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Code and category are required" },
        { status: 400 }
      );
    }

    const validCategories: BrokerCategory[] = ["FOREIGN", "LOCAL_FUND", "RETAIL", "OTHER"];
    if (!validCategories.includes(category)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid category" },
        { status: 400 }
      );
    }

    const broker = await prisma.broker.upsert({
      where: { code: code.toUpperCase() },
      create: {
        code: code.toUpperCase(),
        name: getBrokerName(code),
        category,
      },
      update: {
        category,
      },
    });

    return NextResponse.json<ApiResponse<Broker>>({
      success: true,
      data: broker as Broker,
      message: "Broker updated successfully",
    });
  } catch (error) {
    console.error("Failed to update broker:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update broker" },
      { status: 500 }
    );
  }
}

// GET /api/brokers/whitelist - Get default whitelist
export async function OPTIONS() {
  return NextResponse.json<ApiResponse>({
    success: true,
    data: BROKER_WHITELIST,
  });
}
