const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env
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
const startLat = 34.409;
const endLat = 34.413;
const startLng = -119.847;
const endLng = -119.840;
const step = 0.0002; // Very fine grid

async function reverseGeocode(lng, lat) {
    return new Promise((resolve) => {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=poi`;
        https.get(endpoint, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch { resolve({}); }
            });
        }).on('error', () => resolve({}));
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("Scanning...");
    for (let lat = startLat; lat <= endLat; lat += step) {
        for (let lng = startLng; lng <= endLng; lng += step) {
            const data = await reverseGeocode(lng, lat);
            if (data.features) {
                for (const f of data.features) {
                    if (f.text.includes("Hall") || f.text.includes("Anacapa") || f.text.includes("Santa") || f.text.includes("Miguel") || f.text.includes("Nicolas")) {
                        console.log(`Found: ${f.text} at [${lat}, ${lng}] (Center: ${f.center})`);
                    }
                }
            }
            await delay(50); // Be nice to API
        }
    }
}

run();
