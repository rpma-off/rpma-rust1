#!/usr/bin/env node

/**
 * Type Drift Detection Script
 * Detects inconsistencies between generated Rust types and manual TypeScript types
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findFilesWithPattern(dir, pattern, excludeDirs = ['node_modules', '.next', 'build']) {
  const results = [];

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          traverse(fullPath);
        }
      } else if (stat.isFile() && item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (pattern.test(content)) {
          results.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return results;
}

function detectAnyTypes() {
  console.log('🔍 Detecting any types in service and component files...\n');

  const serviceDir = path.join(__dirname, '../src/lib/services');
  const componentDir = path.join(__dirname, '../src/components');
  const hookDir = path.join(__dirname, '../src/hooks');

  const anyPattern = /\b:\s*any\b/g;

  const serviceFiles = findFilesWithPattern(serviceDir, anyPattern);
  const componentFiles = findFilesWithPattern(componentDir, anyPattern);
  const hookFiles = findFilesWithPattern(hookDir, anyPattern);

  if (serviceFiles.length > 0) {
    console.log('❌ Any types found in services:');
    serviceFiles.forEach(file => console.log(`  - ${path.relative(process.cwd(), file)}`));
    console.log();
  }

  if (componentFiles.length > 0) {
    console.log('❌ Any types found in components:');
    componentFiles.forEach(file => console.log(`  - ${path.relative(process.cwd(), file)}`));
    console.log();
  }

  if (hookFiles.length > 0) {
    console.log('❌ Any types found in hooks:');
    hookFiles.forEach(file => console.log(`  - ${path.relative(process.cwd(), file)}`));
    console.log();
  }

  const totalIssues = serviceFiles.length + componentFiles.length + hookFiles.length;

  if (totalIssues === 0) {
    console.log('✅ No any types found in services, components, or hooks!');
  } else {
    console.log(`❌ Found ${totalIssues} files with any types`);
    process.exit(1);
  }
}

function detectDuplicateTypes() {
  console.log('🔍 Detecting potential duplicate type definitions...\n');

  const typesDir = path.join(__dirname, '../src/types');
  const backendTypes = path.join(__dirname, '../src/lib/backend.ts');

  // Read backend types
  const backendContent = fs.readFileSync(backendTypes, 'utf-8');
  const backendTypesList = [];
  const exportTypeRegex = /export (?:type|interface) (\w+)/g;
  let match;
  while ((match = exportTypeRegex.exec(backendContent)) !== null) {
    backendTypesList.push(match[1]);
  }

  console.log(`Found ${backendTypesList.length} types in backend.ts`);

  // Check for duplicates in types directory
  const duplicateCandidates = [];

  function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const localTypes = [];
    while ((match = exportTypeRegex.exec(content)) !== null) {
      localTypes.push(match[1]);
    }

    const duplicates = localTypes.filter(type => backendTypesList.includes(type));
    if (duplicates.length > 0) {
      duplicateCandidates.push({
        file: path.relative(process.cwd(), filePath),
        duplicates
      });
    }
  }

  const typeFiles = findFilesWithPattern(typesDir, exportTypeRegex);
  typeFiles.forEach(checkFile);

  if (duplicateCandidates.length > 0) {
    console.log('⚠️  Potential duplicate type definitions found:');
    duplicateCandidates.forEach(({ file, duplicates }) => {
      console.log(`  - ${file}: ${duplicates.join(', ')}`);
    });
    console.log('\nConsider using types from @/lib/backend instead');
  } else {
    console.log('✅ No duplicate type definitions found!');
  }
}

// Run checks
console.log('🚀 Type Drift Detection\n');
console.log('=' .repeat(50));

try {
  detectAnyTypes();
  console.log('-'.repeat(30));
  detectDuplicateTypes();
} catch (error) {
  console.error('Error during type drift detection:', error);
}

console.log('\n' + '='.repeat(50));
console.log('✨ Type drift detection complete!');