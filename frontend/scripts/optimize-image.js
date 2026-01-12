/**
 * Image Optimization Script
 * 
 * This script helps optimize the Login.jpg image to reduce bundle size.
 * 
 * Usage:
 * 1. Install sharp: npm install --save-dev sharp
 * 2. Run: node scripts/optimize-image.js
 * 
 * Or manually:
 * 1. Use an online tool like https://squoosh.app/ or https://tinypng.com/
 * 2. Convert Login.jpg to WebP format
 * 3. Compress to ~80% quality
 * 4. Target size: < 200KB (from 2.7MB)
 */

const fs = require('fs');
const path = require('path');

const imagePath = path.join(__dirname, '../public/Login.jpg');
const outputPath = path.join(__dirname, '../public/Login.webp');
const outputPathJpg = path.join(__dirname, '../public/Login-optimized.jpg');

console.log('Image Optimization Guide');
console.log('========================');
console.log('');
console.log('Current Login.jpg size:', fs.existsSync(imagePath) 
  ? `${(fs.statSync(imagePath).size / 1024 / 1024).toFixed(2)} MB`
  : 'File not found');
console.log('');
console.log('Recommended optimizations:');
console.log('1. Convert to WebP format (better compression)');
console.log('2. Resize if needed (max width: 1920px)');
console.log('3. Compress to 80-85% quality');
console.log('4. Target size: < 200KB');
console.log('');
console.log('Tools:');
console.log('- Online: https://squoosh.app/ or https://tinypng.com/');
console.log('- CLI: sharp, imagemin, or cwebp');
console.log('');
console.log('After optimization, update AuthPage.tsx to use:');
console.log('- Login.webp (preferred) or Login-optimized.jpg');

// Try to use sharp if available
try {
  const sharp = require('sharp');
  
  if (fs.existsSync(imagePath)) {
    console.log('');
    console.log('Sharp found! Optimizing image...');
    
    sharp(imagePath)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath)
      .then(() => {
        const originalSize = fs.statSync(imagePath).size;
        const newSize = fs.statSync(outputPath).size;
        const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
        
        console.log(`✓ Created Login.webp`);
        console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Optimized: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Reduction: ${reduction}%`);
        console.log('');
        console.log('Also creating optimized JPG fallback...');
        
        return sharp(imagePath)
          .resize(1920, null, { withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(outputPathJpg);
      })
      .then(() => {
        const newSize = fs.statSync(outputPathJpg).size;
        console.log(`✓ Created Login-optimized.jpg`);
        console.log(`  Size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
        console.log('Next steps:');
        console.log('1. Update AuthPage.tsx to use Login.webp');
        console.log('2. Add fallback to Login-optimized.jpg for older browsers');
        console.log('3. Test the login page to ensure image displays correctly');
      })
      .catch((err) => {
        console.error('Error optimizing image:', err.message);
        console.log('');
        console.log('Please use an online tool or install sharp:');
        console.log('  npm install --save-dev sharp');
      });
  } else {
    console.log('Login.jpg not found at:', imagePath);
  }
} catch (err) {
  console.log('Sharp not installed. Install it with:');
  console.log('  npm install --save-dev sharp');
  console.log('');
  console.log('Or use an online tool:');
  console.log('  https://squoosh.app/');
  console.log('  https://tinypng.com/');
}
