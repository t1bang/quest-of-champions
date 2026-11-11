// Optional game-side bridge. Account sessions stay in the arcade shell.
export function connectArcade({game,build='unknown',state,save,onState,interval=500}) {
  if(typeof window==='undefined'||parent===window)return ()=>{};
  let origin;try{origin=new URL(document.referrer).origin;}catch{return ()=>{};}
  const local=origin===location.origin;
  if(!local && origin!=='https://bigbangarcade.com')return ()=>{};
  const send=data=>parent.postMessage({v:1,game,...data},origin);
  let tick=0,inputAt=0,previousSave=null,ready=false;
  const input=()=>{inputAt=Date.now();};
  addEventListener('keydown',input);addEventListener('pointerdown',input);
  const timer=setInterval(()=>{
    const current=state();if(!current)return;
    if(!ready){ready=true;send({bba:'activity',event:{kind:'game_ready'}});}
    onState?.(current,event=>send({bba:'activity',event}));
    try{if([...navigator.getGamepads()].some(p=>p&&(p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.3))))input();}catch{}
    if(++tick%2===0)send({bba:'status',playing:current.playing===true,input:Date.now()-inputAt<1500});
    if(save && tick%4===0){const data=save();const serialized=JSON.stringify(data);if(data && serialized!==previousSave){previousSave=serialized;send({bba:'save',data});}}
  },interval);
  const stop=()=>{clearInterval(timer);removeEventListener('keydown',input);removeEventListener('pointerdown',input);};
  addEventListener('pagehide',stop,{once:true});return stop;
}
