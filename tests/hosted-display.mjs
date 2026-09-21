import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 8795;
const server = spawn(process.execPath, ['server/start.mjs'], { env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','inherit'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Server exited: '+code))); });
const browser = await chromium.launch();
try {
  const host = await browser.newPage();
  const display = await browser.newPage({viewport:{width:1440,height:900}});
  const errors = [];
  async function join(page, role) {
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('[data-dev]');
    await page.evaluate(role => {
      const {state,Net,go} = __chase;
      state.device = role; Net.join('TEST'); Net.announce(role);
      if (role === 'host') startBroadcast();
      go('lobby');
    }, role);
  }
  await join(host,'host'); await join(display,'screen');
  await host.waitForFunction(() => __chase.Net.room.peers().length === 2);
  await host.evaluate(() => {
    __chase.Screens.start.begin({count:1,names:['בדיקה'],level:'medium',host:'human',ans:'host',cats:['gk'],fam:false});
    __chase.go('cash');
  });
  async function matchesQuestion(page = display) {
    const q = await host.evaluate(() => __chase.buildSnap().q);
    await page.waitForFunction(q => document.querySelector('#proj .proj-q')?.textContent === q, q);
    return q;
  }
  const first = await matchesQuestion();
  await host.click('#b-pass');
  await host.waitForFunction(q => __chase.buildSnap().q !== q, first);
  await matchesQuestion();
  assert.equal(await display.locator('.proj-answer').count(),0);
  console.log('PASS quick-round questions advance on the display without revealing answers');
  await host.evaluate(() => { __chase.state.players[0].offer={key:'mid',prize:1000,start:3}; __chase.go('chase'); });
  await matchesQuestion();
  assert.equal(await display.locator('.proj-chase .slot').count(),8);
  assert.equal(await display.locator('.proj-opts .opt').count(),3);
  assert.deepEqual(await display.locator('.proj-opts .opt > span:nth-child(2)').allTextContents(), await host.evaluate(() => __chase.buildSnap().opts));
  assert.equal(await display.locator('.proj-opts .right').count(),0);
  assert.notEqual(await display.locator('.board').evaluate(el=>getComputedStyle(el).transform),'none');
  await display.screenshot({path:'.screenshots/hosted-display-chase.png'});
  console.log('PASS personal chase shows the tilted board, current question and all three choices');
  const late = await browser.newPage(); await join(late,'screen'); await matchesQuestion(late);
  console.log('PASS a display joining during the chase receives the current stage');

  await host.route('**/relay/chase-test', route => route.fulfill({status:503,body:'unavailable'}));
  await host.evaluate(() => __chase.state.chase.q.q = 'שאלה בעת ניתוק');
  await host.waitForFunction(() => __chase.Net.status === 'blocked');
  assert.equal(await host.locator('#network-status').isVisible(),true);
  await host.evaluate(() => __chase.state.chase.q.q = 'השאלה העדכנית לאחר החיבור');
  await host.unroute('**/relay/chase-test');
  await matchesQuestion();
  await host.waitForFunction(() => __chase.Net.status === 'online');
  console.log('PASS rejected updates show an error and retry the latest question after recovery');

  await host.route('**/relay/chase-test', route => route.fulfill({status:429,body:'quota'}));
  await host.evaluate(() => __chase.state.chase.q.q = 'בדיקת מכסה');
  await host.waitForFunction(() => __chase.Net.err === 'quota');
  assert.match(await host.locator('#network-status').innerText(), /מכסת/);
  assert.deepEqual(errors,[]);
  console.log('PASS relay quota rejection is visible instead of silently freezing');
} finally { await browser.close(); server.kill(); }
