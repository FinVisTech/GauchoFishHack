const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function testGeocoding(query, label) {
    const token = 'pk.eyJ1IjoibHd1bmRlcmxpbmciLCJhIjoiY21rOHRpZnFnMWllZzNlb3ZseDhwbzMzMyJ9.8CDkAZn_jjvw7yM2vseq7Q';
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;

    // Bias to UCSB
    const params = new URLSearchParams({
        access_token: token,
        bbox: '-119.90,34.40,-119.80,34.45',
        proximity: '-119.845,34.414',
        limit: '1'
    });

    try {
        const url = `${endpoint}?${params}`;
        const data = await fetchJson(url);

        if (data.features && data.features.length > 0) {
            const f = data.features[0];
            console.log(`✅ ${label || query}: ${f.text} -> [${f.center[1]}, ${f.center[0]}]`);
        } else {
            console.log(`❌ ${label || query}: Not found`);
        }
    } catch (error) {
        console.error('Exception:', error);
    }
}

(async () => {
    console.log('--- Dorms ---');
    await testGeocoding('Anacapa Hall UCSB', 'Anacapa');
    await testGeocoding('Santa Cruz Hall UCSB', 'Santa Cruz');
    await testGeocoding('Santa Rosa Hall UCSB', 'Santa Rosa');
    await testGeocoding('San Miguel Hall UCSB', 'San Miguel');
    await testGeocoding('San Nicolas Hall UCSB', 'San Nicolas');
    await testGeocoding('San Rafael Hall UCSB', 'San Rafael');
    await testGeocoding('Manzanita Village UCSB', 'Manzanita');
    await testGeocoding('Santa Catalina Residence Hall', 'Santa Catalina');
    await testGeocoding('Tropicana Gardens', 'Tropicana');

    console.log('\n--- Others ---');
    await testGeocoding('Kerr Hall UCSB', 'Kerr Hall');
    await testGeocoding('Arts Library UCSB', 'Arts Library');
    await testGeocoding('Student Resource Building UCSB', 'SRB');
})();
