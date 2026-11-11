// Report actual run results to the hosting cabinet. Practice never earns scores.
export function createReporter(send) {
  let previous = 'menu', playing = false;
  return state => {
    if (!state) return;
    if (state.mode === 'playing') playing = true;
    if (playing && state.mode !== previous && ['clear', 'victory', 'gameover'].includes(state.mode)) {
      if (!state.training && Number.isFinite(state.score) && state.score >= 0) {
        send({ bba: 'score', game: 'blankman', score: Math.min(1e9, Math.floor(state.score)) });
      }
      playing = false;
    }
    previous = state.mode;
  };
}

// Compact state transitions only; never send a full game snapshot or controller data.
export function createObserver(send) {
  let previous = null;
  const event = (kind, state, detail) => send({ bba:'activity', v:1, game:'blankman', event:{kind,stage:state.stage,...(Number.isFinite(state.score)?{score:state.score}:{}),...(detail?{detail}:{})} });
  return state => {
    if (!state) return;
    if (!previous) event('game_ready',state);
    if (!state.training) {
      if (state.mode==='playing' && (previous?.stage!==state.stage || !previous || !['playing','paused'].includes(previous.mode))) event('level_start',state);
      if (previous?.mode!==state.mode) {
        const kind={clear:'level_complete',victory:'victory',gameover:'game_over',paused:'pause'}[state.mode];
        if (kind) event(kind,state);
        if (state.mode==='playing' && previous?.mode==='paused') event('resume',state);
      }
      if (previous && state.lives<previous.lives) event('death',state);
      if (state.helper && !previous?.helper) event('assist',state);
      for (const key of ['outfit','weapon']) if (previous?.gear && state.gear?.[key]!==previous.gear[key]) event('equipment_change',state,state.gear[key]);
    }
    previous={mode:state.mode,stage:state.stage,lives:state.lives,helper:!!state.helper,gear:state.gear?{...state.gear}:null};
  };
}

if (typeof window !== 'undefined' && window.parent !== window) {
  const parentOrigin = new URL(document.referrer || location.href).origin;
  if (parentOrigin === location.origin) {
    const send = data => parent.postMessage(data,parentOrigin);
    const report = createReporter(send), observe = createObserver(send);
    let inputAt=0, previousSave=null, tick=0;
    const input=()=>{inputAt=Date.now();};
    addEventListener('keydown',input); addEventListener('pointerdown',input); addEventListener('touchstart',input,{passive:true});
    const timer = setInterval(() => {
      if (!window.blankman?.ready()) return;
      const state=window.blankman.state(); report(state); observe(state);
      try { if ([...navigator.getGamepads()].some(p=>p&&(p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.3)))) input(); } catch {}
      if (++tick%2===0) send({bba:'status',v:1,game:'blankman',playing:state.mode==='playing'&&!state.training,input:Date.now()-inputAt<1500});
      if (tick%4===0) try {
        const saved=localStorage.getItem('blankman-save-v1');
        if (saved && saved!==previousSave) { previousSave=saved; send({bba:'save',v:1,game:'blankman',data:JSON.parse(saved)}); }
      } catch {}
    }, 500);
    addEventListener('pagehide', () => { clearInterval(timer); removeEventListener('keydown',input); removeEventListener('pointerdown',input); removeEventListener('touchstart',input); }, { once: true });
  }
}
