import { connectArcade } from '../../sdk/arcade-game.js';
import { cleanQuestSave } from '../../game-services.js';

export function createQuestObserver(){
  let previous=null;
  return (s,event)=>{
    const fields={stage:Math.max(0,s.level-1),score:s.score};
    if(s.mode==='play' && (previous?.level!==s.level || !['play','paused','selectmenu'].includes(previous?.mode)))event({kind:'level_start',...fields});
    if(previous?.mode!==s.mode){
      if(s.mode==='victory' && previous?.mode!=='entry')event({kind:'level_complete',...fields});
      if(s.mode==='gameover')event({kind:'game_over',...fields});
      if(s.mode==='paused')event({kind:'pause',...fields});
      if(s.mode==='play' && ['paused','selectmenu'].includes(previous?.mode))event({kind:'resume',...fields});
    }
    if(previous && s.lives<previous.lives)event({kind:'death',...fields});
    previous={...s};
  };
}
if(typeof window!=='undefined')connectArcade({game:'quest',build:'arcade-1',
  state:()=>window.questArcade?.state(),save:()=>cleanQuestSave(window.questArcade?.save()),onState:createQuestObserver()});

// Anonymous milestone counts for the admin hub (hub.js supplies bbHub); runs whether or not the game is inside the arcade.
export const questHubKind = e => ({ level_start: 'level_start:' + (e.stage + 1), level_complete: 'level_done:' + (e.stage + 1), game_over: 'game_over', death: 'death' })[e.kind] || null;
if (typeof window !== 'undefined') {
  const observe = createQuestObserver();
  setInterval(() => { try { const s = window.questArcade?.state(); if (s) observe(s, e => { const k = questHubKind(e); if (k && window.bbHub) window.bbHub(k, e.score); }); } catch {} }, 500);
}
