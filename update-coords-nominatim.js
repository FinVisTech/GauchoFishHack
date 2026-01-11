const https = require('https');
const fs = require('fs');
const path = require('path');

// Load buildings.json
const buildingsPath = path.join(__dirname, 'src', 'data', 'buildings.json');
const buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf-8'));

// Function to query Nominatim (OSM's geocoding service)
function queryNominatim(buildingName) {
    return new Promise((resolve, reject) => {
        // Nominatim search API
        const query = encodeURIComponent(`${buildingName}, UCSB, Santa Barbara`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&bounded=1&viewbox=-119.875,34.425,-119.835,34.405`;

        const options = {
            hostname: 'nominatim.openstreetmap.org',
            path: `/search?q=${query}&format=json&limit=1&bounded=1&viewbox=-119.875,34.425,-119.835,34.405`,
            method: 'GET',
            headers: {
                'User-Agent': 'GauchoFishHack/1.0' // Nominatim requires a User-Agent
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.length > 0) {
                        const result = json[0];
                        resolve({
                            lat: parseFloat(result.lat),
                            lng: parseFloat(result.lon),
                            name: result.display_name,
                            osmType: result.osm_type,
                            osmId: result.osm_id
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
    console.log(`Processing ${buildings.length} buildings with Nominatim (OSM Geocoding)...\n`);

    for (let i = 0; i < buildings.length; i++) {
        const building = buildings[i];

        // Try different name variations
        const namesToTry = [
            building.name,
            building.name.replace(' (UCen)', ''),
            building.name.replace(' (Red Barn)', ''),
            building.name.replace(' (FT)', ''),
            building.name.split(' ')[0] // Try just first word
        ];

        console.log(`[${i + 1}/${buildings.length}] Querying: ${building.name}`);

        let result = null;
        for (const name of namesToTry) {
            try {
                result = await queryNominatim(name);
                if (result) {
                    console.log(`  ✓ Found with query: "${name}"`);
                    break;
                }
            } catch (error) {
                console.error(`  ✗ Error with "${name}": ${error.message}`);
            }

            // Rate limiting: Nominatim requires 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (result) {
            const oldLat = building.location.lat;
            const oldLng = building.location.lng;

            building.location.lat = result.lat;
            building.location.lng = result.lng;

            console.log(`  ✓ Updated: (${oldLat}, ${oldLng}) → (${result.lat}, ${result.lng})`);
            console.log(`  OSM: ${result.osmType}/${result.osmId}\n`);
        } else {
            console.log(`  ✗ No OSM data found, keeping original coordinates\n`);
        }
    }

    // Write updated buildings.json
    fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 4));
    console.log(`\n✓ Successfully updated ${buildingsPath}`);
}

updateAllCoordinates().catch(console.error);
