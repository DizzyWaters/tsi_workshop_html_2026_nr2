'use strict';

const dungeon = document.getElementById('dungeon');
const commandButtons = document.querySelectorAll('[data-command]');
let expedition;

function renderDungeon() {
  const visible = expedition.visible();
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < expedition.height; y++) {
    for (let x = 0; x < expedition.width; x++) {
      const key = `${x},${y}`;
      const tile = document.createElement('span');
      let symbol = ' '; let kind = 'unseen';
      if (expedition.explored.has(key)) {
        symbol = expedition.map[y][x];
        kind = visible.has(key) ? (symbol === '#' ? 'wall' : 'floor') : 'remembered';
        if (visible.has(key)) {
          const item = expedition.items.find(item => item.x === x && item.y === y);
          const enemy = expedition.enemies.find(enemy => enemy.x === x && enemy.y === y);
          if (item) { symbol = item.symbol; kind = 'item'; }
          if (enemy) { symbol = enemy.symbol; kind = 'enemy'; }
        }
      }
      if (x === expedition.player.x && y === expedition.player.y) { symbol = '@'; kind = 'player'; }
      tile.textContent = symbol; tile.className = `tile ${kind}`;
      if (expedition.lastHit === key) tile.classList.add('hit');
      tile.setAttribute('aria-hidden', 'true'); fragment.appendChild(tile);
    }
  }
  dungeon.replaceChildren(fragment);
  dungeon.classList.toggle('game-over', expedition.over);
  const p = expedition.player;
  document.getElementById('rogue-stats').textContent = `FLOOR ${expedition.level}/2   ♥ ${p.hp}/${p.maxHp}   POTIONS ${p.potions}   GOLD ${p.gold}   FOOD ${p.food}   TURN ${expedition.turn}`;
  document.getElementById('game-status').textContent = expedition.over
    ? (expedition.won ? `You rescued the dragon egg! ${p.gold} gold collected in ${expedition.turn} turns.` : 'Your expedition has ended. Start a new one to try again.')
    : `Floor ${expedition.level}: ${expedition.level === 1 ? 'Find the stairs (>) and descend.' : 'Find the dragon egg (*).'} Position ${p.x + 1}, ${p.y + 1}. ${expedition.messages.at(-1)}`;
  document.getElementById('rogue-log').replaceChildren(...expedition.messages.slice(-4).reverse().map(message => {
    const li = document.createElement('li'); li.textContent = message; return li;
  }));
  commandButtons.forEach(button => { button.disabled = expedition.over; });
}

function command(action) { expedition.act(action); renderDungeon(); }
function startExpedition() { expedition = new TinyRogue(); renderDungeon(); }
commandButtons.forEach(button => button.addEventListener('click', () => command(button.dataset.command)));
document.getElementById('restart-game').addEventListener('click', () => {
  startExpedition(); dungeon.focus({ preventScroll: true });
});
dungeon.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  const keys = { ArrowUp: 'up', w: 'up', k: 'up', ArrowDown: 'down', s: 'down', j: 'down', ArrowLeft: 'left', a: 'left', h: 'left', ArrowRight: 'right', d: 'right', l: 'right', p: 'potion', '.': 'wait', '>': 'descend' };
  const action = keys[event.key] || keys[event.key.toLowerCase()];
  if (action) { event.preventDefault(); command(action); }
});
document.querySelectorAll('[data-species]').forEach(button => {
  button.addEventListener('click', () => {
    const species = document.getElementById('species');
    species.value = button.dataset.species;
    species.focus();
  });
});
startExpedition();
