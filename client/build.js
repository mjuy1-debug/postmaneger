import { build } from 'vite';
import { rm } from 'fs/promises';
import { resolve } from 'path';

console.log("Starting custom build script...");

const distDir = resolve(process.cwd(), 'dist');

try {
    console.log(`Cleaning ${distDir}...`);
    await rm(distDir, { recursive: true, force: true });
} catch (err) {
    console.warn(`Warning: Could not clean dist folder: ${err.message}`);
}

try {
    await build({
        root: process.cwd(),
        configFile: './vite.config.js',
        build: {
            write: true,
            emptyOutDir: false
        }
    });
    console.log('Build completed successfully!');
} catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
}
