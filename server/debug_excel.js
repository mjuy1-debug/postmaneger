const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DISTRICTS = ['seongbuk', 'songpa', 'dongdaemun'];

DISTRICTS.forEach(district => {
    console.log(`\n--- Checking District: ${district} ---`);
    const districtDir = path.join(DATA_DIR, district);

    if (!fs.existsSync(districtDir)) {
        console.log(`Directory not found: ${districtDir}`);
        return;
    }

    // Check 2024 and 2025
    ['2024', '2025'].forEach(year => {
        const yearDir = path.join(districtDir, year);
        if (fs.existsSync(yearDir)) {
            const files = fs.readdirSync(yearDir);
            console.log(`Year ${year} Files:`, files);

            files.forEach(file => {
                if (file.endsWith('.xlsx')) {
                    try {
                        const filePath = path.join(yearDir, file);
                        console.log(`Reading ${file}...`);
                        const workbook = xlsx.readFile(filePath);
                        const sheetName = workbook.SheetNames[0];
                        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                        if (data.length > 0) {
                            console.log(`[PASS] ${file}: ${data.length} rows`);
                            console.log(`Sample Keys:`, Object.keys(data[0]));
                            console.log(`Sample Row 0:`, JSON.stringify(data[0]));

                            // Check dates
                            const invalidDates = data.filter(r => !r['날짜']).length;
                            console.log(`Rows with missing '날짜': ${invalidDates}`);
                        } else {
                            console.log(`[WARN] ${file}: Empty file`);
                        }
                    } catch (err) {
                        console.error(`[FAIL] Error reading ${file}:`, err.message);
                    }
                }
            });
        }
    });
});
