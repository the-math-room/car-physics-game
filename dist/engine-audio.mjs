// Procedural four-cylinder exhaust pulses: two firing events per revolution.
// No downloaded recordings; pitch follows actual simulated engine RPM.
export class EngineAudio{
 constructor(){this.enabled=true;this.available=true;}
 async start(){
  try{
   if(!this.ctx){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unsupported');
    const c=this.ctx=new Audio(),master=this.master=c.createGain(),compress=c.createDynamicsCompressor();master.gain.value=0;master.connect(compress);compress.connect(c.destination);
    const real=new Float32Array(20),imag=new Float32Array(20);for(let i=1;i<20;i++)imag[i]=(i%2?1:.55)/Math.pow(i,.8);
    this.exhaust=c.createOscillator();this.exhaust.setPeriodicWave(c.createPeriodicWave(real,imag));
    this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=1400;this.exhaust.connect(this.filter);this.filter.connect(master);this.exhaust.start();
    this.sub=c.createOscillator();this.sub.type='triangle';const subGain=c.createGain();subGain.gain.value=.35;this.sub.connect(subGain);subGain.connect(master);this.sub.start();
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*7;}
    const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;this.air=c.createGain();this.air.gain.value=0;noise.connect(this.air);this.air.connect(master);noise.start();
   }
   await this.ctx.resume();
  }catch{this.available=false;}
 }
 update(rpm,speed,driving=true){if(!this.ctx||!this.available)return;const now=this.ctx.currentTime;this.exhaust.frequency.setTargetAtTime(Math.max(25,rpm/30),now,.035);this.sub.frequency.setTargetAtTime(Math.max(12,rpm/60),now,.04);this.filter.frequency.setTargetAtTime(500+rpm*.32,now,.05);this.air.gain.setTargetAtTime(Math.min(.8,speed/80),now,.1);this.master.gain.setTargetAtTime(this.enabled?(driving?.11:.035):0,now,.04);}
 stop(){if(this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.06);}
 crash(){if(!this.ctx||!this.enabled)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(90,c.currentTime);o.frequency.exponentialRampToValueAtTime(24,c.currentTime+.25);g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.3);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.3);}
}
