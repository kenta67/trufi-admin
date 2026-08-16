const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.component.ts') && !fullPath.includes('login.component.ts') && !fullPath.includes('layout.component.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace hardcoded dark colors with CSS variables
      content = content.replace(/background:\s*#111827/g, 'background: var(--bg-surface)');
      content = content.replace(/background:\s*#1f2937/g, 'background: var(--bg-surface-hover)');
      content = content.replace(/border-color:\s*#1f2937/g, 'border-color: var(--border-color)');
      content = content.replace(/border-bottom:\s*1px solid #1f2937/g, 'border-bottom: 1px solid var(--border-color)');
      content = content.replace(/border:\s*1px solid #1f2937/g, 'border: 1px solid var(--border-color)');
      content = content.replace(/border:\s*1px solid #374151/g, 'border: 1px solid var(--border-color)');
      content = content.replace(/color:\s*#9ca3af/g, 'color: var(--text-muted)');
      content = content.replace(/color:\s*#f9fafb/g, 'color: var(--text-main)');
      content = content.replace(/color:\s*#d1d5db/g, 'color: var(--text-muted)');
      content = content.replace(/color:\s*#4b5563/g, 'color: var(--text-muted)');
      content = content.replace(/color:\s*#6b7280/g, 'color: var(--text-muted)');
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(path.join(__dirname, 'src', 'app', 'pages'));
console.log('✅ Estilos limpiados');
