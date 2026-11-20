import fs from 'node:fs';
import assert from 'node:assert/strict';

import { catalog as liveCatalog, keys, cost, torque, run, legacyEngines } from '../dist/physics.mjs';
// Reproduce the earlier fixed-package study; the current slider uses engine-sweep.mjs.
const catalog={...liveCatalog,engine:legacyEngines};
const stock=Object.fromEntries(keys.map(k=>[k,catalog[k][0]]));
function* builds(i=0,b={}){
  if(i===keys.length){yield {...b};return;}
  const k=keys[i];for(const part of catalog[k]){b[k]=part;yield* builds(i+1,b);}
}
function best(b,distance=600,grip=1){
  let winner;
  for(let rpm=5000;rpm<=7000;rpm+=250){
    const r=run(b,rpm,distance,0.02,grip);delete r.trace;
    if(!winner || r.time<winner.time) winner={...r,rpm};
  }
  return {cost:cost(b),build:Object.fromEntries(keys.map(k=>[k,b[k].id])),...winner};
}
const all=[...builds()];
const results=all.map(b=>best(b)).sort((a,b)=>a.time-b.time);
const budgets=[3000,5000,6500,7500,8000,8500,9000,10000];
const budgetResults=budgets.map(budget=>{
  const eligible=results.filter(r=>r.cost<=budget), first=eligible[0];
  return {budget,best:first,withinTwoTenths:eligible.filter(r=>r.time<=first.time+0.2).length,
    engineWinners:catalog.engine.map(e=>eligible.find(r=>r.build.engine===e.id)).filter(Boolean)};
});
const marginals=[];
for(const e of catalog.engine){
  const base={...stock,engine:e}, baseline=best(base);
  for(const k of keys.filter(k=>k!=='engine'))for(const part of catalog[k].slice(1)){
    const result=best({...base,[k]:part});
    const secondsSaved=baseline.time-result.time;
    marginals.push({engine:e.id,upgrade:part.id,incrementalCost:part.cost,secondsSaved,secondsPer1000:secondsSaved/part.cost*1000});
  }
}
const finalists=budgetResults.find(b=>b.budget===8000).engineWinners;
const sensitivity=finalists.map(r=>{
  const b=Object.fromEntries(keys.map(k=>[k,catalog[k].find(p=>p.id===r.build[k])]));
  const fine=run(b,r.rpm,600,0.005);const medium=run(b,r.rpm,600,0.01);
  assert.ok(Math.abs(fine.time-r.time)<0.06,'Time-step convergence');
  return {engine:r.build.engine,coarse:r.time,medium:medium.time,fine:fine.time,
    shiftSweep:[5000,5500,6000,6500,7000].map(rpm=>({rpm,time:run(b,rpm).time})),
    quarterMile:best(b,402.336),kilometer:best(b,1000),lowerGrip:best(b,600,0.9)};
});
assert.equal(torque(catalog.engine[0],4000),175);
assert.ok(run({...stock,aero:{...stock.aero,cda:0.4}}).time<run(stock).time);
assert.ok(run({...stock,weight:{...stock.weight,mass:-100}}).time<run(stock).time);
const report={model:'Fictional coupe, ideal traction control and launch clutch; no tire-slip dynamics, turbo transient, rotational inertia, wind or thermal effects.',configurations:all.length,shiftSettings:9,runsInMainSweep:all.length*9,baseline:best(stock),catalog,budgetResults,marginals,sensitivity};
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(new URL('./builds.csv',import.meta.url),['cost,time,rpm,'+keys.join(','),...results.map(r=>[r.cost,r.time.toFixed(4),r.rpm,...keys.map(k=>r.build[k])].join(','))].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
