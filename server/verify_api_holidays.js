const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/holidays',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY:', data);
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json) && json.includes('2025-01-31')) {
                console.log('VERIFIED: 2025-01-31 is in the API response.');
            } else {
                console.log('FAILED: 2025-01-31 is NOT in the API response.');
            }
        } catch (e) {
            console.log('FAILED: Invalid JSON');
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
