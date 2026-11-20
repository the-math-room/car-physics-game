import fs from 'node:fs';
import {catalog,stock,cost,run,engineForHp} from '../dist/physics.mjs';
const other=Object.keys(catalog).filter(k=>k!=='engine');
function* combinations(i=0,b={...stock}){if(i===other.length){yield {...b};return;}const k=other[i];for(const p of catalog[k]){b[k]=p;yield* combinations(i+1,b);}}
let runs=0;const rows=[];
for(let hp=120;hp<=300;hp+=1){let best=null;const engine=engineForHp(hp);for(const parts of combinations()){
 const build={...parts,engine};if(cost(build)>8000)continue;
 for(let rpm=5000;rpm<=7000;rpm+=250){const r=run(build,rpm);runs++;if(!best||r.time<best.time){delete r.trace;best={hp,cost:cost(build),engineCost:engine.cost,addedMass:engine.mass,rpm,...r,parts:Object.fromEntries(other.map(k=>[k,build[k].id]))};}}
 }rows.push(best);}
const winner=rows.reduce((a,b)=>a.time<b.time?a:b);
const shifts=rows.filter(r=>[120,180,220,250,260,280,300,winner.hp].includes(r.hp)).map(r=>{const b={engine:engineForHp(r.hp),...Object.fromEntries(other.map(k=>[k,catalog[k].find(p=>p.id===r.parts[k])]))};return {hp:r.hp,best:r.time,rpm:r.rpm,maxRPM:run(b,7000).time,fine:run(b,r.rpm,600,.005).time};});
fs.writeFileSync('analysis/engine-slider-results.json',JSON.stringify({runs,budget:8000,rows,winner,shifts},null,2));
console.log(JSON.stringify({runs,winner,summary:rows.filter(r=>r.hp%20===0).map(r=>({hp:r.hp,cost:r.cost,time:r.time,rpm:r.rpm,parts:r.parts})),shifts},null,2));
