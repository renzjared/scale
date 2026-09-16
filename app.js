const unitToMeters = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };

// App State
let history = JSON.parse(localStorage.getItem('scaleHistory')) || [];
let savedItems = JSON.parse(localStorage.getItem('scaleSaved')) || [];
let debounceTimer;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    renderSaved();
});

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
            const realInMeters = realValue * unitToMeters[realUnit];
            const scaleInMeters = realInMeters / ratio;
            const scaleValue = scaleInMeters / unitToMeters[scaleUnit];
            // Fix to 4 decimals to keep it clean but accurate
            scaleValueInput.value = parseFloat(scaleValue.toFixed(4));
            hasValidData = true;
        } else {
            scaleValueInput.value = '';
        }
    } 
    else if (source === 'scale') {
        const scaleValue = parseFloat(scaleValueInput.value);
        if (!isNaN(scaleValue)) {
            const scaleInMeters = scaleValue * unitToMeters[scaleUnit];
            const realInMeters = scaleInMeters * ratio;
            const realValue = realInMeters / unitToMeters[realUnit];
            realValueInput.value = parseFloat(realValue.toFixed(4));
            hasValidData = true;
        } else {
            realValueInput.value = '';
        }
    }

    // Auto-save to recent history (debounced)
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
    if (history.length > 0) {
        const last = history[0];
        if (last.real === entry.real && last.scale === entry.scale && last.ratio === entry.ratio) return; 
    }
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
    if (!list) return;
    list.innerHTML = '';
    
    if (history.length === 0) {
        list.innerHTML = '<li class="text-sm text-zinc-400 italic">No recent conversions</li>';
        return;
    }

    history.forEach(item => {
        list.innerHTML += `
            <li class="p-3 bg-white border border-stone-200 rounded-lg text-sm shadow-sm">
                <div class="font-semibold text-stone-700 mb-1">1:${item.ratio.split(':')[1]}</div>
                <div class="text-zinc-600 flex justify-between"><span>${item.real}</span> ➔ <span>${item.scale}</span></div>
            </li>
        `;
    });
}

// --- Save & Label Logic ---

function openModal() {
    const realVal = document.getElementById('realValue').value;
    const scaleVal = document.getElementById('scaleValue').value;
    
    // Prevent opening if fields are empty
    if (!realVal || !scaleVal) {
        alert("Please enter a dimension to convert first.");
        return;
    }

    // Populate preview text
    const ratio = `${document.getElementById('ratioLeft').value}:${document.getElementById('ratioRight').value}`;
    const realStr = `${realVal} ${document.getElementById('realUnit').value}`;
    const scaleStr = `${scaleVal} ${document.getElementById('scaleUnit').value}`;
    document.getElementById('modalPreview').innerText = `Ratio ${ratio} • ${realStr} ➔ ${scaleStr}`;

    const modal = document.getElementById('saveModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('saveLabel').focus();
}

function closeModal() {
    const modal = document.getElementById('saveModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('saveLabel').value = '';
}

function confirmSave() {
    const labelInput = document.getElementById('saveLabel').value.trim();
    const finalLabel = labelInput || 'Untitled Dimension';

    const entry = {
        id: Date.now(), // Unique ID for deleting later
        label: finalLabel,
        ratio: `${document.getElementById('ratioLeft').value}:${document.getElementById('ratioRight').value}`,
        real: `${document.getElementById('realValue').value} ${document.getElementById('realUnit').value}`,
        scale: `${document.getElementById('scaleValue').value} ${document.getElementById('scaleUnit').value}`
    };

    savedItems.unshift(entry); // Add to top
    localStorage.setItem('scaleSaved', JSON.stringify(savedItems));
    
    renderSaved();
    closeModal();
}

function deleteSavedItem(id) {
    savedItems = savedItems.filter(item => item.id !== id);
    localStorage.setItem('scaleSaved', JSON.stringify(savedItems));
    renderSaved();
}

function renderSaved() {
    const list = document.getElementById('savedList');
    if (!list) return;
    list.innerHTML = '';
    
    if (savedItems.length === 0) {
        list.innerHTML = '<li class="text-sm text-zinc-400 italic">No saved labels yet.</li>';
        return;
    }

    savedItems.forEach(item => {
        list.innerHTML += `
            <li class="p-3 bg-stone-800 text-white rounded-lg text-sm shadow-md relative group">
                <div class="pr-6">
                    <div class="font-bold text-stone-100 mb-2 border-b border-stone-600 pb-1 break-words">${item.label}</div>
                    <div class="flex justify-between text-stone-300 text-xs mb-1">
                        <span>Ratio:</span> <span>${item.ratio}</span>
                    </div>
                    <div class="flex justify-between text-stone-300 text-xs mb-1">
                        <span>Real:</span> <span>${item.real}</span>
                    </div>
                    <div class="flex justify-between text-stone-300 text-xs">
                        <span>Scale:</span> <span class="text-white font-medium">${item.scale}</span>
                    </div>
                </div>
                <!-- Delete Button (appears on hover) -->
                <button onclick="deleteSavedItem(${item.id})" class="absolute top-3 right-3 text-stone-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </li>
        `;
    });
}