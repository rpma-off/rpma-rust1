const fs = require('fs');
const path = require('path');

// Get the build directory path
const buildDir = path.join(__dirname, '../frontend/.next');
const staticDir = path.join(buildDir, 'static/chunks');

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Function to get file size in KB
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

// Function to recursively calculate directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

// Analyze chunk sizes
console.log('Frontend Bundle Size Analysis\n');
console.log('=============================\n');

// Total build size (excluding cache)
const buildDirs = fs.readdirSync(buildDir);
let totalBuildSize = 0;
buildDirs.forEach(dir => {
  if (dir !== 'cache') {
    const dirPath = path.join(buildDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      totalBuildSize += getDirectorySize(dirPath);
    } else {
      totalBuildSize += fs.statSync(dirPath).size;
    }
  }
});
totalBuildSize = (totalBuildSize / 1024 / 1024).toFixed(2);
console.log(`Total build size (excluding cache): ${totalBuildSize} MB\n`);

// Static assets size
const staticSize = (getDirectorySize(staticDir) / 1024 / 1024).toFixed(2);
console.log(`Static assets size: ${staticSize} MB\n`);

// Get all JavaScript files in chunks directory
const jsFiles = fs.readdirSync(staticDir)
  .filter(file => file.endsWith('.js'))
  .map(file => {
    const filePath = path.join(staticDir, file);
    return {
      name: file,
      size: getFileSize(filePath)
    };
  })
  .sort((a, b) => b.size - a.size);

// Display chunk sizes
console.log('JavaScript Chunks (sorted by size):\n');
jsFiles.forEach(file => {
  console.log(`${file.name}: ${file.size} KB`);
});

// Identify largest chunks
console.log('\nLargest chunks:\n');
const largestChunks = jsFiles.slice(0, 5);
largestChunks.forEach(chunk => {
  console.log(`${chunk.name}: ${chunk.size} KB`);
});

// Bundle size recommendations
console.log('\nRecommendations:\n');

if (parseFloat(totalBuildSize) > 10) {
  console.log('⚠️  Total build size is large (>10MB). Consider:');
  console.log('   - Implementing dynamic imports for large components');
  console.log('   - Optimizing images and assets');
  console.log('   - Removing unused dependencies');
} else if (parseFloat(totalBuildSize) > 5) {
  console.log('⚠️  Total build size is moderate (>5MB). Monitor as you add features.');
} else {
  console.log('✅ Total build size is acceptable (<5MB).');
}

const vendorChunk = jsFiles.find(file => file.name.includes('vendor'));
if (vendorChunk && parseFloat(vendorChunk.size) > 1000) {
  console.log('\n⚠️  Vendor chunk is large (>1MB). Consider:');
  console.log('   - Analyzing if all vendor dependencies are needed');
  console.log('   - Implementing tree shaking for vendor libraries');
  console.log('   - Using smaller alternatives to large libraries');
}

const rechartsChunk = jsFiles.find(file => file.name.includes('recharts'));
if (rechartsChunk && parseFloat(rechartsChunk.size) > 200) {
  console.log('\n⚠️  Recharts chunk is large (>200KB). Consider:');
  console.log('   - Lazy loading chart components');
  console.log('   - Using only specific chart modules instead of the entire library');
}

console.log('\n=============================');
console.log('Analysis complete.');