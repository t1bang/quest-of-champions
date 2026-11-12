// Big Bang Arcade owns player accounts. Games only expose bounded progress data.
const number = (value, max) => Number.isFinite(value) ? Math.max(0,Math.min(max,Math.floor(value))) : 0;
export function cleanBlankmanSave(data) {
  if (!data || !Number.isInteger(data.stage) || data.stage<0 || data.stage>7) return null;
  return {stage:data.stage,score:number(data.score,1e9),best:number(data.best,1e9),unlocked:number(data.unlocked,7),
    cleared:[...new Set((Array.isArray(data.cleared)?data.cleared:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<8))]};
}
export function cleanQuestSave(data) {
  if (!data || !Number.isInteger(data.unlocked) || data.unlocked<1 || data.unlocked>3) return null;
  // Local high-score initials are deliberately excluded from cloud progress.
  const beaten={}; for(const n of [1,2,3])if(data.beaten?.[n]===true)beaten[n]=true;
  return {unlocked:data.unlocked,beaten,scores:[]};
}
export const GAME_SERVICES = {
  quest:{build:'arcade-1',progress:true,save:{key:'qoc_save',clean:cleanQuestSave,label:s=>`LEVEL ${s.unlocked} UNLOCKED`}},
  vendetta:{build:'external',progress:false},
  guerilla:{build:'external',progress:false},
  gamerboy:{build:'external',progress:false},
  cruizin:{build:'external',progress:false},
  blankman:{build:'8.0',progress:true,save:{key:'blankman-save-v1',clean:cleanBlankmanSave,label:s=>`STAGE ${s.stage+1}`}},
};
export function saveFor(game){return GAME_SERVICES[game]?.save;}

export function createSiteTracker(call) {
  let enabled=false,visit=null,queue=[],busy=false,epoch=0,last='';
  return {
    enabled(value){
      value=!!value;if(value===enabled)return;enabled=value;epoch++;
      queue=[];last='';visit=value?crypto.randomUUID():null;
      if(value)this.event('site_enter');
    },
    event(kind,game){
      if(!enabled || !['site_enter','profile_view','library_view','cabinet_view','game_launch','game_exit','leaderboard_view','lobby_open','rewards_open','music_open','avatar_open','map_open'].includes(kind))return;
      if(game && !Object.hasOwn(GAME_SERVICES,game))return;
      const signature=kind+':'+(game||'');if(signature===last && kind!=='game_launch' && kind!=='game_exit')return;
      last=signature;if(queue.length<60)queue.push({id:crypto.randomUUID(),visit,kind,...(game?{game}:{})});
    },
    async flush(){
      if(!enabled||busy||!queue.length)return;
      const batch=queue.splice(0,20),generation=epoch;busy=true;
      try{await call('site_events',{events:batch});}
      catch{if(generation===epoch)queue=[...batch,...queue].slice(0,60);}
      finally{busy=false;}
    },
  };
}
