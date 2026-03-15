#!/usr/bin/env node
/**
 * Documentation Index Generator
 * 
 * Generates or updates docs/README.md with links to all documentation.
 * Run after adding new docs or ADRs.
 * 
 * Usage:
 *   node scripts/generate-docs-index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const ADR_DIR = path.join(DOCS_DIR, 'adr');
const AGENT_PACK_DIR = path.join(DOCS_DIR, 'agent-pack');

function extractFrontmatter(content) {
  // Handle UTF-8 BOM and trim
  const trimmedContent = content.trimStart();
  if (!trimmedContent.startsWith('---')) {
    return null;
  }
  
  const endIdx = trimmedContent.indexOf('---', 3);
  if (endIdx === -1) {
    return null;
  }
  
  const frontmatterStr = trimmedContent.substring(3, endIdx).trim();
  const frontmatter = {};
  
  // Simple YAML parsing
  const lines = frontmatterStr.split(/\r?\n/);
  let currentKey = null;
  let currentValue = [];
  
  for (const line of lines) {
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      if (currentKey) {
        frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : (currentValue.length === 0 ? '' : currentValue);
      }
      currentKey = keyMatch[1];
      let val = keyMatch[2] ? keyMatch[2].trim() : '';
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      currentValue = val ? [val] : [];
    } else if (line.match(/^\s*[-*]\s+(.*)$/)) {
      const listMatch = line.match(/^\s*[-*]\s+(.*)$/);
      let val = listMatch[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      currentValue.push(val);
    } else if (currentKey && line.trim()) {
      currentValue.push(line.trim());
    }
  }
  
  if (currentKey) {
    frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : (currentValue.length === 0 ? '' : currentValue);
  }
  
  return frontmatter;
}

function getDocFiles() {
  return fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const fullPath = path.join(DOCS_DIR, f);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      return {
        filename: f,
        path: `./${f}`,
        title: frontmatter?.title || f.replace('.md', ''),
        summary: frontmatter?.summary || '',
        readWhen: Array.isArray(frontmatter?.read_when) 
          ? frontmatter.read_when 
          : frontmatter?.read_when 
            ? [frontmatter.read_when] 
            : []
      };
    });
}

function getAgentPackFiles() {
  if (!fs.existsSync(AGENT_PACK_DIR)) return [];
  
  return fs.readdirSync(AGENT_PACK_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => {
      const fullPath = path.join(AGENT_PACK_DIR, f);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      return {
        filename: f,
        path: `./agent-pack/${f}`,
        title: frontmatter?.title || f.replace('.md', ''),
        summary: frontmatter?.summary || '',
        readWhen: Array.isArray(frontmatter?.read_when) 
          ? frontmatter.read_when 
          : frontmatter?.read_when 
            ? [frontmatter.read_when] 
            : []
      };
    });
}

function getADRFiles() {
  return fs.readdirSync(ADR_DIR)
    .filter(f => f.match(/^\d+-.*\.md$/) && f !== 'README.md')
    .sort()
    .map(f => {
      const fullPath = path.join(ADR_DIR, f);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      return {
        filename: f,
        path: `./adr/${f}`,
        number: parseInt(f.split('-')[0], 10),
        title: frontmatter?.title || f.replace('.md', ''),
        domain: frontmatter?.domain || 'general',
        status: frontmatter?.status || 'accepted',
        readWhen: Array.isArray(frontmatter?.read_when) 
          ? frontmatter.read_when 
          : frontmatter?.read_when 
            ? [frontmatter.read_when] 
            : []
      };
    });
}

function generateReadme() {
  const docs = getDocFiles();
  const agentPack = getAgentPackFiles();
  const adrs = getADRFiles();
  
  const today = new Date().toISOString().split('T')[0];
  
  let content = `# RPMA Documentation

Auto-generated index of architecture documentation. Run \`node scripts/generate-docs-index.js\` to update.

## Quick Links

| Document | Summary |
|----------|---------|
${docs.map(d => `| [${d.title}](${d.path}) | ${d.summary} |`).join('\n')}

## Agent Knowledge Base

Fundamental guides for developers and AI agents.

| Guide | Summary |
|-------|---------|
${agentPack.map(g => `| [${g.title}](${g.path}) | ${g.summary} |`).join('\n')}

## Architecture Decision Records

See [ADR Index](./adr/README.md) for full details.

### Core Architecture

| ADR | Title | Status |
|-----|-------|--------|
${adrs.filter(a => ['architecture', 'persistence', 'auth', 'types'].includes(a.domain)).map(a => 
  `| [${a.number.toString().padStart(3, '0')}](${a.path}) | ${a.title} | ${a.status === 'accepted' ? '✅' : a.status} |`
).join('\n')}

### Data & Infrastructure

| ADR | Title | Status |
|-----|-------|--------|
${adrs.filter(a => ['data', 'migrations', 'caching', 'ipc', 'performance'].includes(a.domain)).map(a => 
  `| [${a.number.toString().padStart(3, '0')}](${a.path}) | ${a.title} | ${a.status === 'accepted' ? '✅' : a.status} |`
).join('\n')}

### Frontend & State

| ADR | Title | Status |
|-----|-------|--------|
${adrs.filter(a => ['frontend', 'state'].includes(a.domain)).map(a => 
  `| [${a.number.toString().padStart(3, '0')}](${a.path}) | ${a.title} | ${a.status === 'accepted' ? '✅' : a.status} |`
).join('\n')}

### Cross-Cutting Concerns

| ADR | Title | Status |
|-----|-------|--------|
${adrs.filter(a => ['boundaries', 'events', 'validation', 'observability'].includes(a.domain)).map(a => 
  `| [${a.number.toString().padStart(3, '0')}](${a.path}) | ${a.title} | ${a.status === 'accepted' ? '✅' : a.status} |`
).join('\n')}

## When to Read What

`;

  // Group by read_when scenarios
  const scenarios = {};
  const allDocs = [...docs, ...agentPack, ...adrs];
  for (const doc of allDocs) {
    for (const scenario of doc.readWhen) {
      if (!scenarios[scenario]) {
        scenarios[scenario] = [];
      }
      scenarios[scenario].push(doc.title);
    }
  }
  
  for (const [scenario, docList] of Object.entries(scenarios)) {
    content += `- **${scenario}**: ${docList.join(', ')}\n`;
  }
  
  content += `
## Related Files

- [AGENTS.md](../AGENTS.md) - Engineering rules and conventions
- [README.md](../README.md) - Project overview

---

*Generated: ${today}*
`;
  
  return content;
}

// Main
const readme = generateReadme();
const readmePath = path.join(DOCS_DIR, 'README.md');
fs.writeFileSync(readmePath, readme, 'utf-8');
console.log(`✓ Generated ${readmePath}`);
