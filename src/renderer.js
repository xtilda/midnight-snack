import {
  TILE
} from './level.js';
import {
  visualPosition
} from './gameplay.js';

export function createRenderer(canvas, effects) {
  const ctx = canvas.getContext('2d');
  let state;

  function rounded(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill()
  }

  function draw(nextState, t) {
    state = nextState;
    ctx.save();
    if (effects.shake) ctx.translate(Math.sin(t * .12) * effects.shake / 70, Math.cos(t * .15) * effects.shake / 90);
    const {
      grid,
      player,
      enemies
    } = state;
    const glow = ctx.createRadialGradient(336, 280, 30, 336, 280, 480);
    glow.addColorStop(0, '#e8f8ed');
    glow.addColorStop(1, '#b5d5d0');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < grid.length; y++)
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x],
          px = x * TILE,
          py = y * TILE;
        if (cell === '#') {
          rounded(px + 1, py + 1, TILE - 2, TILE - 2, 5, '#314453');
          rounded(px + 4, py + 4, TILE - 8, 3, 2, '#49606b');
        } else if (cell === '.') {
          ctx.fillStyle = '#8fa9a3';
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 'S') drawSnack(px + 16, py + 16, t);
        else if (cell === 'H') drawSauce(px + 16, py + 16, t);
      }
    drawDoor(state.playerStart.x * TILE + 16, state.playerStart.y * TILE + 16, t);
    for (const enemy of enemies) {
      if (enemy.respawn > 0) continue;
      const position = visualPosition(enemy);
      const x = position.x * TILE + 16,
        y = position.y * TILE + 16;
      if (state.power > 0 && Math.floor(t / 160) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = .5;
        if (enemy.type === 'milk') drawMilk(x, y, t);
        else drawCheese(x, y, t);
        ctx.restore();
      } else if (enemy.type === 'milk') drawMilk(x, y, t);
      else drawCheese(x, y, t);
    }
    const position = visualPosition(player);
    if (state.invincible <= 0 || Math.floor(t / 100) % 2 === 0) drawPlayer(position.x * TILE + 16, position.y * TILE + 16, t);
    effects.draw(ctx);
    ctx.restore();
  }

  function drawSnack(x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(t / 220 + x) * .09;
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ffb45e';
    ctx.shadowBlur = 16;
    rounded(-11, -10, 22, 20, 5, '#f56d50');
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe2a1';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a4b37';
    for (const [a, b] of [
        [-2, -2],
        [3, 1],
        [-1, 3]
      ]) {
      ctx.beginPath();
      ctx.arc(a, b, 1, 0, 7);
      ctx.fill()
    }
    ctx.restore();
  }

  function drawSauce(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t / 180) * 2);
    ctx.shadowColor = '#ff6b30';
    ctx.shadowBlur = 18;
    rounded(-8, -9, 16, 20, 4, '#ed4937');
    ctx.shadowBlur = 0;
    rounded(-5, -14, 10, 6, 2, '#ffd57b');
    rounded(-6, -3, 12, 9, 2, '#ffe5b7');
    ctx.fillStyle = '#c7422e';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, 5);
    ctx.restore();
  }

  function drawDoor(x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = state.snacks === 0 ? '#4be3f3' : '#87cce1';
    ctx.shadowBlur = state.snacks === 0 ? 18 : 8;
    rounded(-13, -14, 26, 28, 5, '#3a98b8');
    ctx.shadowBlur = 0;
    rounded(-9, -10, 18, 21, 3, '#d7f7ed');
    ctx.fillStyle = '#317d99';
    ctx.fillRect(5, 0, 2, 5);
    if (state.snacks === 0) {
      ctx.strokeStyle = '#fff5b4';
      ctx.lineWidth = 2;
      ctx.strokeRect(-15, -16, 30, 32)
    }
    ctx.restore();
  }

  function drawPlayer(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t / 110) * 1.5);
    ctx.rotate(Math.sin(t / 270) * .08);
    if (state.power > 0) {
      ctx.shadowColor = '#ff602f';
      ctx.shadowBlur = 18
    }
    ctx.fillStyle = state.power > 0 ? '#ff8050' : '#fac86d';
    ctx.strokeStyle = '#183449';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (state.power > 0) {
      ctx.strokeStyle = '#fff4be';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.power / 7000);
      ctx.stroke()
    }
    ctx.fillStyle = '#183449';
    ctx.beginPath();
    ctx.arc(-4, -2, 1.8, 0, 7);
    ctx.arc(4, -2, 1.8, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 4, 2, 0, Math.PI);
    ctx.stroke();
    ctx.restore()
  }

  function drawMilk(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t / 175) * 1.2);
    rounded(-11, -10, 22, 23, 4, '#fbf6e8');
    ctx.strokeStyle = '#33271e';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-10, -9, 20, 20);
    rounded(-12, -14, 24, 5, 2, '#bd4937');
    ctx.fillStyle = '#183449';
    ctx.beginPath();
    ctx.arc(-4, -2, 2, 0, 7);
    ctx.arc(4, -2, 2, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#33271e';
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(5, 6);
    ctx.stroke();
    ctx.restore()
  }


  function drawCheese(x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t / 200) * 1.2);
    ctx.rotate(-.1);
    ctx.fillStyle = '#e6ae43';
    ctx.strokeStyle = '#33271e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-13, 10);
    ctx.lineTo(-11, -8);
    ctx.lineTo(12, -12);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8a712c';
    for (const [cx, cy, r] of [
        [-5, 4, 2.4],
        [6, -5, 2.8],
        [6, 7, 1.6]
      ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 7);
      ctx.fill()
    }
    ctx.fillStyle = '#33271e';
    ctx.beginPath();
    ctx.arc(-5, -4, 1.6, 0, 7);
    ctx.arc(2, -4, 1.6, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#537551';
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.quadraticCurveTo(-14, -17, -7, -17);
    ctx.stroke();
    ctx.restore();
  }

  return draw;
}
