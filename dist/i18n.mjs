import {spanish} from './es.mjs';
export const LANGUAGE_KEY='drag-lab-language';
let language='en';
try {const saved=globalThis.localStorage?.getItem(LANGUAGE_KEY);language=saved==='es'||saved==='en'?saved:(globalThis.navigator?.language?.startsWith('es')?'es':'en');}catch{}
export const getLanguage=()=>language;
const phrases=Object.keys(spanish).sort((a,b)=>b.length-a.length);
const patterns=[
 [/^(\d+) hp engine(.*)$/,(_,n,rest)=>`Motor de ${n} hp${t(rest)}`],
 [/^(\d+) hp · \+(.+) kg · (.+)\. Explore its torque curve and shift point\.$/,(_,hp,mass,cost)=>`${hp} hp · +${mass} kg · ${cost}. Explora su curva de par y sus RPM de cambio.`],
 [/^(.+) spent · shifts at (.+) RPM$/,(_,cost,rpm)=>`${cost} gastados · cambios a ${rpm} RPM`],
 [/^(.+) spent$/,(_,cost)=>`${cost} gastados`],
 [/^LAUNCH RUN (\d+)$/,(_,n)=>`INICIAR CARRERA ${n}`],
 [/^RUN (\d+)$/,(_,n)=>`CARRERA ${n}`],
 [/^Remove (.+) in upgrades to race\.$/,(_,cost)=>`Quita ${cost} en mejoras para poder correr.`],
 [/^Modify (.+): (.+)$/,(_,category,part)=>`Modificar ${t(category)}: ${t(part)}`],
 [/^Driving force (.+) N · Air drag (.+) N$/,(_,force,drag)=>`Fuerza motriz ${force} N · Resistencia del aire ${drag} N`],
 [/^(.+) m · survival$/,(_,d)=>`${d} m · supervivencia`],
 [/^(.+) m \/ 600 m checkpoint$/,(_,d)=>`${d} m / control de 600 m`],
 [/^SURVIVAL · 600 M SCORE (.+) S$/,(_,time)=>`SUPERVIVENCIA · TIEMPO A 600 M: ${time} S`],
 [/^Build scored: (.+) s at 600 m\. Keep driving—barriers get closer together\.$/,(_,time)=>`Tiempo del auto: ${time} s a los 600 m. Sigue conduciendo: las barreras están cada vez más juntas.`],
 [/^Crashed at (.+) m\. Your 600 m build score stays (.+) s\.$/,(_,d,time)=>`Chocaste a los ${d} m. Tu tiempo a los 600 m sigue siendo ${time} s.`],
 [/^Barrier hit at (.+) m\. Reach 600 m to score this build\. Retry anytime\.$/,(_,d)=>`Chocaste con una barrera a los ${d} m. Llega a los 600 m para registrar el tiempo. Reintenta cuando quieras.`],
 [/^Grip limited your driving force for (.+) s\. Could tires turn more engine torque into acceleration\?$/,(_,time)=>`El agarre limitó la fuerza motriz durante ${time} s. ¿Podrían otros neumáticos aprovechar más par motor para acelerar?`],
 [/^(\d+) shifts interrupted driving force\. Compare your engine curve with your chosen shift RPM\.$/,(_,n)=>`${n} cambios de marcha interrumpieron la fuerza motriz. Compara la curva del motor con las RPM de cambio elegidas.`],
 [/^(.+) s (faster|slower) than attempt (\d+)$/,(_,time,kind,n)=>`${time} s ${kind==='faster'?'más rápido':'más lento'} que la carrera ${n}`],
 [/^Survived to (.+) m$/,(_,distance)=>`Sobreviviste hasta los ${distance} m`],
 [/^Speed versus elapsed time for attempt (\d+)$/,(_,n)=>`Velocidad en función del tiempo de la carrera ${n}`],
 [/^Attempt (\d+) sector times$/,(_,n)=>`Tiempos por tramo de la carrera ${n}`],
 [/^Torque in newton meters and power in kilowatts versus RPM\. Both use a 0–(.+) vertical scale\.$/,(_,max)=>`Par en newton metros y potencia en kilovatios frente a las RPM. Ambos usan una escala vertical de 0 a ${max}.`],
 [/^Next (.+) hp: \+(.+) and \+(.+) kg\. What else could that money buy\?$/,(_,hp,cost,mass)=>`Los próximos ${hp} hp cuestan +${cost} y añaden ${mass} kg. ¿Qué más podrías comprar con ese dinero?`],
 [/^(.+) versus installed$/,(_,cost)=>`${cost} respecto a lo instalado`],
 [/^(.+) remaining after this choice(.*)$/,(_,cost,rest)=>`${cost} disponibles después de esta elección${t(rest)}`],
 [/^(.+) remaining(.*)$/,(_,cost,rest)=>`${cost} disponibles${t(rest)}`],
 [/^(.+): installed package dashed, preview solid$/,(_,label)=>`${t(label)}: línea discontinua para lo instalado y continua para la vista previa`],
 [/^(.+)\. X axis: (.+)\. Y axis: (.+)\.$/,(_,title,x,y)=>`${t(title)}. Eje X: ${t(x)}. Eje Y: ${y}.`],
 [/^Explore: (.+)$/,(_,label)=>`Explora: ${t(label)}`],
 [/^Think before buying: (.+)$/,(_,question)=>`Antes de comprar, piensa: ${t(question)}`],
];
spanish['— swap other parts before racing']='— cambia otras piezas antes de correr';
export function t(source){
 if(language!=='es')return source;
 const core=source.trim();if(!core)return source;
 let translated=spanish[core];
 if(translated===undefined){for(const [pattern,fn] of patterns){const match=core.match(pattern);if(match){translated=fn(...match);break;}}}
 // Composite labels and paragraphs are assembled from the same translated phrases.
 if(translated===undefined){translated=core;for(const phrase of phrases)if(translated.includes(phrase))translated=translated.split(phrase).join(spanish[phrase]);}
 return source.slice(0,source.indexOf(core))+translated+source.slice(source.indexOf(core)+core.length);
}
const sources=new WeakMap(),attributeSources=new WeakMap();
const attributes=['aria-label','placeholder','title'];
function localize(root){
 if(root.nodeType===3){
  if(root.parentElement?.closest('textarea,input,[data-user-text],script,style,[data-no-translate]'))return;
  const value=root.nodeValue,old=sources.get(root),source=old&&value===old.translated?old.source:value,translated=t(source);
  sources.set(root,{source,translated});if(value!==translated)root.nodeValue=translated;return;
 }
 if(root.nodeType!==1)return;
 if(root.matches('textarea,input,[data-user-text],script,style,[data-no-translate]')){
  // Input values and student predictions are never translated; placeholders are.
  if(!root.matches('textarea,input'))return;
 }
 const cache=attributeSources.get(root)||{};
 for(const name of attributes)if(root.hasAttribute(name)){
  const value=root.getAttribute(name),old=cache[name],source=old&&value===old.translated?old.source:value,translated=t(source);
  cache[name]={source,translated};if(value!==translated)root.setAttribute(name,translated);
 }
 attributeSources.set(root,cache);
 for(const node of root.childNodes)localize(node);
}
let observer;
const watch=()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
export function localizePage(){if(typeof document==='undefined')return;observer?.disconnect();localize(document.body);document.documentElement.lang=language;const meta=document.querySelector('meta[name=description]');if(meta)meta.content=language==='es'?'Diseña un auto con $8,000. Carreras ilimitadas. Un reto de física con taller interactivo.':'Build an $8,000 drag car. Unlimited runs. One fastest time. A physics garage challenge.';if(observer)watch();}
export function setLanguage(next){
 if(next!=='en'&&next!=='es')return;
 language=next;try{globalThis.localStorage?.setItem(LANGUAGE_KEY,next);}catch{}
 if(typeof document!=='undefined'){localizePage();document.querySelector('#language').value=next;document.dispatchEvent(new Event('languagechange'));}
}
export function startLocalization(){
 const select=document.querySelector('#language');select.value=language;select.addEventListener('change',()=>setLanguage(select.value));
 localizePage();
 observer=new MutationObserver(records=>{observer.disconnect();for(const record of records){if(record.type==='childList')for(const node of record.addedNodes)localize(node);else localize(record.target);}watch();});watch();
}
