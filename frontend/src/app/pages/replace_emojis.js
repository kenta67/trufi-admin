const fs = require('fs');
const path = require('path');

const iconMap = {
    '👥': "<i class='bx bx-group'></i> ",
    '📋': "<i class='bx bx-clipboard'></i> ",
    '✅': "<i class='bx bx-check-circle'></i> ",
    '🗺': "<i class='bx bx-map-alt'></i> ",
    '✓': "<i class='bx bx-check'></i> ",
    '✗': "<i class='bx bx-x'></i> ",
    '📊': "<i class='bx bx-bar-chart-alt-2'></i> ",
    '⚡': "<i class='bx bx-bolt-circle'></i> ",
    '📝': "<i class='bx bx-edit'></i> ",
    '📭': "<i class='bx bx-inbox'></i> ",
    '👤': "<i class='bx bx-user'></i> ",
    '🚧': "<i class='bx bx-traffic-cone'></i> ",
    '🕳': "<i class='bx bx-radio-circle'></i> ",
    '🔄': "<i class='bx bx-refresh'></i> ",
    '🎉': "<i class='bx bx-party'></i> ",
    '📌': "<i class='bx bx-pin'></i> ",
    '📦': "<i class='bx bx-package'></i> ",
    '✍': "<i class='bx bx-edit-alt'></i> ",
    '⛔': "<i class='bx bx-block'></i> ",
    '💾': "<i class='bx bx-save'></i> ",
    '✕': "<i class='bx bx-x'></i> ",
    '📤': "<i class='bx bx-upload'></i> ",
    '📁': "<i class='bx bx-folder'></i> ",
    '⏳': "<i class='bx bx-time-five'></i> ",
    '🚀': "<i class='bx bx-rocket'></i> ",
    '❌': "<i class='bx bx-x-circle'></i> ",
    '📜': "<i class='bx bx-receipt'></i> ",
    '🟢': "<i class='bx bx-radio-circle-marked'></i> ",
    '⚪': "<i class='bx bx-circle'></i> ",
    '🔍': "<i class='bx bx-search'></i> ",
    '👁': "<i class='bx bx-show'></i> ",
    '🔧': "<i class='bx bx-wrench'></i> ",
    '🗑': "<i class='bx bx-trash'></i> ",
    '⚙': "<i class='bx bx-cog'></i> ",
    '💰': "<i class='bx bx-dollar-circle'></i> ",
    '✏': "<i class='bx bx-edit'></i> ",
    '⚠': "<i class='bx bx-error'></i> "
};

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.ts') || file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('C:/Users/kenta/.gemini/antigravity-ide/scratch/trufi-admin/frontend/src/app/pages');

let changedFilesCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Remove U+FE0F Variation Selector 16
    content = content.replace(/\uFE0F/g, '');
    
    Object.keys(iconMap).forEach(emoji => {
        const regex = new RegExp(emoji, 'g');
        content = content.replace(regex, iconMap[emoji]);
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFilesCount++;
        console.log('Updated: ' + file);
    }
});

console.log('Total files updated: ' + changedFilesCount);
