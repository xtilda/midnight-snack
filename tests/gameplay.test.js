import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  updateGame,
  movePlayer,
  visualPosition,
  checkHit,
  enemyInterval
} from '../src/gameplay.js';
import {
  shortestStep,
  fleeStep
} from '../src/enemy.js';
import {
  DIR,
  walkable
} from '../src/level.js';

function isolatedGame() {
  const game = createGame();
  game.enemies = [];
  return game;
}

function route(game, target) {
  for (let guard = 0; guard < 400; guard++) {
    if (game.player.x === target.x && game.player.y === target.y) return;
    game.wanted = shortestStep(game.grid, game.player, target);
    assert.ok(game.wanted, 'target should be reachable');
    movePlayer(game);
    if (game.phase !== 'playing') return;
  }
  assert.fail('path did not finish');
}

test('all objectives and both hunters are connected to the door', () => {
  const game = createGame();
  for (let y = 0; y < game.grid.length; y++) {
    for (let x = 0; x < game.grid[y].length; x++) {
      if (['S', 'H'].includes(game.grid[y][x])) assert.ok(shortestStep(game.grid, game.player, {
        x,
        y
      }));
    }
  }
  for (const enemy of game.enemies) assert.ok(shortestStep(game.grid, enemy, game.player));
});

test('walls block movement; buffered turns execute once a junction opens', () => {
  const game = isolatedGame();
  game.wanted = 'up';
  movePlayer(game);
  assert.deepEqual(game.player, game.playerStart);
  game.wanted = 'right';
  movePlayer(game);
  game.wanted = 'down'; // blocked at x=2; continue right while keeping the turn queued
  movePlayer(game);
  assert.equal(game.player.x, 3);
  movePlayer(game);
  movePlayer(game);
  assert.equal(game.player.x, 4);
  assert.equal(game.player.y, 2);
});

test('movement interpolates without changing the logical tile', () => {
  const game = isolatedGame();
  game.wanted = 'right';
  movePlayer(game);
  assert.equal(visualPosition(game.player).x, 1);
  updateGame(game, 50);
  assert.equal(game.player.x, 2);
  assert.equal(visualPosition(game.player).x, 1.5);
  updateGame(game, 50);
  assert.equal(visualPosition(game.player).x, 2);
});

test('snack chains award multipliers, cap at three and expire', () => {
  const game = isolatedGame();
  for (let x = 2; x <= 5; x++) game.grid[1][x] = 'S';
  game.wanted = 'right';
  for (let i = 0; i < 4; i++) movePlayer(game);
  assert.equal(game.combo, 3);
  assert.equal(game.score, 900);
  game.direction = game.wanted = null;
  updateGame(game, 12001);
  assert.equal(game.combo, 0);
});

test('powered captures handle multiple enemies and use escalating rewards', () => {
  const game = createGame();
  game.power = 7000;
  for (const enemy of game.enemies) Object.assign(enemy, game.player);
  checkHit(game);
  assert.equal(game.score, 600);
  assert.ok(game.enemies.every(enemy => enemy.respawn === 2500));
  assert.equal(game.lives, 3);
});

test('damage preserves pickups, resets actors and gives a grace period', () => {
  const game = createGame();
  game.grid[1][5] = ' ';
  game.snacks = 4;
  game.combo = 3;
  Object.assign(game.enemies[0], game.player);
  checkHit(game);
  assert.equal(game.lives, 2);
  assert.equal(game.snacks, 4);
  assert.equal(game.grid[1][5], ' ');
  assert.equal(game.combo, 0);
  assert.equal(game.invincible, 2500);
  checkHit(game);
  assert.equal(game.lives, 2);
});

test('head start freezes hunters and difficulty increases gradually', () => {
  const game = createGame();
  const enemy = game.enemies[0];
  const start = {
    x: enemy.x,
    y: enemy.y
  };
  updateGame(game, 1000);
  assert.equal(enemy.x, start.x);
  assert.equal(enemy.y, start.y);
  const interval = enemyInterval(game, enemy);
  game.snacks = 0;
  assert.equal(enemyInterval(game, enemy), interval - 100);
});

test('power expires, and fleeing chooses a legal tile', () => {
  const game = createGame();
  game.power = 100;
  const enemy = game.enemies[0];
  const step = fleeStep(game.grid, enemy, game.player);
  assert.ok(walkable(game.grid, enemy.x + DIR[step].x, enemy.y + DIR[step].y));
  updateGame(game, 100);
  assert.equal(game.power, 0);
  assert.ok(game.events.some(event => event.type === 'power-end'));
});

test('the full collect-and-return route wins once and awards completion bonuses', () => {
  const game = isolatedGame();
  const snacks = [];
  game.grid.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === 'S') snacks.push({
      x,
      y
    });
  }));
  for (const snack of snacks) route(game, snack);
  assert.equal(game.snacks, 0);
  assert.equal(game.phase, 'playing');
  route(game, game.playerStart);
  assert.equal(game.phase, 'won');
  assert.equal(game.result.exitBonus, 500);
  assert.equal(game.result.lifeBonus, 300);
  const score = game.score;
  updateGame(game, 1000);
  assert.equal(game.score, score);
  assert.equal(game.events.filter(event => event.type === 'win').length, 1);
});

test('losing the last chance ends the run without an accidental exit win', () => {
  const game = createGame();
  game.lives = 1;
  game.snacks = 0;
  Object.assign(game.enemies[0], game.player);
  checkHit(game);
  assert.equal(game.phase, 'lost');
  assert.equal(game.result, null);
});

test('collisions follow visible positions instead of an enemy jumping ahead', () => {
  const game = createGame();
  const enemy = game.enemies[0];
  enemy.x = game.player.x;
  enemy.y = game.player.y;
  enemy.motion = {
    x: game.player.x + 1,
    y: game.player.y,
    elapsed: 0,
    duration: 200
  };
  checkHit(game);
  assert.equal(game.lives, 3);
  enemy.motion.elapsed = 120;
  checkHit(game);
  assert.equal(game.lives, 2);
});

test('a new run restores all pickups, clocks and bonuses', () => {
  const old = isolatedGame();
  route(old, {
    x: 5,
    y: 1
  });
  old.elapsed = 50000;
  const fresh = createGame();
  assert.equal(fresh.score, 0);
  assert.equal(fresh.elapsed, 0);
  assert.equal(fresh.lives, 3);
  assert.equal(fresh.snacks, 5);
  assert.equal(fresh.grid[1][5], 'S');
});
