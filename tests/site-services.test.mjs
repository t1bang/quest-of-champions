import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GAMES} from '../config.js';
import {GAME_SERVICES,cleanQuestSave,createSiteTracker} from '../game-services.js';
import {createQuestObserver} from '../games/quest-of-champions/arcade-adapter.js';
import handler from '../api/player.js';

test('every live cabinet is represented in the shared account integration registry',()=>{
  assert.deepEqual(Object.keys(GAME_SERVICES).sort(),GAMES.map(g=>g.id).sort());
  const saves=Object.values(GAME_SERVICES).filter(g=>g.save).map(g=>g.save.key);
  assert.equal(new Set(saves).size,saves.length);
});
test('Quest saves retain progression but discard typed initials and other private fields',()=>{
  assert.deepEqual(cleanQuestSave({unlocked:2,beaten:{1:true,3:false,9:true},scores:[{name:'private',s:9999}],email:'private'}),{unlocked:2,beaten:{1:true},scores:[]});
  assert.equal(cleanQuestSave({unlocked:5}),null);
});
test('site analytics is opt-in and bounded to named actions and registered games',async()=>{
  const calls=[],tracker=createSiteTracker(async(a,b)=>{calls.push([a,b]);});
  tracker.event('library_view');await tracker.flush();assert.equal(calls.length,0);
  tracker.enabled(true);tracker.event('library_view');tracker.event('library_view');tracker.event('typed_text');tracker.event('game_launch','invalid-game');
  tracker.event('game_launch','vendetta');await tracker.flush();
  assert.deepEqual(calls[0][1].events.map(e=>e.kind),['site_enter','library_view','game_launch']);
  assert.equal(calls[0][1].events.at(-1).game,'vendetta');
  tracker.event('profile_view');tracker.enabled(false);await tracker.flush();assert.equal(calls.length,1);
});
test('an in-flight analytics error cannot resurrect a signed-out player queue',async()=>{
  let reject;const calls=[],tracker=createSiteTracker((a,b)=>{calls.push(b);return new Promise((_,r)=>{reject=r;});});
  tracker.enabled(true);const sending=tracker.flush();tracker.enabled(false);reject(new Error('offline'));await sending;await tracker.flush();assert.equal(calls.length,1);
});
test('site endpoints forward the player JWT to the separate platform API',async()=>{
  const old=globalThis.fetch;let request;
  globalThis.fetch=async(url,options)=>{request={url,options};return {ok:true,json:async()=>({games:[]})};};
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  try{await handler({method:'POST',query:{a:'library'},headers:{authorization:'Bearer test.jwt.signature'},body:{}},res);
    assert.equal(res.code,200);assert.equal(new URL(request.url).pathname,'/rest/v1/rpc/bba_site');assert.equal(request.options.headers.Authorization,'Bearer test.jwt.signature');
  }finally{globalThis.fetch=old;}
});
test('Quest transitions report one level start, pause, resume, completion and death',()=>{
  const observer=createQuestObserver(),events=[],emit=e=>events.push(e),state={mode:'play',level:1,score:10,lives:3};
  observer(state,emit);observer(state,emit);observer({...state,mode:'paused'},emit);observer(state,emit);
  observer({...state,lives:2},emit);observer({...state,mode:'victory',lives:2},emit);
  assert.deepEqual(events.map(e=>e.kind),['level_start','pause','resume','death','level_complete']);
});
