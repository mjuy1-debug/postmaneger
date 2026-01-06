
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'client', 'public', 'data.json');
const staffPath = path.join(__dirname, 'client', 'public', 'staff_list_dongdaemun.json');

console.log(`Checking data file at: ${dataPath}`);

try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    const resultLog = [];
    const log = (msg) => {
        console.log(msg);
        resultLog.push(msg);
        if (typeof msg === 'object') resultLog.push(JSON.stringify(msg, null, 2));
    };

    log(`Total records: ${data.length}`);

    // Filter for 2025-12 and Dongdaemun
    const targetDistrict = 'dongdaemun';
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';

    const filtered = data.filter(item => {
        const itemDate = item['날짜'];
        const itemDistrict = item['지점'];
        return itemDistrict === targetDistrict && itemDate >= startDate && itemDate <= endDate;
    });

    log(`Found ${filtered.length} records for ${targetDistrict} in Dec 2025.`);

    if (filtered.length > 0) {
        log('Sample record:');
        log(filtered[0]);
        // Calculating total volume for verification
        const totalVol = filtered.reduce((sum, item) => sum + (Number(item['당일수량']) || 0), 0);
        log(`Total Volume for period: ${totalVol}`);
    } else {
        log('No records found for the specified criteria.');
    }

    fs.writeFileSync('verification_result.txt', resultLog.join('\n'), 'utf8');

} catch (err) {
    console.error('Error reading/parsing data.json:', err.message);
}

// Check Staff List
console.log(`\nChecking staff list at: ${staffPath}`);
try {
    const rawStaff = fs.readFileSync(staffPath, 'utf8');
    const staff = JSON.parse(rawStaff);
    console.log(`Total staff in Dongdaemun list: ${staff.length}`);
    if (staff.length > 0) console.log('First staff:', staff[0]);
} catch (err) {
    console.error('Error reading staff list:', err.message);
}
