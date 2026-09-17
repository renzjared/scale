const unitToMeters = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };

// App State
let history = JSON.parse(localStorage.getItem('scaleHistory')) || [];
let savedItems = JSON.parse(localStorage.getItem('scaleSavedItems')) || [];
let folders = JSON.parse(localStorage.getItem('scaleFolders')) || [];
let debounceTimer;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderHistory();
    renderTree();
});

// --- Dark Mode Logic ---
function initTheme() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcon(false);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (isDark) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    } else {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    }
}

// --- Calc Logic ---
function getRatio() {
    const left = parseFloat(document.getElementById('ratioLeft').value) || 1;
    const right = parseFloat(document.getElementById('ratioRight').value) || 1;
    return right / left;
}

function calculate(source) {
    const ratio = getRatio();
    const realValueInput = document.getElementById('realValue');
    const scaleValueInput = document.getElementById('scaleValue');
    const realUnit = document.getElementById('realUnit').value;
    const scaleUnit = document.getElementById('scaleUnit').value;

    let hasValidData = false;

    if (source === 'real') {
        const realValue = parseFloat(realValueInput.value);
        if (!isNaN(realValue)) {
            const scaleValue = (realValue * unitToMeters[realUnit]) / ratio / unitToMeters[scaleUnit];
            scaleValueInput.value = parseFloat(scaleValue.toFixed(4));
            hasValidData = true;
        } else {
            scaleValueInput.value = '';
        }
    } else if (source === 'scale') {
        const scaleValue = parseFloat(scaleValueInput.value);
        if (!isNaN(scaleValue)) {
            const realValue = (scaleValue * unitToMeters[scaleUnit]) * ratio / unitToMeters[realUnit];
            realValueInput.value = parseFloat(realValue.toFixed(4));
            hasValidData = true;
        } else {
            realValueInput.value = '';
        }
    }

    clearTimeout(debounceTimer);
    if (hasValidData) {
        debounceTimer = setTimeout(() => {
            saveToHistory({
                ratio: `${document.getElementById('ratioLeft').value}:${document.getElementById('ratioRight').value}`,
                real: `${realValueInput.value} ${realUnit}`,
                scale: `${scaleValueInput.value} ${scaleUnit}`
            });
        }, 1500);
    }
}

// --- History Logic ---
function saveToHistory(entry) {
    if (history.length > 0 && history[0].real === entry.real && history[0].scale === entry.scale && history[0].ratio === entry.ratio) return; 
    history.unshift(entry); 
    if (history.length > 15) history.pop(); 
    localStorage.setItem('scaleHistory', JSON.stringify(history));
    renderHistory();
}

function clearHistory() {
    history = [];
    localStorage.removeItem('scaleHistory');
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<li class="text-sm font-bold text-gray-400">No recent conversions</li>';
        return;
    }
    history.forEach(item => {
        list.innerHTML += `
            <li class="p-3 bg-white dark:bg-duo-darkCard border-2 border-gray-100 dark:border-duo-darkBorder rounded-2xl shadow-sm">
                <div class="font-extrabold text-gray-700 dark:text-gray-300 mb-1">1:${item.ratio.split(':')[1]}</div>
                <div class="text-gray-500 dark:text-gray-400 font-bold text-sm flex justify-between"><span>${item.real}</span> ➔ <span>${item.scale}</span></div>
            </li>
        `;
    });
}

// --- Folders & Tree Logic ---
function populateFolderSelects() {
    const saveSelect = document.getElementById('saveFolderSelect');
    const moveSelect = document.getElementById('moveFolderSelect');
    const options = `<option value="root">None (Root)</option>` + folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    saveSelect.innerHTML = options;
    moveSelect.innerHTML = options;
}

function toggleFolder(folderId) {
    const f = folders.find(f => f.id === folderId);
    if (f) {
        f.expanded = !f.expanded;
        localStorage.setItem('scaleFolders', JSON.stringify(folders));
        renderTree();
    }
}

function deleteFolder(folderId) {
    if(confirm("Delete folder and all its contents?")) {
        folders = folders.filter(f => f.id !== folderId);
        savedItems = savedItems.filter(i => i.folderId !== folderId);
        saveState();
    }
}

function renderTree() {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '';
    
    if (folders.length === 0 && savedItems.length === 0) {
        container.innerHTML = '<div class="text-sm font-bold text-gray-400">No saved labels.</div>';
        return;
    }

    folders.forEach(folder => {
        const folderItems = savedItems.filter(i => i.folderId === folder.id);
        const chevron = folder.expanded 
            ? `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>`
            : `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>`;
        
        let html = `
            <div class="mb-2">
                <div class="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#1A262C] rounded-xl cursor-pointer group transition">
                    <div class="flex items-center gap-2 flex-1" onclick="toggleFolder(${folder.id})">
                        ${chevron}
                        <svg class="w-5 h-5 text-duo-blue" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                        <span class="font-extrabold text-gray-700 dark:text-gray-200">${folder.name}</span>
                    </div>
                    <button onclick="deleteFolder(${folder.id})" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
        `;

        if (folder.expanded) {
            html += `<div class="ml-6 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-duo-darkBorder pl-4">`;
            if (folderItems.length === 0) {
                html += `<div class="text-xs font-bold text-gray-400 py-1">Empty</div>`;
            } else {
                folderItems.forEach(item => html += generateItemHTML(item));
            }
            html += `</div>`;
        }
        html += `</div>`;
        container.innerHTML += html;
    });

    const rootItems = savedItems.filter(i => i.folderId === 'root' || !i.folderId);
    if(rootItems.length > 0 && folders.length > 0) {
        container.innerHTML += `<div class="mt-4 mb-2 border-t-2 border-gray-100 dark:border-duo-darkBorder pt-2"></div>`;
    }
    rootItems.forEach(item => container.innerHTML += generateItemHTML(item));
}

function generateItemHTML(item) {
    return `
        <div class="p-3 bg-white dark:bg-duo-darkCard border-2 border-gray-200 dark:border-duo-darkBorder rounded-2xl shadow-sm relative group mb-2">
            <div class="pr-6">
                <div class="font-extrabold text-gray-800 dark:text-white mb-1 break-words">${item.label}</div>
                <div class="flex justify-between text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">
                    <span>Ratio:</span> <span>${item.ratio}</span>
                </div>
                <div class="flex justify-between text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">
                    <span>Real:</span> <span>${item.real}</span>
                </div>
                <div class="flex justify-between text-duo-green dark:text-duo-green text-xs font-extrabold">
                    <span>Scale:</span> <span>${item.scale}</span>
                </div>
            </div>
            <div class="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onclick="openMoveModal(${item.id})" class="text-gray-300 hover:text-duo-blue" title="Move">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                </button>
                <button onclick="deleteSavedItem(${item.id})" class="text-gray-300 hover:text-red-500" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    `;
}

// --- Modals Logic ---
function closeModals() {
    ['saveModal', 'moveModal', 'addFolderModal'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
        document.getElementById(id).classList.remove('flex');
    });
}

function openSaveModal() {
    const realVal = document.getElementById('realValue').value;
    const scaleVal = document.getElementById('scaleValue').value;
    if (!realVal || !scaleVal) return alert("Please enter a dimension to convert first.");
    
    document.getElementById('modalPreview').innerText = `${document.getElementById('ratioLeft').value}:${document.getElementById('ratioRight').value} • ${realVal}${document.getElementById('realUnit').value} ➔ ${scaleVal}${document.getElementById('scaleUnit').value}`;
    populateFolderSelects();
    
    document.getElementById('saveModal').classList.remove('hidden');
    document.getElementById('saveModal').classList.add('flex');
    document.getElementById('saveLabel').focus();
}

function confirmSave() {
    const label = document.getElementById('saveLabel').value.trim() || 'Untitled';
    const folderId = document.getElementById('saveFolderSelect').value;
    
    savedItems.unshift({
        id: Date.now(),
        label: label,
        folderId: folderId === 'root' ? 'root' : parseInt(folderId),
        ratio: `${document.getElementById('ratioLeft').value}:${document.getElementById('ratioRight').value}`,
        real: `${document.getElementById('realValue').value} ${document.getElementById('realUnit').value}`,
        scale: `${document.getElementById('scaleValue').value} ${document.getElementById('scaleUnit').value}`
    });
    
    saveState();
    closeModals();
    document.getElementById('saveLabel').value = '';
}

function openAddFolderModal() {
    document.getElementById('addFolderModal').classList.remove('hidden');
    document.getElementById('addFolderModal').classList.add('flex');
    document.getElementById('folderName').focus();
}

function confirmAddFolder() {
    const name = document.getElementById('folderName').value.trim();
    if(name) {
        folders.push({ id: Date.now(), name: name, expanded: true });
        saveState();
    }
    closeModals();
    document.getElementById('folderName').value = '';
}

function openMoveModal(itemId) {
    populateFolderSelects();
    document.getElementById('moveItemId').value = itemId;
    document.getElementById('moveModal').classList.remove('hidden');
    document.getElementById('moveModal').classList.add('flex');
}

function confirmMove() {
    const itemId = parseInt(document.getElementById('moveItemId').value);
    const folderId = document.getElementById('moveFolderSelect').value;
    
    const item = savedItems.find(i => i.id === itemId);
    if(item) {
        item.folderId = folderId === 'root' ? 'root' : parseInt(folderId);
        saveState();
    }
    closeModals();
}

function deleteSavedItem(id) {
    savedItems = savedItems.filter(item => item.id !== id);
    saveState();
}

function saveState() {
    localStorage.setItem('scaleSavedItems', JSON.stringify(savedItems));
    localStorage.setItem('scaleFolders', JSON.stringify(folders));
    renderTree();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
}

// --- Snake Mini Game Logic ---
let snakeInterval;
let snake = [];
let food = {};
let direction = {x: 1, y: 0};
let nextDirection = {x: 1, y: 0};
let score = 0;
const gridSize = 15;

function openMiniGame() {
    document.getElementById('gameModal').classList.remove('hidden');
    document.getElementById('gameModal').classList.add('flex');
    startSnakeGame();
}

function closeMiniGame() {
    document.getElementById('gameModal').classList.add('hidden');
    document.getElementById('gameModal').classList.remove('flex');
    clearInterval(snakeInterval);
}

function startSnakeGame() {
    clearInterval(snakeInterval);
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('flex');
    
    snake = [ {x: 105, y: 105}, {x: 90, y: 105}, {x: 75, y: 105} ];
    direction = {x: 1, y: 0};
    nextDirection = {x: 1, y: 0};
    score = 0;
    document.getElementById('gameScore').innerText = score;
    spawnFood();
    
    snakeInterval = setInterval(gameLoop, 140);
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * 16) * gridSize,
        y: Math.floor(Math.random() * 16) * gridSize
    };
    if(snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        spawnFood();
    }
}

function gameLoop() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x * gridSize, y: snake[0].y + direction.y * gridSize };
    
    // Wall and self collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height || snake.some(s => s.x === head.x && s.y === head.y)) {
        return gameOver();
    }
    
    snake.unshift(head);
    
    // Food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('gameScore').innerText = score;
        spawnFood();
    } else {
        snake.pop();
    }
    
    // Draw Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Food (Apple red)
    ctx.fillStyle = '#FF4B4B'; 
    ctx.beginPath();
    ctx.roundRect(food.x, food.y, gridSize - 1, gridSize - 1, 4);
    ctx.fill();
    
    // Draw Snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#58CC02' : '#58A700'; // Duo green
        ctx.beginPath();
        ctx.roundRect(segment.x, segment.y, gridSize - 1, gridSize - 1, index === 0 ? 4 : 2);
        ctx.fill();
    });
}

function gameOver() {
    clearInterval(snakeInterval);
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('flex');
}

function snakeDir(dir) {
    if (dir.x !== 0 && direction.x === 0) nextDirection = dir;
    if (dir.y !== 0 && direction.y === 0) nextDirection = dir;
}

window.addEventListener('keydown', e => {
    if (document.getElementById('gameModal').classList.contains('hidden')) return;
    switch(e.key) {
        case 'ArrowUp': case 'w': snakeDir({x: 0, y: -1}); break;
        case 'ArrowDown': case 's': snakeDir({x: 0, y: 1}); break;
        case 'ArrowLeft': case 'a': snakeDir({x: -1, y: 0}); break;
        case 'ArrowRight': case 'd': snakeDir({x: 1, y: 0}); break;
    }
});