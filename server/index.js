const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '../data');

// Helper to get list of months between two dates
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

// API: Get data filtered by district and date range
app.get('/api/data', (req, res) => {
    try {
        const { district, startDate, endDate } = req.query;

        console.log(`[API] Request: District=${district}, Range=${startDate}~${endDate}`);

        if (!district || !startDate || !endDate) {
            return res.status(400).json({ error: 'District, startDate, and endDate are required' });
        }

        const districtDir = path.join(DATA_DIR, district);
        console.log(`[API] Looking in: ${districtDir}`);

        if (!fs.existsSync(districtDir)) {
            console.log(`[API] District folder not found`);
            return res.json([]);
        }

        const months = getMonthsInRange(startDate, endDate);
        let combinedData = [];

        months.forEach(({ year, month }) => {
            const filePath = path.join(districtDir, String(year), `${year}-${month}.xlsx`);

            if (fs.existsSync(filePath)) {
                console.log(`[API] Reading: ${filePath}`);
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];

                // Read as 2D array to handle complex headers
                const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

                // Find Header Row (Look for '배달일자' or '날짜')
                let headerRowIdx = -1;
                let colMap = {};
                let dataStartRow = 1;

                for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                    const row = rawRows[i];
                    if (!row) continue;

                    // Check for key columns
                    const dateIdx = row.findIndex(c => c && (c.includes('배달일자') || c.includes('날짜')));
                    const nameIdx = row.findIndex(c => c && (c.includes('배달원명') || c.includes('이름')));

                    if (dateIdx !== -1 && nameIdx !== -1) {
                        headerRowIdx = i;
                        // Map basic columns
                        colMap = {
                            date: dateIdx,
                            name: nameIdx,
                            totalQty: row.findIndex(c => c && (c.includes('물량합계') || c.includes('당일수량'))),
                            etcQty: (() => {
                                const idx1 = row.findIndex(c => c && (c.includes('검배수량') || c.includes('겸배수량')));
                                return idx1 !== -1 ? idx1 : row.findIndex(c => c && c.includes('기타물량'));
                            })(),
                            // Old format fallback
                            oldUnitPrice: row.findIndex(c => c && c === '단가'),
                            workStatus: row.findIndex(c => c && c === '근무여부'),
                            rangeStart: -1
                        };

                        dataStartRow = i + 1;

                        // Detect start of ranges (usually after Total Qty, looks for "배달물량")
                        // In new format, '배달물량' repeats. We start looking from totalQty + 1
                        if (colMap.totalQty !== -1) {
                            for (let c = colMap.totalQty + 1; c < row.length; c++) {
                                if (row[c] && row[c].includes('배달물량')) {
                                    colMap.rangeStart = c;
                                    break;
                                }
                            }
                            // Check Row i+1 (Multi-row Header Case)
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
                    // Process Data Rows
                    const pageData = [];
                    for (let i = dataStartRow; i < rawRows.length; i++) {
                        const row = rawRows[i];
                        if (!row || !row[colMap.date]) continue; // Skip empty rows

                        // 1. Date Normalization
                        let rowDate = row[colMap.date];
                        if (typeof rowDate === 'number') {
                            const dateObj = new Date(Math.round((rowDate - 25569) * 86400 * 1000));
                            rowDate = dateObj.toISOString().split('T')[0];
                        } else if (typeof rowDate === 'string') {
                            rowDate = rowDate.trim();
                        }

                        // Filter strictly by date range
                        if (rowDate < startDate || rowDate > endDate) continue;

                        // 2. Name
                        const name = row[colMap.name];

                        // 3. Quantities
                        const totalQty = Number(row[colMap.totalQty]) || 0;
                        const etcQty = colMap.etcQty !== -1 ? (Number(row[colMap.etcQty]) || 0) : 0;

                        // 4. Calculate Unit Price (Weighted Average)
                        let calculatedPrice = 0;

                        if (colMap.rangeStart !== -1) {
                            // New Format: Iterate pairs (Qty, Price)
                            // Assuming Structure: [Qty, Price], [Qty, Price] ...
                            let revenue = 0;
                            let processedQty = 0;

                            // Loop until hitting '기타물량' or end
                            // Assuming pairs are continuous. 
                            // Check header row again? No, assume consistency.
                            // Range columns are pairs.
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
                            // Old Format
                            calculatedPrice = Number(row[colMap.oldUnitPrice]) || 0;
                        }

                        // 5. Work Status (New format: Derive from Qty)
                        let isWorking = '근무';
                        if (colMap.workStatus !== -1) {
                            isWorking = row[colMap.workStatus]; // Old format explicit
                        } else {
                            isWorking = totalQty > 0 ? '근무' : '휴무';
                        }

                        // Construct Normalized Object
                        pageData.push({
                            '날짜': rowDate,
                            '이름': name,
                            '당일수량': totalQty,
                            '검배수량': etcQty,
                            '검배횟수': 0, // Not available in new format
                            '단가': calculatedPrice,
                            '근무여부': isWorking
                        });
                    }
                    console.log(`[API] Parsed ${pageData.length} records from ${sheetName}`);
                    combinedData = [...combinedData, ...pageData];
                } else {
                    console.log(`[API] Could not find header row in ${filePath}`);
                    // Fallback to old simple read if header detection failed? 
                    // Or maybe just let it be empty.
                }

            } else {
                console.log(`[API] File not found: ${filePath}`);
            }
        });

        console.log(`[API] Final Data Count: ${combinedData.length}`);
        res.json(combinedData);
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// API: Get Staff List (Detailed Info)
app.get('/api/staff-list', (req, res) => {
    try {
        const { district } = req.query;
        // Default to 'dongdaemun' or handle all if needed, but user implies separated.
        // Let's require district or default to 'dongdaemun' if not provided for safety layer
        const targetDistrict = district || 'dongdaemun';

        const filePath = path.join(DATA_DIR, `staff_info_${targetDistrict}.xlsx`);
        if (!fs.existsSync(filePath)) {
            console.log(`[API] Staff list not found for ${targetDistrict}: ${filePath}`);
            return res.json([]);
        }

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        res.json(data);
    } catch (error) {
        console.error('Error reading staff list:', error);
        res.status(500).json({ error: 'Failed to read staff list' });
    }
});

// API: Get Holidays
app.get('/api/holidays', (req, res) => {
    try {
        const filePath = path.join(DATA_DIR, 'holidays.xlsx');
        if (!fs.existsSync(filePath)) {
            console.log(`[API] Holidays file not found: ${filePath}`);
            return res.json([]);
        }

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        // Read first column assuming it contains dates
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        
        const holidays = [];
        rows.forEach(row => {
            if (row && row[0]) {
                let dateStr = row[0];
                // Check if it's Excel serial number
                if (typeof dateStr === 'number') {
                    const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                    dateStr = dateObj.toISOString().split('T')[0];
                } else if (typeof dateStr === 'string') {
                    // Try to parse if strictly YYYY-MM-DD or similar
                    // Removing potential whitespace
                    dateStr = dateStr.trim();
                }
                // Simple validation YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    holidays.push(dateStr);
                }
            }
        });

        console.log(`[API] Loaded ${holidays.length} holidays`);
        res.json(holidays);
    } catch (error) {
        console.error('Error reading holidays:', error);
        res.status(500).json({ error: 'Failed to read holidays' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
