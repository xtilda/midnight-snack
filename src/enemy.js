import {
  DIR,
  walkable
} from './level.js';

const directions = Object.entries(DIR);

// Shortest walkable path from an enemy to a target, recomputed at each step.
export function shortestStep(grid, from, target) {
  const queue = [{
    x: from.x,
    y: from.y,
    first: null
  }];
  const seen = new Set([`${from.x},${from.y}`]);
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node.x === target.x && node.y === target.y) return node.first;
    for (const [name, d] of directions) {
      const x = node.x + d.x,
        y = node.y + d.y,
        key = `${x},${y}`;
      if (!walkable(grid, x, y) || seen.has(key)) continue;
      seen.add(key);
      queue.push({
        x,
        y,
        first: node.first || name
      });
    }
  }
  return null;
}

// Find the furthest open tile ahead, up to four tiles away. The cheese
// aims for that tile, then switches back to the player's current tile
// when the predicted spot is no longer reachable.
export function interceptTarget(grid, player, direction) {
  if (!DIR[direction]) return {
    x: player.x,
    y: player.y
  };
  const d = DIR[direction],
    target = {
      x: player.x,
      y: player.y
    };
  for (let i = 0; i < 4; i++) {
    if (!walkable(grid, target.x + d.x, target.y + d.y)) break;
    target.x += d.x;
    target.y += d.y;
  }
  return target;
}

export function nextEnemyStep(grid, enemy, player, playerDirection) {
  const target = enemy.type === 'cheese' ? interceptTarget(grid, player, playerDirection) : player;
  return shortestStep(grid, enemy, target) || shortestStep(grid, enemy, player);
}

export function fleeStep(grid, enemy, player) {
  const queue = [player],
    distances = new Map([
      [`${player.x},${player.y}`, 0]
    ]);
  for (let head = 0; head < queue.length; head++) {
    const tile = queue[head],
      distance = distances.get(`${tile.x},${tile.y}`);
    for (const [, d] of directions) {
      const x = tile.x + d.x,
        y = tile.y + d.y,
        key = `${x},${y}`;
      if (!walkable(grid, x, y) || distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push({
        x,
        y
      });
    }
  }
  const opposite = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  } [enemy.direction];
  const choices = directions.filter(([, d]) => walkable(grid, enemy.x + d.x, enemy.y + d.y));
  if (!choices.length) return null;
  choices.sort((a, b) => {
    const da = distances.get(`${enemy.x+a[1].x},${enemy.y+a[1].y}`) ?? -1;
    const db = distances.get(`${enemy.x+b[1].x},${enemy.y+b[1].y}`) ?? -1;
    return db - da || Number(a[0] === opposite) - Number(b[0] === opposite);
  });
  return choices[0][0];
}
