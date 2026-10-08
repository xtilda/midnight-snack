// # wall · space floor · . bonus crumb · S snack · H hot sauce · P door/player
export const TILE = 32;
export const LEVEL = [
  '#####################',
  '#P...S#.......#.....#',
  '#.##.#.#.###.#.#.##.#',
  '#....#.#...#...#.S..#',
  '###.##.###.###.##.###',
  '#...#.....#.....#...#',
  '#.#.#.###.#.###.#.#.#',
  '#.#S..#....H..#...#.#',
  '#.###.#.#####.#.###.#',
  '#.....#...M...#.....#',
  '#.###.###.#.###.###.#',
  '#...#.....#.....#S..#',
  '###.#.#########.#.###',
  '#...#...........#...#',
  '#.#####.#####.#####.#',
  '#......S....#...C...#',
  '#.#######.#.#######.#',
  '#####################'
];
export function createLevel() {
  const grid = LEVEL.map(row => [...row]);
  let player, remaining = 0,
    snacks = 0;
  const enemies = [];
  grid.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === 'P') {
      player = {
        x,
        y
      };
      grid[y][x] = ' ';
    }
    if (cell === 'M' || cell === 'C') {
      enemies.push({
        type: cell === 'M' ? 'milk' : 'cheese',
        x,
        y,
        start: {
          x,
          y
        },
        direction: null,
        clock: 0,
        respawn: 0
      });
      grid[y][x] = ' ';
    }
    if (cell === '.') remaining++;
    if (cell === 'S') snacks++;
  }));
  return {
    grid,
    player,
    enemies,
    remaining,
    snacks,
    totalSnacks: snacks
  };
}
export const DIR = {
  up: {
    x: 0,
    y: -1
  },
  down: {
    x: 0,
    y: 1
  },
  left: {
    x: -1,
    y: 0
  },
  right: {
    x: 1,
    y: 0
  }
};
export function walkable(grid, x, y) {
  return grid[y]?.[x] !== undefined && grid[y][x] !== '#';
}
