import { NextResponse } from "next/server";
import { apiError } from "@/lib/restaurants/http";
import { sortByWaitTime } from "@/lib/restaurants/service";
import { parseWaitTimeInput } from "@/lib/restaurants/validation";

export async function POST(request: Request) {
  try {
    const input = parseWaitTimeInput(await request.json());
    return NextResponse.json(sortByWaitTime(input.restaurants, input.results));
  } catch (error) {
    return apiError(error);
  }
}
