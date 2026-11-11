import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const base=process.env.ARCADE_URL || 'http://127.0.0.1:4178';
const out=process.env.QA_OUTPUT || '../qa/player-system';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}), checks=[];
const ok=name=>{checks.push(name);console.log('PASS',name);};
const errors=[];
const uid='00000000-0000-4000-8000-000000000042';
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test_signature';

async function context({signed=false,mobile=false,owner=false,enabled=false}={}) {
  const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const calls=[], player={name:'QA Player',tokens:45,earned:45,closet:[],badge:'',avatar:{},linked:true,adult:true,analytics:false};
  let save=null, conflict=false;
  await c.route('**/auth/v1/**',route=>{const url=route.request().url();return route.fulfill({json:url.includes('/settings')?{external:{google:enabled,facebook:enabled}}:url.includes('/logout')?{}:{id:uid,email:'qa@example.invalid'}});});
  if (c.routeWebSocket) await c.routeWebSocket('**/realtime/**',ws=>ws.close());
  await c.route('**/api/arcade?**',route=>route.fulfill({json:{player,rows:[],gained:0}}));
  await c.route('**/api/player?**',async route=>{
    const action=new URL(route.request().url()).searchParams.get('a'),body=route.request().postDataJSON();calls.push({action,body});
    assert.equal(route.request().headers().authorization,'Bearer '+jwt);
    let json={ok:true};
    if(action==='account')json={pid:'a'.repeat(16),player,owner};
    else if(action==='preferences'){player.analytics=body.analytics;json={player};}
    else if(action==='save_get')json={save};
    else if(action==='save_put'){
      if(conflict || body.revision!==(save?.revision||0))return route.fulfill({status:409,json:{error:'Cloud save changed. Reload before saving.'}});
      save={game:'blankman',data:body.data,revision:(save?.revision||0)+1};json={save};
    } else if(action==='run_start')json={id:body.id};
    else if(action.startsWith('lobby_'))json={code:'ABCDEF123456',game:'blankman',members:[{name:'QA Player',host:true}]};
    else if(action==='dashboard')json={players:19,linked:1,opted_in:1,saves:1,games:[{game:'blankman',launches:3,players:1,active_seconds:120}],events:[{game:'blankman',kind:'level_complete',stage:0,total:2}]};
    else if(action==='export')json={profile:player,saves:[save]};
    await route.fulfill({json});
  });
  if(signed)await c.addInitScript(({jwt,uid})=>{
    if(sessionStorage.getItem('qa-initialized'))return;
    sessionStorage.setItem('qa-initialized','1');
    localStorage.setItem('sb-fspcfzxtohaaeoudrack-auth-token',JSON.stringify({access_token:jwt,refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid,email:'qa@example.invalid',app_metadata:{provider:'google'},user_metadata:{},aud:'authenticated'}}));
    localStorage.setItem('blankman-save-v1',JSON.stringify({stage:1,score:1500,best:1500,unlocked:1,cleared:[0]}));
  },{jwt,uid});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base,{waitUntil:'networkidle'});
  return {c,p,calls,conflict:(on=true)=>{conflict=on;},player};
}
try {
  for(const mobile of [false,true]) {
    const {c,p,calls}=await context({mobile});
    assert.equal(await p.locator('.gbox > *').count(),3);assert.equal(await p.locator('.gfeature').count(),0);
    await p.fill('#gname','Local Player');await p.click('#genter');
    if(await p.locator('#panel').isVisible())await p.click('#panel .x');
    await p.click('#who');await p.locator('#account-adult').waitFor();
    assert.match(await p.locator('#pbody').innerText(),/Guest play stays on this device/);
    assert.equal(await p.locator('[data-social]').count(),0);assert.equal(calls.length,0);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await p.screenshot({path:`${out}/guest-${mobile?'mobile':'desktop'}.png`});ok(`${mobile?'Mobile':'Desktop'} entrance stays simple; guest name stays local; disabled providers hidden`);
    await c.close();
  }
  const {c,p,calls,conflict}=await context({signed:true,owner:true,enabled:true});
  await p.waitForFunction(()=>document.querySelector('#who').textContent==='QA Player');await p.click('#genter');await p.click('#who');
  assert.equal(await p.locator('#activity-optin').isChecked(),false);assert.equal(await p.locator('#owner-stats').count(),1);
  await p.check('#activity-optin');await p.click('#save-preferences');
  await p.click('#owner-stats');await p.locator('.passport-metrics').waitFor();
  assert.match(await p.locator('#pbody').innerText(),/3 launches/);await p.screenshot({path:`${out}/owner-dashboard.png`});
  ok('Linked player restores, analytics defaults off, opt-in saves, and owner dashboard renders');
  await p.click('#passport-back');await p.click('#cloud-panel');await p.locator('#cloud-upload').waitFor();
  await p.click('#cloud-upload');await p.locator('#cloud-panel').waitFor();
  assert.ok(calls.some(x=>x.action==='save_put' && x.body.data.stage===1));ok('Blankman local progress uploads with a revision and enables cloud saving');
  await p.click('#cloud-panel');await p.locator('#cloud-upload').waitFor();conflict();
  p.on('dialog',d=>d.accept());await p.click('#cloud-upload');await p.waitForTimeout(150);
  assert.match(await p.locator('#toast').innerText(),/Cloud save changed/);conflict(false);
  ok('A conflicting cloud save is reported without replacing progress');
  await p.click('#cloud-restore');await p.locator('#cloud-panel').waitFor();
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('blankman-save-v1')).stage),1);
  await p.click('#lobby-panel');await p.click('#lobby-create');await p.locator('#lobby-play').waitFor();
  assert.match(await p.locator('#lobby-state').innerText(),/ABCDEF123456/);ok('Private lobby create, invite code and member list render');
  await p.click('#lobby-play');await p.click('#gplay');
  const frame=p.frameLocator('#gf iframe');await frame.locator('#press-start').waitFor({timeout:30000});
  await frame.locator('#press-start').click();await frame.locator('#new-game').click();await frame.locator('#begin-stage').click();
  await p.waitForTimeout(1200);
  const game=p.frames().find(f=>f.url().includes('/games/blankman/'));
  assert.equal(await game.evaluate(()=>window.blankman.state().mode),'playing');
  const x=await game.evaluate(()=>window.blankman.state().player.x);
  await p.keyboard.down('ArrowRight');await p.waitForTimeout(400);await p.keyboard.up('ArrowRight');
  assert.ok((await game.evaluate(()=>window.blankman.state().player.x))>x);
  await p.screenshot({path:`${out}/blankman-playing.png`});
  // A message from the top page must never impersonate the game iframe.
  const before=calls.filter(x=>x.action==='save_put').length;
  await p.evaluate(()=>postMessage({bba:'save',game:'blankman',v:1,data:{stage:7,score:999999,best:999999,unlocked:7,cleared:[]}},location.origin));
  await p.waitForTimeout(100);assert.equal(calls.filter(x=>x.action==='save_put').length,before);
  await p.click('#gf button');await p.waitForTimeout(350);
  assert.ok(calls.some(x=>x.action==='run_start'&&x.body.game==='blankman'));
  assert.ok(calls.some(x=>x.action==='run_events'&&x.body.events.some(e=>e.kind==='level_start')));
  assert.ok(calls.some(x=>x.action==='run_end'));ok('Blankman plays, emits opted-in progression, rejects forged parent messages, and closes its session');
  await p.click('#who');await p.uncheck('#activity-optin');await p.click('#save-preferences');
  assert.ok(calls.some(x=>x.action==='preferences'&&x.body.analytics===false));
  await p.click('#signout-player');await p.waitForFunction(()=>!localStorage.getItem('sb-fspcfzxtohaaeoudrack-auth-token'));
  await p.waitForFunction(()=>localStorage.getItem('blankman-save-v1')===null);ok('Opt-out and sign-out controls work; shared-device account/save data clears');
  await c.close();
  const m=await context({signed:true,mobile:true});await m.p.waitForFunction(()=>document.querySelector('#who').textContent==='QA Player');
  await m.p.click('#genter');await m.p.click('#who');assert.equal(await m.p.locator('#owner-stats').count(),0);
  assert.equal(await m.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await m.p.screenshot({path:`${out}/passport-mobile.png`});ok('Mobile player passport fits and hides owner controls from regular players');await m.c.close();
  assert.deepEqual(errors,[]);ok('No browser runtime errors');
  writeFileSync(`${out}/results.json`,JSON.stringify({base,checks,errors,auth:'Mocked browser accounts; real database isolation tested separately with rolled-back fixtures.'},null,2));
} finally { await browser.close(); }
