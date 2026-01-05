const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

const HEADERS = [
    '이름', '집배구', '구분코드', '담당구역', '전화번호', 'PDA번호', '생년월일', '임용일자'
];

const dummyDataDongdaemun = [
    ['송병근', '43001', '01', '장안동', '010-9834-3633', 'PDA-001', '****** - *******', '2003-03-01'],
    ['도덕기', '43002', '02', '휘경동', '010-9878-3347', 'PDA-002', '660401 - *******', '2011-11-01'],
    ['김태성', '43003', '03', '답십리', '010-5661-8807', 'PDA-003', '750110 - *******', '2012-01-21'],
];

const dummyDataSeongbuk = [
    ['이재덕', '43004', '04', '성북동', '010-5064-1201', 'PDA-004', '770309 - *******', '2023-03-16'],
    ['윤영식', '43005', '05', '돈암동', '010-9006-4700', 'PDA-005', '****** - *******', '2011-02-25'],
];

const dummyDataSongpa = [
    ['정양룡', '43006', '06', '잠실동', '010-4938-1318', 'PDA-006', '800203 - *******', '2018-04-10'],
    ['최민호', '43007', '07', '가락동', '010-3895-1283', 'PDA-007', '****** - *******', '2009-07-07'],
];

function createStaffFile(district, data) {
    const outputPath = path.join(DATA_DIR, `staff_info_${district}.xlsx`);
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([HEADERS, ...data]);
    xlsx.utils.book_append_sheet(wb, ws, 'Staff List');
    xlsx.writeFile(wb, outputPath);
    console.log(`Created staff info file for ${district}: ${outputPath}`);
}

// Generate files for each district
createStaffFile('dongdaemun', dummyDataDongdaemun);
createStaffFile('seongbuk', dummyDataSeongbuk);
createStaffFile('songpa', dummyDataSongpa);
