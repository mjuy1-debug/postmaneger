const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(__dirname, '../client/public/data.json');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            if (file.endsWith('.xlsx')) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

console.log('Starting data export for Netlify...');

try {
    const excelFiles = getAllFiles(DATA_DIR);
    console.log(`Found ${excelFiles.length} Excel files.`);

    let combinedData = [];

    excelFiles.forEach(filePath => {
        console.log(`Processing: ${filePath}`);
        try {

            // Extract District from path (assuming data/DISTRICT/YEAR/file.xlsx)
            // Adjust logic if structure is different
            const relativePath = path.relative(DATA_DIR, filePath);
            const pathParts = relativePath.split(path.sep);
            const district = pathParts[0]; // First folder is district

            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];

            // Reuse parsing logic from index.js
            const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

            let headerRowIdx = -1;
            let colMap = {};
            let dataStartRow = 1;

            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                const row = rawRows[i];
                if (!row) continue;

                const dateIdx = row.findIndex(c => c && (c.includes('배달일자') || c.includes('날짜')));
                const nameIdx = row.findIndex(c => c && (c.includes('배달원명') || c.includes('이름')));

                if (dateIdx !== -1 && nameIdx !== -1) {
                    headerRowIdx = i;
                    colMap = {
                        date: dateIdx,
                        name: nameIdx,
                        totalQty: row.findIndex(c => c && (c.includes('물량합계') || c.includes('당일수량'))),
                        etcQty: (() => {
                            const idx1 = row.findIndex(c => c && (c.includes('검배수량') || c.includes('겸배수량')));
                            return idx1 !== -1 ? idx1 : row.findIndex(c => c && c.includes('기타물량'));
                        })(),
                        oldUnitPrice: row.findIndex(c => c && c === '단가'),
                        workStatus: row.findIndex(c => c && c === '근무여부'),
                        rangeStart: -1
                    };

                    dataStartRow = i + 1;

                    if (colMap.totalQty !== -1) {
                        for (let c = colMap.totalQty + 1; c < row.length; c++) {
                            if (row[c] && row[c].includes('배달물량')) {
                                colMap.rangeStart = c;
                                break;
                            }
                        }
                        if (colMap.rangeStart === -1 && i + 1 < rawRows.length) {
                            const nextRow = rawRows[i + 1];
                            if (nextRow) {
                                for (let c = colMap.totalQty + 1; c < nextRow.length; c++) {
                                    if (nextRow[c] && nextRow[c].includes('배달물량')) {
                                        colMap.rangeStart = c;
                                        dataStartRow = i + 2;
                                        break;
                                    }
                                }
                                if (colMap.etcQty === -1) {
                                    colMap.etcQty = (() => {
                                        const idx1 = nextRow.findIndex(c => c && (c.includes('검배수량') || c.includes('겸배수량')));
                                        return idx1 !== -1 ? idx1 : nextRow.findIndex(c => c && c.includes('기타물량'));
                                    })();
                                }
                            }
                        }
                    }
                    break;
                }
            }

            if (headerRowIdx !== -1) {
                const pageData = [];
                for (let i = dataStartRow; i < rawRows.length; i++) {
                    const row = rawRows[i];
                    if (!row || !row[colMap.date]) continue;

                    let rowDate = row[colMap.date];
                    if (typeof rowDate === 'number') {
                        const dateObj = new Date(Math.round((rowDate - 25569) * 86400 * 1000));
                        rowDate = dateObj.toISOString().split('T')[0];
                    } else if (typeof rowDate === 'string') {
                        rowDate = rowDate.trim();
                    }

                    // IMPORTANT: Add district info to the data so frontend can filter
                    // However, the current frontend API response does not include district.
                    // It relies on backend filtering.
                    // So if we serve all data, we MUST include a 'district' field so frontend can filter.

                    const name = row[colMap.name];
                    const totalQty = Number(row[colMap.totalQty]) || 0;
                    const etcQty = colMap.etcQty !== -1 ? (Number(row[colMap.etcQty]) || 0) : 0;
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
                        if (processedQty > 0) {
                            calculatedPrice = Math.round(revenue / processedQty);
                        }
                    } else if (colMap.oldUnitPrice !== -1) {
                        calculatedPrice = Number(row[colMap.oldUnitPrice]) || 0;
                    }

                    let isWorking = '근무';
                    if (colMap.workStatus !== -1) {
                        isWorking = row[colMap.workStatus];
                    } else {
                        isWorking = totalQty > 0 ? '근무' : '휴무';
                    }

                    pageData.push({
                        '날짜': rowDate,
                        '이름': name,
                        '당일수량': totalQty,
                        '검배수량': etcQty,
                        '검배횟수': 0,
                        '단가': calculatedPrice,
                        '근무여부': isWorking,
                        '지점': district // Add '지점' field for filtering on frontend
                    });
                }
                combinedData = [...combinedData, ...pageData];
            }
        } catch (err) {
            console.error(`Error processing file ${filePath}:`, err);
        }
    });

    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combinedData, null, 2));
    console.log(`Successfully exported ${combinedData.length} records to ${OUTPUT_FILE}`);

    // --- New: Export Holidays ---
    console.log('Exporting holidays...');
    const holidaysPath = path.join(DATA_DIR, 'holidays.xlsx');
    const holidaysOut = path.join(__dirname, '../client/public/holidays.json');

    if (fs.existsSync(holidaysPath)) {
        const hWorkbook = xlsx.readFile(holidaysPath);
        const hSheetName = hWorkbook.SheetNames[0];
        const hRows = xlsx.utils.sheet_to_json(hWorkbook.Sheets[hSheetName], { header: 1 });

        const holidayList = [];
        hRows.forEach(row => {
            if (row && row[0]) {
                let dateStr = row[0];
                if (typeof dateStr === 'number') {
                    // Excel date to JS date
                    const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                    dateStr = dateObj.toISOString().split('T')[0];
                } else if (typeof dateStr === 'string') {
                    dateStr = dateStr.trim();
                }

                // Simple validation YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    holidayList.push(dateStr);
                }
            }
        });

        fs.writeFileSync(holidaysOut, JSON.stringify(holidayList, null, 2));
        console.log(`Successfully exported ${holidayList.length} holidays to ${holidaysOut}`);
    } else {
        console.log('No holidays.xlsx found, skipping holiday export.');
        fs.writeFileSync(holidaysOut, '[]'); // Create empty file to prevent 404
    }

    // --- New: Export Staff List (Separated by District) ---
    console.log('Exporting staff list...');

    // Define the specific files we want to process and their target output
    const staffFiles = [
        { district: 'dongdaemun', file: 'staff_info_dongdaemun.xlsx' },
        { district: 'seongbuk', file: 'staff_info_seongbuk.xlsx' },
        { district: 'songpa', file: 'staff_info_songpa.xlsx' }
    ];

    staffFiles.forEach(staffFile => {
        const filePath = path.join(DATA_DIR, staffFile.file);
        const outputJsonPath = path.join(__dirname, `../client/public/staff_list_${staffFile.district}.json`);

        if (fs.existsSync(filePath)) {
            try {
                console.log(`Processing staff file: ${filePath}`);
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

                const staffData = rows.map(row => ({
                    '이름': row['이름'] || '',
                    '집배구': row['집배구'] || '',
                    '구분코드': row['구분코드'] || '',
                    '담당구역': row['담당구역'] || '',
                    '전화번호': row['전화번호'] || '',
                    'PDA번호': row['PDA번호'] || '',
                    '생년월일': row['생년월일'] || '',
                    '임용일자': row['임용일자'] || '',
                    'district': staffFile.district
                })).filter(s => s['이름']); // Filter empty rows

                fs.writeFileSync(outputJsonPath, JSON.stringify(staffData, null, 2));
                console.log(`Successfully exported ${staffData.length} staff members to ${outputJsonPath}`);

            } catch (err) {
                console.error(`Error processing staff file ${filePath}:`, err);
            }
        } else {
            console.warn(`Staff file not found: ${filePath}, skipping...`);
            // Create empty file to prevent 404s
            fs.writeFileSync(outputJsonPath, '[]');
        }
    });


} catch (error) {
    console.error('Export failed:', error);
}
