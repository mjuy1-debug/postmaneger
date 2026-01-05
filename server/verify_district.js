const http = require('http');

// Verify Dongdaemun (Default)
http.get('http://localhost:3001/api/staff-list?district=dongdaemun', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('Dongdaemun Data:', data.substring(0, 100)));
});

// Verify Seongbuk
http.get('http://localhost:3001/api/staff-list?district=seongbuk', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('Seongbuk Data:', data.substring(0, 100)));
});
