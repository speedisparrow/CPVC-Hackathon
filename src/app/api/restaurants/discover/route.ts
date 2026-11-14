import { NextResponse } from "next/server";
import { apiError } from "@/lib/restaurants/http";
import { discoverRestaurants } from "@/lib/restaurants/service";
import { parseSearchInput } from "@/lib/restaurants/validation";

export async function POST(request: Request) {
  try {
    const input = parseSearchInput(await request.json());
    return NextResponse.json(await discoverRestaurants(input));
  } catch (error) {
    return apiError(error);
  }
}

