const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
// Load environment variables from .env.local manually
try {
    const content = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Error loading .env.local', e);
}

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (!token) {
    console.error('No token found');
    process.exit(1);
}

const buildings = [
    "Santa Rosa Hall UCSB",
    "Santa Cruz Hall UCSB",
    "Anacapa Hall UCSB",
    "San Nicolas Hall UCSB",
    "San Miguel Hall UCSB"
];

const UCSB_CENTER = [-119.848946, 34.413963]; // Proximity bias

async function geocode(query) {
    return new Promise((resolve, reject) => {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&proximity=${UCSB_CENTER.join(',')}&limit=1`;

        https.get(endpoint, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    for (const b of buildings) {
        try {
            const data = await geocode(b);
            if (data.features && data.features.length > 0) {
                const f = data.features[0];
                console.log(`${b}: [${f.center[1]}, ${f.center[0]}] (Lat, Lng) - ${f.text}`);
            } else {
                console.log(`${b}: No results`);
            }
        } catch (e) {
            console.error(`Error for ${b}:`, e);
        }
    }
}

run();
