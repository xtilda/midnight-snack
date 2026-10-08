import {
  DIR,
  TILE
} from './level.js';
import {
  createGame,
  updateGame,
  POWER_DURATION
} from './gameplay.js';
import {
  initAudio,
  setMuted,
  playSound
} from './audio.js';
import {
  Effects
} from './effects.js';
import {
  createRenderer
} from './renderer.js';

const element = id => document.getElementById(id);
const effects = new Effects();
const draw = createRenderer(element('game'), effects);
const board = document.querySelector('.board-wrap');
const overlay = element('overlay');
const play = element('play');
const bestKey = 'midnight-snack-best-v1';
let best = 0;
try {
  best = Math.max(0, Number(localStorage.getItem(bestKey)) || 0);
} catch {
  /* Storage may be unavailable. */
}
let game = createGame();
let phase = 'ready';
let rafId, endTimer, last = 0,
  muted = false;
let messageTime = 0;
const initialCrumbs = game.remaining;
const pad = number => String(number).padStart(5, '0');
const time = milliseconds => `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

function objective() {
  return !game.snacks ? 'RETURN TO THE BLUE DOOR' : `FIND ${game.snacks} MORE SNACK${game.snacks === 1 ? '' : 'S'}`;
}

function refresh() {
  element('score').textContent = pad(game.score);
  element('remaining').textContent = `${game.totalSnacks - game.snacks} / ${game.totalSnacks}`;
  element('lives').textContent = Array(game.lives).fill('♥').join(' ');
  element('run-time').textContent = time(game.elapsed);
  element('power').hidden = game.power <= 0;
  element('power-time').textContent = `${Math.ceil(game.power / 1000)}s`;
  element('power').style.background = `linear-gradient(90deg,#f8d58e ${game.power / POWER_DURATION * 100}%,#eaded0 0)`;
  element('combo').textContent = game.combo ?
    `SNACK CHAIN ×${game.combo} · ${Math.ceil(game.comboTime / 1000)}s` :
    'SNACK CHAIN · COLLECT WITHIN 12s';
  element('combo').classList.toggle('active', game.combo > 1);
  element('crumbs').textContent = `CRUMBS ${initialCrumbs - game.remaining} / ${initialCrumbs}`;
  element('enemy-warning').textContent = game.enemyDelay > 0 ?
    `${Math.ceil(game.enemyDelay / 1000)}s HEAD START` :
    game.power > 0 ? 'HUNTERS ARE FLEEING' : !game.snacks ? 'THEY WANT YOU BACK!' : 'WATCH THE NEXT CORNER';
  if (game.score > best) {
    best = game.score;
    try {
      localStorage.setItem(bestKey, String(best));
    } catch {
      /* Best still works for this session. */
    }
  }
  element('best').textContent = pad(best);
}

function show(title, copy, kicker, button) {
  element('overlay-title').textContent = title;
  element('overlay-copy').textContent = copy;
  element('overlay-kicker').textContent = kicker;
  play.firstChild.textContent = `${button} `;
  overlay.classList.remove('hidden');
  play.focus({
    preventScroll: true
  });
}

function start() {
  clearTimeout(endTimer);
  cancelAnimationFrame(rafId);
  initAudio();
  effects.clear();
  board.classList.remove('lights-out');
  game = createGame();
  phase = 'playing';
  messageTime = 0;
  element('status').textContent = objective();
  element('pause').textContent = 'PAUSE';
  overlay.classList.add('hidden');
  play.blur();
  refresh();
  last = performance.now();
  rafId = requestAnimationFrame(frame);
}

function pause() {
  if (phase !== 'playing') return;
  phase = 'paused';
  cancelAnimationFrame(rafId);
  element('pause').textContent = 'RESUME';
  show('Paused.', 'Your run, sauce and chain timers are frozen.', 'TAKE A BREATHER', 'RESUME');
}

function resume() {
  if (phase !== 'paused') return;
  initAudio();
  phase = 'playing';
  overlay.classList.add('hidden');
  element('pause').textContent = 'PAUSE';
  play.blur();
  last = performance.now();
  rafId = requestAnimationFrame(frame);
}

function handleEvents() {
  for (const event of game.events.splice(0)) {
    playSound(event.type);
    if (['snack', 'sauce', 'eat'].includes(event.type)) {
      effects.burst(event.x * TILE + 16, event.y * TILE + 16, event.type === 'snack' ? '#ffbd70' : '#ff7855', event.points);
      messageTime = 1400;
      element('status').textContent = event.type === 'snack' ?
        !game.snacks ? 'EXIT OPEN! GET BACK HOME' : game.combo > 1 ? `SNACK CHAIN ×${game.combo}!` : objective() :
        event.type === 'sauce' ? 'HOT SAUCE! CHASE THEM' : `GOT THEM! +${event.points}`;
    } else if (event.type === 'hurt') {
      effects.hit();
      messageTime = 1800;
      element('status').textContent = 'CLOSE CALL! TAKE A BREATH';
    } else if (event.type === 'lose') {
      phase = 'stopped';
      element('status').textContent = 'CAUGHT IN THE ACT';
      show('Caught.', `${event.culprit === 'milk' ? 'Sour Milk' : 'Moldy Cheese'} caught you. ${game.totalSnacks - game.snacks}/5 snacks, ${pad(game.score)} points. Try saving the sauce for your escape.`, 'THE FRIDGE WINS', 'TRY AGAIN');
    } else if (event.type === 'win') {
      phase = 'ending';
      element('status').textContent = 'SNACK RUN COMPLETE';
      board.classList.add('lights-out');
      const {
        timeBonus,
        lifeBonus,
        crumbBonus
      } = game.result;
      endTimer = setTimeout(() => {
        phase = 'stopped';
        show('Made it.', `${time(game.elapsed)} · ${pad(game.score)} points. Exit +500, speed +${timeBonus}, chances +${lifeBonus}${crumbBonus ? `, clean shelf +${crumbBonus}` : ''}. Can you beat your run?`, 'BACK IN BED', 'PLAY AGAIN');
      }, 650);
    }
  }
}

function frame(now) {
  if (phase !== 'playing') return;
  const dt = Math.min(now - last, 50);
  last = now;
  updateGame(game, dt);
  effects.update(dt);
  messageTime = Math.max(0, messageTime - dt);
  if (!messageTime) element('status').textContent = game.power > 0 ? 'HOT SAUCE! CHASE THEM' : objective();
  handleEvents();
  refresh();
  draw(game, now);
  if (phase === 'playing') rafId = requestAnimationFrame(frame);
}

function setDirection(name) {
  if (DIR[name] && phase === 'playing') game.wanted = name;
}
const keys = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
};
window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key === 'p' || event.key === 'Escape') {
    if (event.repeat) return;
    if (phase === 'playing' || phase === 'paused') {
      event.preventDefault();
      phase === 'playing' ? pause() : resume();
    }
    return;
  }
  const direction = keys[event.key] || keys[key];
  if (direction) {
    event.preventDefault();
    setDirection(direction);
  }
  // Native button activation handles Enter/Space when a control has focus.
  if ((event.key === 'Enter' || event.key === ' ') && !event.repeat && !event.target.closest('button')) {
    if (['ready', 'stopped', 'paused'].includes(phase)) {
      event.preventDefault();
      phase === 'paused' ? resume() : start();
    }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('pointerdown', event => {
  event.preventDefault();
  setDirection(button.dataset.direction);
}));
play.addEventListener('click', () => phase === 'paused' ? resume() : start());
element('pause').addEventListener('click', () => phase === 'playing' ? pause() : resume());
element('restart').addEventListener('click', start);
element('sound').addEventListener('click', () => {
  muted = setMuted(!muted);
  element('sound').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  element('sound').setAttribute('aria-pressed', String(muted));
  if (!muted) initAudio();
});
refresh();
draw(game, 0);
