const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const filePath = path.join(DATA_DIR, 'holidays.xlsx');

if (!fs.existsSync(filePath)) {
    console.log('File not found');
    process.exit(1);
}

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

const holidays = [];
rows.forEach(row => {
    if (row && row[0]) {
        let dateStr = row[0];
        if (typeof dateStr === 'number') {
            const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
            dateStr = dateObj.toISOString().split('T')[0];
        } else if (typeof dateStr === 'string') {
            dateStr = dateStr.trim();
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            holidays.push(dateStr);
        }
    }
});

console.log(`Total Holidays Found: ${holidays.length}`);
const target = '2025-01-31';
const found = holidays.includes(target);
console.log(`Check for ${target}: ${found ? 'FOUND' : 'NOT FOUND'}`);
if (!found) {
    console.log('First 5 holidays:', holidays.slice(0, 5));
}
