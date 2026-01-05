const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../data/dongdaemun/2024/2024-12.xlsx');
console.log(`Reading: ${filePath}`);

if (require('fs').existsSync(filePath)) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Row count: ${data.length}`);
    if (data.length > 0) {
        console.log('First row keys:', Object.keys(data[0]));
        console.log('First row sample:', data[0]);

        const decDates = data.filter(r => {
            const d = r['날짜'];
            if (typeof d === 'number') return d >= 45627 && d <= 45657;
            if (typeof d === 'string') return d.startsWith('2024-12');
            return false;
        });
        console.log(`Rows in Dec 2024: ${decDates.length}`);

        const totalQty = data.reduce((sum, r) => sum + (r['당일수량'] || 0), 0);
        const workDays = data.filter(r => r['근무여부'] === '근무').length;

        console.log(`Total Quantity: ${totalQty}`);
        console.log(`Work Days: ${workDays}`);

        const allDates = data.map(r => r['날짜']);
        console.log(`Sample dates: ${allDates.slice(0, 5).join(', ')}`);
    } else {
        console.log('File is empty.');
    }
} else {
    console.log('File does not exist.');
}
