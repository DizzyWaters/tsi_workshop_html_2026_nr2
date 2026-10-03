'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const TinyRogue = require('../rogue.js');

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function path(game, destination) {
  const queue = [{ x: game.player.x, y: game.player.y, steps: [] }];
  const seen = new Set();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.x === destination.x && p.y === destination.y) return p.steps;
    for (const [action, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
      const x = p.x + dx; const y = p.y + dy; const key = `${x},${y}`;
      if (!game.walkable(x, y) || seen.has(key)) continue;
      seen.add(key); queue.push({ x, y, steps: [...p.steps, action] });
    }
  }
  return null;
}
function arena() {
  const game = new TinyRogue(() => 0);
  game.map = Array.from({ length: 15 }, (_, y) => Array.from({ length: 25 }, (_, x) => x === 0 || y === 0 || x === 24 || y === 14 ? '#' : '.'));
  Object.assign(game.player, { x: 2, y: 2 }); game.enemies = []; game.items = [];
  return game;
}

test('100 generated runs have connected floors and a reachable two-floor victory', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const game = new TinyRogue(seeded(seed));
    for (let floor = 1; floor <= 2; floor++) {
      const entities = [game.player, ...game.items, ...game.enemies];
      assert.equal(new Set(entities.map(p => `${p.x},${p.y}`)).size, entities.length);
      for (const entity of entities) assert.ok(path(game, entity), `Unreachable entity, seed ${seed}`);
      for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) {
        if (game.walkable(x, y)) assert.ok(path(game, { x, y }), `Disconnected floor, seed ${seed}`);
      }
      game.enemies = []; // Isolate traversal from combat, which is checked below.
      let destination;
      if (floor === 1) {
        for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) if (game.map[y][x] === '>') destination = { x, y };
      } else destination = game.items.find(item => item.symbol === '*');
      for (const action of path(game, destination)) assert.equal(game.act(action), true);
      if (floor === 1) { assert.equal(game.act('descend'), true); assert.equal(game.level, 2); }
    }
    assert.equal(game.won, true); assert.equal(game.over, true);
    const turn = game.turn; game.act('wait'); assert.equal(game.turn, turn);
  }
});

test('blocked movement and invalid item/stair commands consume no turn', () => {
  const game = arena(); game.player.x = 1;
  for (const action of ['left', 'potion', 'descend', 'invalid']) assert.equal(game.act(action), false);
  assert.equal(game.turn, 0); assert.equal(game.player.food, 100);
});

test('bump combat, retaliation, kill reward, and permanent death', () => {
  const game = arena(); game.enemies = [{ x: 3, y: 2, hp: 5, symbol: 'r' }];
  game.act('right'); assert.equal(game.enemies[0].hp, 2); assert.equal(game.player.hp, 23); assert.equal(game.player.x, 2);
  game.act('right'); assert.equal(game.enemies.length, 0); assert.equal(game.player.gold, 5);
  game.enemies = [{ x: 3, y: 2, hp: 5, symbol: 'r' }]; game.player.hp = 1;
  game.act('wait'); assert.equal(game.player.hp, 0); assert.equal(game.over, true); assert.equal(game.won, false);
  assert.equal(game.act('potion'), false);
});

test('potions and automatic pickups update inventory and cap health/food', () => {
  const game = arena(); game.player.hp = 20;
  game.act('potion'); assert.equal(game.player.hp, 24); assert.equal(game.player.potions, 1);
  for (const [symbol, x] of [['!', 3], ['%', 4], ['$', 5]]) game.items.push({ x, y: 2, symbol });
  game.act('right'); assert.equal(game.player.potions, 2);
  game.act('right'); assert.equal(game.player.food, 99);
  game.act('right'); assert.equal(game.player.gold, 8); assert.equal(game.items.length, 0);
});

test('starvation can kill, including on the stairs', () => {
  const game = arena(); game.player.hp = 1; game.player.food = 0;
  game.map[2][2] = '>'; game.act('descend');
  assert.equal(game.level, 2); assert.equal(game.over, true); assert.equal(game.player.hp, 0);
});

test('monsters pursue around walls without stacking or moving on an invalid action', () => {
  const game = arena(); game.enemies = [{ x: 5, y: 3, hp: 5, symbol: 'r' }, { x: 6, y: 3, hp: 5, symbol: 'r' }];
  game.map[2][4] = '#';
  const before = JSON.stringify(game.enemies); game.act('invalid'); assert.equal(JSON.stringify(game.enemies), before);
  for (let i = 0; i < 5; i++) {
    game.act('wait');
    assert.equal(new Set(game.enemies.map(e => `${e.x},${e.y}`)).size, game.enemies.length);
    assert.ok(game.enemies.every(e => game.walkable(e.x, e.y) && (e.x !== game.player.x || e.y !== game.player.y)));
  }
  assert.ok(game.player.hp < 24);
});

test('fog stops at walls and remembers previously explored terrain', () => {
  const game = arena(); game.explored.clear();
  for (let y = 0; y < game.height; y++) game.map[y][4] = '#';
  assert.ok(game.visible().has('4,2')); assert.ok(!game.visible().has('5,2'));
  game.player.y = 12; assert.ok(!game.visible().has('2,2')); assert.ok(game.explored.has('2,2'));
});
