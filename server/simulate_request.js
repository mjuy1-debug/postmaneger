const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Mock request parameters
const district = 'dongdaemun';
const startDate = '2024-12-01';
const endDate = '2024-12-31';

const DATA_DIR = path.join(__dirname, '../data');

function getMonthsInRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        months.push({ year, month });
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

function simulate() {
    console.log(`[SIM] Request: District=${district}, Range=${startDate}~${endDate}`);

    const districtDir = path.join(DATA_DIR, district);
    if (!fs.existsSync(districtDir)) {
        console.log(`[SIM] District folder not found: ${districtDir}`);
        return;
    }

    const months = getMonthsInRange(startDate, endDate);
    console.log(`[SIM] Months identified:`, months);

    let combinedData = [];

    months.forEach(({ year, month }) => {
        const filePath = path.join(districtDir, String(year), `${year}-${month}.xlsx`);
        console.log(`[SIM] Checking file: ${filePath}`);

        if (fs.existsSync(filePath)) {
            try {
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
                console.log(`[SIM] Read ${rawData.length} rows from ${filePath}`);

                // Inspect first row date type
                if (rawData.length > 0) {
                    console.log(`[SIM] Sample Date Type: ${typeof rawData[0]['날짜']} Value: ${rawData[0]['날짜']}`);
                }

                combinedData = [...combinedData, ...rawData];
            } catch (e) {
                console.error(`[SIM] Error reading file: ${e.message}`);
            }
        } else {
            console.log(`[SIM] File not found: ${filePath}`);
        }
    });

    const finalData = combinedData.filter(row => {
        let rowDate = row['날짜'];
        if (!rowDate) return false;

        if (typeof rowDate === 'number') {
            const dateObj = new Date(Math.round((rowDate - 25569) * 86400 * 1000));
            rowDate = dateObj.toISOString().split('T')[0];
        }

        if (typeof rowDate === 'string') {
            rowDate = rowDate.trim();
        }

        const match = rowDate >= startDate && rowDate <= endDate;
        if (!match && combinedData.indexOf(row) < 5) {
            console.log(`[SIM] Filter Fail: ${rowDate} is not between ${startDate} and ${endDate}`);
        }
        return match;
    });

    console.log(`[SIM] Final Data Count: ${finalData.length}`);
    if (finalData.length > 0) {
        console.log(`[SIM] First item:`, finalData[0]);
    }
}

simulate();
