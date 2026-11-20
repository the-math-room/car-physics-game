import {t as translate} from './i18n.mjs';
// Perspective scenery is presentation only; the shared physics determines time.
import {obstaclesBetween} from './driving.mjs';
export function drawRace(ctx,sample,message='',driver={lane:0,target:0,reduced:false}){
  const [t,distance,speed]=sample,W=1100,H=540,horizon=145;
  const project=(z,lane=0)=>{const s=7/(7+Math.max(-1,z));return {x:550+lane*620*s,y:horizon+430*s,s,half:620*s};};
  const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  const strip=(near,far,left,right,color)=>{const a=project(near),b=project(far);poly([[a.x+left*a.half,a.y],[b.x+left*b.half,b.y],[b.x+right*b.half,b.y],[a.x+right*a.half,a.y]],color);};
  ctx.clearRect(0,0,W,H);
  const sky=ctx.createLinearGradient(0,0,0,240);sky.addColorStop(0,'#172736');sky.addColorStop(.65,'#796071');sky.addColorStop(1,'#eab18b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f7d399';ctx.beginPath();ctx.arc(780,113,43,0,7);ctx.fill();
  poly([[0,155],[100,115],[200,141],[305,107],[410,146],[520,125],[640,150],[740,128],[880,146],[985,107],[1100,140],[1100,205],[0,205]],'#4c4b59');
  for(let i=0;i<30;i++){const bx=i*42,ht=18+Math.sin(i*13)**2*48;ctx.fillStyle='#333d49';ctx.fillRect(bx,172-ht,29,ht);ctx.fillStyle='#c9b28a66';for(let k=0;k<3;k++)ctx.fillRect(bx+5+k*8,179-ht,3,4);}
  ctx.fillStyle='#655c51';ctx.fillRect(0,horizon,W,H-horizon);
  poly([[550,horizon],[-70,575],[1170,575]],'#374044');
  const sceneryDistance=driver.reduced?0:distance;
  // Alternating world-space sections expand rapidly as they approach the camera.
  for(let world=Math.ceil((sceneryDistance+220)/2)*2;world>sceneryDistance-2;world-=2){const near=Math.max(0,world-sceneryDistance),far=world+2-sceneryDistance;if(far<0)continue;strip(near,far,-3,3,Math.round(world/2)%2?'#665d4f':'#706650');strip(near,far,-1,1,Math.round(world/2)%2?'#333c40':'#374044');strip(near,far,-1.06,-1,Math.round(world/2)%2?'#e3cfab':'#b36e55');strip(near,far,1,1.06,Math.round(world/2)%2?'#e3cfab':'#b36e55');}
  for(let world=Math.ceil((sceneryDistance+220)/6)*6;world>sceneryDistance-6;world-=6){const near=Math.max(0,world-sceneryDistance),far=world+2.5-sceneryDistance;if(far>0)for(const lane of [-.333,.333])strip(near,far,lane-.009,lane+.009,'#dad3aa');}
  strip(0,220,-.96,-.95,'#d7c9a7');strip(0,220,.95,.96,'#d7c9a7');
  const objects=[];
  for(let i=Math.floor(sceneryDistance/6);i<Math.ceil((sceneryDistance+220)/6);i++){
    const z=i*6-sceneryDistance;if(z<0)continue;
    objects.push({z,type:i%4===0?'palm':i%4===1?'sign':i%4===2?'lamp':'barrier',side:i%2?1:-1,index:i});
    objects.push({z:z+3,type:'barrier',side:i%2?-1:1,index:i});
  }
  for(const obstacle of obstaclesBetween(distance-1,distance+85)){const z=obstacle.at-distance;if(z>=0&&z<85)objects.push({z,type:'obstacle',lane:obstacle.lane,wide:obstacle.wide});}
  objects.sort((a,b)=>b.z-a.z);
  for(const obj of objects){const p=project(obj.z+(obj.type==='obstacle'?1.75:0),obj.type==='obstacle'?obj.lane:obj.side*1.10),s=p.s;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);
    if(obj.type==='palm'){
      ctx.strokeStyle='#383a31';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(8,-115,-16,-238);ctx.stroke();
      for(let j=0;j<7;j++){const a=j*Math.PI/3.5;poly([[-16,-238],[-16+Math.cos(a)*100,-238+Math.sin(a)*58],[-16+Math.cos(a+.3)*42,-238+Math.sin(a+.3)*20]],j%2?'#3a5143':'#283e36');}
    }else if(obj.type==='lamp'){
      ctx.strokeStyle='#28363c';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-265);ctx.lineTo(-obj.side*75,-265);ctx.stroke();ctx.fillStyle='#ffe2a2';ctx.fillRect(-obj.side*75-12,-265,26,7);
    }else if(obj.type==='sign'){
      ctx.fillStyle='#34423e';ctx.fillRect(-5,-115,10,115);ctx.fillStyle='#c7ed87';ctx.fillRect(-70,-170,140,70);ctx.fillStyle='#27372d';ctx.textAlign='center';ctx.font='900 23px sans-serif';ctx.fillText(obj.index%3?'LA MESA':'DRAG LAB',0,-139);ctx.font='14px sans-serif';ctx.fillText(translate('CLOSED COURSE'),0,-117);ctx.textAlign='left';
    }else if(obj.type==='obstacle'){
      // Barricades share their world positions with swept collision detection.
      if(obj.wide)ctx.scale(1.5,1);
      ctx.fillStyle='#131d2280';ctx.beginPath();ctx.ellipse(0,3,65,13,0,0,7);ctx.fill();ctx.fillStyle='#283031';ctx.fillRect(-47,-5,12,20);ctx.fillRect(35,-5,12,20);ctx.fillStyle='#eb9c55';ctx.fillRect(-62,-52,124,44);ctx.save();ctx.beginPath();ctx.rect(-62,-52,124,44);ctx.clip();for(let k=-100;k<100;k+=40)poly([[k,-52],[k+19,-52],[k+58,-8],[k+39,-8]],'#f3e2b8');ctx.restore();
    }else{ctx.fillStyle='#b8aa8c';ctx.fillRect(-27,-32,54,32);ctx.fillStyle='#c5754f';ctx.fillRect(-27,-23,54,10);}
    ctx.restore();
  }
  const finish=600-distance;
  if(finish>=0&&finish<220){for(let i=0;i<12;i++)strip(finish,finish+2,-1+i/6,-1+(i+1)/6,i%2?'#eee4cb':'#18272c');}
  const dodge=driver.lane;
  const carX=550+dodge*496,carY=490+(!driver.reduced&&speed>1?Math.sin(t*35)*Math.min(speed/60,1)*1.2:0);
  // Peripheral streaks scale with speed; they never obscure the car or road.
  if(speed>12&&!driver.reduced){ctx.lineWidth=2;for(let i=0;i<30;i++){
    const progress=(distance*.11+i*.137)%1,side=i%2?1:-1;
    const y=190+progress*350,x=550+side*(125+progress*490);
    ctx.strokeStyle=`rgba(245,226,186,${Math.min(.4,(speed-12)/100)*progress})`;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*speed*(.9+progress),y+speed*.8);ctx.stroke();
  }}
  ctx.save();ctx.translate(carX,carY);ctx.rotate((driver.target-dodge)*.22);ctx.scale(1.08,1.08);
  ctx.fillStyle='#08131988';ctx.beginPath();ctx.ellipse(0,11,66,18,0,0,7);ctx.fill();
  ctx.fillStyle='#111b20';ctx.fillRect(-55,-31,16,49);ctx.fillRect(39,-31,16,49);
  poly([[-44,16],[-50,-27],[-34,-85],[30,-85],[49,-27],[44,16]],'#b9e66c');
  poly([[-31,-79],[27,-79],[35,-52],[-38,-52]],'#223d49');
  poly([[-38,-47],[35,-47],[41,-23],[-43,-23]],'#86a85b');
  ctx.fillStyle='#d7f796';ctx.fillRect(-45,-20,89,26);ctx.fillStyle='#52664b';ctx.fillRect(-47,9,93,8);
  ctx.fillStyle='#ff7970';ctx.fillRect(-42,-10,23,8);ctx.fillRect(18,-10,23,8);ctx.fillStyle='#263d37';ctx.fillRect(-17,-11,33,8);ctx.fillStyle='#ebe8ce';ctx.fillRect(-13,3,25,8);
  ctx.fillStyle='#2d3e36';ctx.fillRect(-50,-25,100,5);ctx.restore();
  ctx.fillStyle='#132428b8';ctx.fillRect(22,491,285,29);ctx.fillStyle='#c4f46f';ctx.font='bold 12px sans-serif';ctx.fillText(translate('PLAYER STEERING / AVOID BARRIERS'),33,510);
  if(message){ctx.fillStyle='#0b171b55';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#c4f46f';ctx.font='900 76px sans-serif';ctx.fillText(translate(message),550,300);ctx.textAlign='left';}
}
