import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { PNG } from 'pngjs';

const ZIP_FILE = 'all_buildings_floor_maps.zip';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'floorplans');
const MANIFEST_FILE = path.join(process.cwd(), 'src', 'data', 'floorplans.manifest.json');

// Mappings from Zip Name (basename) to Building ID
const BUILDING_ID_MAP: Record<string, string> = {
  'Library': 'ucsb-library',
  'ILP': 'ilp',
  'NorthHall': 'north-hall',
  'PhelpsHall': 'phelps-hall',
  'HaroldFrankHall': 'harold-frank-hall',
};

interface FloorData {
  path: string;
  w: number;
  h: number;
}

interface BuildingManifest {
  sourceZip: string;
  floors: Record<string, FloorData>;
  skipped: string[];
}

type Manifest = Record<string, BuildingManifest>;

async function main() {
  console.log('📦 Starting Floorplan Unpacking...');

  if (!fs.existsSync(ZIP_FILE)) {
    console.error(`❌ Error: ${ZIP_FILE} not found in root.`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest: Manifest = {};
  const mainZip = new AdmZip(ZIP_FILE);
  const mainEntries = mainZip.getEntries();

  for (const entry of mainEntries) {
    if (entry.entryName.endsWith('.zip')) {
      const baseName = path.basename(entry.entryName, '.zip');
      const buildingId = BUILDING_ID_MAP[baseName];

      if (!buildingId) {
        console.warn(`⚠️  Skipping unknown building zip: ${baseName}`);
        continue;
      }

      console.log(`Processing ${baseName} -> ${buildingId}...`);
      
      // Create building dir
      const buildingDir = path.join(OUTPUT_DIR, buildingId);
      fs.mkdirSync(buildingDir, { recursive: true });

      // Unzip nested zip buffer
      const nestedZipBuffer = entry.getData();
      const nestedZip = new AdmZip(nestedZipBuffer);
      const nestedEntries = nestedZip.getEntries();

      const buildingManifest: BuildingManifest = {
        sourceZip: entry.entryName,
        floors: {},
        skipped: []
      };

      for (const fileEntry of nestedEntries) {
        if (fileEntry.isDirectory || !fileEntry.entryName.endsWith('.png')) continue;

        const fileName = path.basename(fileEntry.entryName); 
        // Expected format: "1.png", "2.png"
        const floorName = fileName.replace('.png', '');
        
        // Validate PNG
        const buffer = fileEntry.getData();
        if (buffer.length === 0) {
          console.warn(`   Start 0 byte file: ${fileName}`);
          buildingManifest.skipped.push(floorName);
          continue;
        }

        try {
          const dimensions = await parsePngDimensions(buffer);
          
          // Write to file
          fs.writeFileSync(path.join(buildingDir, fileName), buffer);

          buildingManifest.floors[floorName] = {
            path: `/floorplans/${buildingId}/${fileName}`,
            w: dimensions.width,
            h: dimensions.height
          };
          console.log(`   ✅ Loaded Floor ${floorName} (${dimensions.width}x${dimensions.height})`);

        } catch (err) {
          console.error(`   ❌ Invalid PNG: ${fileName}`, err);
          buildingManifest.skipped.push(floorName);
        }
      }

      manifest[buildingId] = buildingManifest;
    }
  }

  // Write Manifest
  const dataDir = path.dirname(MANIFEST_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\n🎉 Done! Manifest written to ${MANIFEST_FILE}`);
}

function parsePngDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    png.parse(buffer, (error, data) => {
      if (error) reject(error);
      else resolve({ width: data.width, height: data.height });
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
