#!/usr/bin/env node
'use strict';

const readline = require('readline');
const colors = require('colors/safe');

function good(s) {
  console.log(colors.green(s));
}
function bad(s) {
  console.log(colors.red(s));
}
function todo(s) {
  console.log(colors.yellow(s));
}
function original(lines) {
  console.log((turn ? '\n' : '') + colors.grey(`${lines.join('\n')}\n`));
}

const BOOSTS = {
  'Attack': 'atk',
  'Defense': 'def',
  'Special Attack': 'spa',
  'Special Defense': 'spd',
  'Speed': 'spe',
  'Accuracy': 'accuracy',
  'Evasion': 'evasion',
};

const JOIN = /^(.*) has started watching.$/;
const LEAVE = /^(.*) has left.$/;
const SWITCH = /^(.*) sent out (.*) \(Lv.(\d+) (.*)\)!$/;
const DRAG = /^(.*) \(Lv.(\d+) (.*)\) was dragged out!$/;

var p1, p2;
var teams = {p1: {}, p2: {}};
var active = {p1: '', p2: ''};
var spectators = [];
var actor;
var lastMove;

const FEMALE = new Set([
  'Chansey', 'Blissey', 'Cresselia', 'Frosslass', 'Happiney', 'Illumise', 'Jynx', 'Kangaskhan',
  'Latias', 'Miltank', 'Nidoqueen', 'Nidoran♀', 'Nidorina', 'Smoochum', 'Vespiquen', // etc...
]);
const GENDERLESS = new Set([
  'Arceus', 'Articuno', 'Azelf', 'Baltoy', 'Beldum', 'Bronzong', 'Bronzor', 'Celebi', 'Claydol',
  'Ditto', 'Electrode', 'Entei', 'Genesect', 'Giratina', 'Groudon', 'Ho-Oh', 'Jirachi', 'Keldeo',
  'Kyogre', 'Kyurem', 'Lugia', 'Lunatone', 'Magneton', 'Magnezone', 'Manaphy', 'Mesprit',
  'Metagross', 'Mew', 'Mewtwo', 'Moltres', 'Porygon', 'Porygon2', 'Porygon-Z', 'Raikou',
  'Rayquaza', 'Regice', 'Registeel', 'Regirock', 'Rotom', 'Shaymin', 'Shedinja', 'Solrock',
  'Starmie', 'Suicune', 'Uxie', 'Voltorb', 'Zapdos', // etc...
]);

function getGender(s) {
  if (GENDERLESS.has(s)) return '';
  return FEMALE.has(s) ? ', F' : ', M';
}

function processSwitch(m) {
  const player = m[1] === p1 ? 'p1' : 'p2';
  const ident = `${player}a: ${m[2]}`;
  const details = m[4] + (m[3] !== '100' ? `, L${m[3]}` : '') + getGender(m[4]);
  const mon = teams[player][m[2]] = {
    ident,
    details,
    hp: teams[player][m[2]] && teams[player][m[2]].hp
      ? teams[player][m[2]].hp
      : (player === 'p2' ? 100 : null),
    status: teams[player][m[2]] ? teams[player][m[2]].status : null,
  };
  active[player] = m[2];

  let hp;
  if (player === 'p1') {
    hp = (mon.hp ? colors.green(mon.hp) : colors.red('???')) +
      colors.green('\\/') +
      colors.red('???') +
      (mon.status ? colors.green(` ${mon.status}`)  : '');
  } else {
    hp = colors.green(`${mon.hp}\\/100${mon.status ? ' ' + mon.status : ''}`);
  }
  let bp = '';
  if (lastMove === 'Baton Pass') {
    bp = colors.green('|[from] move: Baton Pass');
    lastMove = null;
  }

  return colors.green(`|switch|${ident}|${details}|`) + hp + bp;
}

function acted() {
  return actor === 'p1' ? 'p2' : 'p1';
}

function processDrag(m) {
  const player = acted();
  const ident = `${player}a: ${m[1]}`;
  const details = m[3] + (m[2] !== '100' ? `, L${m[2]}` : '') + getGender(m[3]);
  const mon = teams[player][m[1]] = {
    ident,
    details,
    hp: teams[player][m[2]] && teams[player][m[2]].hp
      ? teams[player][m[2]].hp
      : (player === 'p2' ? 100 : null),
    status: teams[player][m[2]] ? teams[player][m[2]].status : null,
  };
  active[player] = m[1];

  let hp;
  if (player === 'p1') {
    hp = (mon.hp ? colors.green(mon.hp) : colors.red('???')) +
      colors.green('\\/') +
      colors.red('???') +
      (mon.status ? colors.green(` ${mon.status}`)  : '');
  } else {
    hp = colors.green(`${mon.hp}\\/100${mon.status ? ' ' + mon.status : ''}`);
  }

  return colors.green(`|drag|${ident}|${details}|`) + hp;
}

function processBeginning(lines) {
  const rules = [];
  const other = [];
  const switches = [];
  const earlyspecs = [];
  for (const line of lines) {
    let m;
    if (m = /(.*) vs (.*). Begin!/.exec(line)) {
      p1 = m[2];
      p2 = m[1];
      spectators.push(p1, p2);
    } else if (m = /^Rule: (.*)$/.exec(line)) {
      rules.push(m[1]);
    } else if (m = SWITCH.exec(line)) {
      switches.push(m);
    } else if (m = JOIN.exec(line)) {
      earlyspecs.push(m[1]);
      spectators.push(m[1]);
    } else  if (line == 'Battle Log:' || line === 'Battle Mode: Ruby/Sapphire') {
      continue;
    } else {
      other.push(line);
    }
  }
  good(`|j|☆${p1}`);
  good(`|j|☆${p2}`);
  good(`|player|p1|${p1}|1`);
  good(`|player|p2|${p2}|2`);
  // NOTE: assumptions...
  good(`|teamsize|p1|6`);
  good(`|teamsize|p2|6`);
  good(`|gametype|singles`);
  good(`|gen|3`);
  good(`|tier|[Gen 3] OU`);
  good(rules.map(r => `|rule|${r}: ${r}`).join('\n'));
  good('|');
  good('|start');
  if (earlyspecs.length) good(earlyspecs.map(s => `|j| ${s}`).join('\n'));
  console.log(switches.map(s => processSwitch(s)).join('\n'));
  bad(other.join('\n'));
}

function escape(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

var SAVED_EOT = {};
function processTurn(lines, turn) {
  original(lines, turn);
  if (!turn) return processBeginning(lines);

  const EOT = new RegExp(`^(${escape(p1)}|${escape(p2)})'s (.*): (\\\d+)%? HP(?: \\((.*)\\))?$`);

  good(`|turn|${turn}`);
  good('|');
  for (const line of lines) {
    let m;
    if (m = SWITCH.exec(line)) {
      console.log(processSwitch(m));
    } else if (m = JOIN.exec(line)) {
      spectators.push(m[1]);
      good(`|j| ${m[1]}`);
    } else if (m = LEAVE.exec(line)) {
      spectators = spectators.filter(s => s !== m[1]);
      good(`|l| ${m[1]}`);
    } else if (/^(.*) (fled from battle|was blown away)!$/.test(line)) {
      continue;
    } else if (m = /^(.*)'s attack missed!$/.exec(line)) {
      good(`|-miss|${actor}a: ${m[1]}|${acted()}a: ${active[acted()]}`);
    } else if (m = /^(.*) is fast asleep.$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|cant|${player}a: ${m[1]}|slp`);
    } else if (m = /^(.*)'s Leftovers restored its HP a little!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      const mon = active[player];
      console.log(
        colors.green(`|-heal|${player}a: ${m[1]}|`) +
        colors.red('???') +
        colors.green('\\/') +
        (player === 'p2' ? colors.green(100) : colors.red('???')) +
        (mon.status ? colors.green(` ${mon.status}`) : '') +
        colors.green(`|[from]item: Leftovers`)
      );
    } else if (m = /^(.*) is hurt by Spikes!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      const mon = active[player];
      console.log(
        colors.green(`|-damage|${player}a: ${m[1]}|`) +
        colors.red('???') +
        colors.green('\\/') +
        (player === 'p2' ? colors.green(100) : colors.red('???')) +
        (mon.status ? colors.green(` ${mon.status}`) : '') +
        colors.green(`|[from] Spikes`)
      );
    } else if (m = /^(.*) is buffeted by the sandstorm!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      const mon = active[player];
      console.log(
        colors.green(`|-damage|${player}a: ${m[1]}|`) +
        colors.red('???') +
        colors.green('\\/') +
        (player === 'p2' ? colors.green(100) : colors.red('???')) +
        (mon.status ? colors.green(` ${mon.status}`) : '') +
        colors.green(`|[from] Sandstorm`)
      );
    } else if (m = /^(.*)'s Sand Stream whipped up a sandstorm!$/.exec(line)) {
      const player = m[1] === p1 ? 'p1' : 'p2';
      good(`|-weather|Sandstorm|[from] ability: Sand Stream|[of] ${player}a: ${m[1]}`);
    } else if (m = /^(.*)'s team had Spikes scattered around it!$/.exec(line)) {
      const player = m[1] === p1 ? 'p1' : 'p2';
      good(`|-sidestart|${player}: ${m[1]}|Spikes`);
    } else if (m = /^(.*) is paralyzed! It may be unable to move!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|-status|${player}a: ${m[1]}|par`);
    } else if (m = /^(.*) is paralyzed! It can't move!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|cant|${player}a: ${m[1]}|par`);
    } else if (m = /^(.*) went to sleep!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      console.log(
        colors.green(`|-status|${player}a: ${m[1]}|slp`)  +
        colors.red(`|[from] move: ${lastMove}`)
      );
    } else if (m = /^(.*) woke up!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|-curestatus|${player}a: ${m[1]}|slp|[msg]`)
    } else if (m = /^(.*) flinched!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|cant|${player}a: ${m[1]}|flinch`);
    } else if (m = /^(.*) fell for the Taunt!$/.exec(line)) {
      good(`|-start|${acted()}a: ${m[1]}|move: Taunt`);
      const saved = (SAVED_EOT[turn+2] = SAVED_EOT[turn+2] || []);
      saved.push(`|-end|${acted()}a: ${m[1]}|move: Taunt`);
    } else if (m = /^(.*) can't use (.*) after the Taunt!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|cant|${player}a: ${m[1]}|move: Taunt|${m[2]}`);
    } else if (m = /^\((\d+)%? damage\)$/.exec(line)) {
      const mon = active[acted()];
      const hp = acted() === 'p1' ?
        colors.red('???') + colors.green('\\/') + colors.red('???') :
        colors.red('???') + colors.green('\\/100')  +
        (mon.status ? colors.green(` ${mon.status}`) : '');
      console.log(colors.green(`|-damage|${acted()}a: ${active[acted()]}|`) + hp);
    } else if (m = /^(.*) fainted!$/.exec(line)) {
      // TODO |-damage|...|0 fnt
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|faint|${player}a: ${m[1]}`);
    } else if (m = /^(.*) regained health!$/.exec(line)) {
      const mon = active[actor];
      const hp = (actor === 'p1' ?
        colors.red('???') + colors.green('\\/') + colors.red('???') :
        colors.red('???') + colors.green('\\/100')) +
        (mon.status ? colors.green(` ${mon.status}`) : '');
      console.log(colors.green(`|-heal|${actor}a: ${active[actor]}|`) + hp);
    } else if (line === 'But it failed!') {
      console.log(colors.green(`|-fail|${actor}a: ${active[actor]}`) + colors.red('|???'));
    } else if (line === 'A critical hit!') {
      good(`|-crit|${acted()}a: ${active[acted()]}`);
    } else if (line === 'It\'s not very effective...') {
      good(`|-resisted|${acted()}a: ${active[acted()]}`);
    } else if (line === 'It\'s super effective!') {
      good(`|-supereffective|${acted()}a: ${active[acted()]}`);
    } else if (m = /^It doesn't affect (.*)...$/.exec(line)) {
      good(`|-immune|${acted()}a: ${active[acted()]}`);
    } else if (m = /^(.*)'s team's (.*) raised Special Defense!$/.exec(line)) {
      const player = m[1] === p1 ? 'p1' : 'p2';
      good(`|-sidestart|${player}: ${m[1]}|move: ${m[2]}`);
    } else if (m = /^(.*)'s team's (.*) wore off!$/.exec(line)) {
      const player = m[1] === p1 ? 'p1' : 'p2';
      good(`|-sideend|${player}: ${m[1]}|${m[2]}`)
    } else if (m = DRAG.exec(line)) {
      console.log(processDrag(m));
    } else if (m = /^(.*)'s (Attack|Defense|Special Attack|Special Defense|Speed|Accuracy|Evasion) (rose|fell)!$/.exec(line)) {
      const boost = m[3] === 'rose' ? 'boost' : 'unboost';
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      good(`|-${boost}|${player}a: ${m[1]}|${BOOSTS[m[2]]}|1`);
    } else if (/^End of turn #\d+$/.test(line)) {
      continue;
    } else if (m = EOT.exec(line)) {
      const player = m[1] === p1 ? 'p1' : 'p2';
      const a = m[2];
      if (active[player] !== a) {
        throw new Error(`Expected ${player}'s '${active[player]}' to be active, not '${a}'`);
      }
      teams[player][a].hp = +m[3];
      teams[player][a].status = m[4] ? m[4].toLowerCase() : '';
    } else if (m = /^(.*) used (.*)!$/.exec(line)) {
      const player = m[1] === active.p1 ? 'p1' : 'p2';
      actor = player;
      lastMove = m[2];
      console.log(
        colors.green(`|move|${player}a: ${m[1]}|${m[2]}`) +
        colors.red('|' + (player === 'p1' ? `p2a: ${active.p2}` : `p1a: ${active.p1}`)));
    } else if ((m = /^.* withdrew .*!$/.test(line))) {
      continue;
    } else if ((m = /^(.*): (.*)$/.exec(line)) && spectators.includes(m[1])) {
      const rank = (m[1] === p1 || m[1] === p2) ? '☆' : ' ';
      good(`|c|${rank}${m[1]}|${m[2]}`);
    } else if (line === 'The sandstorm rages.') {
      good('|-weather|Sandstorm|[upkeep]');
    } else if (
        line === '---------------------------------' ||
        /^Score: \d to \d$/.test(line) ||
        /^NetBattle v\d+.\d+.\d+/.test(line) ||
        /^Log saved \d+\/\d+\/\d+ .*$/.test(line)
    ) {
      continue;
    } else if (m = /^End Battle! (.*) wins!$/.exec(line)) {
      good(`|win|${m[1]}`);
      continue;
    } else {
      bad(line);
    }
  }
  good('|');
  if (SAVED_EOT[turn]) {
    for (const saved of SAVED_EOT[turn]) todo(saved);
  }
  good('|upkeep');

  displayState();
}

function divisions(hp) {
  const ds = [];
  for (const [d, u] of [[1/16, 16/15], [1/8, 8/7], [1/6, 6/5], [1/4, 4/3]]) {
    const down = Math.round(hp - hp * d);
    const up = Math.round(hp * u);
    ds.push(`${down}|${up}`);
  }
  return ds.join(', ');
}

function displayState() {
  const display = m =>
    `${m.ident} (${m.details}) = ${m.hp} HP${m.status ? ' ' + m.status : ''} (${divisions(m.hp)})`;
  console.log(`\n${p1}`);
  console.log('*' + display(teams.p1[active.p1]));
  for (const name in teams.p1) {
    if (name !== active.p1) console.log(display(teams.p1[name]));
  }

  console.log(`\n${p2}`);
  console.log('*' + display(teams.p2[active.p2]));
  for (const name in teams.p2) {
    if (name !== active.p2) console.log(display(teams.p2[name]));
  }
}

let turn = 0;
let data = [];
readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
}).on('line', line => {
  if (!line.trim()) return;
  const m = /^Begin Turn #(\d+)$/.exec(line);
  if (!m) {
    data.push(line);
  } else {
    turn = m[1] - 1;
    processTurn(data, turn);
    data = [];
  }
}).on('close', () => {
  processTurn(data, turn + 1);
});

