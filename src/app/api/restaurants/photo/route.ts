export async function GET() {
  return new Response(null, { status: 404 });
}

/* Photo loading is disabled until an image source is chosen.
import { fetchRestaurantPhoto, isPoiDetailsId } from "@/lib/restaurants/photos";

export async function GET(request: Request) {
  const detailsId = new URL(request.url).searchParams.get("detailsId");
  if (!isPoiDetailsId(detailsId)) {
    return new Response("Invalid photo reference", { status: 400 });
  }

  const photo = await fetchRestaurantPhoto(detailsId);
  if (!photo) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(photo.bytes, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
*/
