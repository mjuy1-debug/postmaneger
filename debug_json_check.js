const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'client/dist/data.json');
const outputPath = path.join(__dirname, 'debug_output.txt');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    let output = '';
    output += `Total records: ${data.length}\n`;

    // Filter for Dec 2025
    const decData = data.filter(d => d['날짜'] && d['날짜'].startsWith('2025-12'));
    output += `Total records for Dec 2025: ${decData.length}\n`;

    // Count by district
    const districtCounts = {};
    decData.forEach(d => {
        const dist = d['지점'] || 'undefined';
        districtCounts[dist] = (districtCounts[dist] || 0) + 1;
    });

    output += 'District counts for Dec 2025:\n';
    output += JSON.stringify(districtCounts, null, 2);
    output += '\n';

    if (decData.length > 0) {
        output += 'Sample Dec Record:\n';
        output += JSON.stringify(decData[0], null, 2);
    } else {
        output += 'No Dec 2025 data found.\n';
    }

    // Check distinct districts in WHOLE file
    const allDistricts = {};
    data.forEach(d => {
        const dist = d['지점'] || 'undefined';
        allDistricts[dist] = (allDistricts[dist] || 0) + 1;
    });
    output += '\nAll Districts Counts:\n';
    output += JSON.stringify(allDistricts, null, 2);

    fs.writeFileSync(outputPath, output);
    console.log('Debug info written to debug_output.txt');

} catch (err) {
    console.error('Error:', err);
}
