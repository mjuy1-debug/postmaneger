const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '../data/dongdaemun/2025/2025-12.xlsx');
console.log(`Testing file: ${filePath}`);

if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    process.exit(1);
}

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

console.log(`Total raw rows: ${rawRows.length}`);
// Dump first 5 rows to see structure
for (let k = 0; k < 5; k++) {
    console.log(`Row ${k}:`, JSON.stringify(rawRows[k]));
}

// Find Header Row (Same logic as index.js)
let headerRowIdx = -1;
let colMap = {};

for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (!row) continue;

    // Check for key columns
    const dateIdx = row.findIndex(c => c && (c.includes('배달일자') || c.includes('날짜')));
    const nameIdx = row.findIndex(c => c && (c.includes('배달원명') || c.includes('이름')));

    if (dateIdx !== -1 && nameIdx !== -1) {
        headerRowIdx = i;
        colMap = {
            date: dateIdx,
            name: nameIdx,
            totalQty: row.findIndex(c => c && (c.includes('물량합계') || c.includes('당일수량'))),
            etcQty: row.findIndex(c => c && (c.includes('기타물량') || c.includes('검배수량'))),
            oldUnitPrice: row.findIndex(c => c && c === '단가'),
            workStatus: row.findIndex(c => c && c === '근무여부'),
            rangeStart: -1
        };

        let dataStartRow = i + 1;

        // 1. Check current row for simple format
        if (colMap.totalQty !== -1) {
            colMap.etcQty = row.findIndex(c => c && (c.includes('기타물량') || c.includes('검배수량')));
            for (let c = colMap.totalQty + 1; c < row.length; c++) {
                if (row[c] && row[c].includes('배달물량')) {
                    colMap.rangeStart = c;
                    break;
                }
            }

            // 2. Check next row for complex format (sub-headers)
            if (colMap.rangeStart === -1 && i + 1 < rawRows.length) {
                const nextRow = rawRows[i + 1];
                if (nextRow) {
                    for (let c = colMap.totalQty + 1; c < nextRow.length; c++) {
                        if (nextRow[c] && nextRow[c].includes('배달물량')) {
                            colMap.rangeStart = c;
                            dataStartRow = i + 2; // Data starts after sub-header
                            break;
                        }
                    }
                    if (colMap.etcQty === -1) {
                        colMap.etcQty = nextRow.findIndex(c => c && (c.includes('기타물량') || c.includes('검배수량')));
                    }
                }
            }
        }

        console.log("Header found at index:", i);
        console.log("Data Start Row:", dataStartRow);
        console.log("Column Map:", colMap);

        // Use dataStartRow for the check loop below
        headerRowIdx = dataStartRow - 1;
        break;
    }
}

if (headerRowIdx === -1) {
    console.error("Could not find header row!");
    process.exit(1);
}

// Check first 3 rows
for (let i = headerRowIdx + 1; i < Math.min(rawRows.length, headerRowIdx + 4); i++) {
    const row = rawRows[i];
    if (!row || !row[colMap.date]) continue;

    // Calculate Price
    let calculatedPrice = 0;
    if (colMap.rangeStart !== -1) {
        let revenue = 0;
        let processedQty = 0;
        for (let c = colMap.rangeStart; c < (colMap.etcQty !== -1 ? colMap.etcQty : row.length); c += 2) {
            const q = Number(row[c]) || 0;
            const p = Number(row[c + 1]) || 0;
            if (q > 0) {
                revenue += q * p;
                processedQty += q;
            }
        }
        if (processedQty > 0) calculatedPrice = Math.round(revenue / processedQty);
    }

    console.log(`Row ${i}: Date=${row[colMap.date]}, Name=${row[colMap.name]}, Total=${row[colMap.totalQty]}, Price=${calculatedPrice}`);
}
