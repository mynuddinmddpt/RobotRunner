const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const menu=document.getElementById("menu");
const gameOverPanel=document.getElementById("gameOverPanel");
const gameOverDialogue=document.getElementById("gameOverDialogue");
const gameOverStats=document.getElementById("gameOverStats");
const restartButton=document.getElementById("restartButton");
const W=1200,H=700;
const PW=38,PH=52;
const gravity=.85;

const imgs={};
for(const n of ["TONMOY","APON","TAHMID","friends"]){
  const im=new Image(); im.src=`images/${n}.png`; imgs[n]=im;
}

let character="TONMOY";
let enemy1="APON", enemy2="TAHMID";
let left=false,right=false;
let state="menu",paused=false;
let player,platforms=[],coins=[],enemies=[],spikes=[],hazards=[];
let cameraX=0,nextGenerationX=0;
let distance=0,coinsCollected=0,health=3,highScore=Number(localStorage.getItem("robotRunnerHighScore")||0);
let jumpCount=0,frame=0,damageTimer=0,attackCooldown=0,attackFlash=0;
let roast="",roastTimer=0,nextRoast=180;
let deathReason="",killer="",revengeTarget="";
let revengeBonus=0, revengeKills=0, enemiesDefeated=0;

const roasts=[
"ওই ভাই, ঘুমাস নাকি?","কী রে বোকাচোদা, জাম্প করতে পারোস না?","ভাই, তোর স্কিল কই?","এই জাম্পটা কী ছিল?","নাইস জাম্প... ওই ওয়েট!","তোর বন্ধু তোর পিছনে!","বাঁচবি নাকি?","আরে ভাই, এটাও মিস করলি?","কী মার খাইতেছোস রে!","তোর দিন আজকে খারাপ!","বন্ধুরা তোর উপর হাসছে!","এই গেম তোর জন্য না!","তোর মাথায় কী চলে?","জাম্প কর, বোকাচোদা!","ওই, পিছনে তাকাস না!","তোর বন্ধু তোরে ধরতে আসতেছে!","কী রে, ভাগ!","আজকে তোর ইজ্জত শেষ!","তোর অবস্থা দেখে হাসি পাচ্ছে!","এত স্লো কেন রে?","তোর কি ঘুম পাচ্ছে?","এইবারও মার খা!","তোর বন্ধু তোরে ছেড়ে কোথাও যাবে না!","বাহ! দারুণ করলি... না, আসলে করলি না!","তোর মতো নুব কখনো দেখি নাই!","আরে চালাক হো!","তোর কপালে আজকে মার আছে!","ভাই, স্ক্রিনে আছোস তো?","তোর লাইফের মতো গেমও ডাউন!","ওই, জাম্প কর!","তোর পিছনে কে আসতেছে দেখ!"
];

function rects(a,b){
 return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
function difficulty(){return Math.min(10,distance/1500)}
function speed(){
 let bonus=character==="APON"?1.0:0;
 return Math.min(12,5+difficulty()*.5+bonus);
}
function maxHealth(){return character==="TAHMID"?4:3}
function maxJumps(){return character==="TONMOY"?3:2}
function jumpPower(){
 if(character==="TONMOY")return -18.5;
 if(character==="TAHMID")return -17;
 return -18;
}
function ability(){
 if(character==="TONMOY")return "ABILITY: Triple Jump";
 if(character==="APON")return "ABILITY: Speed Boost";
 return "ABILITY: 4 HP";
}

function chooseCharacter(c){
 character=c;
 const all=["TONMOY","APON","TAHMID"];
 const others=all.filter(x=>x!==c);
 enemy1=others[0]; enemy2=others[1];
 menu.style.display="none";
 startGame();
}
document.querySelectorAll(".characters button").forEach(b=>b.addEventListener("click",()=>chooseCharacter(b.dataset.character)));

function startGame(){
 gameOverPanel.classList.remove("show");
 gameOverPanel.setAttribute("aria-hidden","true");
 state="playing"; paused=false; frame=0; cameraX=0; distance=0; coinsCollected=0;
 health=maxHealth(); jumpCount=0; damageTimer=0; attackCooldown=0; attackFlash=0; jetCooldown=0; jetFlash=0;
 roastTimer=0; revengeBonus=0; revengeKills=0; enemiesDefeated=0; revengeTarget=""; killer=""; deathReason="";
 player={x:120,y:450,vx:0,vy:0,w:PW,h:PH};
 platforms=[];coins=[];enemies=[];spikes=[];hazards=[];nextGenerationX=0;
 createStartingWorld(); generateAhead();
}

function createStartingWorld(){
 platforms.push({x:0,y:610,w:420,h:35,type:"normal"});
 platforms.push({x:500,y:540,w:250,h:30,type:"normal"});
 platforms.push({x:830,y:600,w:330,h:35,type:"normal"});
 nextGenerationX=1160;
}

function generateAhead(){
 while(nextGenerationX<cameraX+2200){
   generateChunk(nextGenerationX);
   nextGenerationX+=320+Math.random()*220;
 }
}

function generateChunk(startX){
 const d=difficulty();
 const width=180+Math.random()*180;
 const y=400+Math.random()*190;
 const types=["normal","normal","moving","falling"];
 const type=types[Math.floor(Math.random()*types.length)];
 const p={x:startX,y,w:width,h:30,type,moveStartY:y,moveDistance:40+Math.random()*60,moveSpeed:.8+d*.1,moveTimer:0,triggered:false,fallVelocity:0};
 platforms.push(p);

 const count=3+Math.floor(Math.random()*4);
 for(let i=0;i<count;i++){
   const cx=startX+30+i*((width-60)/Math.max(1,count-1));
   coins.push({x:cx,y:y-45-(i%2)*25,w:24,h:24,a:Math.random()*6.28});
 }

 if(Math.random()<.35+d*.025){
   spikes.push({x:startX+width*.55,y:y-25,w:35+Math.random()*45,h:25});
 }
 if(Math.random()<.75 || distance<1500){
   const n=Math.random()<.5?enemy1:enemy2;
   const flying=Math.random()<.25;
   enemies.push({x:startX+width*.65,y:flying?y-120:y-42,w:flying?45:42,h:flying?32:42,
     sx:startX+width*.65,sy:flying?y-120:y-42,dir:Math.random()<.5?-1:1,patrol:100,type:flying?"flying":"ground",
     float:Math.random()*6.28,name:n});
 }
 if(Math.random()<.25+d*.04){
   hazards.push({x:startX+width*.8,y:y-110,sy:y-110,a:Math.random()*6.28,w:42,h:42});
 }
}

function update(){
 if(state!=="playing"||paused)return;
 frame++;
 const dt=1/60;
 if(damageTimer>0)damageTimer-=dt;
 if(attackCooldown>0)attackCooldown-=dt; if(jetCooldown>0)jetCooldown-=dt; if(jetFlash>0)jetFlash-=dt;
 if(attackFlash>0)attackFlash-=dt;
 if(roastTimer>0)roastTimer-=dt;

 updatePlatforms(); updateEnemies(); updateHazards();
 player.vx=speed()+(right?2.5:0)-(left?2:0);
 player.x+=player.vx; player.vy+=gravity; player.y+=player.vy;
 distance=Math.max(distance,player.x);
 checkPlatforms(); checkCoins(); checkSpikes(); checkEnemies(); checkHazards();
 if(player.y>H+150) damage("fall");
 cameraX=Math.max(0,cameraX+(player.x-300-cameraX)*.12);
 generateAhead();
 cleanup();

 if(roastTimer<=0 && frame>=nextRoast){
   roast=roasts[Math.floor(Math.random()*roasts.length)];
   roastTimer=2.5; nextRoast=frame+120+Math.floor(Math.random()*180);
 }
}

function updatePlatforms(){
 for(const p of platforms){
   if(p.type==="moving"){
     p.moveTimer+=.03;
     p.y=p.moveStartY+Math.sin(p.moveTimer)*p.moveDistance;
   }else if(p.type==="falling"&&p.triggered){
     p.fallVelocity+=.35;p.y+=p.fallVelocity;
   }
 }
}
function updateEnemies(){
 const d=difficulty();
 for(const e of enemies){
   if(e.name==="APON"){
     const dx=player.x-e.x;
     if(Math.abs(dx)<550)e.dir=dx>10?1:dx<-10?-1:e.dir;
     e.x+=e.dir*(Math.abs(dx)<550?1.8+d*.3:1.4);
   }else if(e.name==="TAHMID"){
     e.x+=e.dir*(2+d*.4);
   }else e.x+=e.dir*(1.5+d*.25);
   if(e.x<e.sx-e.patrol){e.x=e.sx-e.patrol;e.dir=1}
   if(e.x>e.sx+e.patrol){e.x=e.sx+e.patrol;e.dir=-1}
   if(e.type==="flying"){e.float+=.04+d*.005;e.y=e.sy+Math.sin(e.float)*35}
 }
}
function updateHazards(){
 for(const h of hazards){h.a+=.08;h.y=h.sy+Math.sin(h.a)*35;h.x-=.8}
}
function checkPlatforms(){
 if(player.vy<0)return;
 const current=player.y+player.h, previous=current-player.vy;
 for(const p of platforms){
   if(player.x+player.w>p.x&&player.x<p.x+p.w&&previous<=p.y&&current>=p.y){
     player.y=p.y-player.h;player.vy=0;jumpCount=0;
     if(p.type==="falling")p.triggered=true;
     return;
   }
 }
}
function checkCoins(){
 for(let i=coins.length-1;i>=0;i--)if(rects(player,coins[i])){
   coins.splice(i,1);coinsCollected++;
 }
}
function checkSpikes(){
 for(const s of spikes)if(rects(player,s)){damage("spike");return}
}
function checkEnemies(){
 for(const e of enemies)if(rects(player,e)){damage("enemy",e.name);return}
}
function checkHazards(){
 for(const h of hazards)if(rects(player,h)){damage("hazard");return}
}
function damage(reason,name=""){
 if(damageTimer>0)return;
 health--;damageTimer=1;player.vy=-8;deathReason=reason;killer=name;
 if(reason==="enemy"){roast=`${name} তোর বারোটা বাজাইছে!`;roastTimer=1.8}
 if(health<=0)endGame();
}
function endGame(){
 state="gameover";
 left=false; right=false;
 const score=scoreValue()+revengeBonus;
 if(score>highScore){highScore=score;localStorage.setItem("robotRunnerHighScore",highScore)}
 revengeTarget=killer||"";
 const dialogue = killer ? `${killer} তোরে ভইরা দিছে!` : deathReason==="spike" ? "কাঁটায় পড়ে তোর অবস্থা শেষ!" : deathReason==="fall" ? "নিচে পড়ে একেবারে শেষ!" : "ধাক্কা খেয়ে তোর বারোটা বাজছে!";
 gameOverDialogue.textContent=dialogue;
 gameOverStats.innerHTML=`SCORE ${score} &nbsp; • &nbsp; HIGH SCORE ${highScore}<br>COINS ${coinsCollected} &nbsp; • &nbsp; KILLS ${enemiesDefeated} &nbsp; • &nbsp; REVENGE ${revengeKills}`;
 gameOverPanel.classList.add("show");
 gameOverPanel.setAttribute("aria-hidden","false");
}
function scoreValue(){return Math.floor(distance/10)+coinsCollected*10}
function cleanup(){
 const del=cameraX-500;
 platforms=platforms.filter(p=>p.x+p.w>del);
 coins=coins.filter(c=>c.x+c.w>del);
 enemies=enemies.filter(e=>e.x+e.w>del);
 spikes=spikes.filter(s=>s.x+s.w>del);
 hazards=hazards.filter(h=>h.x+h.w>del);
}

function jump(){
 if(state!=="playing"||paused)return;
 if(jumpCount<maxJumps()){player.vy=jumpPower();jumpCount++}
}
function jetAttack(){
 if(state!=="playing"||paused||attackCooldown>0)return;
 attackCooldown=.10;attackFlash=.12;
 const hit={x:player.x+player.w,y:player.y+10,w:220,h:player.h-10};
 for(let i=enemies.length-1;i>=0;i--){
   if(rects(hit,enemies[i])){
     const defeated=enemies[i]; enemies.splice(i,1); revengeBonus+=100;
     if(defeated.name===revengeTarget) revengeBonus+=1000;
   }
 }
}
function attack(){
 if(state!=="playing"||paused||attackCooldown>0)return;
 attackCooldown=.45; attackFlash=.20;
 const hit={x:player.x-5,y:player.y-5,w:85,h:player.h+15};
 let defeated=null;
 for(const e of enemies){ if(rects(hit,e)){ defeated=e; break; } }
 if(defeated){
   const name=defeated.name; enemies=enemies.filter(e=>e!==defeated); enemiesDefeated++;
   let bonus=250;
   if(name===revengeTarget){ revengeKills++; revengeBonus+=1000; bonus+=1000; roast=`${name} কে মেরে খাইলি! প্রতিশোধ!`; roastTimer=2.5; }
   else { roast=`${name} কে ভইরা দিলাম!`; roastTimer=1.8; }
   distance+=bonus;
 } else { roast="হিট করলি... কিন্তু কেউ ছিল না!"; roastTimer=1.3; }
}
function jetAttack(){
 if(state!=="playing"||paused||jetCooldown>0)return;
 jetCooldown=.10; jetFlash=.12;
 const hit={x:player.x+player.w,y:player.y+15,w:220,h:player.h-10};
 let defeated=null;
 for(const e of enemies){ if(rects(hit,e)){ defeated=e; break; } }
 if(defeated){
   const name=defeated.name; enemies=enemies.filter(e=>e!==defeated); enemiesDefeated++;
   let bonus=400;
   if(name===revengeTarget){ revengeKills++; revengeBonus+=1000; bonus+=1000; }
   roast="আমার উপরে মুতা কাম ডা ঠিক করলি না!"; roastTimer=2.5; distance+=bonus;
 }
}
function togglePause(){
 if(state==="playing")paused=!paused;
}
function draw(){
 ctx.clearRect(0,0,W,H);
 drawBackground();
 ctx.save();ctx.translate(-cameraX,0);
 drawPlatforms();drawCoins();drawSpikes();drawEnemies();drawHazards();drawPlayer();drawAttack();
 ctx.restore();
 drawHUD();
 if(roastTimer>0)drawRoast();
 if(paused)drawOverlay("PAUSED","Press P to continue");

}

function drawBackground(){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,"#50b4f5");g.addColorStop(1,"#e5f5ff");
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(imgs.friends&&imgs.friends.complete&&imgs.friends.naturalWidth){const sc=Math.min(W/imgs.friends.width,420/imgs.friends.height);const fw=imgs.friends.width*sc,fh=imgs.friends.height*sc;ctx.globalAlpha=.5;ctx.drawImage(imgs.friends,(W-fw)/2,10,fw,fh);ctx.globalAlpha=1;}
 ctx.fillStyle="rgba(255,255,255,.55)";
 for(let i=0;i<8;i++){const x=(i*220-(cameraX*.15)%220);ctx.beginPath();ctx.arc(x,120+(i%3)*45,45,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle="#9bd18b";ctx.fillRect(0,610,W,90);
}
function drawPlatforms(){
 for(const p of platforms){
   ctx.fillStyle=p.type==="moving"?"#7d5fff":p.type==="falling"?"#b06a35":"#76502f";
   ctx.fillRect(p.x,p.y,p.w,p.h);
   ctx.fillStyle="#4caf50";ctx.fillRect(p.x,p.y,p.w,7);
 }
}
function drawCoins(){
 for(const c of coins){
   ctx.save();ctx.translate(c.x+12,c.y+12);ctx.rotate(c.a+frame*.05);
   ctx.fillStyle="#ffd54a";ctx.beginPath();ctx.ellipse(0,0,10,12,0,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle="#c98f00";ctx.stroke();ctx.restore();
 }
}
function drawSpikes(){
 for(const s of spikes){
   ctx.fillStyle="#555";const count=Math.max(2,Math.floor(s.w/18));
   for(let i=0;i<count;i++){const x=s.x+i*s.w/count;ctx.beginPath();ctx.moveTo(x,s.y+s.h);ctx.lineTo(x+s.w/count/2,s.y);ctx.lineTo(x+s.w/count,s.y+s.h);ctx.fill()}
 }
}
function drawEnemies(){
 for(const e of enemies){
   const im=imgs[e.name];
   if(im&&im.complete&&im.naturalWidth){
     const w=e.type==="flying"?60:58, h=e.type==="flying"?75:70;
     ctx.drawImage(im,e.x-8,e.y-(e.type==="flying"?15:10),w,h);
   }
   ctx.fillStyle="#111";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(e.name,e.x+e.w/2,e.y-45);
 }
}
function drawHazards(){
 for(const h of hazards){
   ctx.save();ctx.translate(h.x+h.w/2,h.y+h.h/2);ctx.rotate(h.a);
   ctx.fillStyle="#ff7a00";ctx.beginPath();
   for(let i=0;i<8;i++){const a=i*Math.PI/4;const r=i%2?14:25;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   ctx.closePath();ctx.fill();ctx.restore();
 }
}
function drawPlayer(){
 if(damageTimer>0 && frame%6<3)return;
 const im=imgs[character];
 if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,player.x-10,player.y-15,58,80);
 else{ctx.fillStyle="#2196f3";ctx.fillRect(player.x,player.y,player.w,player.h)}
 ctx.fillStyle="#111";ctx.font="bold 12px Arial";ctx.textAlign="center";ctx.fillText(character,player.x+player.w/2,player.y-45);
}
function drawAttack(){
 if(attackFlash>0){ctx.fillStyle="rgba(255,255,255,.75)";ctx.fillRect(player.x-5,player.y+10,85,24);}
 if(jetFlash>0){const sx=player.x+player.w, sy=player.y+player.h/2;ctx.strokeStyle="lightblue";ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+220,sy);ctx.stroke();ctx.strokeStyle="white";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+220,sy);ctx.stroke();}
}
function drawHUD(){
 ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillRect(10,10,280,220);
 ctx.fillStyle="#111";ctx.font="bold 16px Arial";ctx.textAlign="left";
 const lines=[
   `PLAYER: ${character}`,`SCORE: ${scoreValue()+revengeBonus}`,
   `COINS: ${coinsCollected}`,`DISTANCE: ${Math.floor(distance/10)}m`,
   `HIGH SCORE: ${highScore}`,`SPEED: ${speed().toFixed(1)}`,ability(),
   `ENEMIES: ${enemy1} + ${enemy2}`,`KILLS: ${enemiesDefeated}`,`REVENGE: ${revengeKills} (+${revengeBonus})`
 ];
 lines.forEach((t,i)=>ctx.fillText(t,20,35+i*23));
 for(let i=0;i<maxHealth();i++)drawHeart(1035+i*35,20,24,i<health?"#e53935":"#ccc");
 ctx.font="bold 12px Arial";ctx.fillStyle="rgba(0,0,0,.65)";
 ctx.fillText("A/D or ←/→ Move · SPACE Jump · F Attack · P Pause",20,H-18);
}
function drawHeart(x,y,s,color){
 ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(x+s/2,y+s);ctx.bezierCurveTo(x-5,y+s*.55,x,y+s*.2,x+s*.25,y+s*.25);
 ctx.bezierCurveTo(x+s*.4,y+s*.25,x+s*.5,y+s*.4,x+s*.5,y+s*.4);
 ctx.bezierCurveTo(x+s*.5,y+s*.4,x+s*.6,y+s*.25,x+s*.75,y+s*.25);
 ctx.bezierCurveTo(x+s,y+s*.2,x+s+5,y+s*.55,x+s/2,y+s);ctx.fill();
}
function drawRoast(){
 ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(100,245,W-200,60);
 ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.textAlign="center";ctx.fillText(roast,W/2,282);
}
function drawOverlay(title,sub){
 ctx.fillStyle="rgba(0,0,0,.65)";ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="bold 56px Arial";ctx.fillText(title,W/2,300);
 ctx.font="24px Arial";ctx.fillText(sub,W/2,345);
}
function drawGameOver(){
 drawOverlay("GAME OVER",`${deathReason==="enemy"?killer+" got you":deathReason==="spike"?"You hit the spikes":deathReason==="fall"?"You fell":"You hit a hazard"} · Press R or tap Jump to restart`);
 ctx.font="bold 24px Arial";ctx.fillText(`Score: ${scoreValue()+revengeBonus} · High Score: ${highScore}`,W/2,405);
}

function key(e,down){
 if(["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code))e.preventDefault();
 if(e.code==="KeyA"||e.code==="ArrowLeft")left=down;
 if(e.code==="KeyD"||e.code==="ArrowRight")right=down;
 if(down&&["KeyW","ArrowUp"].includes(e.code))jump();
 if(down&&e.code==="Space")jetAttack();
 if(down&&e.code==="KeyF")attack();
 if(down&&e.code==="KeyP")togglePause();
 if(down&&e.code==="KeyR"&&state==="gameover")startGame();
}
window.addEventListener("keydown",e=>key(e,true));
window.addEventListener("keyup",e=>key(e,false));

restartButton.addEventListener("pointerdown", e=>{
 e.preventDefault();
 startGame();
});
restartButton.addEventListener("click", e=>{
 e.preventDefault();
 startGame();
});

document.querySelectorAll("#mobileControls button").forEach(b=>{
 const k=b.dataset.key;
 const down=e=>{e.preventDefault();if(k==="left")left=true;if(k==="right")right=true;if(k==="jump")jump();if(k==="jet")jetAttack();if(k==="attack")attack()};
 const up=e=>{e.preventDefault();if(k==="left")left=false;if(k==="right")right=false};
 b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);
});

function loop(){update();draw();requestAnimationFrame(loop)}
startGame();
state="menu";
loop();
