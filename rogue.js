'use strict';

// Pure game state, separate from the browser UI for easy testing.
class TinyRogue {
  constructor(random = Math.random) {
    this.random = random; this.width = 25; this.height = 15;
    this.level = 1; this.turn = 0; this.over = false; this.won = false;
    this.player = { x: 0, y: 0, hp: 24, maxHp: 24, potions: 2, gold: 0, food: 100 };
    this.messages = ['You enter the Ember Vault. Find the stairs.'];
    this.generate();
  }
  roll(min, max) { return min + Math.floor(this.random() * (max - min + 1)); }
  say(message) { this.messages.push(message); this.messages = this.messages.slice(-20); }
  walkable(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height && this.map[y][x] !== '#'; }
  generate() {
    this.map = Array.from({ length: this.height }, () => Array(this.width).fill('#'));
    this.items = []; this.enemies = []; this.explored = new Set(); this.lastHit = null;
    const rooms = [[1, 1], [14, 1], [14, 9], [1, 9]].map(([x, y]) => ({ x: x + this.roll(0, 1), y, w: this.roll(6, 8), h: this.roll(4, 5) }));
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.map[y][x] = '.';
    const centers = rooms.map(r => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) }));
    for (let i = 1; i < centers.length; i++) {
      let { x, y } = centers[i - 1]; const end = centers[i];
      const carveX = () => { while (x !== end.x) { x += Math.sign(end.x - x); this.map[y][x] = '.'; } };
      const carveY = () => { while (y !== end.y) { y += Math.sign(end.y - y); this.map[y][x] = '.'; } };
      if (this.roll(0, 1)) { carveX(); carveY(); } else { carveY(); carveX(); }
    }
    Object.assign(this.player, centers[0]);
    const occupied = new Set(centers.map(p => `${p.x},${p.y}`)); const free = [];
    for (let y = 1; y < this.height - 1; y++) for (let x = 1; x < this.width - 1; x++) {
      if (this.walkable(x, y) && !occupied.has(`${x},${y}`) && Math.abs(x - this.player.x) + Math.abs(y - this.player.y) > 3) free.push({ x, y });
    }
    const place = () => free.splice(this.roll(0, free.length - 1), 1)[0];
    const destination = centers[3];
    if (this.level === 1) this.map[destination.y][destination.x] = '>';
    else this.items.push({ ...destination, symbol: '*' });
    for (const symbol of ['!', '!', '%', '%', '$', '$', '$']) this.items.push({ ...place(), symbol });
    for (let i = 0; i < this.level + 2; i++) this.enemies.push({ ...place(), symbol: this.level === 1 ? 'r' : 'g', hp: this.level === 1 ? 5 : 8 });
    this.visible();
  }
  // Cast short rays; remember terrain, but never show hidden monsters or items.
  visible() {
    const result = new Set(); const p = this.player;
    for (let y = Math.max(0, p.y - 6); y <= Math.min(this.height - 1, p.y + 6); y++) {
      for (let x = Math.max(0, p.x - 6); x <= Math.min(this.width - 1, p.x + 6); x++) {
        const steps = Math.max(Math.abs(x - p.x), Math.abs(y - p.y));
        if (Math.hypot(x - p.x, y - p.y) > 6) continue;
        for (let i = 0; i <= steps; i++) {
          const tx = steps ? Math.round(p.x + (x - p.x) * i / steps) : p.x;
          const ty = steps ? Math.round(p.y + (y - p.y) * i / steps) : p.y;
          const key = `${tx},${ty}`; result.add(key); this.explored.add(key);
          if (this.map[ty][tx] === '#') break;
        }
      }
    }
    return result;
  }
  pickup() {
    const index = this.items.findIndex(item => item.x === this.player.x && item.y === this.player.y);
    if (index < 0) return;
    const item = this.items.splice(index, 1)[0]; const p = this.player;
    if (item.symbol === '!') { p.potions++; this.say('You found a healing potion.'); }
    if (item.symbol === '%') { p.food = Math.min(100, p.food + 45); this.say('You eat a ration. Your hunger eases.'); }
    if (item.symbol === '$') { const gold = this.roll(8, 20); p.gold += gold; this.say(`You collect ${gold} gold.`); }
    if (item.symbol === '*') { this.over = true; this.won = true; this.say('The dragon egg is safe. You win!'); }
  }
  act(action) {
    if (this.over) return false;
    this.lastHit = null; const p = this.player;
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    if (directions[action]) {
      const [dx, dy] = directions[action]; const x = p.x + dx; const y = p.y + dy;
      if (!this.walkable(x, y)) { this.say('A wall blocks your way.'); return false; }
      const enemy = this.enemies.find(e => e.x === x && e.y === y);
      if (enemy) {
        const damage = this.roll(3, 5); enemy.hp -= damage; this.lastHit = `${x},${y}`;
        this.say(`You strike the ${enemy.symbol === 'r' ? 'rat' : 'goblin'} for ${damage}.`);
        if (enemy.hp <= 0) { this.enemies.splice(this.enemies.indexOf(enemy), 1); p.gold += 5; this.say('Monster defeated. +5 gold.'); }
      } else { p.x = x; p.y = y; this.pickup(); }
    } else if (action === 'potion') {
      if (!p.potions || p.hp === p.maxHp) { this.say(p.potions ? 'You are already at full health.' : 'No potions left.'); return false; }
      p.potions--; p.hp = Math.min(p.maxHp, p.hp + 12); this.say('You drink a potion and recover up to 12 health.');
    } else if (action === 'descend') {
      if (this.map[p.y][p.x] !== '>' || this.level !== 1) { this.say('Stand on the stairs (>) to descend.'); return false; }
      this.level = 2; this.generate(); this.say('Floor 2. Find the dragon egg (*).');
    } else if (action === 'wait') this.say('You wait and listen.');
    else return false;
    this.turn++;
    if (!this.over) {
      p.food = Math.max(0, p.food - 1);
      if (p.food === 0) { p.hp--; this.say('You are starving! Find food (%).'); }
      if (p.hp > 0) this.monsterTurn();
      if (p.hp <= 0) { p.hp = 0; this.over = true; this.say('You fall in the vault. This run is over.'); }
    }
    this.visible(); return true;
  }
  monsterTurn() {
    const p = this.player; const visible = this.visible();
    for (const enemy of this.enemies) {
      if (p.hp <= 0) break;
      const distance = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
      if (distance === 1) {
        const damage = this.roll(1, this.level + 1); p.hp -= damage;
        this.lastHit = `${p.x},${p.y}`; this.say(`The ${enemy.symbol === 'r' ? 'rat' : 'goblin'} hits you for ${damage}.`);
      } else if (visible.has(`${enemy.x},${enemy.y}`)) {
        const queue = [{ x: enemy.x, y: enemy.y, first: null }]; const seen = new Set([`${enemy.x},${enemy.y}`]);
        for (let i = 0; i < queue.length; i++) {
          const current = queue[i];
          if (current.x === p.x && current.y === p.y) { Object.assign(enemy, current.first); break; }
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const x = current.x + dx; const y = current.y + dy; const key = `${x},${y}`;
            if (!this.walkable(x, y) || seen.has(key) || this.enemies.some(other => other !== enemy && other.x === x && other.y === y)) continue;
            seen.add(key); queue.push({ x, y, first: current.first || { x, y } });
          }
        }
      }
    }
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = TinyRogue;
