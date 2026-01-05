const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DATA_DIR = path.join(__dirname, '../data');
const DISTRICTS = ['dongdaemun', 'seongbuk', 'songpa'];

function diagnose() {
    console.log('Starting System Diagnosis...');
    console.log('--------------------------------');

    DISTRICTS.forEach(district => {
        const districtDir = path.join(DATA_DIR, district);
        if (!fs.existsSync(districtDir)) {
            console.log(`[${district}] FOLDER MISSING`);
            return;
        }

        console.log(`[${district}] Scanning...`);
        const years = fs.readdirSync(districtDir);

        years.forEach(year => {
            const yearDir = path.join(districtDir, year);
            if (!fs.statSync(yearDir).isDirectory()) return;

            const files = fs.readdirSync(yearDir);
            files.forEach(file => {
                if (!file.endsWith('.xlsx')) return;

                const filePath = path.join(yearDir, file);
                try {
                    const workbook = xlsx.readFile(filePath);
                    const sheetName = workbook.SheetNames[0];
                    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                    if (data.length === 0) {
                        console.log(`  - ${file}: EMPTY`);
                    } else {
                        const firstRow = data[0];
                        const dateVal = firstRow['날짜'];
                        const dateType = typeof dateVal;

                        // Check date range
                        const dates = data.map(r => r['날짜']).filter(d => d !== undefined);
                        const sampleDate = dates[0];

                        console.log(`  - ${file}: ${data.length} rows. DateType: ${dateType}. Sample: ${sampleDate}`);
                    }

                } catch (e) {
                    console.error(`  - ${file}: ERROR READING - ${e.message}`);
                }
            });
        });
    });
    console.log('--------------------------------');
    console.log('Diagnosis Complete.');
}

diagnose();
