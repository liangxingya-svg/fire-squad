(function(root){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function gateCount(n,op,v){return clamp(Math.floor(op==='×'?n*v:op==='÷'?n/v:n+v),0,9999)}
function levelEvents(level){
 const es=[],difficulty=1+(level-1)*.18;let id=0;
 const add=(type,z,x,more)=>es.push({id:id++,type,z,x,dead:false,...more});
 const gate=(z,left,right)=>{add('gate',z,-.53,{...left,width:.45});add('gate',z,.53,{...right,width:.45})};
 gate(18,{op:'+',value:12},{op:'+',value:6});
 add('enemy',34,0,{hp:36*difficulty,max:36*difficulty,count:10});
 gate(47,{op:'×',value:2},{op:'+',value:18});
 add('crate',61,level%2?-.55:.55,{hp:30*difficulty,max:30*difficulty,reward:'rapid'});
 add('enemy',74,.52,{hp:95*difficulty,max:95*difficulty,count:24});
 add('barrel',74,-.52,{hp:40*difficulty,max:40*difficulty});
 gate(89,{op:'+',value:-12,shootable:true,charge:0},{op:'×',value:2});
 add('enemy',104,-.55,{hp:125*difficulty,max:125*difficulty,count:32});
 add('crate',112,.53,{hp:55*difficulty,max:55*difficulty,reward:level%2?'spread':'power'});
 gate(128,{op:'+',value:25},{op:'+',value:-18,shootable:true,charge:0});
 add('enemy',144,0,{hp:200*difficulty,max:200*difficulty,count:48});
 gate(163,{op:'×',value:2},{op:'+',value:45});
 add('turret',177,level%2?-.5:.5,{hp:100*difficulty,max:100*difficulty,next:0});
 add('boss',198,0,{hp:950*difficulty,max:950*difficulty,next:2,phase:0});
 return es;
}
function create(level=1){return {level,status:'ready',time:0,progress:0,x:0,target:0,count:8,peak:8,power:1,rate:1,spread:1,kills:0,entities:levelEvents(level),bullets:[],attacks:[],effects:[],notices:[],shot:0,boss:false,bossTime:0,seed:0,combo:0}}
function note(s,text,color='blue'){s.notices.push({text,color,life:1.4});if(s.notices.length>5)s.notices.shift()}
function damageSquad(s,n){s.count=Math.max(0,s.count-Math.ceil(n));note(s,'−'+Math.ceil(n)+' 队员','red');s.effects.push({type:'hit',life:.3,x:s.x,z:s.progress});if(!s.count)s.status='lost'}
function reward(s,kind){if(kind==='rapid')s.rate=Math.min(3,s.rate+.4);if(kind==='spread')s.spread=Math.min(5,s.spread+1);if(kind==='power')s.power+=.5;note(s,{rapid:'射速提升',spread:'散射 +1',power:'伤害 +50%'}[kind],'gold')}
function kill(s,e){e.dead=true;s.effects.push({type:'boom',x:e.x,z:e.z,life:.55});
 if(e.type==='enemy'||e.type==='turret'){s.kills+=e.count||8;note(s,'击破 +'+(e.count||8),'gold')}
 if(e.type==='crate')reward(s,e.reward);
 if(e.type==='barrel'){note(s,'连锁爆破','gold');for(const other of s.entities){if(!other.dead&&other.id!==e.id&&['enemy','turret'].includes(other.type)&&Math.abs(other.z-e.z)<9){other.hp-=140*s.power;if(other.hp<=0)kill(s,other)}}}
 if(e.type==='boss'){s.kills+=100;s.status='won';note(s,'首领击破！','gold')}
}
function step(s,dt){if(s.status!=='running')return;s.time+=dt;s.x+=(s.target-s.x)*Math.min(1,dt*12);s.progress+=s.boss?0:4.1*dt;s.shot-=dt;
 if(s.shot<=0){s.shot=.26/s.rate;const lanes=Math.min(9,Math.ceil(s.count/6)+s.spread-1);for(let i=0;i<lanes;i++)s.bullets.push({x:clamp(s.x+(i-(lanes-1)/2)*.055*s.spread,-.96,.96),z:s.progress+1,damage:s.count*s.power/lanes*.24,life:3});}
 for(const b of s.bullets){const previous=b.z;b.z+=38*dt;b.life-=dt;
  for(const e of s.entities){if(e.dead||e.z<s.progress||b.z<e.z||previous>e.z+3)continue;const w=e.type==='gate'?.46:e.type==='boss'?.48:e.type==='enemy'?.31:.22;
   if(Math.abs(b.x-e.x)>w)continue;
   if(e.type==='gate'){if(!e.shootable)continue;e.charge+=b.damage;while(e.charge>=12){e.charge-=12;e.value=Math.min(60,e.value+1)}b.life=0;break}
   e.hp-=b.damage;b.life=0;s.effects.push({type:'spark',x:b.x,z:e.z,life:.16});if(e.hp<=0)kill(s,e);break;
  }
 }
 s.bullets=s.bullets.filter(b=>b.life>0&&b.z-s.progress<85);
 for(const e of s.entities){if(e.dead)continue;const d=e.z-s.progress;
  if(e.type==='boss'&&d<24){s.boss=true;s.progress=Math.min(s.progress,e.z-20);s.bossTime+=dt;e.x=Math.sin(s.bossTime*.5)*.55;e.next-=dt;if(e.next<=0){e.next=Math.max(1.25,2.8-s.level*.05);e.phase++;const lane=e.phase%3===0?s.x:[-.57,.57,0][e.phase%3];s.attacks.push({x:lane,z:s.progress,life:1.45,max:1.45,width:e.phase%3===0?.32:.4,damage:5+Math.floor(s.level/3)})}if(s.bossTime>38){s.rage=(s.rage||0)+dt;if(s.rage>=1){s.rage-=1;damageSquad(s,5)}}}
  if(e.type==='turret'&&d<32&&d>1){e.next-=dt;if(e.next<=0){e.next=2.7;s.attacks.push({x:e.x,z:s.progress,life:1.3,max:1.3,width:.2,damage:3})}}
  if(d<0){if(e.type==='gate'){const partner=s.entities.find(p=>p.type==='gate'&&p.z===e.z&&p.id!==e.id);if(!partner?.dead){const picked=Math.abs(s.x-e.x)<=Math.abs(s.x-(partner?.x||0))?e:partner;const before=s.count;s.count=gateCount(s.count,picked.op,picked.value);note(s,(picked.op==='+'&&picked.value<0?'':picked.op)+picked.value+' · '+s.count+' 人',s.count>=before?'blue':'red');e.dead=true;if(partner)partner.dead=true;if(!s.count)s.status='lost';}}
   else if(e.type==='enemy'||e.type==='turret'){if(Math.abs(s.x-e.x)<.52)damageSquad(s,Math.ceil(e.hp/9));else note(s,'避开敌阵','blue');e.dead=true}
   else if(e.type!=='boss'){e.dead=true;note(s,'补给错过','red')}
  }
 }
 for(const a of s.attacks){a.life-=dt;if(a.life<=0){if(Math.abs(s.x-a.x)<a.width)damageSquad(s,a.damage);s.effects.push({type:'blast',x:a.x,z:s.progress,life:.4});}}
 s.attacks=s.attacks.filter(a=>a.life>0);s.peak=Math.max(s.peak,s.count);
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);for(const n of s.notices)n.life-=dt;s.notices=s.notices.filter(n=>n.life>0);
 if(s.entities.find(e=>e.type==='boss').dead)s.status='won';
}
const api={create,step,gateCount,levelEvents,clamp};if(typeof module!=='undefined')module.exports=api;root.SquadEngine=api;
})(typeof window!=='undefined'?window:globalThis);
