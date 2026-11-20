import {t,getLanguage,startLocalization} from './i18n.mjs';
import {steer,moveLane,collision} from './driving.mjs';
import {EngineAudio} from './engine-audio.mjs';
import {mountUpgradeLab} from './upgrade-lab.mjs';
import {drawRace} from './race-view.mjs';
import {catalog,keys,cost,torque,run,createRace,peakPower,legacyEngines,HP_TO_KW} from './physics.mjs';
import {BUDGET,STORAGE_KEY,fresh,resolve,canLaunch,restore,record} from './session.mjs';
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={engine:'Engine package',tires:'Tires',weight:'Weight reduction',aero:'Aerodynamics',gearing:'Final drive',shifter:'Shifter'};
const labels={engine:['Stock naturally aspirated','Intake, exhaust & tune','Responsive turbo','Top-end turbo'],tires:['Street tires','Sport tires','Drag tire package'],weight:['Stock components','Lightweight battery','Lightweight package'],aero:['Stock body','Smooth undertray','Full underbody package'],gearing:['Standard · 4.10','Tall · 3.60','Short · 4.60'],shifter:['Standard shifter','Short-throw shifter']};
const descriptions={engine:['No added mass. A modest, broad torque curve.','More breathing room at high RPM. Same mass.','Strong midrange; torque falls at high RPM. +30 kg.','More high-RPM power; weaker low-RPM pull. +38 kg.'],tires:['μ = 0.85. Low rolling resistance, limited launch grip.','μ = 1.05. More grip; slightly more rolling resistance.','μ = 1.20. Strong launch grip; higher rolling resistance.'],weight:['1,120 kg base car, including driver and race equipment.','Save 10 kg. Small improvement, small package.','Save 35 kg total. Includes the battery upgrade.'],aero:['Drag area (CdA): 0.68 m².','CdA: 0.66 m². Adds 4 kg; helps most at speed.','CdA: 0.63 m². Adds 9 kg; includes the undertray.'],gearing:['Balanced gearing. No additional cost.','Less wheel torque; more road speed per engine RPM.','More wheel torque; reaches shift RPM sooner.'],shifter:['0.45 seconds without engine drive per shift.','0.35 seconds without engine drive per shift.']};
labels.engine=catalog.engine.map(e=>`${e.hp} hp engine`);
descriptions.engine=catalog.engine.map(e=>`${e.hp} hp · +${e.mass} kg · ${money(e.cost)}. Explore its torque curve and shift point.`);
const oldNames={'stock':'Original stock engine','intake-exhaust-tune':'Original intake/exhaust tune','responsive-turbo':'Original responsive turbo','top-end-turbo':'Original top-end turbo'};
const label=(k,id)=>k==='engine'&&oldNames[id]?oldNames[id]:labels[k][catalog[k].findIndex(p=>p.id===id)];

let storageOK=true,state;
try{state=restore(localStorage.getItem(STORAGE_KEY));}catch{state=fresh();storageOK=false;}
const engineAudio=new EngineAudio();
let driver={lane:0,target:0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches},paused=false;
let racing=false,frame=0,lastSample=[0,0,0,0,0,0,0],lastRace=null;
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{storageOK=false;}if(!storageOK)$('#status').textContent='Browser storage is unavailable. Keep this tab open and export your results.';}
$('#parts').innerHTML=keys.map(k=>`<div class="part-group"><label class="part-label" for="part-${k}">${names[k]}<span id="price-${k}"></span></label><button type="button" class="modify-part" id="modify-${k}"><span id="selected-${k}"></span><b>Modify</b></button><select hidden aria-hidden="true" tabindex="-1" id="part-${k}">${catalog[k].map((p,i)=>`<option value="${p.id}">${labels[k][i]} · ${p.cost?money(p.cost):'Included'}</option>`).join('')}</select><p class="part-detail" id="detail-${k}"></p></div>`).join('');
for(const k of keys){$(`#part-${k}`).value=state.selection[k];$(`#part-${k}`).addEventListener('change',e=>{state.selection[k]=e.target.value;save();render();});}
const openLab=mountUpgradeLab({getBuild:()=>resolve(state.selection),getSelection:()=>state.selection,apply:(k,id)=>{if(racing)return;state.selection[k]=id;$(`#part-${k}`).value=id;save();render();},names,labels,descriptions});
for(const k of keys)$(`#modify-${k}`).addEventListener('click',()=>openLab(k));
$('#shift').value=state.rpm;$('#prediction').value=state.prediction;
$('#shift').addEventListener('input',e=>{state.rpm=Number(e.target.value);save();render();});
$('#prediction').addEventListener('input',e=>{state.prediction=e.target.value;save();});
function render(){
  const b=resolve(state.selection),spent=cost(b),left=BUDGET-spent;
  $('#remaining').textContent=money(left);$('#spent').textContent=`${money(spent)} spent`;
  $('.build-dashboard').classList.toggle('over-budget',left<0);$('#budget-fill').style.width=`${Math.min(100,spent/BUDGET*100)}%`;
  for(const k of keys){const i=catalog[k].findIndex(p=>p.id===state.selection[k]);$(`#selected-${k}`).textContent=labels[k][i];$(`#modify-${k}`).setAttribute('aria-label',`Modify ${names[k]}: ${labels[k][i]}`);$(`#price-${k}`).textContent=b[k].cost?money(b[k].cost):'Included';$(`#detail-${k}`).textContent=descriptions[k][i];}
  const totalMass=1120+b.engine.mass+b.weight.mass+b.aero.mass;
  const peakKW=peakPower(b.engine);
  $('#mass').textContent=totalMass.toLocaleString();
  $('#power').textContent=peakKW.toFixed(1);
  $('#power-weight').textContent=(peakKW/(totalMass/1000)).toFixed(1);
  $('#horsepower').textContent=`${Math.round(peakKW/HP_TO_KW)} hp`;
  $('#drag-area').textContent=b.aero.cda.toFixed(2);
  $('#grip').textContent=b.tires.mu.toFixed(2);
  $('#shift-label').innerHTML=`${state.rpm.toLocaleString()} <small>RPM</small>`;
  $('#attempt-count').innerHTML=`${state.runs.length}`;
  const finished=state.runs;
  const comparable=finished.filter(r=>r.modelVersion===2);
  $('#best-time').innerHTML=comparable.length?`${Math.min(...comparable.map(r=>r.result.time)).toFixed(2)} <small>s</small>`:'— <small>s</small>';
  $('#parts').disabled=racing;$('#shift').disabled=racing;$('#prediction').disabled=racing;
  $('#launch').disabled=racing||!canLaunch(state);$('#reset').disabled=racing;$('#export').disabled=racing||!state.runs.length;
  $('#launch').textContent=racing?'RUN IN PROGRESS':`LAUNCH RUN ${state.runs.length+1}`;
  $('#launch-title').textContent=state.runs.length===0?'Make your first move.':racing?'Put it to the test.':state.runs.length===1?'Change one thing.':'Keep refining your build.';
  $('#launch-note').textContent=left<0?`Remove ${money(-left)} in upgrades to race.`:'Build score at 600 m. Then survive as long as you can.';
  drawDyno(b.engine);renderRuns(finished);
}
function drawDyno(engine){
  const max=Math.max(350,Math.ceil(Math.max(...engine.curve)/50)*50);
  const x=r=>36+(r-1000)/6000*350,y=v=>105-v/max*90;
  const pts=Array.from({length:61},(_,i)=>{const rpm=1000+i*100;return [rpm,torque(engine,rpm)];});
  $('#dyno').innerHTML=`<title>Torque in newton meters and power in kilowatts versus RPM. Both use a 0–${max} vertical scale.</title>${[0,max/2,max].map(v=>`<path d="M36 ${y(v)}H386" stroke="#36443e"/><text x="0" y="${y(v)+4}" fill="#a4afb0" font-size="10">${v}</text>`).join('')}<polyline points="${pts.map(([r,t])=>`${x(r)},${y(t)}`).join(' ')}" fill="none" stroke="#ffb77b" stroke-width="2.5"/><polyline points="${pts.map(([r,t])=>`${x(r)},${y(t*r*2*Math.PI/60000)}`).join(' ')}" fill="none" stroke="#87ccd2" stroke-width="2.5"/><path d="M${x(state.rpm)} 8V108" stroke="#c4f46f" stroke-dasharray="4 4"/><text x="36" y="127" fill="#a4afb0" font-size="10">1,000</text><text x="190" y="127" fill="#a4afb0" font-size="10">4,000</text><text x="352" y="127" fill="#a4afb0" font-size="10">7,000</text>`;
}
function renderRuns(runs){
  if(!runs.length){$('#runs').innerHTML='<div class="empty"><span class="empty-icon">▤</span><div><h3>Your first run sets the baseline.</h3><p>Compare splits, shift timing, and upgrade choices here after each attempt.</p></div></div>';return;}
  const best=Math.min(...runs.filter(r=>r.modelVersion===2).map(r=>r.result.time));
  $('#runs').innerHTML=`<div class="run-grid">${runs.map((r,i)=>{
    const v=r.result,prev=runs[i-1]?.modelVersion===r.modelVersion?runs[i-1]:null,delta=prev?prev.result.time-v.time:0;
    const insight=v.tractionLimitedSeconds>3?`Grip limited your driving force for ${v.tractionLimitedSeconds.toFixed(1)} s. Could tires turn more engine torque into acceleration?`:`${v.shifts} shifts interrupted driving force. Compare your engine curve with your chosen shift RPM.`;
    const points=v.trace.map(p=>`${20+p[0]/v.time*280},${82-p[2]*3.6/220*70}`).join(' ');
    return `<article class="run-card ${v.time===best?'winner':''}"><div class="run-title"><span>RUN ${i+1}</span>${v.time===best?'<span class="best-badge">PERSONAL BEST</span>':''}</div><div class="run-time">${v.time.toFixed(2)} <small>seconds</small></div><div class="run-change">${prev?`${Math.abs(delta).toFixed(2)} s ${delta>=0?'faster':'slower'} than attempt ${i}`:'Baseline recorded'}</div><p class="run-spec">${escape(label('engine',r.selection.engine))}${r.modelVersion===2?'':' · earlier model'}<br>${money(r.cost)} spent · shifts at ${r.rpm.toLocaleString()} RPM</p><svg class="speed-chart" viewBox="0 0 320 105" role="img" aria-label="Speed versus elapsed time for attempt ${i+1}"><path d="M20 12V82H300" fill="none" stroke="#50614c"/><polyline points="${points}" fill="none" stroke="#c4f46f" stroke-width="2"/><text x="22" y="11" fill="#a4afb0" font-size="10">Speed (0–220 km/h)</text><text x="20" y="100" fill="#a4afb0" font-size="10">0 s</text><text x="264" y="100" fill="#a4afb0" font-size="10">${v.time.toFixed(2)} s</text></svg><table class="split-table" aria-label="Attempt ${i+1} sector times"><tr><td>0–100 m</td><td>${v.splits[100].toFixed(2)} s</td></tr><tr><td>100–300 m</td><td>${(v.splits[300]-v.splits[100]).toFixed(2)} s</td></tr><tr><td>300–600 m</td><td>${(v.time-v.splits[300]).toFixed(2)} s</td></tr><tr><td>Speed at 600 m</td><td>${v.speed.toFixed(1)} km/h</td></tr><tr><td>Grip-limited time</td><td>${v.tractionLimitedSeconds.toFixed(1)} s</td></tr></table>${r.survival?`<p class="survival-result">${r.survival.crashed?`Survived to ${Math.round(r.survival.distance)} m`:'600 m score saved · survival unfinished'}</p>`:''}<p class="run-insight">${insight}</p><details><summary>Build & prediction</summary><ul>${keys.map(k=>`<li>${names[k]}: ${escape(label(k,r.selection[k]))}</li>`).join('')}</ul><blockquote ${r.prediction?'data-user-text':''}>${escape(r.prediction||'No prediction recorded.')}</blockquote></details></article>`;
  }).join('')}</div>`;
}
const canvas=$('#track'),ctx=canvas.getContext('2d');
let lastOverlay='';
function drawTrack(sample,countdown=''){lastOverlay=countdown;drawRace(ctx,sample,countdown,driver);}
document.addEventListener('languagechange',()=>drawTrack(lastSample,lastOverlay));
function telemetry(p){lastSample=p;$('#elapsed').innerHTML=`${p[0].toFixed(2)} <small>s</small>`;$('#speed').innerHTML=`${Math.round(p[2]*2.236936)} <small>mph</small>`;$('#rpm-readout').innerHTML=`${Math.round(p[3]).toLocaleString()} <small>rpm</small>`;$('#gear').textContent=p[4]||'N';$('#distance').textContent=`${Math.round(p[1])} m${p[1]>=600?' · survival':' / 600 m checkpoint'}`;$('#distance-fill').style.width=`${Math.min(100,p[1]/6)}%`;$('#forces').textContent=`Driving force ${Math.round(p[5]).toLocaleString()} N · Air drag ${Math.round(p[6]).toLocaleString()} N`;}
function changeLane(direction){if(!racing||paused)return;driver.target=steer(driver.target,direction);}
window.addEventListener('keydown',event=>{if(!racing||document.querySelector('dialog[open]')||event.target.closest?.('select,input,textarea'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();changeLane(event.key==='ArrowLeft'?-1:1);}});
for(const [id,dir] of [['#steer-left',-1],['#steer-right',1]])$(id).addEventListener('pointerdown',event=>{event.preventDefault();changeLane(dir);});
$('#sound').addEventListener('click',()=>{engineAudio.enabled=!engineAudio.enabled;$('#sound').textContent=engineAudio.enabled?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(engineAudio.enabled));if(!engineAudio.enabled)engineAudio.stop();else if(racing&&!paused)engineAudio.start();});
function setPaused(value){if(!racing)return;paused=value;$('#pause').textContent=paused?'Resume':'Pause';if(paused){engineAudio.stop();$('#race-state').textContent='PAUSED';drawTrack(lastSample,'PAUSED');}}
$('#pause').addEventListener('click',()=>setPaused(!paused));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
$('#launch').addEventListener('click',()=>{
  if(racing||!canLaunch(state))return;
  const result=run(resolve(state.selection),state.rpm);lastRace=result;
  driver={lane:0,target:0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};paused=false;racing=true;save();engineAudio.start().then(()=>{if(!engineAudio.available){$('#sound').textContent='Sound unavailable';$('#sound').disabled=true;}});
  $('#checkpoint-score').textContent='Not reached';$('#status').textContent='Steer to 600 m to score the build. Then keep going until you crash.';$('#race-state').textContent='STAGING · GET READY';render();$('#pause').disabled=false;$('#pause').textContent='Pause';
  $('.track-panel').scrollIntoView({behavior:driver.reduced?'instant':'smooth',block:'start'});canvas.focus({preventScroll:true});
  const simulation=createRace(resolve(state.selection),state.rpm);
  let a=simulation.step().sample,b=simulation.step().sample,elapsed=0,last=performance.now(),previousDistance=0,scoredRun=null;
  function tick(now){
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(paused){frame=requestAnimationFrame(tick);return;}
    elapsed+=dt;
    if(elapsed<3){telemetry([0,0,0,3000,1,0,0]);engineAudio.update(2600+Math.sin(elapsed*8)*450,0);drawTrack(lastSample,String(3-Math.floor(elapsed)));frame=requestAnimationFrame(tick);return;}
    const t=elapsed-3;while(b[0]<t){a=b;b=simulation.step().sample;}
    const fraction=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
    const p=a.map((value,i)=>i===4?(fraction<1?a[i]:b[i]):value+(b[i]-value)*fraction);p[0]=t;
    const oldLane=driver.lane;driver.lane=moveLane(driver.lane,driver.target,dt);
    telemetry(p);engineAudio.update(p[3],p[2],p[5]>1);drawTrack(p);$('#race-state').textContent=p[5]<1?'SHIFTING · DRIVE INTERRUPTED':'STEER LEFT / RIGHT · AVOID BARRIERS';
    const hit=collision(previousDistance,p[1],oldLane,driver.lane);previousDistance=p[1];
    if(!scoredRun&&p[1]>=600&&(!hit||hit.at>600)){
      scoredRun=record(state,result);scoredRun.survival={distance:600,time:result.time,crashed:false};save();render();
      $('#status').textContent=`Build scored: ${result.time.toFixed(2)} s at 600 m. Keep driving—barriers get closer together.`;
    }
    if(scoredRun){$('#race-state').textContent=`SURVIVAL · 600 M SCORE ${result.time.toFixed(2)} S`;$('#checkpoint-score').textContent=`${result.time.toFixed(2)} s`;}
    if(hit){
      racing=false;engineAudio.stop();engineAudio.crash();$('#pause').disabled=true;
      if(scoredRun){scoredRun.survival={distance:hit.at,time:t,crashed:true};save();}
      drawTrack(p,'CRASH');$('#race-state').textContent=scoredRun?'RUN ENDED · BUILD SCORE SAVED':'CRASH BEFORE CHECKPOINT · RETRY';render();$('#launch').textContent='RACE AGAIN';
      $('#status').textContent=scoredRun?`Crashed at ${Math.round(hit.at)} m. Your 600 m build score stays ${result.time.toFixed(2)} s.`:`Barrier hit at ${Math.round(hit.at)} m. Reach 600 m to score this build. Retry anytime.`;return;
    }
    frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
});
for(const [button,dialog] of [['#help','#help-dialog'],['#model-info','#notes-dialog'],['#reset','#reset-dialog']])$(button).addEventListener('click',()=>{if(racing)setPaused(true);$(dialog).showModal();});
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#confirm-reset').addEventListener('click',()=>{cancelAnimationFrame(frame);state=fresh();racing=false;paused=false;engineAudio.stop();driver.lane=driver.target=0;$('#pause').disabled=true;$('#checkpoint-score').textContent='Not reached';lastRace=null;for(const k of keys)$(`#part-${k}`).value=state.selection[k];$('#shift').value=6500;$('#prediction').value='';$('#status').textContent='';save();render();telemetry([0,0,0,0,0,0,0]);drawTrack(lastSample);$('#race-state').textContent='READY AT THE LINE';$('#reset-dialog').close();});
$('#export').addEventListener('click',()=>{
  const headings=['Run','Time (s)','Cost ($)','Shift RPM','0–100 m (s)','100–300 m (s)','300–600 m (s)','Speed at 600 m (km/h)','Grip-limited (s)',...keys.map(k=>names[k]),'Prediction','Engine model','Survival distance (m)','Survival crash'];
  const cell=v=>'"'+String(v).replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';
  const rows=state.runs.map((r,i)=>[i+1,r.result.time.toFixed(3),r.cost,r.rpm,r.result.splits[100].toFixed(3),(r.result.splits[300]-r.result.splits[100]).toFixed(3),(r.result.time-r.result.splits[300]).toFixed(3),r.result.speed.toFixed(1),r.result.tractionLimitedSeconds.toFixed(2),...keys.map(k=>label(k,r.selection[k])),r.prediction,r.modelVersion===2?'Horsepower slider':'Earlier model',r.survival?.crashed?r.survival.distance.toFixed(1):'',r.survival?.crashed?'Yes':'']);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+[headings.map(t),...rows.map(row=>row.map((value,i)=>i===9+keys.length?value:t(String(value))))].map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=getLanguage()==='es'?'resultados-carreras.csv':'drag-lab-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();drawTrack(lastSample);startLocalization();if(!storageOK)save();
