import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/player.js';
import { cleanEvent, cleanBlankmanSave, createActivityTracker } from '../player-services.js';
import { createObserver } from '../games/blankman/arcade-adapter.js';

async function request(req, response = {}, status = 200) {
  const old=globalThis.fetch, calls=[];
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:status<400,status,json:async()=>response};};
  try{await handler(req,res);return {...res,calls};}finally{globalThis.fetch=old;}
}
test('player API rejects missing auth, GET writes, invalid JSON, unknown actions and oversized bodies',async()=>{
  for(const [req,code] of [
    [{method:'GET',query:{a:'preferences'}},405],
    [{method:'POST',query:{a:'preferences'},body:{}},401],
    [{method:'POST',query:{a:'preferences'},body:'{'},400],
    [{method:'POST',query:{a:'preferences'},body:[]},400],
    [{method:'POST',query:{a:'missing'},body:{}},404],
    [{method:'POST',query:{a:'save_put'},body:{data:'x'.repeat(91000)}},413],
  ]){const r=await request(req);assert.equal(r.code,code);assert.equal(r.calls.length,0);}
});
test('player proxy forwards only the supplied player JWT; save conflict status is preserved',async()=>{
  const r=await request({method:'POST',query:{a:'save_put'},headers:{authorization:'Bearer test.jwt.signature'},body:{game:'blankman',revision:2}},{code:'40001',message:'Cloud save changed'},400);
  assert.equal(r.code,409);assert.equal(r.headers['Cache-Control'],'no-store');
  assert.equal(r.calls[0].options.headers.Authorization,'Bearer test.jwt.signature');
  assert.deepEqual(JSON.parse(r.calls[0].options.body),{p_action:'save_put',p_body:{game:'blankman',revision:2}});
});
test('owner authorization failures remain forbidden',async()=>{
  const r=await request({method:'POST',query:{a:'dashboard'},headers:{authorization:'Bearer test.jwt.signature'},body:{}},{code:'42501',message:'Owner access required'},403);
  assert.equal(r.code,403);
});
test('game events discard private and unrecognized properties',()=>{
  const e=cleanEvent({kind:'level_complete',stage:2,score:13.9,email:'private@example.invalid',token:'secret',position:{x:100},detail:'private text'});
  assert.deepEqual(Object.keys(e).sort(),['id','kind','score','stage']);assert.equal(e.score,13);
  assert.equal(cleanEvent({kind:'typed_text',value:'private'}),null);
  assert.equal(cleanEvent({kind:'game_over',score:Infinity}).score,undefined);
});
test('cloud save validation retains only bounded progress fields',()=>{
  assert.equal(cleanBlankmanSave({stage:10}),null);
  const s=cleanBlankmanSave({stage:2,score:15.5,best:Infinity,unlocked:99,cleared:[0,1,1,8,-1,'3'],email:'private'});
  assert.deepEqual(s,{stage:2,score:15,best:0,unlocked:7,cleared:[0,1]});
});
test('activity is silent without consent; retries retain event IDs; stopping closes the run',async()=>{
  globalThis.document={hidden:false};const calls=[];let fail=true;
  const tracker=createActivityTracker(async(a,b)=>{calls.push([a,b]);if(a==='run_events'&&fail){fail=false;throw new Error('offline');}return {id:b.id};});
  await tracker.start('blankman');tracker.event({kind:'level_start'});await tracker.flush();assert.equal(calls.length,0);
  tracker.enabled(true);await tracker.start('blankman');tracker.event({kind:'level_start',stage:0});tracker.playing(true);tracker.input();
  await tracker.flush();await tracker.flush();
  const batches=calls.filter(([a])=>a==='run_events');assert.equal(batches[0][1].events[0].id,batches[1][1].events[0].id);assert.equal(batches[1][1].active,true);
  await tracker.stop();assert.equal(calls.at(-1)[0],'run_end');
  tracker.enabled(false);const count=calls.length;await tracker.start('quest');assert.equal(calls.length,count);
});
test('a late launch response cannot restart a closed game session',async()=>{
  let done;const calls=[];const tracker=createActivityTracker((a,b)=>{calls.push(a);return a==='run_start'?new Promise(r=>{done=r;}):Promise.resolve({});});
  tracker.enabled(true);const starting=tracker.start('blankman');await new Promise(r=>setTimeout(r,0));await tracker.stop();done({id:'unused'});await starting;tracker.event({kind:'level_start'});await tracker.flush();assert.deepEqual(calls,['run_start']);
});
test('Blankman observer emits transitions once and excludes practice actions',()=>{
  const sent=[],observe=createObserver(d=>sent.push(d.event));
  const base={mode:'playing',stage:0,score:0,lives:3,gear:{outfit:'base',weapon:'fists'}};
  observe(base);observe(base);observe({...base,mode:'paused'});observe(base);
  observe({...base,lives:2,helper:{active:true},gear:{...base.gear,weapon:'plunger'}});
  observe({...base,mode:'clear',lives:2});
  assert.equal(sent.filter(e=>e.kind==='level_start').length,1);assert.equal(sent.filter(e=>e.kind==='resume').length,1);
  for(const kind of ['assist','death','equipment_change','level_complete'])assert.ok(sent.some(e=>e.kind===kind),kind);
  const n=sent.length;observe({...base,training:true,mode:'gameover'});assert.equal(sent.length,n);
});
