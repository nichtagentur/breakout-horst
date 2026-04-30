const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

const COLORS = ['#ff6b9d','#ffb86b','#ffe66b','#6bff9d','#6bd3ff','#7b6bff'];

let paddle, ball, bricks, particles, score, lives, level, state, keys;

function resetPaddle() {
  paddle = { w: 100, h: 12, x: W/2 - 50, y: H - 30, speed: 8 };
}
function resetBall() {
  ball = { x: W/2, y: paddle.y - 10, r: 8, vx: 0, vy: 0, stuck: true };
}
function buildBricks(lvl) {
  bricks = [];
  const rows = Math.min(4 + lvl, 8);
  const cols = 10;
  const pad = 6, top = 60, side = 30;
  const bw = (W - side*2 - pad*(cols-1)) / cols;
  const bh = 22;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: side + c*(bw+pad),
        y: top + r*(bh+pad),
        w: bw, h: bh,
        color: COLORS[r % COLORS.length],
        hit: false
      });
    }
  }
}
function init() {
  score = 0; lives = 3; level = 1;
  particles = [];
  keys = {};
  state = 'ready';
  resetPaddle(); resetBall(); buildBricks(level);
  updateHUD();
}
function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}
function launch() {
  if (!ball.stuck) return;
  ball.stuck = false;
  const angle = (-Math.PI/2) + (Math.random()*0.6 - 0.3);
  const sp = 6 + level*0.3;
  ball.vx = Math.cos(angle)*sp;
  ball.vy = Math.sin(angle)*sp;
}
function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*5,
      vy: (Math.random()-0.5)*5,
      life: 30, color
    });
  }
}

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') {
    e.preventDefault();
    if (state === 'gameover') { init(); state = 'ready'; return; }
    if (state === 'ready') { launch(); state = 'playing'; }
    else if (state === 'playing') state = 'paused';
    else if (state === 'paused') state = 'playing';
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W/rect.width);
  paddle.x = Math.max(0, Math.min(W - paddle.w, mx - paddle.w/2));
});
canvas.addEventListener('click', () => {
  if (state === 'gameover') { init(); state = 'ready'; }
  else if (state === 'ready') { launch(); state = 'playing'; }
});

function update() {
  if (state !== 'playing') return;

  if (keys['ArrowLeft']) paddle.x = Math.max(0, paddle.x - paddle.speed);
  if (keys['ArrowRight']) paddle.x = Math.min(W - paddle.w, paddle.x + paddle.speed);

  if (ball.stuck) {
    ball.x = paddle.x + paddle.w/2;
    ball.y = paddle.y - ball.r;
    return;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }

  if (ball.y + ball.r > paddle.y &&
      ball.y - ball.r < paddle.y + paddle.h &&
      ball.x > paddle.x && ball.x < paddle.x + paddle.w &&
      ball.vy > 0) {
    ball.y = paddle.y - ball.r;
    const hit = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
    const sp = Math.hypot(ball.vx, ball.vy);
    const angle = -Math.PI/2 + hit * (Math.PI/3);
    ball.vx = Math.cos(angle)*sp;
    ball.vy = Math.sin(angle)*sp;
  }

  for (const b of bricks) {
    if (b.hit) continue;
    if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
      b.hit = true;
      score += 10;
      spawnParticles(b.x + b.w/2, b.y + b.h/2, b.color);
      const prevX = ball.x - ball.vx;
      const prevY = ball.y - ball.vy;
      if (prevX < b.x || prevX > b.x + b.w) ball.vx *= -1;
      else ball.vy *= -1;
      updateHUD();
      break;
    }
  }

  if (ball.y - ball.r > H) {
    lives--;
    updateHUD();
    if (lives <= 0) { state = 'gameover'; }
    else { resetBall(); state = 'ready'; }
  }

  if (bricks.every(b => b.hit)) {
    level++;
    resetPaddle(); resetBall(); buildBricks(level);
    updateHUD();
    state = 'ready';
  }

  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  for (const b of bricks) {
    if (b.hit) continue;
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;
    roundRect(b.x, b.y, b.w, b.h, 4);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#e8ecff';
  ctx.shadowColor = '#7b6bff';
  ctx.shadowBlur = 15;
  roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#46d3ff';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  for (const p of particles) {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (state === 'ready') drawCenter('Click or press SPACE to launch', 'rgba(255,255,255,0.85)');
  else if (state === 'paused') drawCenter('PAUSED', '#ffe66b');
  else if (state === 'gameover') {
    drawCenter('GAME OVER', '#ff6b9d', -20);
    drawCenter('Score: ' + score + ' - Click to restart', 'rgba(255,255,255,0.8)', 20, '18px');
  }
}

function drawCenter(text, color, dy = 0, size = '24px') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size} 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W/2, H/2 + dy);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

init();
loop();
