// Same obstacle layout for every build. Positions and speed are in meters.
export const LANES=[-.55,0,.55];
export const COURSE=Array.from({length:28},(_,i)=>({at:55+i*19,lane:LANES[[1,0,2,1,2,0,1,0,2,0,1,2,1,0][i%14]]}));
// Generate only the section needed. Past 600 m, gaps decay from 19 m toward 4 m.
const survival=[];let nextAt=625,index=0;
export function obstaclesBetween(from,to){
 while(nextAt<=to){
  // Introduce double barriers occasionally, then increase their frequency.
  const doubleEvery=Math.max(1,6-Math.floor((index-24)/6));
  if(index<24||(index-24)%doubleEvery!==0)survival.push({at:nextAt,lane:LANES[index%3]});
  else {
   // Two barriers leave a single changing lane as the challenge intensifies.
   const safe=[0,1,2,1][index%4];for(let lane=0;lane<3;lane++)if(lane!==safe)survival.push({at:nextAt,lane:LANES[lane],wide:true});
  }
  nextAt+=Math.max(4,19*Math.pow(.98,index++));
 }
 return [...COURSE,...survival].filter(o=>o.at>from&&o.at<=to);
}
export function steer(target,direction){return Math.max(-.55,Math.min(.55,target+direction*.55));}
export function moveLane(lane,target,dt){return lane+Math.max(-2.8*dt,Math.min(2.8*dt,target-lane));}
export function collision(from,to,fromLane,toLane){
 for(const obstacle of obstaclesBetween(from,to)){if(obstacle.at>from&&obstacle.at<=to){const f=(obstacle.at-from)/(to-from);if(Math.abs(fromLane+(toLane-fromLane)*f-obstacle.lane)<(obstacle.wide?.30:.24))return obstacle;}}
 return null;
}
