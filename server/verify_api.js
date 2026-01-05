const http = require('http');

http.get('http://localhost:3001/api/staff-list', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', data.substring(0, 200) + '...');
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
