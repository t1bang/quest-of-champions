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
