import { NextResponse } from "next/server";
import { apiError } from "@/lib/restaurants/http";
import { filterRestaurants } from "@/lib/restaurants/service";
import { parseSearchInput } from "@/lib/restaurants/validation";

export async function POST(request: Request) {
  try {
    const input = parseSearchInput(await request.json());
    if (!input.cuisine) {
      return NextResponse.json({ error: "cuisine is required" }, { status: 400 });
    }
    return NextResponse.json(await filterRestaurants(input));
  } catch (error) {
    return apiError(error);
  }
}

