const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const staffList = ['김철수', '이영희', '박민수', '최지혜', '정우성'];
const basePrice = 850;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function generateMonthData(year, month) {
    const data = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    staffList.forEach(name => {
        let cumulative = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const isSunday = date.getDay() === 0;

            // Randomly simulate day off for some, but Sunday is always off
            const isWorkDay = !isSunday && (Math.random() > 0.05);

            let dailyQty = 0;
            let geombaeQty = 0;
            let geombaeCount = 0;
            let status = '휴무';

            if (isWorkDay) {
                status = '근무';
                dailyQty = randomInt(150, 400); // 150~400 parcels
                cumulative += dailyQty;

                // 30% chance of geombae
                if (Math.random() > 0.7) {
                    geombaeCount = randomInt(1, 10);
                    geombaeQty = randomInt(10, 50);
                }
            }

            data.push({
                '이름': name,
                '날짜': formatDate(date),
                '누적수량': cumulative,
                '당일수량': dailyQty,
                '검배수량': geombaeQty,
                '검배횟수': geombaeCount,
                '근무여부': status,
                '단가': basePrice
            });
        }
    });

    return data;
}

function saveExcel(year, month) {
    const data = generateMonthData(year, month);
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

    // Ensure folder exists
    const dir = path.join(__dirname, `../data/${year}`);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `${year}-${String(month).padStart(2, '0')}.xlsx`; // e.g., 2024-11.xlsx
    xlsx.writeFile(wb, path.join(dir, fileName));
    console.log(`Generated ${fileName}`);
}

// Generate for 2024-11, 2024-12, 2025-01
saveExcel(2024, 11);
saveExcel(2024, 12);
saveExcel(2025, 1);
