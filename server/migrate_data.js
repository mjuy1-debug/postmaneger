
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DATA_DIR = path.join(__dirname, '../data');
const DISTRICTS = ['dongdaemun', 'seongbuk', 'songpa'];

// Ensure DISTRICT folders exist
DISTRICTS.forEach(district => {
    const dir = path.join(DATA_DIR, district, '2024');
    fs.mkdirSync(dir, { recursive: true });
});

// Move existing files to 'dongdaemun' (default) if they rely on old structure
// Old structure: data/2024/2024-11.xlsx
const oldYearDir = path.join(DATA_DIR, '2024');
if (fs.existsSync(oldYearDir)) {
    const files = fs.readdirSync(oldYearDir);
    files.forEach(file => {
        if (file.endsWith('.xlsx')) {
            const oldPath = path.join(oldYearDir, file);
            const newPath = path.join(DATA_DIR, 'dongdaemun', '2024', file);
            // Copy instead of move for safety during dev
            fs.copyFileSync(oldPath, newPath);
            console.log(`Copied ${file} to dongdaemun`);
        }
    });
}

// Create sample data for others
const sampleData = [
    { 이름: '박기사', 날짜: '2024-11-05', 누적수량: 500, 당일수량: 100, 검배수량: 0, 검배횟수: 0, 근무여부: 'O', 단가: 800 },
    { 이름: '이기사', 날짜: '2024-11-20', 누적수량: 1200, 당일수량: 150, 검배수량: 10, 검배횟수: 1, 근무여부: 'O', 단가: 850 }
];

['seongbuk', 'songpa'].forEach(district => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sampleData);
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

    // Create Nov/Dec files
    const novPath = path.join(DATA_DIR, district, '2024', '2024-11.xlsx');
    const decPath = path.join(DATA_DIR, district, '2024', '2024-12.xlsx');

    // Only write if not exists
    if (!fs.existsSync(novPath)) xlsx.writeFile(wb, novPath);
    if (!fs.existsSync(decPath)) xlsx.writeFile(wb, decPath);
    console.log(`Created sample data for ${district}`);
});
