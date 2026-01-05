const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/public/staff_list.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    console.log(`Total records: ${data.length}`);
    if (data.length > 0) {
        console.log('First record keys:', Object.keys(data[0]));
        console.log('First record sample:', data[0]);

        // Check for district values
        const districts = [...new Set(data.map(item => item.district))];
        console.log('Districts found:', districts);

        // Check for Korean characters validity
        const name = data[0]['이름'];
        console.log(`Sample Name: ${name}`);
        console.log(`Name char codes: ${name.split('').map(c => c.charCodeAt(0))}`);
    }
} catch (err) {
    console.error('Error reading/parsing file:', err);
}
