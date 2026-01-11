const https = require('https');
const fs = require('fs');
const path = require('path');

// Load buildings.json
const buildingsPath = path.join(__dirname, 'src', 'data', 'buildings.json');
const buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf-8'));

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// UCSB bounding box (slightly expanded for better coverage)
const BBOX = {
    south: 34.405,
    west: -119.875,
    north: 34.425,
    east: -119.835
};

// Function to query Overpass API for a building
function queryOverpass(buildingName) {
    return new Promise((resolve, reject) => {
        const query = `
[bbox:${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}]
[out:json]
[timeout:90]
;
(
  node["name"="${buildingName}"];
  way["name"="${buildingName}"];
  relation["name"="${buildingName}"];
);
out center;
        `;

        const postData = "data=" + encodeURIComponent(query);

        const options = {
            hostname: 'overpass-api.de',
            path: '/api/interpreter',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.elements && json.elements.length > 0) {
                        const element = json.elements[0];

                        // Get coordinates - either direct lat/lon or center
                        let lat, lon;
                        if (element.lat && element.lon) {
                            lat = element.lat;
                            lon = element.lon;
                        } else if (element.center) {
                            lat = element.center.lat;
                            lon = element.center.lon;
                        }

                        if (lat && lon) {
                            resolve({
                                lat,
                                lng: lon,
                                name: element.tags?.name || buildingName,
                                osmType: element.type,
                                osmId: element.id
                            });
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Process all buildings
async function updateAllCoordinates() {
    console.log(`Processing ${buildings.length} buildings with Overpass API (OpenStreetMap)...\n`);

    for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i];

        // Try different name variations
        const namesToTry = [
            building.name,
            building.name.replace(' (UCen)', ''),
            building.name.replace(' (Red Barn)', ''),
            building.name.replace(' (FT)', ''),
            ...building.abbr
        ];

        console.log(`[${i + 1}/${buildings.length}] Querying: ${building.name}`);

        let result = null;
        for (const name of namesToTry) {
            try {
                result = await queryOverpass(name);
                if (result) {
                    console.log(`  ✓ Found with query: "${name}"`);
                    break;
                }
            } catch (error) {
                console.error(`  ✗ Error with "${name}": ${error.message}`);
            }

            // Rate limiting: wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (result) {
            const oldLat = building.location.lat;
            const oldLng = building.location.lng;

            building.location.lat = result.lat;
            building.location.lng = result.lng;

            console.log(`  ✓ Updated: (${oldLat}, ${oldLng}) → (${result.lat}, ${result.lng})`);
            console.log(`  OSM: ${result.osmType}/${result.osmId} - "${result.name}"\n`);
        } else {
            console.log(`  ✗ No OSM data found, keeping original coordinates\n`);
        }
    }

    // Write updated buildings.json
    fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 4));
    console.log(`\n✓ Successfully updated ${buildingsPath}`);
}

updateAllCoordinates().catch(console.error);
