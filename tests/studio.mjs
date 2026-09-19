// Regression coverage for the studio redesign and review findings.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(execSync('npm root -g',{encoding:'utf8'}).trim(),'x.js'))('playwright'));}
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('index.html')).href+'?fast=1');
 await page.waitForSelector('[data-dev]');
 const family=await page.evaluate(()=>{
  localStorage.setItem('chase.custom.v1',JSON.stringify([{q:'שאלת משפחה לבדיקה',a:'נכון',w1:'לא',w2:'אחר'}]));
  const {state,go,Screens}=__chase;
  state.device='solo';state.step=4;
  state.draft={names:['נועה'],count:1,level:'medium',host:'human',ans:'shared',cats:['gk'],fam:true};
  go('start');
  const checkboxAbsent=!document.querySelector('#s-fam');
  Screens.start.begin(state.draft);
  return {checkboxAbsent,enabled:state.useFamily,count:state.pool.filter(q=>q.cat==='fam').length};
 });
 assert.deepEqual(family,{checkboxAbsent:true,enabled:true,count:1});
 console.log('PASS family choice survives the answer-display screen');
 const bank=await page.evaluate(()=>{
  const {state,buildSnap}=__chase;state.players[0].status='safe';state.players[0].bank=6000;state.players[0].won=36000;
  return buildSnap().players[0].b;
 });assert.equal(bank,36000);console.log('PASS spectator standings use the banked offer');
 await page.evaluate(()=>{const {state,go}=__chase;state.hostMode='human';state.answerMode='shared';state.final={teamSteps:10,headStart:1,chaserSteps:2};go('finalChaser');});
 await page.click('#c-no');
 let snap=await page.evaluate(()=>__chase.buildSnap());
 assert.equal(snap.answer,undefined);assert.equal(snap.clock.run,false);
 await page.waitForSelector('#pb-opts');
 const push=await page.evaluate(()=>{const s=__chase.buildSnap();return {snap:s,html:__chase.projectorHtml(s),correct:__chase.state.final.q.shuffled.indexOf(__chase.state.final.q.a)};});
 assert.ok(push.snap.pushback);assert.equal(push.snap.answer,undefined);assert.ok(push.html.includes('הצ׳ייסר טעה — התור שלכם'));assert.equal(push.snap.pushback.opts.length,3);
 await page.click(`[data-pb="${push.correct}"]`);
 snap=await page.evaluate(()=>__chase.buildSnap());assert.ok(snap.answer);assert.equal(snap.pushback.resolved,true);
 console.log('PASS pushback hides the answer until resolution and broadcasts its own phase');
 await page.evaluate(()=>{const {state,go}=__chase;state.current=0;state.players[0].offer={key:'high',prize:36000,start:2};go('chase');});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});
  const box=await page.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect();return {viewport:innerWidth,page:document.documentElement.scrollWidth,left:b.left,right:b.right};});
  assert.equal(box.page,width);assert.ok(box.left>=0&&box.right<=width,JSON.stringify(box));
  await page.screenshot({path:`.screenshots/studio-${width}.png`,fullPage:true});
 }
 const assets=await page.evaluate(async()=>Promise.all(['assets/studio.png','assets/victory.png'].map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth);image.onerror=()=>resolve(0);image.src=src;}))));
 assert.ok(assets.every(w=>w>=1600));assert.deepEqual(errors,[]);
 console.log('PASS studio assets load and live board fits desktop and mobile');
}finally{await browser.close();}
