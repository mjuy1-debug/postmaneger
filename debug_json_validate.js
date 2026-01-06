const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'client/public');
const filesAndDirs = fs.readdirSync(publicDir);

filesAndDirs.forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(publicDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
            console.log(`[PASS] ${file}`);
        } catch (err) {
            console.error(`[FAIL] ${file} is invalid JSON: ${err.message}`);
        }
    }
});
