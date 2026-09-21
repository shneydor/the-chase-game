const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const script of scripts) new vm.Script(script);
const source = scripts.join('\n');
const poolCode = source.slice(source.indexOf('function customQuestions()'), source.indexOf('function questionsExhausted()'));
const ctx = vm.createContext({
  state: {cats:['general'], useFamily:true, pool:[], used:new Set()},
  RAW: {general:[['First?', 'a','b','c'], ['Second?', 'a','b','c']]},
  Store: {get:() => [{q:'  FIRST?  ',a:'a',w1:'b',w2:'c'}, {q:'Third?',a:'a',w1:'b',w2:'c'}]},
  KEY_CUSTOM: 'custom', shuffle: a => a.slice()
});
vm.runInContext(poolCode, ctx);
const run = code => vm.runInContext(code, ctx);
run('buildPool()');
assert.equal(run('nextQuestion().q'), 'First?');
// Moving between players and rounds must keep the game history.
run("state.current = 1; state.screen = 'chase'");
assert.equal(run('nextQuestion().q'), 'Second?');
run("state.screen = 'finalTeam'; buildPool()");
assert.equal(run('nextQuestion().q'), 'Third?');
run("state.screen = 'finalChaser'");
assert.equal(run('nextQuestion()'), null);
assert.equal(run('nextQuestion()'), null);
assert.equal(run('state.used.size'), 3);
run('state.used = new Set(); buildPool()');
assert.equal(run('nextQuestion().q'), 'First?');
run('state.cats = []; state.useFamily = false; buildPool()');
assert.equal(run('nextQuestion()'), null);
assert.ok(!source.includes('passQueue'), 'Skipped questions must never be queued again');
// Every gameplay caller must handle an exhausted bank before reading a question.
const calls = [...source.matchAll(/(?:st\.q|q = f\.q) = nextQuestion\([^;]*\);\s*if \(!(?:st\.q|q)\)/g)];
assert.equal(calls.length, 4);
console.log('PASS: script syntax, game-wide history, duplicate entries, rebuild, exhaustion, new game, empty bank, and all four round guards');

// Exercise the actual skip button and keyboard handlers in both timed rounds.
const elements = new Map();
const keys = {};
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {
    style:{setProperty(){}}, classList:{add(){},remove(){}},
    addEventListener(type, handler){ this[type] = handler; }
  });
  return elements.get(selector);
};
Object.assign(ctx, {
  Screens:{}, $:element, mountTopBar(){}, money:String, CATS:{general:{icon:'',name:'General'}},
  Judge:{set(){},mount(){},reveal(){}}, Sound:{pass(){},musicStart(){},musicStop(){}},
  onKeys(map){Object.assign(keys,map)}, addTimeout(fn){fn()}, addCleanup(){}, T:n=>n,
  CASH_SECONDS:60, FINAL_SECONDS:120,
  Clock:class {constructor(){this.running=false} start(){this.running=true} stop(){this.running=false}},
  questionsExhausted(){ctx.exhausted=true}
});
ctx.RAW.general = Array.from({length:12}, (_,i)=>[`Question ${i}`, 'a','b','c']);
run("state.cats=['general']; state.useFamily=false; state.used=new Set(); state.players=[{}]; state.current=0; state.final={right:0,wrong:0,passed:0,teamSteps:0}; buildPool()");
for (const [name, next] of [['cash','offer'],['finalTeam','finalChaser']]) {
  const block = source.slice(source.indexOf(`Screens.${name} =`), source.indexOf(`Screens.${next} =`));
  run(block);
  run(`Screens.${name}.mount()`);
  const field = name === 'cash' ? 'cash' : 'final';
  for (let i=0; i<5; i++) {
    const before = run(`state.${field}.q.q`);
    if (i % 2) keys[' '](); else element('#b-pass').click();
    assert.notEqual(run(`state.${field}.q.q`), before);
    assert.equal(run('state.used.size'), (name === 'cash' ? 2 : 8) + i);
  }
}
assert.equal(run('state.used.size'), 12);
element('#b-pass').click();
assert.equal(ctx.exhausted,true);
assert.equal(run('state.used.size'),12);
console.log('PASS: repeated skips via buttons and keyboard in cash and final rounds, shared history, and exhaustion after skipping');

// Each player's real opening-round handler gets a distinct reserved Or question,
// even if an earlier player has consumed every unreserved question.
const bank = vm.createContext({});
vm.runInContext(scripts.find(s => s.includes('const RAW =')), bank);
ctx.RAW = vm.runInContext('RAW', bank);
ctx.CATS.or = {icon:'', name:'אור'};
run("state.players = Array.from({length:4}, () => ({})); state.cats=['or']; state.useFamily=false; state.used=new Set(); state.current=0; buildPool()");
assert.equal(run('state.orOpeners.length'), 4);
const openings = new Set();
for (let player=0; player<4; player++) {
  run(`state.current=${player}; Screens.cash.mount()`);
  assert.equal(run('state.cash.q.cat'), 'or');
  openings.add(run('state.cash.q.q'));
  // Simulate any number of subsequent questions or head-to-head draws.
  run('while (nextQuestion()) {}');
  if (player < 3) run('buildPool()');
}
assert.equal(openings.size, 4);
assert.equal(run('state.used.size'), 6);
assert.equal(run('nextQuestion()'), null);
// With only opening questions used, the two extras remain for the final chase.
run('state.used=new Set(); buildPool()');
for (let player=0; player<4; player++) run(`state.current=${player}; nextQuestion(true)`);
assert.equal(run('nextQuestion().cat'), 'or');
assert.equal(run('nextQuestion().cat'), 'or');
assert.equal(run('nextQuestion()'), null);
// Deselecting Or on a new game removes all reservations.
run("state.cats=['gk']; state.used=new Set(); buildPool()");
assert.equal(run('state.orOpeners.length'), 0);
assert.equal(run('nextQuestion(true).cat'), 'gk');
console.log('PASS: distinct Or opening questions for all four players, protected reservations across rounds and rebuilds, extras in final chase, and deselection');
