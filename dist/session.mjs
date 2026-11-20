import {catalog,keys,cost,stock,legacyEngines,peakPower,HP_TO_KW} from './physics.mjs';
export const BUDGET=8000, STORAGE_KEY='drag-lab-session-v1';
export const fresh=()=>({version:1,selection:Object.fromEntries(keys.map(k=>[k,catalog[k][0].id])),rpm:6500,prediction:'',runs:[]});
export function resolve(selection){return Object.fromEntries(keys.map(k=>[k,catalog[k].find(p=>p.id===selection[k])||(k==='engine'?legacyEngines.find(p=>p.id===selection[k]):null)||stock[k]]));}
export function canLaunch(state){return cost(resolve(state.selection))<=BUDGET;}
export function restore(raw){
  try{
    const s=JSON.parse(raw);
    if(s.version!==1 || !Array.isArray(s.runs)) return fresh();
    const validSelection=v=>v && keys.every(k=>catalog[k].some(p=>p.id===v[k])||(k==='engine'&&legacyEngines.some(p=>p.id===v[k])));
    const validRPM=v=>Number.isInteger(v)&&v>=5000&&v<=7000&&v%250===0;
    if(!validSelection(s.selection)||!validRPM(s.rpm)||typeof s.prediction!=='string') return fresh();
    if(!s.runs.every(r=>validSelection(r.selection)&&validRPM(r.rpm)&&Number.isFinite(r.result?.time)&&r.result.time>0&&Array.isArray(r.result.trace)&&r.result.trace.length>0&&[100,300,600].every(m=>Number.isFinite(r.result.splits?.[m]))&&typeof r.prediction==='string')) return fresh();
    const legacy=legacyEngines.find(e=>e.id===s.selection.engine);
    if(legacy)s.selection.engine=`engine-${Math.round(peakPower(legacy)/HP_TO_KW)}`;
    return s;
  }catch{return fresh();}
}
export function record(state,result){
  if(!canLaunch(state))throw new Error('Build over budget');
  state.runs.push({modelVersion:2,selection:{...state.selection},rpm:state.rpm,prediction:state.prediction.slice(0,400),cost:cost(resolve(state.selection)),result});
  return state.runs.at(-1);
}
