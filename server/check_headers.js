
const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../data/2024/2024-11.xlsx');
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log('Headers:', data[0]);
} catch (e) {
    console.error('Error:', e.message);
}
