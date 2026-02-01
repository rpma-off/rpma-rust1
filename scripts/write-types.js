#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../frontend/src/lib/backend.ts');

// Read from stdin
let typeDefinitions = '';
process.stdin.on('data', (chunk) => {
  typeDefinitions += chunk;
});

process.stdin.on('end', () => {
  try {
    // Clean up malformed escape sequences that ts-rs sometimes generates
    typeDefinitions = typeDefinitions.replace(/\\n/g, '\n');

    // Validate critical exports (excluding types that are manually defined to avoid conflicts)
    const requiredExports = ['TaskStatus', 'TaskPriority', 'UserAccount'];
    const manuallyDefinedTypes = ['Task', 'Client']; // These are defined in unified.types.ts to avoid conflicts
    const missingExports = requiredExports.filter(exp => !typeDefinitions.includes(`export type ${exp}`) && !typeDefinitions.includes(`export interface ${exp}`));

    if (missingExports.length > 0) {
      console.error(`❌ Missing exports: ${missingExports.join(', ')}`);
      console.error('This may cause TypeScript compilation errors. Please check the Rust type generation.');
      process.exit(1);
    }

    // Attempt to write with retry logic
    let attempts = 0;
    const maxAttempts = 10;

    const writeFile = () => {
      try {
        fs.writeFileSync(outputPath, typeDefinitions, 'utf8');
        console.log(`✅ Successfully exported Rust types to TypeScript at ${outputPath}`);
        console.log(`✅ Validated exports: ${requiredExports.join(', ')}`);
      } catch (error) {
        attempts++;
        if (error.code === 'EPERM' || error.code === 'EACCES') {
          if (attempts < maxAttempts) {
            console.log(`⚠️  File access denied (attempt ${attempts}/${maxAttempts}), retrying in 200ms...`);
            setTimeout(writeFile, 200);
            return;
          }
        }
        throw error;
      }
    };

    writeFile();
  } catch (error) {
    console.error('Failed to write TypeScript definitions:', error.message);
    process.exit(1);
  }
});

process.stdin.on('error', (error) => {
  console.error('Error reading from stdin:', error.message);
  process.exit(1);
});