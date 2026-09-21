import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.resolve(process.argv[2]||'index.html')).href;
 await page.goto(url+'?fast=1');
 await page.waitForSelector('#f-opening');
 await page.context().setOffline(true);
 await page.click('#f-opening');
 await page.waitForFunction(()=>__chase.Sound._music?.currentTime>0);
 assert.equal(await page.evaluate(()=>__chase.Sound._music.loop),false);
 await page.evaluate(()=>{
  const {state,Screens}=__chase;state.device='solo';
  Screens.start.begin({count:1,names:['בדיקה'],level:'medium',host:'human',ans:'shared',cats:['gk'],fam:false});
 });
 assert.equal(await page.evaluate(()=>__chase.Sound.musicKey),'opening');
 for(const screen of ['cash','chase','finalTeam','finalChaser']){
  await page.evaluate(screen=>{
   const {state,go}=__chase;
   state.players[0].offer={key:'mid',prize:5000,start:3};
   state.players[0].status='safe';
   state.final={teamSteps:20,headStart:1,chaserSteps:1};
   go(screen);
  },screen);
  await page.waitForFunction(()=>__chase.Sound._music?.currentTime>0);
  const info=await page.evaluate(()=>({key:__chase.Sound.musicKey,loop:__chase.Sound._music.loop,duration:__chase.Sound._music.duration}));
  assert.equal(info.key,screen);assert.equal(info.loop,true);assert.ok(info.duration>20);
  console.log('PASS stage playback',screen,info.duration);
 }
 await page.click('#btn-sound');
 assert.equal(await page.evaluate(()=>__chase.Sound._music.muted),true);
 await page.click('#btn-sound');
 assert.equal(await page.evaluate(()=>__chase.Sound._music.muted),false);
 await page.click('#c-no');
 assert.equal(await page.evaluate(()=>__chase.Sound._music.paused),true);
 await page.waitForSelector('[data-pb]');
 await page.click('[data-pb="0"]');
 await page.waitForFunction(()=>!__chase.Sound._music?.paused);
 await page.evaluate(()=>{__chase.Sound.setVolume('music',.12);__chase.Sound.setVolume('effects',.4);});
 assert.equal(await page.evaluate(()=>__chase.Sound._music.volume),.12);
 await page.evaluate(()=>__chase.go('start'));
 assert.equal(await page.evaluate(()=>__chase.Sound._music),null);
 await page.reload();await page.waitForSelector('#f-opening');
 assert.equal(await page.evaluate(()=>__chase.Sound.musicVolume),.12);
 assert.equal(await page.evaluate(()=>__chase.Sound.effectsVolume),.4);
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS mute, pushback pause/resume, cleanup, saved volume, responsive controls');
}finally{await browser.close();}
