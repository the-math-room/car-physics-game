// Fictional lightweight RWD coupe; SI units. Prices are rounded parts budgets.
// Curves are teaching assumptions, not measured dyno data for named products.
export const HP_TO_KW=0.745699872;
export function peakPower(engine){
  let peak=0;
  for(let i=0;i<6;i++){
    const r0=1000+i*1000,m=(engine.curve[i+1]-engine.curve[i])/1000,c=engine.curve[i]-m*r0;
    const points=[r0,r0+1000];if(m<0){const vertex=-c/(2*m);if(vertex>r0&&vertex<r0+1000)points.push(vertex);}
    for(const rpm of points)peak=Math.max(peak,(m*rpm+c)*rpm*2*Math.PI/60000);
  }
  return peak;
}
export function engineForHp(hp){
  if(!Number.isInteger(hp)||hp<120||hp>300)throw new RangeError('Choose 120–300 horsepower');
  const extra=hp-120,u=extra/180;
  const low=[120,145,165,175,160,120,60],high=[90,120,190,260,290,250,120];
  const curve=low.map((v,i)=>v+(high[i]-v)*u),scale=hp*HP_TO_KW/peakPower({curve});
  return {id:`engine-${hp}`,hp,cost:Math.round((25*extra+.10*extra*extra)/10)*10,mass:Math.round((.15*extra+.002*extra*extra)*10)/10,curve:curve.map(v=>v*scale)};
}
export const legacyEngines=[
    {id:'stock',cost:0,mass:0,curve:[130,155,170,175,165,145,110]},
    {id:'intake-exhaust-tune',cost:1500,mass:0,curve:[132,158,177,187,185,165,125]},
    {id:'responsive-turbo',cost:6000,mass:30,curve:[145,220,285,295,270,205,100]},
    {id:'top-end-turbo',cost:7500,mass:38,curve:[125,155,220,280,300,280,225]},
  ];
export const catalog = {
  engine: Array.from({length:181},(_,i)=>engineForHp(120+i)),
  tires:[{id:'street',cost:0,mu:0.85,crr:0.012},{id:'sport',cost:750,mu:1.05,crr:0.013},{id:'drag',cost:1100,mu:1.2,crr:0.015}],
  weight:[{id:'stock',cost:0,mass:0},{id:'battery',cost:650,mass:-10},{id:'lightweight-package',cost:2200,mass:-35}],
  aero:[{id:'stock',cost:0,mass:0,cda:0.68},{id:'undertray',cost:400,mass:4,cda:0.66},{id:'underbody-package',cost:1100,mass:9,cda:0.63}],
  gearing:[{id:'standard',cost:0,ratio:4.1},{id:'tall',cost:850,ratio:3.6},{id:'short',cost:850,ratio:4.6}],
  shifter:[{id:'standard',cost:0,delay:0.45},{id:'short-throw',cost:400,delay:0.35}],
};
export const keys=Object.keys(catalog);
export const stock=Object.fromEntries(keys.map(k=>[k,catalog[k][0]]));
export const cost=b=>keys.reduce((s,k)=>s+b[k].cost,0);
export function torque(engine,rpm){
  const u=Math.max(0,Math.min(6,(rpm-1000)/1000));
  const i=Math.min(5,Math.floor(u));
  return engine.curve[i]+(engine.curve[i+1]-engine.curve[i])*(u-i);
}
// The same fixed-step integrator powers timed analysis and endless gameplay.
export function createRace(b,shiftRPM=6500,dt=0.02,grip=1){
  const m=1120+b.engine.mass+b.weight.mass+b.aero.mass;
  const gears=[3.14,1.89,1.33,1,.81],radius=.29;
  let t=0,x=0,v=0,gear=0,shiftEnd=0,shifts=0,limited=0;
  return {step(){
    const ratio=gears[gear]*b.gearing.ratio,wheelRPM=v/radius*ratio*60/(2*Math.PI),rpm=Math.max(3000,wheelRPM);
    if(t>=shiftEnd&&wheelRPM>=shiftRPM&&gear<gears.length-1){gear++;shifts++;shiftEnd=t+b.shifter.delay;}
    const drag=.5*1.225*b.aero.cda*v*v,resistance=drag+b.tires.crr*m*9.81;
    const drive=t<shiftEnd||wheelRPM>7000?0:torque(b.engine,rpm)*ratio*.88/radius;
    const mu=b.tires.mu*grip,traction=(mu*(.5*m*9.81-.20*resistance))/(1-.20*mu),force=Math.min(drive,Math.max(0,traction));
    if(drive>traction)limited+=dt;
    const sample=[t,x,v,rpm,gear+1,force,drag],a=(force-resistance)/m;
    const nextV=Math.max(0,v+a*dt),nextX=x+(v+nextV)*.5*dt;
    const before={t,x};x=nextX;v=nextV;t+=dt;
    return {sample,before,t,x,v,shifts,limited};
  }};
}
export function run(b,shiftRPM=6500,distance=600,dt=.02,grip=1){
  const simulation=createRace(b,shiftRPM,dt,grip),splits={},trace=[];
  let state;
  do{
    state=simulation.step();const {before,t,x,sample}=state;
    for(const mark of [100,300,distance])if(before.x<mark&&x>=mark)splits[mark]=before.t+dt*(mark-before.x)/(x-before.x);
    if(Math.round(before.t/dt)%10===0)trace.push(sample);
  }while(state.x<distance&&state.t<90);
  if(!splits[distance])throw new Error('Car did not finish');
  return {time:splits[distance],speed:state.v*3.6,shifts:state.shifts,tractionLimitedSeconds:state.limited,splits,trace};
}
