import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, 'api');

const logFiles = [
    'events.jsonl',
    'requests.jsonl',
    'sessionreplay.jsonl',
    'recordingids.json'
];

console.log('🧹 Cleaning up log files...');

logFiles.forEach((file) => {
    const filePath = path.join(apiDir, file);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted: ${file}`);
        } else {
            console.log(`⏭️  Skipped: ${file} (doesn't exist)`);
        }
    } catch (err) {
        console.error(`❌ Failed to delete ${file}:`, err.message);
    }
});

// Create empty recordingids.json
const recordingIdsPath = path.join(apiDir, 'recordingids.json');
fs.writeFileSync(recordingIdsPath, JSON.stringify({}, null, 2));
console.log('✅ Created empty recordingids.json');

console.log('✨ Cleanup complete!');
