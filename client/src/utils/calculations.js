import { parseISO } from 'date-fns';

export const calculateOverview = (data, holidays = []) => {
    // 0. Prepare Holiday Set
    const holidaySet = new Set(holidays);
    // 1. Basic sums
    const totalVolume = data.reduce((acc, row) => acc + (row.당일수량 || 0), 0);
    const uniqueStaff = new Set(data.map(r => r.이름));
    const totalStaff = uniqueStaff.size;

    // 2. Daily Stats & Day of Week
    const dailyVolume = {};
    const dailyWorkingCounts = {}; // Track number of working staff per day
    const dayOfWeekStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0=Sun, 6=Sat
    const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    data.forEach(row => {
        const dateStr = row.날짜;
        // Skip invalid rows
        if (!dateStr || typeof dateStr !== 'string') return;

        const qty = Number(row.당일수량) || 0;
        const isWorking = row.근무여부 === 'O' || row.근무여부 === 'o' || row.근무여부 === '근무';

        // Daily
        if (!dailyVolume[dateStr]) dailyVolume[dateStr] = 0;
        dailyVolume[dateStr] += qty;

        if (isWorking) {
            dailyWorkingCounts[dateStr] = (dailyWorkingCounts[dateStr] || 0) + 1;
        }

        // Day of Week
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
            const day = dateObj.getDay();
            dayOfWeekStats[day] += qty;
            dayOfWeekCounts[day] += 1;
        }
    });

    const dailyStats = Object.keys(dailyVolume).sort().map(d => ({ date: d, count: dailyVolume[d] }));


    // Average per day of week (normalize by number of times that day occurred? or just raw sum? 
    // Usually average volume per Monday is better.
    // However, if dayOfWeekCounts[day] tracks number of RECORDS, that's wrong. We need number of Mondays.
    // Let's count unique dates per day of week.

    const uniqueDates = [...new Set(data.map(r => r.날짜))];
    const uniqueDowCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    uniqueDates.forEach(d => {
        const day = new Date(d).getDay();
        uniqueDowCounts[day] += 1;
    });

    const chartDayOfWeek = [
        { name: '월', avg: uniqueDowCounts[1] ? dayOfWeekStats[1] / uniqueDowCounts[1] : 0, key: 1 },
        { name: '화', avg: uniqueDowCounts[2] ? dayOfWeekStats[2] / uniqueDowCounts[2] : 0, key: 2 },
        { name: '수', avg: uniqueDowCounts[3] ? dayOfWeekStats[3] / uniqueDowCounts[3] : 0, key: 3 },
        { name: '목', avg: uniqueDowCounts[4] ? dayOfWeekStats[4] / uniqueDowCounts[4] : 0, key: 4 },
        { name: '금', avg: uniqueDowCounts[5] ? dayOfWeekStats[5] / uniqueDowCounts[5] : 0, key: 5 },
        { name: '토', avg: uniqueDowCounts[6] ? dayOfWeekStats[6] / uniqueDowCounts[6] : 0, key: 6 },
        { name: '일', avg: uniqueDowCounts[0] ? dayOfWeekStats[0] / uniqueDowCounts[0] : 0, key: 0 },
    ];

    // 3. Staff Stats
    const staffMap = {};
    data.forEach(row => {
        const name = row.이름;
        if (!staffMap[name]) {
            staffMap[name] = {
                name,
                totalQty: 0,
                workDays: 0,
                gyeombaeQty: 0, // 겸배수량
                gyeombaeCount: 0,
                maxQty: 0,
                unitPrice: 0,
                totalRevenue: 0,
                records: []
            };
        }
        const s = staffMap[name];
        // Ensure numeric values
        const rowQty = Number(row.당일수량) || 0;
        const rowGye = Number(row.검배수량) || 0;
        const rowGyeCnt = Number(row.검배횟수) || 0;

        // Add to records with sanitized numbers
        s.records.push({
            ...row,
            당일수량: rowQty,
            검배수량: rowGye
        });

        const isWorking = row.근무여부 === 'O' || row.근무여부 === 'o' || row.근무여부 === '근무';

        if (isWorking) {
            const dateObj = parseISO(row.날짜);
            const isMonday = dateObj.getDay() === 1;


            // Check if it is a holiday
            const dateStr = row.날짜; // ISO format YYYY-MM-DD
            const isHoliday = holidaySet.has(dateStr);

            if (!isMonday && !isHoliday) {
                s.workDays += 1;
            }
            s.totalQty += rowQty;
            s.gyeombaeQty += rowGye;
            s.gyeombaeCount += rowGyeCnt;
            if (rowQty > s.maxQty) s.maxQty = rowQty;

            // Calculate Revenue for Weighted Average Unit Price
            const rowPrice = Number(row.단가) || 0;
            if (rowPrice > 0) {
                s.totalRevenue += (rowQty * rowPrice);
            }
        }
    });

    const staffStats = Object.values(staffMap).map(s => {
        const dailyAvg = s.workDays > 0 ? (s.totalQty / s.workDays) : 0;
        const avgExcGyeombae = s.workDays > 0 ? ((s.totalQty - s.gyeombaeQty) / s.workDays) : 0;

        // Final Weighted Average Unit Price
        if (s.totalQty > 0 && s.totalRevenue > 0) {
            s.unitPrice = Math.round(s.totalRevenue / s.totalQty);
        }

        return {
            ...s,
            dailyAvg,
            avgExcGyeombae,
            isOverloaded: false, // Calculated next
            status: '정상',
        };
    });



    // Calculate Overload Threshold (e.g., Total Average of all staff's averages)
    // Formula Update: Total Volume / (Business Days * Total Staff)
    // Business Days: Majority Rule (More than 50% of staff working)

    // Count days where working staff > totalStaff / 2
    let businessDays = 0;
    const majorityThreshold = totalStaff * 0.5;

    Object.values(dailyWorkingCounts).forEach(count => {
        if (count >= majorityThreshold) {
            businessDays++;
        }
    });



    // Default to 1 to avoid division by zero if something goes wrong
    const effectiveDays = businessDays > 0 ? businessDays : 1;

    // Global Daily Avg per Person
    // "Total Volume" / ("Business Days" * "Total Staff")
    const globalDailyAvg = (totalVolume > 0 && totalStaff > 0)
        ? (totalVolume / (effectiveDays * totalStaff))
        : 0;

    let overloadCount = 0;
    let underloadCount = 0;

    staffStats.forEach(s => {
        // Condition: Daily Avg > Global Avg + 20%
        if (s.dailyAvg > globalDailyAvg * 1.2) {
            s.isOverloaded = true;
            s.status = '과부하';
            overloadCount++;
        } else if (s.dailyAvg > globalDailyAvg * 1.1) {
            s.status = '주의';
        } else if (s.dailyAvg < globalDailyAvg * 0.7) {
            s.status = '과부족';
            underloadCount++;
        } else if (s.dailyAvg < globalDailyAvg * 0.9) {
            s.status = '부족';
        }
    });

    return {
        totalVolume,
        totalStaff,
        effectiveDays,
        globalDailyAvg,
        overloadCount,
        underloadCount,
        dailyStats,
        dayOfWeekStats: chartDayOfWeek,
        staffStats: staffStats.map(s => ({ ...s })),
    };
};
