// Tower Defense - Uppdaterad version

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Spelstatus
let money = 1000;
let waveNumber = 0;
let enemies = [];
let towers = [];
let bullets = [];
let lightningChains = []; // för blixt-arc visuell effekt
let isPaused = false;
let gameWaveActive = false;
let selectedTowerType = 'gun';
let selectedTower = null;
let towerCounter = 0;
let playerHealth = 0;        // återstående liv/hälsa

// svårighetshantering
let difficulty = 'easy';      // lätt/medium/svår
let gameStarted = false;

// fiendedefinitioner (hälsa, färg, hastighet)
const ENEMY_TYPES = {
    red:   {health: 10,  color: '#f00', speed: 1.0},
    blue:  {health: 20,  color: '#00f', speed: 1.1},
    green: {health: 30,  color: '#0f0', speed: 1.2},
    black: {health: 250, color: '#000', speed: 2.0},
    white: {health: 1000, color: '#fff', speed: 0.5} 
};

// rundmallar för lätt svårighet
const EASY_ROUNDS = [
    [{type: 'red', count: 10}],
    [{type: 'red', count: 20}],
    [{type: 'red', count: 25}, {type: 'blue', count: 10}],
    [{type: 'blue', count: 20}],
    [{type: 'blue', count: 25}, {type: 'green', count: 10}],
    [{type: 'green', count: 20}],
    [{type: 'green', count: 40}, {type: 'black', count: 10}],
    [{type: 'green', count: 80}, {type: 'black', count: 20}],
    [{type: 'green', count: 120}, {type: 'black', count: 50}],
    [{type: 'green', count: 100}, {type: 'black', count: 100}],
    [{type: 'white', count: 50}, {type: 'black', count: 100}],
];

function scaleRounds(rounds, factor) {
    return rounds.map(round =>
        round.map(entry => ({type: entry.type, count: Math.ceil(entry.count * factor)}))
    );
}

const WAVE_CONFIGS = {
    easy: EASY_ROUNDS,
    medium: scaleRounds(EASY_ROUNDS, 1.5),
    hard: scaleRounds(EASY_ROUNDS, 2),
    lava: scaleRounds(EASY_ROUNDS, 2)  // samma som hard
};

// Rutnätssystem
const GRID_SIZE = 20;

// kartlayout kodad med enskilda bokstäver: G = byggbar (land), P = väg, C = klippa, W = vatten_väg. 25 rader av 40 kolumner (samma storlek som canvas / GRID_SIZE).
const MAP_LAYOUT = [
"CCCCCGGGGGGGGGGGGGGGGGGGGCCCCCGGWWWCCCCC",
"CCCCCGGGGGGGGGGGGGGGGGGGGCCCCCGGWWWCCCCC",
"CCCCCGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWCCCCC",
"CCCCCGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWCCCCC",
"CCCCCGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWCCCCC",
"GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGPPPPPPPPPPPGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGGGGGGGGCCCPGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGGGGGGGGGCCPGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGGGGGGGGGGGPGGGGGGGGGGGGGGGGWWWGGGGG",
"GGGGGWWWWWWWWWWPWWWWWWWWWWWWWWWWWWWGGGGG",
"GGGGGWWWWWWWWWWPWWWWWWWWWWWWWWWWWWWGGGGG",
"GGGGGWWWWWWWWWWPWWWWWWWWWWWWWWWWWWWGGGGG",
"CCGGGWWWWWWWWWWPWWWWWWWWWWWWWWWWWWWGGGGG",
"CCGGGWWWWGGGGGGPGGGGGGGGGGGGGGGGGGGGGGGG",
"CCGGGWWWWGGGGGGPGGGGGGGCCCCGGGGGGGGGGGGG",
"CCGGGWWWWGGGGGGPGGGGGGGCCCCGGGGGGGGGGGGG",
"CCGGGWWWWGGGGGGPGGGGGGGGGGGGGGGGGGGGGGGG",
"CCCCCWWWWGGGGGGPPPPPPPPPPPPPPPPPPPPCCCCC",
"CCCCCWWWWGGGGGGGGGGGGGGGGGGGGGGGGGPCCCCC",
"CCCCCWWWWGGGGGGGGGGGGGGGGGGGGGGGGGPCCCCC",
"CCCCCWWWWGGGGGGGGGGGGGGGGGGGGGGGGGPCCCCC",
"CCCCCWWWWGGGGGGGGGGGGGGGGGGGGGGGGGPPPPPP",
];

const GRID_HEIGHT = MAP_LAYOUT.length;
const GRID_WIDTH = MAP_LAYOUT[0].length;

// Celltyper
const CELL_TYPE = {
    BUILDABLE: 'buildable',  // grön
    PATH: 'path',            // ljusgrå
    CLIFF: 'cliff',          // mörkgrå
    WATER: 'water',          // blå vatten
    WATER_PATH: 'water_path', // blå väg för vatten
    LAVA: 'lava'             // röd lava
};

// Gridden - definierar banans layout
let grid = [];

// Maximalt antal uppgraderingar per torngren (skada / eldhastighet / räckvidd)
const MAX_UPGRADES_PER_BRANCH = 5;

// Torntyper
const TOWER_TYPES = {
    gun: {
        cost: 75,
        range: 120,
        fireRate: 0.5,
        damage: 5,
        isLandTower: true,
        isCliffTower: false,
        isWaterTower: false,
        color: '#0f0',
        description: 'Gun Tower'
    },
    sniper: {
        cost: 250,
        range: 200,
        fireRate: 1.0,  // Snabbare än tidigare (var 2.0)
        damage: 50,
        isLandTower: false,
        isCliffTower: true,
        isWaterTower: false,
        color: '#f0f',
        description: 'Sniper Tower'
    },
    pirate: {
        cost: 550,
        range: 150,
        fireRate: 1.2,
        damage: 8,
        isLandTower: false,
        isCliffTower: false,
        isWaterTower: true,
        color: '#00f',
        description: 'Piratbåt',
        shots: 6
    },
    blikten: {
        cost: 1000,
        range: 300,
        fireRate: 1.5,
        damage: 100,
        isLandTower: true,
        isCliffTower: false,
        isWaterTower: false,
        color: '#ff0',
        description: 'Blixtrar'    },
    kanon: {
        cost: 800,
        range: 250,
        fireRate: 0.5,
        damage: 200,
        isLandTower: false,
        isCliffTower: true,
        isWaterTower: false,
        color: '#800',
        description: 'Kanon',
        aoeRadius: 100    }
};

// Initiera rutnät från MAP_LAYOUT
function initializeGrid() {
    grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        const line = MAP_LAYOUT[y] || '';
        const row = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            const ch = line[x] || 'G';
            let cellType;
            switch (ch) {
                case 'G': cellType = CELL_TYPE.BUILDABLE; break;
                case 'P': cellType = CELL_TYPE.PATH; break;
                case 'C': cellType = CELL_TYPE.CLIFF; break;
                case 'W': cellType = CELL_TYPE.WATER_PATH; break;
                default: cellType = CELL_TYPE.BUILDABLE; break;
            }
            row.push(cellType);
        }
        grid.push(row);
    }
}

function activateLavaMode() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === CELL_TYPE.BUILDABLE || grid[y][x] === CELL_TYPE.WATER_PATH) {
                grid[y][x] = CELL_TYPE.LAVA;
            }
        }
    }
}

function createGradient(x, y, color, radius) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, lightenColor(color, 0.5));
    gradient.addColorStop(1, color);
    return gradient;
}

function lightenColor(color, factor) {
    // Enkel funktion för att göra färg ljusare
    if (color.startsWith('#')) {
        // Konvertera 3-tecken hex till 6-tecken
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    return color;
}

// Rita rutnät
function drawGrid() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cellType = grid[y][x];
            const px = x * GRID_SIZE;
            const py = y * GRID_SIZE;
            
            let color;
            if (cellType === CELL_TYPE.BUILDABLE) {
                color = '#176817';  // Mörkgrön
            } else if (cellType === CELL_TYPE.PATH) {
                color = '#999';  // Ljusgrå
            } else if (cellType === CELL_TYPE.WATER_PATH) {
                color = '#0066cc';  // Blå vatten
            } else if (cellType === CELL_TYPE.CLIFF) {
                color = '#444';  // Mörkgrå
            } else if (cellType === CELL_TYPE.LAVA) {
                color = 'rgb(255, 85, 0)';  // Röd lava
            }
            
            ctx.fillStyle = createGradient(px + GRID_SIZE/2, py + GRID_SIZE/2, color, GRID_SIZE/2);
            ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, py, GRID_SIZE, GRID_SIZE);
        }
    }
}

// Hämta väg som waypoints genom att gå genom rutnätsceller markerade PATH
function getPathWaypoints() {
    const cells = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === CELL_TYPE.PATH) {
                cells.push({ x, y });
            }
        }
    }
    if (cells.length === 0) return [];

    // börja vid översta, vänstra vägcellen
    let start = cells[0];
    for (const c of cells) {
        if (c.y < start.y || (c.y === start.y && c.x < start.x)) {
            start = c;
        }
    }

    const visited = new Set();
    const path = [];
    let current = start;
    visited.add(`${current.y},${current.x}`);
    path.push({ x: current.x * GRID_SIZE + GRID_SIZE / 2, y: current.y * GRID_SIZE + GRID_SIZE / 2 });

    const dirs = [ [0,1], [1,0], [0,-1], [-1,0] ];
    while (true) {
        let next = null;
        for (const [dx, dy] of dirs) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT
                && grid[ny][nx] === CELL_TYPE.PATH
                && !visited.has(`${ny},${nx}`)) {
                next = { x: nx, y: ny };
                break;
            }
        }
        if (!next) break;
        visited.add(`${next.y},${next.x}`);
        path.push({ x: next.x * GRID_SIZE + GRID_SIZE / 2, y: next.y * GRID_SIZE + GRID_SIZE / 2 });
        current = next;
    }

    return path;
}

const path = [];

function initPath() {
    path.length = 0;
    const waypoints = getPathWaypoints();
    path.push(...waypoints);
}

// UI-element
const moneyEl = document.getElementById('money');
const waveEl = document.getElementById('wave');
const upgradeDamageBtn = document.getElementById('upgradeDamageBtn');
const upgradeFireRateBtn = document.getElementById('upgradeFireRateBtn');
const upgradeRangeBtn = document.getElementById('upgradeRangeBtn');
const upgradeMenu = document.getElementById('upgradeMenu');
const menuLevel = document.getElementById('menuLevel');
const menuDamage = document.getElementById('menuDamage');
const menuFireRate = document.getElementById('menuFireRate');
const menuRange = document.getElementById('menuRange');
const menuTowerNum = document.getElementById('menuTowerNum');
const pauseIndicator = document.getElementById('pauseIndicator');

// Tornval
const towerOptions = document.querySelectorAll('.tower-option');
towerOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        towerOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedTowerType = opt.dataset.tower;
        upgradeMenu.style.display = 'none';
    });
});

// verktyg - på-skärm-meddelande för spelare
const messageEl = document.getElementById('message');
function showMessage(text) {
    if (!messageEl) return;
    messageEl.textContent = text;
    if (text === 'Game Over') {
        messageEl.style.fontSize = '3em';
        messageEl.style.fontWeight = 'bold';
        messageEl.style.color = '#f00';  // Röd färg för Game Over
    } else {
        messageEl.style.fontSize = '0.9em';
        messageEl.style.fontWeight = 'normal';
        messageEl.style.color = '#fff';  // Vit färg för andra meddelanden
    }
    messageEl.style.opacity = 1;
    const timeout = text === 'Game Over' ? 5000 : 1200;  // Visa Game Over längre
    setTimeout(() => {
        if (messageEl) messageEl.style.opacity = 0;
    }, timeout);
}

// Canvas-klick - placera torn
canvas.addEventListener('click', (e) => {
    if (isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    // ta hänsyn till CSS-skalning: konvertera webbläsarkoordinater till canvas-pixlar
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    
    // debug-info för placeringsproblem
    console.log('canvas click raw', e.clientX, e.clientY, '->', mx.toFixed(1), my.toFixed(1));
    
    // Kontrollera om klickat på torn för att välja det
    for (let i = 0; i < towers.length; i++) {
        let t = towers[i];
        if (Math.hypot(mx - t.x, my - t.y) < 15) {
            selectedTower = t;
            showTowerMenu(t);
            return;
        }
    }
    
    // Placera nytt torn
    const gridX = Math.floor(mx / GRID_SIZE);
    const gridY = Math.floor(my / GRID_SIZE);
    console.log('grid coords', gridX, gridY, 'selected', selectedTowerType, 'money', money);
    
    if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
        const cellType = grid[gridY][gridX];
        const towerType = TOWER_TYPES[selectedTowerType];
        console.log('cellType', cellType, 'towerType', towerType);
        
        // Kontrollera om cell tillåter denna torntyp. landtorn endast på byggbar, vattentorn endast på vatten, klipptorn endast på klippa
        let canPlace = false;
        if (cellType === CELL_TYPE.BUILDABLE && towerType.isLandTower) {
            canPlace = true;
        } else if (cellType === CELL_TYPE.CLIFF && towerType.isCliffTower) {
            canPlace = true;
        } else if (cellType === CELL_TYPE.WATER_PATH && towerType.isWaterTower) {
            canPlace = true;
        }
        if (cellType === CELL_TYPE.LAVA) {
            showMessage('Kan inte placera på lava!');
            return;
        }
        if (!canPlace) {
            console.log('cannot place: invalid terrain', cellType, 'for', towerType.description);
            if (cellType === CELL_TYPE.BUILDABLE) showMessage('Endast marktorn kan byggas här');
            else if (cellType === CELL_TYPE.CLIFF) showMessage('Endast cliff‑torn kan byggas här');
            else if (cellType === CELL_TYPE.WATER_PATH) showMessage('Endast vatten‑torn kan byggas här');
            else showMessage('Kan inte bygga här');
        }
        if (towerType && money < towerType.cost) {
            console.log('cannot place: not enough money', money, '<', towerType.cost);
            showMessage('Inte tillräckligt pengar');
        }
        
        if (canPlace && towerType && money >= towerType.cost) {
            const tower = {
                id: towerCounter++,
                type: selectedTowerType,
                x: gridX * GRID_SIZE + GRID_SIZE / 2,
                y: gridY * GRID_SIZE + GRID_SIZE / 2,
                // Behåll basstatistik så att vi kan räkna om efter att ha applicerat tak
                baseDamage: towerType.damage,
                baseFireRate: towerType.fireRate,
                baseRange: towerType.range,
                range: towerType.range,
                fireRate: towerType.fireRate,
                damage: towerType.damage,
                cooldown: 0,
                level: 1,
                upgrades: {
                    damage: 0,
                    fireRate: 0,
                    range: 0
                }
            };
            towers.push(tower);
            money -= towerType.cost;
            updateUI();
            upgradeMenu.style.display = 'none';
        }
    } else {
        console.log('click outside grid');
        showMessage('Utanför spelplanen');
    }
});

function getUpgradeMax(tower, branch) {
    const hasMaxBranch = ['damage', 'fireRate', 'range'].find(b => tower.upgrades[b] >= MAX_UPGRADES_PER_BRANCH);
    if (!hasMaxBranch) return MAX_UPGRADES_PER_BRANCH;
    return branch === hasMaxBranch ? MAX_UPGRADES_PER_BRANCH : 3;
}

function applyTowerUpgrades(tower) {
    // Klipp andra grenar när en når max
    const maxBranch = ['damage', 'fireRate', 'range'].find(b => tower.upgrades[b] >= MAX_UPGRADES_PER_BRANCH);
    if (maxBranch) {
        for (const b of ['damage', 'fireRate', 'range']) {
            if (b !== maxBranch && tower.upgrades[b] > 3) {
                tower.upgrades[b] = 3;
            }
        }
    }

    // Räkna om statistik baserat på bas + uppgraderingsantal
    tower.damage = tower.baseDamage + tower.upgrades.damage * 5;
    tower.fireRate = Math.max(0.1, tower.baseFireRate - tower.upgrades.fireRate * 0.15);
    tower.range = tower.baseRange + tower.upgrades.range * 30;

    tower.level = 1 + tower.upgrades.damage + tower.upgrades.fireRate + tower.upgrades.range;
}

function updateUpgradeButtons(tower) {
    if (!tower) return;
    updateUpgradeButtonsState(tower);
}

function updateUpgradeButtonsState(tower) {
    upgradeDamageBtn.disabled = tower.upgrades.damage >= getUpgradeMax(tower, 'damage');
    upgradeFireRateBtn.disabled = tower.upgrades.fireRate >= getUpgradeMax(tower, 'fireRate');
    upgradeRangeBtn.disabled = tower.upgrades.range >= getUpgradeMax(tower, 'range');
}

function updateUpgradeButtonLabels(tower) {
    const maxDamage = getUpgradeMax(tower, 'damage');
    const maxFireRate = getUpgradeMax(tower, 'fireRate');
    const maxRange = getUpgradeMax(tower, 'range');

    upgradeDamageBtn.textContent = `Uppgradera Skada (15) [${tower.upgrades.damage}/${maxDamage}]`;
    upgradeFireRateBtn.textContent = `Uppgradera Hastighet (15) [${tower.upgrades.fireRate}/${maxFireRate}]`;
    upgradeRangeBtn.textContent = `Uppgradera Räckvidd (20) [${tower.upgrades.range}/${maxRange}]`;
}

function showTowerMenu(tower) {
    const towerType = TOWER_TYPES[tower.type];
    menuTowerNum.textContent = tower.id;
    menuLevel.textContent = tower.level;
    menuDamage.textContent = tower.damage.toFixed(1);
    menuFireRate.textContent = (1 / tower.fireRate).toFixed(2);
    menuRange.textContent = tower.range.toFixed(0);
    upgradeMenu.style.display = 'block';
    updateUpgradeButtonsState(tower);
    updateUpgradeButtonLabels(tower);
}

// Uppgraderingsknappar - ADDITIV inte multiplikativ
upgradeDamageBtn.addEventListener('click', () => {
    if (!selectedTower) return;
    if (selectedTower.upgrades.damage >= getUpgradeMax(selectedTower, 'damage')) {
        showMessage('Max antal skadeuppgraderingar nådd');
        return;
    }
    if (money < 50) {
        showMessage('Inte tillräckligt pengar');
        return;
    }

    money -= 50;
    selectedTower.upgrades.damage++;
    applyTowerUpgrades(selectedTower);

    updateUI();
    showTowerMenu(selectedTower);
});

upgradeFireRateBtn.addEventListener('click', () => {
    if (!selectedTower) return;
    if (selectedTower.upgrades.fireRate >= getUpgradeMax(selectedTower, 'fireRate')) {
        showMessage('Max antal eldshastighetsuppgraderingar nådd');
        return;
    }
    if (money < 50) {
        showMessage('Inte tillräckligt pengar');
        return;
    }

    money -= 50;
    selectedTower.upgrades.fireRate++;
    applyTowerUpgrades(selectedTower);

    updateUI();
    showTowerMenu(selectedTower);
});

upgradeRangeBtn.addEventListener('click', () => {
    if (!selectedTower) return;
    if (selectedTower.upgrades.range >= getUpgradeMax(selectedTower, 'range')) {
        showMessage('Max antal räckviddsuppgraderingar nådd');
        return;
    }
    if (money < 50) {
        showMessage('Inte tillräckligt pengar');
        return;
    }

    money -= 50;
    selectedTower.upgrades.range++;
    applyTowerUpgrades(selectedTower);

    updateUI();
    showTowerMenu(selectedTower);
});

// Tangentbordskontroller
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        isPaused = !isPaused;
        pauseIndicator.style.display = isPaused ? 'block' : 'none';
    }
});

function spawnWave(n) {
    if (playerHealth <= 0) return; // skapa inte efter död
    gameWaveActive = true;
    const rounds = WAVE_CONFIGS[difficulty] || WAVE_CONFIGS.easy;
    const config = rounds[n - 1];
    if (!config) {
        console.warn('no wave config for', difficulty, n);
        return;
    }
    // platta till typer enligt antal
    const sequence = [];
    config.forEach(entry => {
        for (let i = 0; i < entry.count; i++) sequence.push(entry.type);
    });
    sequence.forEach((type, i) => {
        setTimeout(() => {
            if (path.length > 0 && playerHealth > 0) {
                enemies.push(createEnemy(type));
            }
        }, i * 800);
    });
}

function createEnemy(type) {
    const info = ENEMY_TYPES[type] || ENEMY_TYPES.red;
    return {
        x: path[0].x, y: path[0].y,
        speed: info.speed,
        health: info.health,
        maxHealth: info.health,
        type: type,
        color: info.color,
        pathIndex: 0
    };
}

const diffEl = document.getElementById('diff');
const healthEl = document.getElementById('health');
function updateUI() {
    moneyEl.textContent = money;
    waveEl.textContent = waveNumber;
    if (healthEl) healthEl.textContent = playerHealth;
    if (diffEl) {
        let label = 'Lätt';
        if (difficulty === 'medium') label = 'Medel';
        else if (difficulty === 'hard') label = 'Svår';
        else if (difficulty === 'lava') label = 'Lava';
        diffEl.textContent = label;
    }
}

// Kontrollera om våg är komplett
function checkWaveComplete() {
    if (gameWaveActive && enemies.length === 0) {
        gameWaveActive = false;
        const rounds = WAVE_CONFIGS[difficulty] || WAVE_CONFIGS.easy;
        if (waveNumber >= rounds.length) {
            showMessage('Du klarade alla vågor!');
            return;
        }
        // Auto-starta nästa våg efter 2 sekunder
        setTimeout(() => {
            if (!isPaused && !gameWaveActive && playerHealth > 0) {
                waveNumber++;
                updateUI();
                spawnWave(waveNumber);
            }
        }, 2000);
    }
}

function update(dt) {
    if (isPaused) return;
    
    // Flytta fiender
    for (let e of enemies) {
        if (e.pathIndex < path.length - 1) {
            const target = path[e.pathIndex + 1];
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < e.speed) {
                e.x = target.x;
                e.y = target.y;
                e.pathIndex++;
            } else {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
        } else {
            // nådde slutet - skada spelare
            loseHealth(ENEMY_TYPES[e.type] ? ENEMY_TYPES[e.type].health : e.maxHealth);
            e.dead = true;
        }
    }
    enemies = enemies.filter(e => !e.dead && e.health > 0);
    
    // Torn skjuter
    for (let t of towers) {
        t.cooldown -= dt;
        if (t.cooldown <= 0) {
            let nearest = null;
            let dmin = 1e9;
            
            for (let e of enemies) {
                const d = Math.hypot(e.x - t.x, e.y - t.y);
                if (d < t.range && d < dmin) {
                    dmin = d;
                    nearest = e;
                }
            }
            
            if (nearest) {
                if (t.type === 'sniper') {
                    // Sniper skjuter direkta starka skott (homing)
                    console.log('Sniper shooting at enemy at', nearest.x, nearest.y, 'damage:', t.damage);
                    const bullet = {
                        x: t.x,
                        y: t.y,
                        enemy: nearest,  // Homing bullet
                        damage: t.damage,
                        speed: 8,
                        towerType: 'sniper'
                    };
                    // Flytta bullet lite ut från klippan så den inte förstörs direkt
                    const dx = nearest.x - bullet.x;
                    const dy = nearest.y - bullet.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0) {
                        bullet.x += (dx / dist) * 10;  // Flytta 10 pixlar ut
                        bullet.y += (dy / dist) * 10;
                    }
                    bullets.push(bullet);
                    console.log('Sniper bullet created at', bullet.x, bullet.y, 'cell', Math.floor(bullet.x / GRID_SIZE), Math.floor(bullet.y / GRID_SIZE));
                } else if (t.type === 'pirate') {
                    // Pirat skjuter 6 skott i olika riktningar
                    const angles = [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3];
                    for (let angle of angles) {
                        const distance = 200;
                        bullets.push({
                            x: t.x,
                            y: t.y,
                            tx: t.x + Math.cos(angle) * distance,
                            ty: t.y + Math.sin(angle) * distance,
                            damage: t.damage,
                            speed: 6,
                            towerType: 'pirate'
                        });
                    }
                } else if (t.type === 'blikten') {
                    // Blixtrar arc mellan upp till 8 fiender
                    const inRange = enemies.filter(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
                    if (inRange.length === 0) return;
                    
                    // Starta från närmaste fiende
                    let current = inRange.reduce((closest, e) => {
                        const d = Math.hypot(e.x - t.x, e.y - t.y);
                        const cd = Math.hypot(closest.x - t.x, closest.y - t.y);
                        return d < cd ? e : closest;
                    });
                    
                    const chain = [current];
                    const jumpRange = 100; // max avstånd för arc
                    
                    while (chain.length < 8) {
                        let next = null;
                        let minDist = jumpRange;
                        for (let e of inRange) {
                            if (chain.includes(e)) continue;
                            const d = Math.hypot(e.x - current.x, e.y - current.y);
                            if (d < minDist) {
                                minDist = d;
                                next = e;
                            }
                        }
                        if (!next) break;
                        chain.push(next);
                        current = next;
                    }
                    
                    // Applicera damage till alla i kedjan
                    for (let e of chain) {
                        e.health -= t.damage;
                        if (e.health <= 0) {
                            e.dead = true;
                            money += 10;
                            updateUI();
                        }
                    }
                    
                    // Lägg till för visuell effekt
                    lightningChains.push({ tower: t, chain: chain.slice(), time: 0 });
                } else if (t.type === 'kanon') {
                    // Kanon gör AoE skada runt närmaste fiende
                    const aoeCenter = nearest;
                    const towerType = TOWER_TYPES[t.type];
                    console.log('Kanon shooting at', aoeCenter.x, aoeCenter.y, 'damage:', t.damage, 'aoeRadius:', towerType.aoeRadius);
                    for (let e of enemies) {
                        if (Math.hypot(e.x - aoeCenter.x, e.y - aoeCenter.y) < towerType.aoeRadius) {
                            console.log('Damaging enemy at', e.x, e.y, 'health before:', e.health);
                            e.health -= t.damage;
                            console.log('health after:', e.health);
                            if (e.health <= 0) {
                                e.dead = true;
                                money += 10;
                                updateUI();
                            }
                        }
                    }
                    // Lägg till explosionseffekt
                    bullets.push({
                        x: aoeCenter.x,
                        y: aoeCenter.y,
                        damage: 100, // bara för visuell effekt, själva skadan applicerades direkt
                        speed: 0,
                        towerType: 'kanon',
                        time: 0
                    });
                } else {
                    // Kanontorn vanliga skott
                    bullets.push({
                        x: t.x,
                        y: t.y,
                        tx: nearest.x,
                        ty: nearest.y,
                        damage: t.damage,
                        speed: 5,
                        towerType: 'gun'
                    });
                }
                t.cooldown = t.fireRate;
            }
        }
    }
    
    // Uppdatera kulor
    for (let b of bullets) {
        if (b.towerType === 'kanon') {
            b.time += dt;
            if (b.time > 0.5) b.dead = true;
            continue;
        }
        // om kula går in i en klippcell, blockeras den och förstörs (förutom sniper)
        const cellX = Math.floor(b.x / GRID_SIZE);
        const cellY = Math.floor(b.y / GRID_SIZE);
        if (cellX >= 0 && cellX < GRID_WIDTH && cellY >= 0 && cellY < GRID_HEIGHT) {
            if (grid[cellY][cellX] === CELL_TYPE.CLIFF && b.towerType !== 'sniper') {
                b.dead = true;
                continue;
            }
        }

        // För homing bullets (sniper)
        let tx = b.tx;
        let ty = b.ty;
        if (b.enemy) {
            if (b.enemy.dead) {
                b.dead = true;
                continue;
            }
            tx = b.enemy.x;
            ty = b.enemy.y;
        }

        const dx = tx - b.x;
        const dy = ty - b.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < b.speed) {
            let hit = false;
            for (let e of enemies) {
                if (Math.hypot(e.x - b.x, e.y - b.y) < 15) {
                    e.health -= b.damage;
                    if (e.health <= 0) {
                        e.dead = true;
                        money += 10;
                        updateUI();
                    }
                    hit = true;
                    break;
                }
            }
            b.dead = true;
        } else {
            b.x += (dx / dist) * b.speed;
            b.y += (dy / dist) * b.speed;
            
            // Kontrollera om ny position träffade en klippa
            const cx = Math.floor(b.x / GRID_SIZE);
            const cy = Math.floor(b.y / GRID_SIZE);
            if (cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT) {
                if (grid[cy][cx] === CELL_TYPE.CLIFF) {
                    b.dead = true;
                    continue;
                }
            }

            // Kontrollera träffar under resa
            for (let e of enemies) {
                if (Math.hypot(e.x - b.x, e.y - b.y) < 12) {
                    e.health -= b.damage;
                    if (e.health <= 0) {
                        e.dead = true;
                        money += 10;
                        updateUI();
                    }
                    b.dead = true;
                    break;
                }
            }
        }
    }
    bullets = bullets.filter(b => !b.dead);
    
    // Uppdatera blixt-kedjor
    lightningChains = lightningChains.filter(lc => {
        lc.time += dt;
        return lc.time < 0.5; // visa i 0.5 sekunder
    });
    
    // Kontrollera om våg ska auto-framåt
    checkWaveComplete();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Rita rutnät
    drawGrid();
    
    // Rita väg
    if (path.length > 1) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let p of path) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }
    
    // Rita torn
    for (let t of towers) {
        const towerType = TOWER_TYPES[t.type];
        ctx.fillStyle = createGradient(t.x, t.y, towerType.color, 10);
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Torntypindikator
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Räckviddscirkel
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Rita fiender
    for (let e of enemies) {
        ctx.fillStyle = createGradient(e.x, e.y, e.color, 8);
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Hälsostapel
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x - 10, e.y - 16, 20 * (e.health / e.maxHealth), 4);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(e.x - 10, e.y - 16, 20, 4);
    }
    
    // Rita kulor
    for (let b of bullets) {
        let color;
        if (b.towerType === 'sniper') {
            color = '#f0f';
        } else if (b.towerType === 'pirate') {
            color = '#00f';
        } else if (b.towerType === 'kanon') {
            color = '#f00';
            ctx.fillStyle = createGradient(b.x, b.y, color, 20);
            ctx.beginPath();
            ctx.arc(b.x, b.y, 20, 0, Math.PI * 2); // större explosion
            ctx.fill();
            continue;
        } else {
            color = '#ff0';
        }
        ctx.fillStyle = createGradient(b.x, b.y, color, 4);
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Rita blixt-kedjor
    for (let lc of lightningChains) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lc.tower.x, lc.tower.y);
        for (let e of lc.chain) {
            ctx.lineTo(e.x, e.y);
        }
        ctx.stroke();
    }
}

// Spelslinga
let lastTime = performance.now();
function loop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// hälsa / liv systemverktyg
function loseHealth(amount) {
    if (amount <= 0) return;
    playerHealth -= amount;
    updateUI();
    showMessage(`-${amount} hälsa`);
    if (playerHealth <= 0) {
        playerHealth = 0;
        gameOver();
    }
}

function gameOver() {
    showMessage('Game Over');
    isPaused = true;
    gameStarted = false;
    // För felsökning: visa alert om Game Over inte syns
    alert('Hej! Game Over! Du förlorade spelet.');
}

// svårighetsknappar
const easyBtn = document.getElementById('easyBtn');
const mediumBtn = document.getElementById('mediumBtn');
const hardBtn = document.getElementById('hardBtn');
const lavaBtn = document.getElementById('lavaBtn');

easyBtn.addEventListener('click', () => selectDifficulty('easy'));
mediumBtn.addEventListener('click', () => selectDifficulty('medium'));
hardBtn.addEventListener('click', () => selectDifficulty('hard'));
lavaBtn.addEventListener('click', () => selectDifficulty('lava'));

function selectDifficulty(level) {
    if (gameStarted) return;
    difficulty = level;
    [easyBtn, mediumBtn, hardBtn, lavaBtn].forEach(b => {
        b.classList.toggle('selected', b.id.startsWith(level));
        b.disabled = true;
    });
    if (level === 'lava') {
        activateLavaMode();
    }
    // starta spelet när svårighet vald
    startGame();
}

function startGame() {
    gameStarted = true;
    waveNumber = 1;
    // sätt initial hälsa baserat på svårighet
    if (difficulty === 'easy') playerHealth = 100;
    else if (difficulty === 'medium') playerHealth = 50;
    else if (difficulty === 'hard') playerHealth = 1;
    else if (difficulty === 'lava') playerHealth = 1;  // samma som hard
    updateUI();
    spawnWave(1);
}

// Initiera
initializeGrid();
initPath();
updateUI();

// preselect easy visually
easyBtn.classList.add('selected');

requestAnimationFrame(loop);
