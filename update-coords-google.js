const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
let GOOGLE_API_KEY = '';

envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_GOOGLE_API_KEY=')) {
        GOOGLE_API_KEY = trimmed.split('=')[1].replace(/"/g, '');
    }
});

if (!GOOGLE_API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_API_KEY not found in .env.local');
    process.exit(1);
}

// Load buildings.json
const buildingsPath = path.join(__dirname, 'src', 'data', 'buildings.json');
const buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf-8'));

// UCSB center for location bias
const UCSB_CENTER = { lat: 34.414, lng: -119.845 };

// Function to query Google Places API
function queryGooglePlaces(buildingName) {
    return new Promise((resolve, reject) => {
        const query = encodeURIComponent(`${buildingName} UCSB Santa Barbara`);
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${UCSB_CENTER.lat},${UCSB_CENTER.lng}&radius=2000&key=${GOOGLE_API_KEY}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'OK' && json.results && json.results.length > 0) {
                        const place = json.results[0];
                        resolve({
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng,
                            name: place.name
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Process all buildings
async function updateAllCoordinates() {
    console.log(`Processing ${buildings.length} buildings...\n`);

    for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i];
        console.log(`[${i + 1}/${buildings.length}] Querying: ${building.name}`);

        try {
            const result = await queryGooglePlaces(building.name);

            if (result) {
                const oldLat = building.location.lat;
                const oldLng = building.location.lng;

                building.location.lat = result.lat;
                building.location.lng = result.lng;

                console.log(`  ✓ Updated: (${oldLat}, ${oldLng}) → (${result.lat}, ${result.lng})`);
                console.log(`  Google name: "${result.name}"\n`);
            } else {
                console.log(`  ✗ No results found, keeping original coordinates\n`);
            }

            // Rate limiting: wait 200ms between requests
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
            console.error(`  ✗ Error: ${error.message}\n`);
        }
    }

    // Write updated buildings.json
    fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 4));
    console.log(`\n✓ Successfully updated ${buildingsPath}`);
}

updateAllCoordinates().catch(console.error);
