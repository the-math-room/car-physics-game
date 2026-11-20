import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,stock,run,cost,legacyEngines,engineForHp,peakPower,HP_TO_KW} from '../dist/physics.mjs';
import {fresh,resolve,canLaunch,record,restore} from '../dist/session.mjs';
test('calibrated finalist builds reproduce analysis and shifting matters',()=>{
  const a={...stock,engine:legacyEngines[2],tires:catalog.tires[2],aero:catalog.aero[1],shifter:catalog.shifter[1]};
  const b={...stock,engine:legacyEngines[3],shifter:catalog.shifter[1]};
  assert.equal(cost(a),7900);assert.equal(cost(b),7900);
  assert.ok(Math.abs(run(a,6000).time-18.15966027)<1e-6);
  assert.ok(Math.abs(run(b,7000).time-18.29934119)<1e-6);
  assert.ok(run(a,6000).time<run(b,7000).time);
  assert.ok(run(a,6000,1000).time>run(b,7000,1000).time);
  assert.ok(run(a,7000).time-run(a,6000).time>0.4);
});
test('runs beyond the old limit survive reload and remain playable',()=>{
  let state=fresh();state.prediction='Less mass should help.';
  for(let i=0;i<10;i++){assert.ok(canLaunch(state));record(state,run(resolve(state.selection)));state=restore(JSON.stringify(state));assert.equal(state.runs.length,i+1);}
  assert.equal(canLaunch(state),true);record(state,run(stock));assert.equal(state.runs.length,11);
  assert.equal(state.runs[0].prediction,'Less mass should help.');
});
test('over-budget builds cannot race; swapping a part restores eligibility',()=>{
  const state=fresh();state.selection.engine='top-end-turbo';state.selection.tires='sport';
  assert.equal(canLaunch(state),false);assert.throws(()=>record(state,run(resolve(state.selection))));
  state.selection.tires='street';assert.ok(canLaunch(state));
});
test('records are snapshots and corrupted storage recovers',()=>{
  const state=fresh();record(state,run(stock));state.selection.engine='responsive-turbo';
  assert.equal(state.runs[0].selection.engine,'engine-120');
  assert.deepEqual(restore('not json'),fresh());assert.deepEqual(restore('{"version":1}'),fresh());
  state.rpm=9999;assert.deepEqual(restore(JSON.stringify(state)),fresh());
});
test('integrator converges and split times increase',()=>{
  const normal=run(stock),fine=run(stock,6500,600,0.005);
  assert.ok(Math.abs(normal.time-fine.time)<.02);
  assert.ok(normal.splits[100]<normal.splits[300]&&normal.splits[300]<normal.time);
  assert.ok(normal.trace.every(row=>row.every(Number.isFinite)));
});

test('steering and swept collisions handle crossed barriers without tunneling',async()=>{
 const {steer,moveLane,collision,COURSE}=await import('../dist/driving.mjs');
 assert.equal(steer(.55,1),.55);assert.equal(steer(0,-1),-.55);
 assert.equal(moveLane(0,.55,1),.55);
 assert.equal(collision(54,56,0,0),COURSE[0]);
 assert.equal(collision(54,56,-.55,-.55),null);
 assert.equal(collision(0,100,0,0),COURSE[0]);
 const state=fresh();collision(54,56,0,0);assert.equal(state.runs.length,0);
 record(state,run(stock));assert.equal(state.runs.length,1);
});


test('horsepower slider has exact peak power, increasing cost and mass',()=>{
 let previous=engineForHp(120);
 for(let hp=121;hp<=300;hp++){
  const e=engineForHp(hp);assert.ok(Math.abs(peakPower(e)/HP_TO_KW-hp)<1e-8);
  assert.ok(e.cost>previous.cost);assert.ok(e.mass>previous.mass);previous=e;
 }
 assert.throws(()=>engineForHp(301));assert.throws(()=>engineForHp(180.5));
});
test('legacy sessions retain results and migrate only the active engine',()=>{
 const s=fresh();s.selection.engine='responsive-turbo';record(s,run(resolve(s.selection)));delete s.runs[0].modelVersion;
 const restored=restore(JSON.stringify(s));assert.match(restored.selection.engine,/^engine-\d+$/);
 assert.equal(restored.runs[0].selection.engine,'responsive-turbo');
 const modern=fresh();modern.selection.engine='engine-279';modern.rpm=6250;record(modern,run(resolve(modern.selection)));
 assert.deepEqual(restore(JSON.stringify(modern)),modern);
});
test('maximum engine and maximum shift RPM are not universal winners',()=>{
 const balanced={...stock,engine:engineForHp(279),tires:catalog.tires[2],shifter:catalog.shifter[1]};
 const maxed={...stock,engine:engineForHp(300)};
 assert.ok(cost(balanced)<=8000);assert.ok(cost(maxed)<=8000);
 assert.ok(run(balanced,6500).time<run(maxed,6500).time-1);
 assert.ok(run(balanced,6500).time<run(balanced,7000).time-.15);
});

test('endless integrator preserves checkpoint timing and keeps moving past it',async()=>{
 const {createRace}=await import('../dist/physics.mjs');
 const sim=createRace(stock);let checkpoint,step;
 do{step=sim.step();if(!checkpoint&&step.before.x<600&&step.x>=600)checkpoint=step.before.t+.02*(600-step.before.x)/(step.x-step.before.x);}while(step.x<1500);
 assert.ok(Math.abs(checkpoint-run(stock).time)<1e-9);assert.ok(step.v>0);
});
test('survival obstacles tighten after 600 m and leave a changing lane',async()=>{
 const {obstaclesBetween,collision}=await import('../dist/driving.mjs');
 const early=obstaclesBetween(600,750),late=obstaclesBetween(1500,1550);
 assert.equal(early[0].at,625);assert.ok(early[2].at-early[1].at<early[1].at-early[0].at);
 assert.ok(late.every(o=>o.wide));
 const distinct=[...new Set(late.map(o=>o.at))];assert.ok(distinct[1]-distinct[0]<early[1].at-early[0].at);
 const barrier=late[0];assert.equal(collision(barrier.at-.1,barrier.at+.1,barrier.lane,barrier.lane).at,barrier.at);
});

test('damaged saved results are skipped while valid runs and the build survive',()=>{
 const state=fresh();state.selection.engine='engine-180';state.prediction='Compare grip.';
 record(state,run(resolve(state.selection)));
 const good=structuredClone(state.runs[0]);
 const mutations=[r=>delete r.result.speed,r=>r.result.trace[0][2]='bad',r=>r.result.tractionLimitedSeconds=null,r=>r.survival={distance:'bad',time:30,crashed:true}];
 for(const mutate of mutations){const damaged=structuredClone(good);mutate(damaged);state.runs.push(damaged);}
 state.runs.push(null,good);
 const recovered=restore(JSON.stringify(state));
 assert.equal(recovered.runs.length,2);assert.deepEqual(recovered.runs,[good,good]);
 assert.deepEqual(recovered.selection,state.selection);assert.equal(recovered.prediction,state.prediction);
});

test('sound defaults off, remembers the choice, and tolerates blocked storage',async()=>{
 const {EngineAudio}=await import('../dist/engine-audio.mjs');
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  const data=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
  assert.equal(new EngineAudio().enabled,false);
  const audio=new EngineAudio();audio.setEnabled(true);assert.equal(new EngineAudio().enabled,true);
  audio.setEnabled(false);assert.equal(new EngineAudio().enabled,false);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Blocked');}});
  const blocked=new EngineAudio();assert.equal(blocked.enabled,false);assert.doesNotThrow(()=>blocked.setEnabled(true));
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('survival introduces double barriers gradually and avoids full-width forced jumps',async()=>{
 const {obstaclesBetween,LANES}=await import('../dist/driving.mjs');
 const rows=[...Map.groupBy(obstaclesBetween(600,2200),o=>o.at).values()];
 assert.ok(rows.slice(0,24).every(row=>row.length===1));
 assert.equal(rows[24].length,2);
 assert.ok(rows.slice(25,30).every(row=>row.length===1));
 assert.ok(rows.slice(24,54).some(row=>row.length===1));
 assert.ok(rows.slice(54).every(row=>row.length===2));
 const safe=row=>LANES.find(lane=>row.every(o=>o.lane!==lane));
 for(let i=55;i<rows.length;i++)assert.ok(Math.abs(safe(rows[i])-safe(rows[i-1]))<=.55);
 const gap=rows[25][0].at-rows[24][0].at;
 assert.ok(gap>19*Math.pow(.975,24));
});
