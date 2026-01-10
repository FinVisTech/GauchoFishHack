# Gaucho Map - UCSB Find My Classroom

Hackathon-quality indoor navigation for UCSB.

## Features
- 🗺️ **Campus Map**: Full-screen Mapbox integration.
- 🏢 **Indoor Floorplans**: View floorplans for Library, ILP, Phelps, North Hall, Harold Frank.
- 📅 **Schedule Import**: Paste your class list (e.g., "PHELP 3526") to find rooms.
- 🚀 **Fast Search**: Instant building resolution.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Mapbox Token**
   - Get a token from [Mapbox](https://mapbox.com).
   - Create `.env.local` in the root:
     ```bash
     NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
     ```

3. **Generate Floorplan Manifest**
   - Ensure `all_buildings_floor_maps.zip` is in the project root.
   - Run the ingestion script:
     ```bash
     npm run floorplans
     ```
   - This unpacks PNGs to `/public/floorplans` and creates `src/data/floorplans.manifest.json`.

4. **Run Dev Server**
   ```bash
   npm run dev
   ```

## Adding Buildings
1. Add zip file to `all_buildings_floor_maps.zip` (nested).
2. Update `scripts/unpackFloorplans.ts` mapping.
3. Update `src/data/buildings.json` with coordinates.
4. Run `npm run floorplans`.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- customized Mapbox GL JS
- Zustand
