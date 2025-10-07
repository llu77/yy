/**
 * Dependency Audit Script
 * Checks for security vulnerabilities and outdated packages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Security-sensitive packages that need extra attention
const criticalPackages = [
  'firebase',
  'firebase-admin',
  'next',
  'react',
  'react-dom',
  '@genkit-ai/googleai'
];

// Known vulnerable versions (example - should be updated regularly)
const knownVulnerabilities = {
  'lodash': ['< 4.17.21'],
  'minimist': ['< 1.2.6'],
  'node-fetch': ['< 2.6.7'],
  'axios': ['< 0.21.2']
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    return error.stdout || error.message;
  }
}

function checkNodeVersion() {
  log('\n🔍 Checking Node.js version...', 'blue');
  
  const nodeVersion = process.version;
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');
  
  if (fs.existsSync(nvmrcPath)) {
    const recommendedVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
    log(`Current Node.js version: ${nodeVersion}`, 'yellow');
    log(`Recommended version: v${recommendedVersion}`, 'green');
    
    if (!nodeVersion.startsWith(`v${recommendedVersion.split('.')[0]}`)) {
      log('⚠️  Node.js version mismatch! Consider using the recommended version.', 'red');
    }
  }
}

function auditDependencies() {
  log('\n🔒 Running security audit...', 'blue');
  
  // Run npm audit
  const auditResult = runCommand('npm audit --json');
  
  try {
    const audit = JSON.parse(auditResult);
    const vulnerabilities = audit.metadata.vulnerabilities;
    
    log(`\nVulnerability Summary:`, 'yellow');
    log(`  Info: ${vulnerabilities.info || 0}`);
    log(`  Low: ${vulnerabilities.low || 0}`, vulnerabilities.low > 0 ? 'yellow' : 'green');
    log(`  Moderate: ${vulnerabilities.moderate || 0}`, vulnerabilities.moderate > 0 ? 'yellow' : 'green');
    log(`  High: ${vulnerabilities.high || 0}`, vulnerabilities.high > 0 ? 'red' : 'green');
    log(`  Critical: ${vulnerabilities.critical || 0}`, vulnerabilities.critical > 0 ? 'red' : 'green');
    
    if (vulnerabilities.high > 0 || vulnerabilities.critical > 0) {
      log('\n⚠️  High or critical vulnerabilities found!', 'red');
      log('Run "npm audit fix" to attempt automatic fixes.', 'yellow');
    }
  } catch (error) {
    log('Could not parse audit results', 'red');
  }
}

function checkOutdatedPackages() {
  log('\n📦 Checking for outdated packages...', 'blue');
  
  const outdated = runCommand('npm outdated --json');
  
  try {
    const packages = JSON.parse(outdated || '{}');
    const packageNames = Object.keys(packages);
    
    if (packageNames.length === 0) {
      log('✅ All packages are up to date!', 'green');
      return;
    }
    
    log(`\nFound ${packageNames.length} outdated packages:`, 'yellow');
    
    packageNames.forEach(pkg => {
      const info = packages[pkg];
      const isCritical = criticalPackages.includes(pkg);
      
      log(`\n  ${pkg}:`, isCritical ? 'red' : 'yellow');
      log(`    Current: ${info.current}`);
      log(`    Wanted: ${info.wanted}`);
      log(`    Latest: ${info.latest}`);
      
      if (isCritical) {
        log(`    ⚠️  This is a critical package - consider updating!`, 'red');
      }
    });
  } catch (error) {
    log('Could not check outdated packages', 'yellow');
  }
}

function checkLicenses() {
  log('\n📄 Checking licenses...', 'blue');
  
  const licenses = runCommand('npm ls --json --depth=0');
  
  try {
    const data = JSON.parse(licenses);
    const deps = { ...data.dependencies, ...data.devDependencies };
    
    const riskyLicenses = ['GPL', 'AGPL', 'LGPL'];
    const foundRiskyLicenses = [];
    
    Object.entries(deps).forEach(([name, info]) => {
      if (info.license && riskyLicenses.some(risky => info.license.includes(risky))) {
        foundRiskyLicenses.push({ name, license: info.license });
      }
    });
    
    if (foundRiskyLicenses.length > 0) {
      log('\n⚠️  Found packages with restrictive licenses:', 'yellow');
      foundRiskyLicenses.forEach(({ name, license }) => {
        log(`  ${name}: ${license}`, 'yellow');
      });
    } else {
      log('✅ No restrictive licenses found', 'green');
    }
  } catch (error) {
    log('Could not check licenses', 'yellow');
  }
}

function generateReport() {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    nodeVersion: process.version,
    platform: process.platform,
    recommendations: []
  };
  
  // Add recommendations based on checks
  if (process.version < 'v18.0.0') {
    report.recommendations.push('Update Node.js to version 18 or later');
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n📊 Report saved to: ${reportPath}`, 'green');
}

// Main execution
function main() {
  log('🚀 Starting dependency audit...', 'blue');
  log('================================\n', 'blue');
  
  checkNodeVersion();
  auditDependencies();
  checkOutdatedPackages();
  checkLicenses();
  generateReport();
  
  log('\n================================', 'blue');
  log('✅ Audit complete!', 'green');
}

// Run the audit
main();
