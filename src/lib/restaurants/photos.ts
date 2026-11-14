type PoiDetailsReference = { id?: string };

export type PoiPhotoReferences = PoiDetailsReference | PoiDetailsReference[];

export function isPoiDetailsId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_+/=.:-]{1,512}$/.test(value);
}

export function restaurantPhotoUrl(
  references: PoiPhotoReferences | undefined,
): string | null {
  const reference = Array.isArray(references)
    ? references.find((item) => isPoiDetailsId(item?.id))
    : references;

  return isPoiDetailsId(reference?.id)
    ? `/api/restaurants/photo?detailsId=${encodeURIComponent(reference.id)}`
    : null;
}

export async function fetchRestaurantPhoto(
  detailsId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key || !isPoiDetailsId(detailsId)) return null;

  try {
    const detailsUrl = new URL(
      "https://api.tomtom.com/search/2/poiDetails.json",
    );
    detailsUrl.searchParams.set("key", key);
    detailsUrl.searchParams.set("id", detailsId);

    const detailsResponse = await fetch(detailsUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!detailsResponse.ok) return null;

    const details = (await detailsResponse.json()) as {
      result?: { photos?: Array<{ id?: string }> };
    };
    const photos = details.result?.photos;
    const photoId = Array.isArray(photos)
      ? photos.find((photo) => isPoiDetailsId(photo?.id))?.id
      : undefined;
    if (!photoId) return null;

    const photoUrl = new URL("https://api.tomtom.com/search/2/poiPhoto");
    photoUrl.searchParams.set("key", key);
    photoUrl.searchParams.set("id", photoId);
    photoUrl.searchParams.set("width", "160");
    photoUrl.searchParams.set("height", "160");

    const photoResponse = await fetch(photoUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!photoResponse.ok) return null;

    const contentType = photoResponse.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (
      !contentType ||
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        contentType,
      )
    ) {
      return null;
    }

    const bytes = await photoResponse.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 5_000_000) return null;

    return { bytes, contentType };
  } catch {
    return null;
  }
}
