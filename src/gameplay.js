import {
  createLevel,
  DIR,
  walkable
} from './level.js';
import {
  nextEnemyStep,
  fleeStep
} from './enemy.js';

export const PLAYER_INTERVAL = 125;
export const POWER_DURATION = 7000;
const COMBO_WINDOW = 12000;

export function createGame() {
  const level = createLevel();
  return {
    ...level,
    playerStart: {
      ...level.player
    },
    score: 0,
    lives: 3,
    direction: null,
    wanted: null,
    invincible: 0,
    enemyDelay: 4500,
    power: 0,
    elapsed: 0,
    playerClock: 0,
    combo: 0,
    comboTime: 0,
    eaten: 0,
    phase: 'playing',
    events: [],
    result: null,
  };
}

function emit(game, type, extra = {}) {
  game.events.push({
    type,
    ...extra
  });
}

function relocate(actor, x, y, duration) {
  actor.motion = {
    x: actor.x,
    y: actor.y,
    elapsed: 0,
    duration
  };
  actor.x = x;
  actor.y = y;
}

// Rendering interpolates between tiles; wall tests and pathfinding stay on the grid.
export function visualPosition(actor) {
  const motion = actor.motion;
  if (!motion) return actor;
  const progress = Math.min(1, motion.elapsed / motion.duration);
  return {
    x: motion.x + (actor.x - motion.x) * progress,
    y: motion.y + (actor.y - motion.y) * progress,
  };
}

export function enemyInterval(game, enemy) {
  const collected = game.totalSnacks - game.snacks;
  const base = enemy.type === 'milk' ? 440 : 570;
  return base - collected * (enemy.type === 'milk' ? 20 : 26);
}

export function checkHit(game) {
  if (game.phase !== 'playing') return;
  // Handle every enemy on the tile, including simultaneous powered captures.
  for (const enemy of game.enemies) {
    if (enemy.respawn > 0) continue;
    const a = visualPosition(game.player),
      b = visualPosition(enemy);
    if (Math.hypot(a.x - b.x, a.y - b.y) > 0.55) continue;
    if (game.power > 0) {
      const points = 200 * 2 ** Math.min(game.eaten++, 2);
      game.score += points;
      emit(game, 'eat', {
        x: enemy.x,
        y: enemy.y,
        points
      });
      Object.assign(enemy, enemy.start, {
        direction: null,
        clock: 0,
        respawn: 2500,
        motion: null
      });
      continue;
    }
    if (game.invincible > 0) return;
    game.lives--;
    game.combo = 0;
    game.comboTime = 0;
    emit(game, game.lives ? 'hurt' : 'lose', {
      culprit: enemy.type
    });
    if (!game.lives) {
      game.phase = 'lost';
      return;
    }
    game.player = {
      ...game.playerStart
    };
    for (const actor of game.enemies) {
      Object.assign(actor, actor.start, {
        direction: null,
        clock: 0,
        respawn: 0,
        motion: null
      });
    }
    game.direction = game.wanted = null;
    game.playerClock = 0;
    game.invincible = 2500;
    game.enemyDelay = 3500;
    game.power = 0;
    return;
  }
}

export function movePlayer(game) {
  const player = game.player;
  const canMove = name => name && walkable(game.grid, player.x + DIR[name].x, player.y + DIR[name].y);
  if (canMove(game.wanted)) game.direction = game.wanted;
  if (!canMove(game.direction)) return;
  const delta = DIR[game.direction];
  relocate(player, player.x + delta.x, player.y + delta.y, 100);
  const cell = game.grid[player.y][player.x];
  if (['.', 'S', 'H'].includes(cell)) game.grid[player.y][player.x] = ' ';
  if (cell === '.') {
    game.remaining--;
    game.score += 5;
    emit(game, 'crumb', {
      x: player.x,
      y: player.y
    });
  } else if (cell === 'S') {
    game.snacks--;
    game.combo = Math.min(3, game.comboTime > 0 ? game.combo + 1 : 1);
    game.comboTime = COMBO_WINDOW;
    const points = 100 * game.combo;
    game.score += points;
    emit(game, 'snack', {
      x: player.x,
      y: player.y,
      points
    });
  } else if (cell === 'H') {
    game.power = POWER_DURATION;
    game.eaten = 0;
    game.score += 50;
    emit(game, 'sauce', {
      x: player.x,
      y: player.y,
      points: 50
    });
  }
  checkHit(game);
  if (game.phase !== 'playing') return;
  if (game.player === player && game.snacks === 0 && game.player.x === game.playerStart.x && game.player.y === game.playerStart.y) {
    const timeBonus = Math.max(0, 600 - Math.floor(game.elapsed / 1000) * 5);
    const lifeBonus = game.lives * 100;
    const crumbBonus = game.remaining === 0 ? 250 : 0;
    game.result = {
      timeBonus,
      lifeBonus,
      crumbBonus,
      exitBonus: 500
    };
    game.score += 500 + timeBonus + lifeBonus + crumbBonus;
    game.phase = 'won';
    emit(game, 'win');
  }
}

export function updateGame(game, dt) {
  if (game.phase !== 'playing') return;
  game.elapsed += dt;
  for (const actor of [game.player, ...game.enemies]) {
    if (actor.motion) actor.motion.elapsed += dt;
  }
  for (const key of ['invincible', 'enemyDelay', 'comboTime']) game[key] = Math.max(0, game[key] - dt);
  if (!game.comboTime) game.combo = 0;
  const powered = game.power > 0;
  game.power = Math.max(0, game.power - dt);
  if (powered && !game.power) emit(game, 'power-end');
  game.playerClock += dt;
  while (game.playerClock >= PLAYER_INTERVAL && game.phase === 'playing') {
    game.playerClock -= PLAYER_INTERVAL;
    movePlayer(game);
  }
  if (game.phase !== 'playing') return;
  for (const enemy of game.enemies) {
    if (enemy.respawn > 0) {
      enemy.respawn = Math.max(0, enemy.respawn - dt);
      // A returning enemy may share the player's tile before either moves.
      if (!enemy.respawn) checkHit(game);
      continue;
    }
    if (game.enemyDelay > 0) continue;
    enemy.clock += dt;
    const interval = enemyInterval(game, enemy);
    while (enemy.clock >= interval && game.phase === 'playing') {
      enemy.clock -= interval;
      const step = game.power > 0 ?
        fleeStep(game.grid, enemy, game.player) :
        nextEnemyStep(game.grid, enemy, game.player, game.direction);
      if (!step) break;
      enemy.direction = step;
      relocate(enemy, enemy.x + DIR[step].x, enemy.y + DIR[step].y, Math.min(interval, 260));
      checkHit(game);
    }
  }
  checkHit(game);
}
