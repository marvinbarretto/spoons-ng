#!/usr/bin/env node

/**
 * Bundle Analysis Tool
 * Provides comprehensive bundle metrics and reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_PATH = path.join(__dirname, '../../dist/spoons/browser');
const STATS_FILE = path.join(DIST_PATH, 'stats.json');

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

/**
 * Get gzipped file size
 */
function getGzippedSize(filePath) {
  try {
    const gzipResult = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf8' });
    return parseInt(gzipResult.trim(), 10);
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze JavaScript bundles
 */
function analyzeJSBundles() {
  const jsFiles = fs.readdirSync(DIST_PATH)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(DIST_PATH, file);
      const size = getFileSize(filePath);
      const gzipSize = getGzippedSize(filePath);
      
      return {
        name: file,
        size: size,
        gzipSize: gzipSize,
        type: file.includes('main') ? 'main' : 
              file.includes('polyfills') ? 'polyfills' :
              file.includes('vendor') ? 'vendor' : 'chunk'
      };
    })
    .sort((a, b) => b.size - a.size);

  return jsFiles;
}

/**
 * Analyze CSS bundles
 */
function analyzeCSSBundles() {
  const cssFiles = fs.readdirSync(DIST_PATH)
    .filter(file => file.endsWith('.css'))
    .map(file => {
      const filePath = path.join(DIST_PATH, file);
      const size = getFileSize(filePath);
      const gzipSize = getGzippedSize(filePath);
      
      return {
        name: file,
        size: size,
        gzipSize: gzipSize,
        type: 'styles'
      };
    })
    .sort((a, b) => b.size - a.size);

  return cssFiles;
}

/**
 * Calculate bundle metrics
 */
function calculateMetrics(bundles) {
  const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
  const totalGzipSize = bundles.reduce((sum, bundle) => sum + bundle.gzipSize, 0);
  
  const mainBundle = bundles.find(b => b.type === 'main');
  const vendorBundle = bundles.find(b => b.type === 'vendor');
  const polyfillsBundle = bundles.find(b => b.type === 'polyfills');
  
  return {
    totalSize,
    totalGzipSize,
    mainSize: mainBundle ? mainBundle.size : 0,
    vendorSize: vendorBundle ? vendorBundle.size : 0,
    polyfillsSize: polyfillsBundle ? polyfillsBundle.size : 0,
    chunkCount: bundles.filter(b => b.type === 'chunk').length,
    compressionRatio: totalSize > 0 ? (totalGzipSize / totalSize) : 0
  };
}

/**
 * Check performance budgets
 */
function checkBudgets(metrics) {
  const budgets = {
    mainBundle: 500 * 1024,      // 500KB
    vendorBundle: 1000 * 1024,   // 1MB
    totalGzipped: 1500 * 1024,   // 1.5MB
    polyfills: 100 * 1024        // 100KB
  };
  
  const results = {
    mainBundle: metrics.mainSize <= budgets.mainBundle,
    vendorBundle: metrics.vendorSize <= budgets.vendorBundle,
    totalGzipped: metrics.totalGzipSize <= budgets.totalGzipped,
    polyfills: metrics.polyfillsSize <= budgets.polyfills
  };
  
  return { budgets, results };
}

/**
 * Print colored output
 */
function printColored(text, color) {
  console.log(colors[color] + text + colors.reset);
}

/**
 * Print bundle analysis report
 */
function printReport(jsBundles, cssBundles, metrics, budgetCheck) {
  console.log('\n' + '='.repeat(60));
  printColored('📊 BUNDLE ANALYSIS REPORT', 'cyan');
  console.log('='.repeat(60));
  
  // Total metrics
  console.log('\n📈 TOTAL METRICS:');
  console.log(`  Raw Size:     ${formatBytes(metrics.totalSize)}`);
  console.log(`  Gzipped:      ${formatBytes(metrics.totalGzipSize)}`);
  console.log(`  Compression:  ${(metrics.compressionRatio * 100).toFixed(1)}%`);
  console.log(`  Chunks:       ${metrics.chunkCount}`);
  
  // Key bundles
  console.log('\n🎯 KEY BUNDLES:');
  console.log(`  Main:         ${formatBytes(metrics.mainSize)} (${formatBytes(jsBundles.find(b => b.type === 'main')?.gzipSize || 0)} gzipped)`);
  console.log(`  Vendor:       ${formatBytes(metrics.vendorSize)} (${formatBytes(jsBundles.find(b => b.type === 'vendor')?.gzipSize || 0)} gzipped)`);
  console.log(`  Polyfills:    ${formatBytes(metrics.polyfillsSize)} (${formatBytes(jsBundles.find(b => b.type === 'polyfills')?.gzipSize || 0)} gzipped)`);
  
  // Budget check
  console.log('\n💰 BUDGET CHECK:');
  const budgetColor = (passed) => passed ? 'green' : 'red';
  const budgetSymbol = (passed) => passed ? '✅' : '❌';
  
  printColored(`  ${budgetSymbol(budgetCheck.results.mainBundle)} Main Bundle: ${formatBytes(metrics.mainSize)} / ${formatBytes(budgetCheck.budgets.mainBundle)}`, budgetColor(budgetCheck.results.mainBundle));
  printColored(`  ${budgetSymbol(budgetCheck.results.vendorBundle)} Vendor Bundle: ${formatBytes(metrics.vendorSize)} / ${formatBytes(budgetCheck.budgets.vendorBundle)}`, budgetColor(budgetCheck.results.vendorBundle));
  printColored(`  ${budgetSymbol(budgetCheck.results.totalGzipped)} Total Gzipped: ${formatBytes(metrics.totalGzipSize)} / ${formatBytes(budgetCheck.budgets.totalGzipped)}`, budgetColor(budgetCheck.results.totalGzipped));
  printColored(`  ${budgetSymbol(budgetCheck.results.polyfills)} Polyfills: ${formatBytes(metrics.polyfillsSize)} / ${formatBytes(budgetCheck.budgets.polyfills)}`, budgetColor(budgetCheck.results.polyfills));
  
  // Top 5 largest files
  console.log('\n📁 TOP 5 LARGEST FILES:');
  const allBundles = [...jsBundles, ...cssBundles].sort((a, b) => b.size - a.size);
  allBundles.slice(0, 5).forEach((bundle, index) => {
    console.log(`  ${index + 1}. ${bundle.name}`);
    console.log(`     Size: ${formatBytes(bundle.size)} (${formatBytes(bundle.gzipSize)} gzipped)`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (metrics.mainSize > budgetCheck.budgets.mainBundle) {
    printColored('  • Consider code splitting for the main bundle', 'yellow');
  }
  if (metrics.vendorSize > budgetCheck.budgets.vendorBundle) {
    printColored('  • Audit vendor dependencies for unused code', 'yellow');
  }
  if (metrics.compressionRatio > 0.4) {
    printColored('  • Good compression ratio - consider brotli compression', 'green');
  }
  if (metrics.chunkCount > 10) {
    printColored('  • Many chunks detected - review lazy loading strategy', 'yellow');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💻 Run "npm run analyze:both" for detailed analysis');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
function main() {
  if (!fs.existsSync(DIST_PATH)) {
    printColored('❌ Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }
  
  const jsBundles = analyzeJSBundles();
  const cssBundles = analyzeCSSBundles();
  const metrics = calculateMetrics([...jsBundles, ...cssBundles]);
  const budgetCheck = checkBudgets(metrics);
  
  printReport(jsBundles, cssBundles, metrics, budgetCheck);
  
  // Exit with error code if budgets are exceeded
  const budgetsPassed = Object.values(budgetCheck.results).every(result => result);
  if (!budgetsPassed) {
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeJSBundles,
  analyzeCSSBundles,
  calculateMetrics,
  checkBudgets,
  formatBytes
};