'use strict';

const careButtons = document.querySelectorAll('[data-care]');
const statusText = document.getElementById('game-status');
const mood = document.getElementById('dragon-mood');
const dragon = document.getElementById('game-dragon');
let needs;
let turn;
let finished;

function render() {
  for (const [need, value] of Object.entries(needs)) {
    const meter = document.getElementById(`${need}-meter`);
    meter.value = value;
    meter.textContent = `${value}%`;
    document.getElementById(`${need}-value`).textContent = `${value}%`;
  }
  careButtons.forEach(button => { button.disabled = finished; });
}

function restart() {
  needs = { hunger: 55, joy: 55, energy: 55 };
  turn = 0;
  finished = false;
  mood.textContent = 'Ready for snacks!';
  statusText.textContent = 'Turn 0 of 8 · Your hatchling is getting to know you.';
  dragon.classList.remove('celebrate');
  render();
}

function care(action) {
  if (finished) return;
  const effects = {
    feed: { hunger: 30, joy: -8, energy: -12 },
    play: { hunger: -12, joy: 30, energy: -16 },
    rest: { hunger: -10, joy: -8, energy: 35 }
  };
  if (!effects[action]) return;
  turn += 1;
  for (const need of Object.keys(needs)) {
    needs[need] = Math.max(0, Math.min(100, needs[need] + effects[action][need]));
  }
  const messages = { feed: 'Crunch! An excellent snack.', play: 'A very tiny, very happy roar!', rest: 'Zzz… dreaming of treasure.' };
  mood.textContent = messages[action];
  if (Object.values(needs).some(value => value === 0)) {
    finished = true;
    mood.textContent = 'Time for a little extra care.';
    statusText.textContent = `Turn ${turn} of 8 · A need reached zero. Try again and balance food, play, and rest!`;
  } else if (turn === 8) {
    finished = true;
    mood.textContent = 'Best friends forever!';
    statusText.textContent = '8 of 8 turns · You earned your Dragon Guardian badge! ✦';
    dragon.classList.add('celebrate');
  } else {
    statusText.textContent = `Turn ${turn} of 8 · ${messages[action]}`;
  }
  render();
}

careButtons.forEach(button => button.addEventListener('click', () => care(button.dataset.care)));
document.getElementById('restart-game').addEventListener('click', restart);
document.querySelectorAll('[data-species]').forEach(button => {
  button.addEventListener('click', () => {
    const species = document.getElementById('species');
    species.value = button.dataset.species;
    species.focus();
  });
});
restart();
