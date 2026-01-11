const https = require('https');
const fs = require('fs');
const path = require('path');

// Load buildings.json
const buildingsPath = path.join(__dirname, 'src', 'data', 'buildings.json');
const buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf-8'));

// UCSB bounding box
const BBOX = {
    south: 34.405,
    west: -119.875,
    north: 34.425,
    east: -119.835
};

// Function to fetch OSM data for the bounding box
function fetchOSMData() {
    return new Promise((resolve, reject) => {
        // OSM API v0.6 map call: /api/0.6/map?bbox=left,bottom,right,top
        const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`;

        console.log('Fetching OSM data for UCSB area...');
        console.log('URL:', url);
        console.log('This may take a moment...\n');

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    return;
                }

                // Parse XML response
                try {
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Simple XML parser to extract nodes and ways with names
function parseOSMXML(xml) {
    const buildingData = new Map();

    // Extract nodes with names
    const nodeRegex = /<node[^>]*id="(\d+)"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>[\s\S]*?<tag k="name" v="([^"]+)"\/>/g;
    let match;

    while ((match = nodeRegex.exec(xml)) !== null) {
        const [, id, lat, lon, name] = match;
        buildingData.set(name, {
            type: 'node',
            id,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
            name
        });
    }

    // Extract ways with names and calculate center
    const wayRegex = /<way[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;

    while ((match = wayRegex.exec(xml)) !== null) {
        const [, wayId, wayContent] = match;

        // Check if way has a name tag
        const nameMatch = wayContent.match(/<tag k="name" v="([^"]+)"\/>/);
        if (!nameMatch) continue;

        const name = nameMatch[1];

        // Extract node references
        const nodeRefs = [];
        const ndRegex = /<nd ref="(\d+)"\/>/g;
        let ndMatch;

        while ((ndMatch = ndRegex.exec(wayContent)) !== null) {
            nodeRefs.push(ndMatch[1]);
        }

        // Find coordinates for these nodes
        const coords = [];
        nodeRefs.forEach(nodeId => {
            const nodeMatch = xml.match(new RegExp(`<node[^>]*id="${nodeId}"[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"`));
            if (nodeMatch) {
                coords.push({
                    lat: parseFloat(nodeMatch[1]),
                    lng: parseFloat(nodeMatch[2])
                });
            }
        });

        if (coords.length > 0) {
            // Calculate center
            const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
            const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

            buildingData.set(name, {
                type: 'way',
                id: wayId,
                lat: avgLat,
                lng: avgLng,
                name
            });
        }
    }

    return buildingData;
}

// Process all buildings
async function updateAllCoordinates() {
    console.log(`Processing ${buildings.length} buildings with OSM API v0.6...\n`);

    try {
        const xmlData = await fetchOSMData();
        const osmBuildings = parseOSMXML(xmlData);

        console.log(`Found ${osmBuildings.size} named features in OSM data\n`);

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

            console.log(`[${i + 1}/${buildings.length}] Searching: ${building.name}`);

            let found = false;
            for (const name of namesToTry) {
                if (osmBuildings.has(name)) {
                    const osmData = osmBuildings.get(name);
                    const oldLat = building.location.lat;
                    const oldLng = building.location.lng;

                    building.location.lat = osmData.lat;
                    building.location.lng = osmData.lng;

                    console.log(`  ✓ Found: "${name}"`);
                    console.log(`  ✓ Updated: (${oldLat}, ${oldLng}) → (${osmData.lat}, ${osmData.lng})`);
                    console.log(`  OSM: ${osmData.type}/${osmData.id}\n`);
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.log(`  ✗ No OSM data found, keeping original coordinates\n`);
            }
        }

        // Write updated buildings.json
        fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 4));
        console.log(`\n✓ Successfully updated ${buildingsPath}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

updateAllCoordinates();
