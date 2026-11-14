"use client";

import Image from "next/image";
import { useState } from "react";

export function RestaurantImage({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span className="restaurant-image">
      {photoUrl && failedUrl !== photoUrl ? (
        <Image
          className="restaurant-photo"
          src={photoUrl}
          alt={`Photo of ${name}`}
          width={160}
          height={160}
          unoptimized
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : null}
    </span>
  );
}
