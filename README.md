# CPVC-Hackathon

Next.js with TypeScript, App Router, Tailwind CSS, and ESLint.

Run locally: npm run dev
Build: npm run build

## Mock restaurant data

`src/data/restaurants.json` contains 100 restaurant entries and metadata describing the mock fields and name sources. The page imports this file directly.

Each entry has `id`, `name`, `cuisine`, `rating`, `phone`, `distance`, `city`, and `sourceUrl`. `distance` is a made-up number in **miles**, not calculated from a location. Cuisines and ratings are illustrative, phone numbers are fictional 555 numbers, and images remain blank placeholders.

The wizard has three steps: distance, cuisine, and restaurant selection. Step one sets the maximum radius, including custom miles. Step two offers a two-column checklist of unique cuisines derived from the JSON, sorted alphabetically, with blank image placeholders. Select multiple cuisines, or leave all unchecked for any cuisine. Step three shows restaurants matching both `distance <= radius` and any of the selected cuisines.

Use **Change cuisine** to return to step two, then **Change distance** if needed. Continuing from either filter step clears previous restaurant selections. An empty result shows a message and keeps Continue disabled. Finishing restaurant selection fades the wizard to white.

The original four restaurant names are preserved. Additional names come from [Downtown SLO's restaurant directory](https://downtownslo.com/shop-and-dine/dining/restaurants), [Pismo Beach's outdoor dining directory](https://experiencepismobeach.com/restaurants/outdoor-dining/), and its [visitor guide](https://experiencepismobeach.com/wp-content/uploads/2024/04/Pismo_Visitor_Guide_2023_11_16_1a5a3391-589b-4a3f-a0b8-d358e7ad1b14.pdf). This dataset is for a frontend demo, not a verified directory of currently operating businesses.
