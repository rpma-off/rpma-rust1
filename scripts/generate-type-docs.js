#!/usr/bin/env node

/**
 * Type Documentation Generator
 *
 * This script generates documentation for TypeScript types in docs/types/
 * by parsing the generated backend.ts file and creating/updating markdown files.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_TS_PATH = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'backend.ts');
const DOCS_TYPES_DIR = path.join(__dirname, '..', 'docs', 'types');

function parseBackendTypes() {
  if (!fs.existsSync(BACKEND_TS_PATH)) {
    console.error('❌ backend.ts file not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(BACKEND_TS_PATH, 'utf8');
  const lines = content.split('\n');

  const categories = {};
  let currentCategory = null;
  let currentType = null;
  let inTypeDefinition = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for category comments
    if (line.startsWith('//') && line.includes('types')) {
      currentCategory = line.replace('//', '').replace('types', '').trim().toLowerCase();
      if (!categories[currentCategory]) {
        categories[currentCategory] = [];
      }
      continue;
    }

    // Check for type definitions
    const typeMatch = line.match(/^export (?:type|interface|enum) (\w+)/);
    if (typeMatch && currentCategory) {
      currentType = {
        name: typeMatch[1],
        kind: typeMatch[0].split(' ')[1],
        definition: [line],
        category: currentCategory
      };
      inTypeDefinition = true;
      braceCount = 0;

      // Count braces in the current line
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (braceCount === 0) {
        // Single line type
        categories[currentCategory].push(currentType);
        currentType = null;
        inTypeDefinition = false;
      }
      continue;
    }

    // Continue collecting type definition
    if (inTypeDefinition && currentType) {
      currentType.definition.push(line);

      // Count braces
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      if (braceCount === 0) {
        // End of type definition
        categories[currentCategory].push(currentType);
        currentType = null;
        inTypeDefinition = false;
      }
    }
  }

  return categories;
}

function generateMarkdownForCategory(category, types) {
  if (types.length === 0) return null;

  const title = category.charAt(0).toUpperCase() + category.slice(1) + ' Types';
  let content = `# ${title}\n\n`;
  content += `This document contains TypeScript type definitions for ${category} functionality.\n\n`;

  content += `## Types\n\n`;

  for (const type of types) {
    content += `### ${type.name}\n\n`;
    content += `\`\`\`typescript\n`;
    content += type.definition.join('\n');
    content += `\n\`\`\`\n\n`;
  }

  content += `## Summary\n\n`;
  content += `- **${types.length}** types defined in this category\n`;
  content += `- Generated from Rust backend types\n\n`;

  return content;
}

function updateDocs() {
  console.log('🔍 Parsing backend types...');

  const categories = parseBackendTypes();

  // Ensure docs/types directory exists
  if (!fs.existsSync(DOCS_TYPES_DIR)) {
    fs.mkdirSync(DOCS_TYPES_DIR, { recursive: true });
  }

  let updatedCount = 0;

  for (const [category, types] of Object.entries(categories)) {
    const filename = `${category}.md`;
    const filepath = path.join(DOCS_TYPES_DIR, filename);

    const content = generateMarkdownForCategory(category, types);
    if (content) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`✅ Updated ${filename}`);
      updatedCount++;
    }
  }

  console.log(`\n📊 Updated ${updatedCount} documentation files in docs/types/`);
}

// Main execution
try {
  updateDocs();
  console.log('\n🎉 Type documentation generation complete!');
} catch (error) {
  console.error('❌ Documentation generation failed:', error.message);
  process.exit(1);
}