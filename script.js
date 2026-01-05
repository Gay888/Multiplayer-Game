const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let gameActive = false;
let keys = {};
let effects = [];
let projectiles = [];

const platforms = [
    { x: 0, y: 360, w: 800, h: 40 }, 
    { x: 100, y: 260, w: 160, h: 12 }, 
    { x: 540, y: 260, w: 160, h: 12 }, 
    { x: 320, y: 150, w: 160, h: 12 }
];

const p1 = {
    id: 'P1', x: 120, y: 300, vy: 0, hp: 100, color: '#4cc9f0',
    width: 30, height: 50, onGround: false, isAttacking: false,
    facing: 1, lastAttack: 0, lastSkill: 0,
    controls: { left: 'a', right: 'd', up: 'w', attack: 'e', skill: 'r' }
};

const p2 = {
    id: 'P2', x: 650, y: 300, vy: 0, hp: 100, color: '#f72585',
    width: 30, height: 50, onGround: false, isAttacking: false,
    facing: -1, lastAttack: 0, lastSkill: 0,
    controls: { left: 'arrowleft', right: 'arrowright', up: 'arrowup', attack: 'l', skill: 'k' }
};

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-wrapper').style.display = 'block';
    gameActive = true;
    requestAnimationFrame(update);
}

// ฟังก์ชันรีเซ็ตเกม
function resetGame() {
    // รีเซ็ตค่าตัวละคร
    [p1, p2].forEach(p => {
        p.hp = 100;
        p.vy = 0;
        p.y = 300;
        p.lastAttack = 0;
        p.lastSkill = 0;
        p.isAttacking = false;
    });
    p1.x = 120; p1.facing = 1;
    p2.x = 650; p2.facing = -1;

    // ล้างเอฟเฟกต์และกระสุน
    projectiles = [];
    effects = [];

    // อัปเดต UI
    document.getElementById('p1-bar').style.width = '100%';
    document.getElementById('p2-bar').style.width = '100%';
    document.getElementById('end-game-ui').style.display = 'none';
    
    // เริ่มเกมใหม่
    if (!gameActive) {
        gameActive = true;
        requestAnimationFrame(update);
    }
}

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function handleMovement(p) {
    if (keys[p.controls.left]) { p.x -= 5; p.facing = -1; }
    if (keys[p.controls.right]) { p.x += 5; p.facing = 1; }
    if (keys[p.controls.up] && p.onGround) { p.vy = -13; p.onGround = false; }

    p.vy += 0.6; p.y += p.vy; p.onGround = false;

    platforms.forEach(plat => {
        if (p.x + p.width > plat.x && p.x < plat.x + plat.w &&
            p.y + p.height > plat.y && p.y + p.height < plat.y + plat.h + 5 && p.vy >= 0) {
            p.y = plat.y - p.height; p.vy = 0; p.onGround = true;
        }
    });

    if (p.x < 0) p.x = 0;
    if (p.x > canvas.width - p.width) p.x = canvas.width - p.width;
}

function handleCombat(attacker, defender) {
    const now = Date.now();

    // โจมตีปกติ
    if (keys[attacker.controls.attack] && now - attacker.lastAttack > 1000) {
        attacker.lastAttack = now;
        attacker.isAttacking = true;
        setTimeout(() => attacker.isAttacking = false, 200);

        effects.push({ x: attacker.x + (attacker.facing === 1 ? 40 : -10), y: attacker.y + 25, r: 5, opacity: 1 });

        const dist = Math.abs((attacker.x + 15) - (defender.x + 15));
        const vDist = Math.abs(attacker.y - defender.y);
        if (dist < 50 && vDist < 50) {
            defender.hp -= 5;
            updateHP();
        }
    }

    // สกิลบอล (30s Cooldown)
    if (keys[attacker.controls.skill] && now - attacker.lastSkill > 30000) {
        attacker.lastSkill = now;
        projectiles.push({
            x: attacker.x + 15, y: attacker.y + 20,
            vx: attacker.facing * 8, owner: attacker.id, color: attacker.color
        });
    }

    // UI Cooldown
    const skillEl = document.getElementById(`${attacker.id.toLowerCase()}-skill-status`);
    const timeLeft = Math.max(0, Math.ceil((30000 - (now - attacker.lastSkill)) / 1000));
    skillEl.innerText = timeLeft > 0 ? `SKILL: ${timeLeft}S` : `SKILL: READY`;
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const pj = projectiles[i];
        pj.x += pj.vx;
        const target = pj.owner === 'P1' ? p2 : p1;
        const dist = Math.sqrt(Math.pow(pj.x - (target.x + 15), 2) + Math.pow(pj.y - (target.y + 25), 2));

        if (dist < 25) {
            target.hp -= 30;
            updateHP();
            projectiles.splice(i, 1);
            continue;
        }
        if (pj.x < 0 || pj.x > 800) projectiles.splice(i, 1);
    }
}

function updateHP() {
    document.getElementById('p1-bar').style.width = Math.max(0, p1.hp) + '%';
    document.getElementById('p2-bar').style.width = Math.max(0, p2.hp) + '%';
    if (p1.hp <= 0) endGame("PLAYER 2 WINS!");
    if (p2.hp <= 0) endGame("PLAYER 1 WINS!");
}

function endGame(msg) {
    gameActive = false;
    document.getElementById('game-msg').innerText = msg;
    document.getElementById('end-game-ui').style.display = 'flex';
}

function update() {
    if (!gameActive) return;
    handleMovement(p1);
    handleMovement(p2);
    handleCombat(p1, p2);
    handleCombat(p2, p1);
    updateProjectiles();
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดพื้น
    ctx.fillStyle = '#1f4068';
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#4cc9f0'; ctx.fillRect(p.x, p.y, p.w, 3); ctx.fillStyle = '#1f4068';
    });

    // วาดผู้เล่น
    [p1, p2].forEach(p => {
        ctx.shadowBlur = 15; ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(p.facing === 1 ? p.x + 20 : p.x + 5, p.y + 10, 5, 5);
        if (p.isAttacking) {
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
            ctx.strokeRect(p.facing === 1 ? p.x + 30 : p.x - 20, p.y, 20, 50);
        }
    });

    // วาดลูกบอลสกิล
    projectiles.forEach(pj => {
        ctx.shadowBlur = 20; ctx.shadowColor = 'white';
        ctx.fillStyle = 'white'; ctx.beginPath();
        ctx.arc(pj.x, pj.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pj.color; ctx.lineWidth = 2; ctx.stroke();
    });

    // เอฟเฟกต์
    effects.forEach((ef, i) => {
        ctx.strokeStyle = `rgba(255,255,255,${ef.opacity})`;
        ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2); ctx.stroke();
        ef.r += 2; ef.opacity -= 0.1;
        if (ef.opacity <= 0) effects.splice(i, 1);
    });
}