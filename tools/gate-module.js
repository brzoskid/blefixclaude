/* RAPID GATE MODULE — automatyczne otwieranie bramki GSM (geofence + połączenie) */
(()=>{ 'use strict';
const q=s=>document.querySelector(s);
const G0={on:false,lat:null,lon:null,num:'',radius:60,lead:8,maxSpd:25,arm:250,cool:10};
const g=()=>settings.gate||(settings.gate=Object.assign({},G0));
const rad=x=>x*Math.PI/180;
const dist=(a,b)=>Math.hypot(rad(b.lon-a.lon)*Math.cos(rad((a.lat+b.lat)/2)),rad(b.lat-a.lat))*6371000;
const geo=()=>window.RapidVoice&&window.RapidVoice.Geo&&window.RapidVoice.Geo.pos;
const say=(k,t,c,p)=>{ try{ window.RapidVoice.Voice.say(k,t,c,p); }catch(e){} };
let armed=false, last=0, hist=[], cd=null, dNow=null;

function dial(num){
  return new Promise((res,rej)=>{
    const P=window.plugins&&window.plugins.CallNumber;
    if(P&&P.callNumber) P.callNumber(res,e=>rej(e),num,false); else rej('NOPLUGIN');
  });
}
async function openGate(reason,manual){
  const c=g(); if(!c.num){ toast('Najpierw wpisz numer modułu bramki.',{type:'warn'}); return; }
  if(!manual){ last=Date.now(); armed=false; }
  say('gate','Otwieram bramkę',5000,1);
  try{ await dial(c.num); toast('Wywołano bramkę ('+reason+').',{type:'info'}); }
  catch(e){
    if(e==='NOPLUGIN') toast('Brak automatycznego dzwonienia — stuknij ZADZWOŃ.',{type:'warn',timeout:9000,action:{label:'ZADZWOŃ',fn:()=>{ location.href='tel:'+c.num; }}});
    else toast(e===20?'Brak zgody na połączenia — włącz „Telefon” w ustawieniach aplikacji.':'Nie udało się zadzwonić.',{type:'crit',timeout:7000});
  }
}
function stopCountdown(){ clearInterval(cd); cd=null; const b=q('#gateBar'); if(b) b.style.display='none'; }
function startCountdown(reason){
  if(cd) return; let n=3; q('#gateBar').style.display='flex';
  const upd=()=>{ q('#gateTxt').textContent='OTWIERAM BRAMKĘ ZA '+n+' s'; };
  upd(); say('gatepre','Otwieram bramkę za trzy sekundy',15000,1);
  cd=setInterval(()=>{ n--; if(n<=0){ stopCountdown(); openGate(reason,false); } else upd(); },1000);
}
function cancel(){
  stopCountdown(); armed=false; last=Date.now();
  toast('Anulowano — bramka rozbrojona do następnego oddalenia.',{type:'warn'});
}
function tick(){
  const c=g(), p=geo();
  if(c.lat==null||!p||Date.now()-p.t>8000){ dNow=null; return; }
  const d=dist(p,c); dNow=d; hist.push(d); if(hist.length>4) hist.shift();
  if(d>=c.arm) armed=true;
  if(!c.on||!c.num||!armed||cd) return;
  if(Date.now()-last<c.cool*60000) return;
  const spd=(p.spd!=null)?p.spd:(S.raw.speed||0);
  if(spd>c.maxSpd) return;
  const appr=hist.length>=3&&d<hist[0]-2;
  const trig=Math.min(200,Math.max(c.radius,spd/3.6*c.lead+15));
  if(d<=c.radius||(d<=trig&&appr)) startCountdown(Math.round(d)+' m od bramki');
}
function savePos(){
  const c=g(), smp=[]; let tries=0, lt=0;
  toast('Stój przed bramką — zapisuję pozycję (ok. 6 s)…',{type:'info',timeout:5000});
  const iv=setInterval(()=>{
    const p=geo(); tries++;
    if(p&&Date.now()-p.t<4000&&p.t!==lt){ lt=p.t; smp.push(p); }
    if(smp.length>=6){
      clearInterval(iv);
      c.lat=smp.reduce((s,x)=>s+x.lat,0)/smp.length; c.lon=smp.reduce((s,x)=>s+x.lon,0)/smp.length;
      saveSettings(); armed=false; refresh(); toast('Zapisano pozycję bramki.',{type:'info'});
    }else if(tries>=20){ clearInterval(iv); toast('Brak sygnału GPS — spróbuj na otwartej przestrzeni.',{type:'warn'}); }
  },1000);
}
function refresh(){
  const c=g(), e=q('#gtStat'), pos=q('#gtPos'); if(!e) return;
  pos.textContent=c.lat==null?'nie zapisano':c.lat.toFixed(5)+', '+c.lon.toFixed(5);
  e.textContent=c.lat==null?'—':(dNow==null?'brak GPS':Math.round(dNow)+' m · '+(armed?'UZBROJONA':'ROZBROJONA (oddal się o '+c.arm+' m)'));
  const b=q('#gateBtn'); if(b) b.style.display=(c.on&&c.num&&c.lat!=null)?'inline-flex':'none';
}
function ui(){
  const c=g(), host=q('#view-logi'); if(!host) return;
  const rg=(k,l,min,max,st,u)=>'<div class="set-row"><div class="set-top"><label>'+l+'</label><span class="num" id="gv-'+k+'">'+c[k]+u+'</span></div><input type="range" data-gr="'+k+'" data-u="'+u+'" min="'+min+'" max="'+max+'" step="'+st+'" value="'+c[k]+'"></div>';
  const t=document.createElement('div'); t.className='tile panel';
  t.innerHTML='<h2>BRAMKA GSM — AUTO-OTWIERANIE</h2>'+
    '<div class="switch-row"><div class="lbl">Otwieraj automatycznie<small>Dzwoni na numer modułu po wjeździe w strefę</small></div><label class="switch"><input type="checkbox" id="gtOn" '+(c.on?'checked':'')+'><span class="knob"></span></label></div>'+
    '<div class="set-row"><div class="set-top"><label for="gtNum">Numer modułu GSM bramki</label></div><input id="gtNum" type="tel" inputmode="tel" placeholder="np. +48 600 100 200" value="'+(c.num||'')+'" style="width:100%;min-height:44px;background:var(--card2);color:var(--txt);border:1px solid var(--neon-line);border-radius:11px;padding:8px 12px;font:14px var(--mono)"></div>'+
    '<div class="kv"><small>POZYCJA BRAMKI</small><b id="gtPos">—</b></div>'+
    '<div class="kv"><small>ODLEGŁOŚĆ / STAN</small><b id="gtStat">—</b></div>'+
    rg('radius','Strefa otwarcia (min.)',30,150,5,' m')+
    rg('lead','Wyprzedzenie (szlaban rusza)',0,15,1,' s')+
    rg('maxSpd','Maks. prędkość otwarcia',10,40,5,' km/h')+
    rg('arm','Uzbrojenie po oddaleniu o',150,500,50,' m')+
    rg('cool','Przerwa między otwarciami',1,30,1,' min')+
    '<div class="btn-row" style="margin-top:12px"><button class="btn primary" id="gtSave" type="button">ZAPISZ POZYCJĘ BRAMKI (stoję przed nią)</button>'+
    '<button class="btn blue" id="gtNow" type="button">OTWÓRZ TERAZ / TEST</button>'+
    '<button class="btn danger" id="gtDel" type="button">USUŃ POZYCJĘ</button></div>';
  host.insertBefore(t,host.lastElementChild);
  const bar=document.createElement('div'); bar.id='gateBar';
  bar.innerHTML='<b id="gateTxt"></b><button type="button" id="gateCancel">ANULUJ</button>'; document.body.appendChild(bar);
  const css=document.createElement('style');
  css.textContent='#gateBar{position:fixed;left:10px;right:10px;top:calc(var(--top) + env(safe-area-inset-top) + 8px);z-index:70;display:none;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(0,40,18,.96);border:1px solid var(--neon);color:#d9efe3;box-shadow:0 0 24px rgba(0,255,102,.3);font-size:13px;letter-spacing:.1em}#gateBar button{min-height:46px;padding:0 18px;border-radius:12px;border:1px solid var(--red);background:rgba(255,51,51,.15);color:#ff8a8a;font-weight:800;letter-spacing:.1em}#gateBtn{display:none}';
  document.head.appendChild(css);
  q('#gateCancel').onclick=cancel;
  q('#gtOn').onchange=e=>{ g().on=e.target.checked; saveSettings(); refresh(); };
  q('#gtNum').oninput=e=>{ g().num=e.target.value.trim(); saveSettings(); refresh(); };
  t.querySelectorAll('[data-gr]').forEach(i=>i.oninput=()=>{
    g()[i.dataset.gr]=parseFloat(i.value); q('#gv-'+i.dataset.gr).textContent=i.value+i.dataset.u; saveSettings(); });
  q('#gtSave').onclick=savePos;
  q('#gtDel').onclick=()=>openModal({title:'USUNĄĆ POZYCJĘ BRAMKI?',body:'Auto-otwieranie przestanie działać do ponownego zapisania pozycji.',confirmText:'USUŃ',danger:true,
    onConfirm:()=>{ const c=g(); c.lat=null; c.lon=null; saveSettings(); armed=false; refresh(); }});
  q('#gtNow').onclick=()=>openModal({title:'OTWORZYĆ BRAMKĘ TERAZ?',body:'Aplikacja zadzwoni na numer modułu GSM. Przy pierwszym razie Android poprosi o zgodę na połączenia.',confirmText:'ZADZWOŃ',onConfirm:()=>openGate('ręcznie',true)});
  /* szybki przycisk w górnej belce (widoczny tylko po skonfigurowaniu) */
  const b=document.createElement('button'); b.id='gateBtn'; b.type='button'; b.className='icon-btn'; b.title='Otwórz bramkę';
  b.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 20V8M21 20V8M3 12h18M3 16h18M7 8v12M12 8v12M17 8v12" /></svg>';
  b.onclick=()=>q('#gtNow').click();
  const ts=q('.top-status'); if(ts) ts.insertBefore(b,ts.firstChild);
  refresh();
}
window.RapidGate={tick,cancel,state:()=>({armed,last,cd:!!cd,dNow})};
function boot(){ g(); ui(); setInterval(()=>{ try{ tick(); refresh(); }catch(e){} },1000); }
if(typeof document!=='undefined'&&document.querySelector){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
}
})();
