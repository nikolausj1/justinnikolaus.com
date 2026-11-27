import {PRIZES, buildPrize} from './catalog.js';
import {bindMovementControls} from './movement-controls.js';
// Adapted from Clawtastrophe, Trevor Riggle. Private family prototype.
// Retains original pendulum, kinematic head, hinged prongs, torque servos,
// compound-body narrowphase optimization, mesh merge and camera behavior.
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const B=window.ClawBridge;
if(!window.THREE||!window.CANNON)throw Error('The 3D engine failed to load.');
let ENDED=false,DETONATED=false;
let S={money:100,stock:120,vol:{music:.5,sfx:.8},stick:'screen',proj:'ortho'};
Object.assign(S,B.settings());
function persist(){B.saveSettings({vol:S.vol,stick:S.stick,proj:S.proj})}
function tickWallet(){}
let turnId=null,wonObjects=new Set(),visible=true,failed=false;
let AC=null,master,sfxBus,musicBus,motorGain,motorOsc,muted=false,nextNote=0,noteI=0,track='arcade',sirenOn=false;
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=muted?0:.6;master.connect(AC.destination);
    sfxBus=AC.createGain();sfxBus.gain.value=S.vol.sfx;sfxBus.connect(master);musicBus=AC.createGain();musicBus.gain.value=S.vol.music*.55;musicBus.connect(master);
    motorOsc=AC.createOscillator();motorOsc.type='sawtooth';motorOsc.frequency.value=70;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=360;
    motorGain=AC.createGain();motorGain.gain.value=0;motorOsc.connect(lp).connect(motorGain).connect(sfxBus);motorOsc.start()}catch(e){AC=null}
}
function setVol(kind,v){S.vol[kind]=v;persist();if(!AC)return;if(kind==='sfx')sfxBus.gain.setTargetAtTime(v,AC.currentTime,.03);else musicBus.gain.setTargetAtTime(v*.55,AC.currentTime,.03)}
function tone(f,d,type='square',v=.12,f2=null,delay=0,bus){if(!AC)return;const t=AC.currentTime+Math.max(0,delay),o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(bus||sfxBus);o.start(t);o.stop(t+d+.03)}
function noise(d,v=.2,freq=2000,delay=0,bus,type='bandpass'){if(!AC)return;const t=AC.currentTime+Math.max(0,delay),n=Math.floor(AC.sampleRate*d),b=AC.createBuffer(1,n,AC.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;f.type=type;f.frequency.value=freq;g.gain.value=v;s.connect(f).connect(g).connect(bus||sfxBus);s.start(t)}
// soft electric-piano voice for the lounge: sine + octave shimmer with a fast decay
function keys_(f,d,v,delay){tone(f,d,'sine',v,null,delay,musicBus);tone(f*2,d*.5,'sine',v*.25,null,delay,musicBus)}
const midi=n=>440*Math.pow(2,(n-69)/12);
const sfx={
  coin(){tone(1320,.07,'square',.1);tone(1980,.3,'square',.09,null,.07)},
  clack(){noise(.07,.35,3200);tone(200,.09,'square',.08,90)},
  clunk(){noise(.12,.3,500);tone(90,.15,'sine',.25,50)},
  tick(){tone(1100,.04,'square',.06)},
  fail(){tone(392,.18,'triangle',.12);tone(330,.18,'triangle',.12,null,.18);tone(262,.5,'triangle',.12,200,.36)},
  win(v){const seq=v==='golden'||v==='prize'?[60,64,67,72,76,79,84,88]:v==='shiny'?[60,64,67,72,76,79]:[60,64,67,72,76];seq.forEach((n,i)=>{tone(midi(n+12),.16,'square',.06,null,i*.075);tone(midi(n),.2,'triangle',.1,null,i*.075)});tone(midi(seq[seq.length-1]+12),.7,'square',.05,null,seq.length*.075)},
  card(){noise(.05,.25,5000)},
  chip(){tone(2400,.03,'square',.05);noise(.04,.15,4000,.01)},
  cash(){[0,.06,.12].forEach((d,i)=>tone(1500+i*400,.08,'square',.06,null,d))},
  thud(){tone(120,.1,'sine',.2,60)},
  glass(){tone(2600,.05,'sine',.08);tone(1900,.12,'sine',.05,null,.02);noise(.04,.12,6000)},
  pop(){tone(900,.08,'sine',.1,300);noise(.05,.1,3000)},
  boom(){noise(2.2,1.2,120,0,null,'lowpass');noise(1.2,.6,900);tone(70,1.6,'sine',.6,25);for(let i=0;i<14;i++)tone(rnd(1800,4200),rnd(.05,.2),'sine',.07,null,rnd(.05,1.2))},
  squeak(){const f=rnd(900,1600);tone(f,.12,'sine',.08,f*1.6)}
};
const ARC=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]];
const LOUNGE=[[62,65,69,72],[55,59,62,65],[60,64,67,71],[57,61,64,67]];  // Dm7 G7 Cmaj7 A7
setInterval(()=>{
  if(!AC)return;
  if(nextNote<AC.currentTime)nextNote=AC.currentTime+.05;
  while(nextNote<AC.currentTime+.3){
    const dl=nextNote-AC.currentTime;
    if(sirenOn){const hi=noteI%2;tone(hi?960:640,.38,'sawtooth',.09,hi?640:960,dl,musicBus);nextNote+=.4;noteI++;continue}
    if(track==='arcade'){const step=60/132/2,bar=Math.floor(noteI/8)%4,s=noteI%8,ch=ARC[bar];
      if(s%2===0)tone(midi(ch[0]-24+(s===4?12:0)),.22,'triangle',.11,null,dl,musicBus);
      const arp=[0,1,2,1,2,0,1,2][s];if(s!==3&&s!==7)tone(midi(ch[arp]+12),.1,'square',.03,null,dl,musicBus);
      if(noteI%32>=16&&s%4===0)tone(midi(ch[2]+24),.28,'square',.02,null,dl,musicBus);
      if(s%2)noise(.03,.05,8000,dl,musicBus);
      nextNote+=step}
    else{const beat=60/92,sw=noteI%2?beat*.36:beat*.64,bar=Math.floor(noteI/8)%4,s=noteI%8,ch=LOUNGE[bar];
      if(s%2===0){const walk=[0,4,7,9][s/2];tone(midi(ch[0]-24+walk),.4,'triangle',.13,null,dl,musicBus)}
      if(s===0||s===5)ch.forEach((n,i)=>keys_(midi(n),1.1,.035,dl+i*.012));
      if(s===3&&Math.random()<.6)keys_(midi(ch[3]+12),.5,.03,dl);
      noise(.06,s%2?.025:.04,7000,dl,musicBus);
      nextNote+=sw}
    noteI++;
  }
},60);

/* ================= textures ================= */
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep)}t.anisotropy=4;return t}
const furTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=200+Math.random()*55|0;g.strokeStyle=`rgb(${v},${v},${v})`;g.lineWidth=1;const x=Math.random()*w,y=Math.random()*h,a=Math.random()*6.28;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*3,y+Math.sin(a)*3);g.stroke()}},2);
const foamTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#ff9cc0';g.fillRect(0,0,w,h);for(let i=0;i<1400;i++){g.fillStyle=Math.random()<.5?'rgba(160,40,90,.25)':'rgba(255,255,255,.25)';g.beginPath();g.arc(Math.random()*w,Math.random()*h,Math.random()*2.2,0,7);g.fill()}},3);
const carpetTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#1d0f2e';g.fillRect(0,0,w,h);const cols=['#ff4f8b','#3fd0ff','#ffd24a','#7ff0b0','#a46bff'];
  for(let i=0;i<46;i++){g.save();g.translate(Math.random()*w,Math.random()*h);g.rotate(Math.random()*6.28);g.strokeStyle=g.fillStyle=pick(cols);g.lineWidth=3;g.globalAlpha=.55;const k=i%4;
    if(k===0){g.beginPath();g.moveTo(-10,0);g.bezierCurveTo(-4,-10,4,10,10,0);g.stroke()}else if(k===1){g.beginPath();g.moveTo(0,-8);g.lineTo(8,6);g.lineTo(-8,6);g.closePath();g.stroke()}else if(k===2){g.beginPath();g.arc(0,0,5,0,7);g.stroke()}else{g.fillRect(-2,-2,4,4)}g.restore()}},14);
function signTex(text,sub,bg,fg){return canvasTex(512,160,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='#ffe6b0';g.lineWidth=8;g.strokeRect(10,10,w-20,h-20);g.fillStyle=fg;g.textAlign='center';g.shadowColor=fg;g.shadowBlur=18;let fs=64;g.font=fs+'px Bungee, Impact, sans-serif';while(g.measureText(text).width>w-60&&fs>20){fs-=2;g.font=fs+'px Bungee, Impact, sans-serif'}g.fillText(text,w/2,92);g.shadowBlur=0;let ss=30;g.font=ss+'px VT323, monospace';while(g.measureText(sub).width>w-50&&ss>14){ss-=1;g.font=ss+'px VT323, monospace'}g.fillStyle='#ffe6b0';g.fillText(sub,w/2,134)})}

/* ================= three setup ================= */
const stage=$('stage'),canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#150b20');
const camO=new THREE.OrthographicCamera(-1,1,1,-1,.1,140),camP=new THREE.PerspectiveCamera(30,1,.1,200);
let cam=S.proj==='persp'?camP:camO;
const VIEW=9.5,BASE_T=new THREE.Vector3(0,1.15,0),camTarget=BASE_T.clone(),tmpT=new THREE.Vector3();
const CV={az:Math.PI/4,el:.6,zoom:1,azT:Math.PI/4,elT:.6,zoomT:1,azV:0,focus:'claw'};
const focusT=BASE_T.clone();
const EL_MIN=.03,EL_MAX=1.52;
function resize(){const w=stage.clientWidth||600,h=stage.clientHeight||600;renderer.setSize(w,h,false);const a=w/h;let vh=VIEW;if(a<1)vh=VIEW/a;
  camO.left=-vh*a/2;camO.right=vh*a/2;camO.top=vh/2;camO.bottom=-vh/2;camO.updateProjectionMatrix();camP.aspect=a;camP.fov=a<1?30/Math.max(.6,a):30;camP.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);resize();

scene.add(new THREE.HemisphereLight('#ffe9f5','#3a2050',.62));
const key=new THREE.DirectionalLight('#fff4e0',.95);key.position.set(.2,14,.3);key.target.position.set(0,0,0);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2.6,right:2.6,top:2.6,bottom:-2.6,near:1,far:20});key.shadow.bias=-.0006;
scene.add(key,key.target);
const fill=new THREE.DirectionalLight('#a9d8ff',.38);fill.position.set(-6,5,-4);scene.add(fill);
const rim=new THREE.DirectionalLight('#ff9ac4',.3);rim.position.set(6,3,6);scene.add(rim);
const pinkP=new THREE.PointLight('#ff4f9a',.55,9);pinkP.position.set(1.8,3.9,1.8);scene.add(pinkP);
const cyanP=new THREE.PointLight('#3fd0ff',.45,9);cyanP.position.set(-1.8,3.9,-1.8);scene.add(cyanP);

const M={
  enamel:new THREE.MeshStandardMaterial({color:'#6951d8',roughness:.45,metalness:.1}),
  enamelDark:new THREE.MeshStandardMaterial({color:'#34256e',roughness:.5}),
  trim:new THREE.MeshStandardMaterial({color:'#ffe6b0',roughness:.5}),
  chrome:new THREE.MeshStandardMaterial({color:'#e6ecf4',roughness:.22,metalness:.55}),
  dark:new THREE.MeshStandardMaterial({color:'#07030a',roughness:1}),
  foam:new THREE.MeshStandardMaterial({color:'#f5a0c0',map:foamTex,roughness:1}),
  glass:new THREE.MeshStandardMaterial({color:'#cfe8ff',transparent:true,opacity:.07,roughness:.05,depthWrite:false,side:THREE.DoubleSide}),
  acrylic:new THREE.MeshStandardMaterial({color:'#cfe8ff',transparent:true,opacity:.22,roughness:.05,depthWrite:false}),
  ledPink:new THREE.MeshBasicMaterial({color:'#ff5aa5'}),
  ledAmber:new THREE.MeshBasicMaterial({color:'#ffb13d'}),
  rubber:new THREE.MeshStandardMaterial({color:'#6951d8',roughness:.8}),
  rope:new THREE.MeshStandardMaterial({color:'#2a2630',roughness:.6}),
  carpet:new THREE.MeshStandardMaterial({color:'#ffffff',map:carpetTex,roughness:1})
};
function box(w,h,d,mat,x,y,z,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m}
const P=2, GY=4.35, FLOORY=0;
// arcade carpet + cabinet (everything added between CAB0 and CAB1 blows up in the ending)
const carpet=new THREE.Mesh(new THREE.PlaneGeometry(60,60),M.carpet);carpet.rotation.x=-Math.PI/2;carpet.position.y=-2.45;carpet.receiveShadow=true;scene.add(carpet);
const CAB0=scene.children.length;
// Split the body around the return bay: the old solid box hid the chute.
box(3.25,2.25,4.5,M.enamel,.625,-1.32,0);
box(1.25,2.25,3.22,M.enamel,-1.625,-1.32,-.64);
box(.25,2.25,1.28,M.enamel,-2.125,-1.32,1.61);
box(3.31,.12,4.62,M.trim,.655,-.26,0);box(1.31,.12,3.31,M.trim,-1.655,-.26,-.655);box(4.62,.1,4.62,M.enamelDark,0,-2.4,0);
// signs on base faces
let signMats=[];
function makeSigns(){
  signMats.forEach(m=>m.map&&m.map.dispose());
  const a=new THREE.MeshBasicMaterial({map:signTex('CLAW CLUB','PICK A TOY · MAKE IT YOURS','#2c0f22','#ff6aa8')});
  const b=new THREE.MeshBasicMaterial({map:signTex('$1 A TRY','MATH → PLAYS → PRIZES','#140a1e','#7ff0b0')});
  signMats=[a,b];return[a,b];
}
const [sA,sB]=makeSigns();
const signZ=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.81),sA);signZ.position.set(.55,-1.05,2.252);scene.add(signZ);
const signX=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.81),sB);signX.position.set(2.252,-1.05,0);signX.rotation.y=Math.PI/2;scene.add(signX);
const signZ2=signZ.clone();signZ2.position.set(0,-1.05,-2.252);signZ2.rotation.y=Math.PI;scene.add(signZ2);
const signX2=signX.clone();signX2.position.set(-2.252,-1.05,0);signX2.rotation.y=-Math.PI/2;scene.add(signX2);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{const[a,b]=makeSigns();signZ.material=a;signZ2.material=a;signX.material=b;signX2.material=b});
// prize door (front, under chute)
// Open hatch, continuous dark shaft and a lit tray. No opaque door or cap.
box(1.04,.07,.1,M.chrome,-1.5,-.55,2.28,false);
box(1.04,.07,.1,M.chrome,-1.5,-1.95,2.28,false);
box(.07,1.45,.1,M.chrome,-2,-1.25,2.28,false);
box(.07,1.45,.1,M.chrome,-1,-1.25,2.28,false);
box(.96,.06,1.18,M.dark,-1.5,-1.92,1.61,false);
box(.04,1.75,1.16,M.dark,-1.99,-1.06,1.57,false);
box(.04,1.75,1.16,M.dark,-1.01,-1.06,1.57,false);
box(1,1.75,.04,M.dark,-1.5,-1.06,1.01,false);
box(.8,.035,.9,M.chrome,-1.5,-1.86,1.7,false);
const bayLight=new THREE.PointLight('#fff2cc',1.2,2.5);bayLight.position.set(-1.5,-.9,2.1);scene.add(bayLight);
const doorLbl=new THREE.Mesh(new THREE.PlaneGeometry(.8,.2),new THREE.MeshBasicMaterial({map:canvasTex(256,64,(g)=>{g.fillStyle='#07030a';g.fillRect(0,0,256,64);g.fillStyle='#ffb13d';g.font='44px VT323, monospace';g.textAlign='center';g.fillText('▼ PUSH ▼',128,46)})}));
doorLbl.position.set(-1.5,-2.14,2.3);scene.add(doorLbl);
// pit floor with chute hole
box(3,.2,4,M.foam,.5,-.1,0,false);box(1,.2,3,M.foam,-1.5,-.1,-.5,false);
// The hole stays open all the way down to the retrieval tray.
for(const [w,d,x,z] of [[1,.03,-1.5,1.02],[.03,1,-1.02,1.5]]){const m=box(w,.12,d,M.dark,x,-.08,z,false)}
// Two recessed panels hinge down along the outer edges of the prize opening.
const trapDoors=[-1,1].map(side=>{
 const pivot=new THREE.Group();pivot.position.set(-1.5+side*.48,.015,1.5);
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.465,.045,.92),M.enamelDark);
 panel.position.x=-side*.237;panel.castShadow=panel.receiveShadow=true;pivot.add(panel);
 const stripe=new THREE.Mesh(new THREE.BoxGeometry(.018,.004,.84),M.ledAmber);
 stripe.position.set(-side*.454,.025,0);pivot.add(stripe);
 const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.84,12),M.chrome);
 hinge.rotation.x=Math.PI/2;pivot.add(hinge);scene.add(pivot);
 return {side,pivot,angle:0,body:null};
});
let trapHold=0;
// chute barriers (acrylic) + LED edges
box(.05,.9,1,M.acrylic,-1,.45,1.5,false);box(1,.9,.05,M.acrylic,-1.5,.45,1,false);
box(.06,.03,1.02,M.ledAmber,-1,.91,1.5,false);box(1.02,.03,.06,M.ledAmber,-1.5,.91,1);
const chuteLbl=new THREE.Mesh(new THREE.PlaneGeometry(.8,.24),new THREE.MeshBasicMaterial({transparent:true,map:canvasTex(256,76,(g)=>{g.fillStyle='rgba(0,0,0,.0)';g.clearRect(0,0,256,76);g.fillStyle='#ffb13d';g.shadowColor='#ffb13d';g.shadowBlur=12;g.font='56px VT323, monospace';g.textAlign='center';g.fillText('PRIZE',128,54)})}));
chuteLbl.position.set(-1.5,.55,1.03);scene.add(chuteLbl);
const chuteLbl2=chuteLbl.clone();chuteLbl2.position.set(-1.03,.55,1.5);chuteLbl2.rotation.y=Math.PI/2;scene.add(chuteLbl2);
// glass walls, posts, top frame
for(const [x,z,ry] of [[0,P,0],[0,-P,0],[P,0,Math.PI/2],[-P,0,Math.PI/2]]){const g=new THREE.Mesh(new THREE.PlaneGeometry(4,GY+.3),M.glass);g.position.set(x,(GY+.3)/2-.1,z);g.rotation.y=ry;g.renderOrder=5;scene.add(g)}
for(const [x,z] of [[P,P],[P,-P],[-P,P],[-P,-P]]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,GY+.6,12),M.chrome);c.position.set(x,(GY+.6)/2-.3,z);c.castShadow=false;scene.add(c)}
for(const [w,d,x,z] of [[4.16,.14,0,P],[4.16,.14,0,-P],[.14,4.16,P,0],[.14,4.16,-P,0]]){box(w,.16,d,M.enamel,x,GY+.34,z,false);box(w*.98||.04,.025,d*.98||.04,M.ledPink,x,GY+.25,z,false)}
// gantry
box(4,.07,.07,M.chrome,0,GY+.14,1.92,false);box(4,.07,.07,M.chrome,0,GY+.14,-1.92,false);
const bridge=box(.1,.07,3.9,M.chrome,0,GY+.07,0,false);
const carriage=box(.34,.16,.34,M.enamel,0,GY-.02,0,false);
const carLed=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),new THREE.MeshBasicMaterial({color:'#7ff0b0'}));scene.add(carLed);
const rope=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,1,6),M.rope);scene.add(rope);
const CAB1=scene.children.length;

// Faster narrowphase for compound bodies: stock cannon 0.6.2 re-transforms every shape for every shape pair.
// Here each body's shape centers are cached once per step, and only pairs whose bounding spheres overlap get full treatment.
(function(){
  const NP=CANNON.Narrowphase.prototype,qi=new CANNON.Quaternion(),qj=new CANNON.Quaternion(),xi=new CANNON.Vec3(),xj=new CANNON.Vec3(),t=new CANNON.Vec3();
  function cache(b,step){if(b._cs===step)return b._cx;const n=b.shapes.length;let a=b._cx;if(!a||a.length!==n*4)a=b._cx=new Float64Array(n*4);
    for(let i=0;i<n;i++){b.quaternion.vmult(b.shapeOffsets[i],t);a[i*4]=t.x+b.position.x;a[i*4+1]=t.y+b.position.y;a[i*4+2]=t.z+b.position.z;a[i*4+3]=b.shapes[i].boundingSphereRadius}
    b._cs=step;return a}
  NP.getContacts=function(p1,p2,world,result,oldcontacts,frictionResult,frictionPool){
    this.contactPointPool=oldcontacts;this.frictionEquationPool=frictionPool;this.result=result;this.frictionResult=frictionResult;
    const step=world.stepnumber;
    for(let k=0,N=p1.length;k!==N;k++){
      const bi=p1[k],bj=p2[k];let bcm=null;if(bi.material&&bj.material)bcm=world.getContactMaterial(bi.material,bj.material)||null;
      const ai=cache(bi,step),aj=cache(bj,step),ni=bi.shapes.length,nj=bj.shapes.length;
      for(let i=0;i<ni;i++){const ix=ai[i*4],iy=ai[i*4+1],iz=ai[i*4+2],ir=ai[i*4+3];
        for(let j=0;j<nj;j++){const dx=aj[j*4]-ix,dy=aj[j*4+1]-iy,dz=aj[j*4+2]-iz,rr=ir+aj[j*4+3];if(dx*dx+dy*dy+dz*dz>rr*rr)continue;
          const si=bi.shapes[i],sj=bj.shapes[j];
          bi.quaternion.mult(bi.shapeOrientations[i],qi);bj.quaternion.mult(bj.shapeOrientations[j],qj);xi.set(ix,iy,iz);xj.set(aj[j*4],aj[j*4+1],aj[j*4+2]);
          let scm=null;if(si.material&&sj.material)scm=world.getContactMaterial(si.material,sj.material)||null;
          this.currentContactMaterial=scm||bcm||world.defaultContactMaterial;
          const res=this[si.type|sj.type];if(res){if(si.type<sj.type)res.call(this,si,sj,xi,xj,qi,qj,bi,bj,si,sj);else res.call(this,sj,si,xj,xi,qj,qi,bj,bi,si,sj)}
        }}
    }
  };
})();
const G=15;
const world=new CANNON.World();world.gravity.set(0,-G,0);world.broadphase=new CANNON.SAPBroadphase(world);
world.solver.iterations=14;world.allowSleep=true;
const mGlass=new CANNON.Material('glass'),mStatic=new CANNON.Material('static'),mPlush=new CANNON.Material('plush'),mClaw=new CANNON.Material('claw');
world.addContactMaterial(new CANNON.ContactMaterial(mPlush,mPlush,{friction:.55,restitution:.02}));
world.addContactMaterial(new CANNON.ContactMaterial(mPlush,mStatic,{friction:.45,restitution:.02}));
world.addContactMaterial(new CANNON.ContactMaterial(mPlush,mClaw,{friction:1,restitution:0}));
world.addContactMaterial(new CANNON.ContactMaterial(mClaw,mStatic,{friction:.3,restitution:0}));
world.addContactMaterial(new CANNON.ContactMaterial(mPlush,mGlass,{friction:.02,restitution:.05}));  // glass is slick: nothing props itself up on a wall
world.addContactMaterial(new CANNON.ContactMaterial(mClaw,mGlass,{friction:.02,restitution:0}));
const GS=1,GPL=2,GCL=4;
function staticBox(hx,hy,hz,x,y,z,mat=mStatic){const b=new CANNON.Body({mass:0,material:mat});b.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));b.position.set(x,y,z);b.collisionFilterGroup=GS;b.collisionFilterMask=GPL|GCL;world.addBody(b);return b}
staticBox(1.5,.1,2,.5,-.1,0).stop=true;staticBox(.5,.1,1.5,-1.5,-.1,-.5).stop=true;
staticBox(.5,3,3,P+.5,3,0,mGlass);staticBox(.5,3,3,-P-.5,3,0,mGlass);staticBox(3,3,.5,0,3,P+.5,mGlass);staticBox(3,3,.5,0,3,-P-.5,mGlass);
staticBox(.025,.45,.5,-1,.45,1.5).stop=true;staticBox(.5,.45,.025,-1.5,.45,1).stop=true;

for(const door of trapDoors){
 const body=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,material:mStatic});
 body.addShape(new CANNON.Box(new CANNON.Vec3(.2325,.0225,.46)));
 body.collisionFilterGroup=GS;body.collisionFilterMask=GPL;world.addBody(body);door.body=body;
 body.position.set(-1.5+door.side*.243,.015,1.5);
}
function updateTrapDoors(dt){
 const approaching=plushes.some(p=>inChute(p.body.position.x,p.body.position.z)&&p.body.position.y<1.45&&p.body.position.y>-.5);
 if(['lower','release','rise'].includes(C.state)||approaching||returnedPrizes.some(p=>p.body.position.y>-.95))trapHold=1.2;
 else trapHold=Math.max(0,trapHold-dt);
 const target=trapHold>0?Math.PI/2:0;
 for(const door of trapDoors){
  const before=door.angle;door.angle+=clamp(target-before,-dt*2.8,dt*4.5);
  const angle=door.side*door.angle,offset=-door.side*.237;
  const x=door.pivot.position.x+Math.cos(angle)*offset,y=.015+Math.sin(angle)*offset;
  door.body.velocity.set(0,0,0);
  door.body.position.set(x,y,1.5);door.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,0,1),angle);
  door.body.angularVelocity.set(0,0,0);door.body.aabbNeedsUpdate=true;
  // Once clear, remove contact so small toys cannot snag on the hinge edge.
  door.body.collisionFilterMask=door.angle>.65?0:GPL;
  door.pivot.rotation.z=angle;
 }
}

/* ================= plush catalogue ================= */
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const Bl=(r,x,y,z,col,o={})=>({t:'ball',r,p:V(x,y,z),col,...o});
const Cp=(r,a,b,col,r2,o={})=>({t:'cap',r1:r,r2:r2==null?r:r2,a:V(...a),b:V(...b),col,...o});
const El=(s,p,col,o={})=>({t:'ell',s:V(...s),p:V(...p),col,...o});
const Hi=(r,x,y,z)=>({t:'hit',r,p:V(x,y,z)});
const Ey=(p,d,r=.04)=>({t:'eye',p:V(...p),d:V(...d).normalize(),r});
const Co=(r,h,p,col,rot=[0,0,0])=>({t:'cone',r,h,p:V(...p),col,rot});
const To=(R,tb,p,col,sy=1)=>({t:'tor',R,tb,p:V(...p),col,sy});
function eyesOn(c,r,d,spread,er=.04){const dd=V(...d).normalize(),out=[];for(const s of[-1,1]){const cs=Math.cos(s*spread),sn=Math.sin(s*spread);const v=V(dd.x*cs+dd.z*sn,dd.y,-dd.x*sn+dd.z*cs).normalize();out.push({t:'eye',p:V(...c).addScaledVector(v,r*.95),d:v,r:er})}return out}
const S2=[-1,1];

const Bx=(s,p,col,rot=[0,0,0],o={})=>({t:'box',s:V(...s),p:V(...p),col,rot,phys:false,...o});
const tools={V,Hi,Bl,El,Cp,Bx,Co,Ey};
const ITEMS=Object.fromEntries(PRIZES.map(p=>[p.id,{...p,w:p.weight,mass:p.tricky?.45:.3,scale:1.9,build:()=>buildPrize(p.id,tools)}]));
const KIND_KEYS=Object.keys(ITEMS),ITEM_SCALE=1.9;

const sphereGeo=new THREE.SphereGeometry(1,24,18),sphereLo=new THREE.SphereGeometry(1,9,7);
const geoFor=r=>r<.06?sphereLo:sphereGeo;
const matCache={};
function furMat(col){return matCache[col]||(matCache[col]=new THREE.MeshStandardMaterial({color:col,map:furTex,roughness:.95}))}
const goldMat=new THREE.MeshStandardMaterial({color:'#ffcf3f',roughness:.3,metalness:.7,emissive:'#6a4400',emissiveIntensity:.5});
const eyeMat=new THREE.MeshStandardMaterial({color:'#15101c',roughness:.15,metalness:.1});
const glintMat=new THREE.MeshBasicMaterial({color:'#ffffff'});
const UP=new THREE.Vector3(0,1,0);
let plushes=[],uid=0;

// Visual detail stays separate from the catalogue's explicit collision spheres.
// Every accent is nonphysical and shares cached materials after mesh merging.
function prizeMat(kind,col){
  const key=`${kind}:${col}`;
  if(matCache[key])return matCache[key];
  const metal=kind==='snitch'||kind==='gold-card';
  const soft=['hat','dumpling','angry-dumpling','capybara-burger','avocado','pineapple'].includes(kind);
  return matCache[key]=new THREE.MeshStandardMaterial({color:col,map:soft?furTex:null,
    side:THREE.DoubleSide,roughness:metal?.28:soft?.85:kind==='football'?.68:.36,metalness:metal?.72:0,
    ...(kind==='duck-green'?{emissive:col,emissiveIntensity:.16}:{})});
}
const surfaceCache={};
function surfaceMat(kind){
 if(surfaceCache[kind])return surfaceCache[kind];
 const texture=canvasTex(1024,kind==='gold-card'?1536:512,(g,w,h)=>{
  if(kind==='gold-card'){
   const gold=g.createLinearGradient(0,0,w,h);gold.addColorStop(0,'#FFF7AA');gold.addColorStop(.25,'#FFE345');gold.addColorStop(.5,'#FFF08A');gold.addColorStop(1,'#DFAE13');g.fillStyle=gold;g.fillRect(0,0,w,h);
   g.strokeStyle='#A6750B';g.lineWidth=14;g.strokeRect(30,30,w-60,h-60);
   g.fillStyle='#463318';g.font='bold 76px sans-serif';g.fillText('PIKACHU',70,145);g.font='bold 42px sans-serif';g.fillText('HP 120',740,140);
   g.fillStyle='#FFEAA0';g.fillRect(80,210,864,810);
   // Painted illustration, entirely within the card's flat face.
   const oval=(x,y,rx,ry,c)=>{g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()};
   const poly=(points,c)=>{g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()};
   poly([[655,775],[855,670],[778,600],[895,450],[845,410],[709,575],[758,630],[633,670]],'#D89B0D');
   oval(495,770,150,182,'#F6C923');oval(495,532,180,155,'#FFDB2D');
   poly([[371,448],[300,254],[358,243],[436,429]],'#FFDB2D');poly([[300,254],[319,305],[375,290],[358,243]],'#24262B');
   poly([[561,419],[659,255],[702,291],[634,463]],'#FFDB2D');poly([[659,255],[631,302],[681,329],[702,291]],'#24262B');
   oval(429,510,20,27,'#20242B');oval(559,510,20,27,'#20242B');oval(435,501,7,9,'#FFFFFF');oval(565,501,7,9,'#FFFFFF');
   oval(363,579,30,26,'#ED593C');oval(627,579,30,26,'#ED593C');poly([[484,549],[504,549],[494,564]],'#28252B');
   g.strokeStyle='#563925';g.lineWidth=8;g.beginPath();g.moveTo(464,588);g.quadraticCurveTo(480,612,495,590);g.quadraticCurveTo(516,612,530,588);g.stroke();
   oval(381,796,42,88,'#FFDB2D');oval(606,796,42,88,'#FFDB2D');oval(425,935,57,28,'#FFDB2D');oval(570,935,57,28,'#FFDB2D');
   g.fillStyle='#463318';g.font='bold 48px sans-serif';g.fillText('Thunder Spark',100,1140);g.fillText('60',832,1140);g.font='30px sans-serif';g.fillText('A bright little bolt of collectible joy.',100,1208);
   for(let i=0;i<3;i++){g.fillStyle='#BC8618';g.fillRect(100,1280+i*42,700-i*95,9)}
  }else{
   const image=g.createImageData(w,h),phi=(1+Math.sqrt(5))/2,normals=[];
   for(const a of [-1,1])for(const b of [-1,1])normals.push(V(0,a,b*phi).normalize(),V(a,b*phi,0).normalize(),V(b*phi,0,a).normalize());
   const panels=normals.map(n=>{const u=V(0,0,0).crossVectors(n,Math.abs(n.y)<.9?UP:V(1,0,0)).normalize();return {n,u,v:V(0,0,0).crossVectors(n,u).normalize()}});
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const t=y/h*Math.PI,f=x/w*Math.PI*2,n=V(-Math.cos(f)*Math.sin(t),Math.cos(t),Math.sin(f)*Math.sin(t));let color;
    if(kind==='soccer'){
     let black=false;for(const p of panels){const d=n.dot(p.n);if(d<.88)continue;const px=n.dot(p.u)/d,py=n.dot(p.v)/d;let inside=true;
      for(let i=0;i<5;i++){const a=(i+.5)*Math.PI*2/5;if(px*Math.cos(a)+py*Math.sin(a)>.29){inside=false;break}}if(inside){black=true;break}}
     color=black?[32,42,53]:[247,250,252];
    }else{const band=Math.abs(n.x);const grain=((x*17+y*31)%11)-5;color=band>.58&&band<.75?[105,190,40]:[112+grain,75+grain,51+grain]}
    const i=(y*w+x)*4;image.data.set([...color,255],i);
   }g.putImageData(image,0,0);
  }
 });texture.encoding=THREE.sRGBEncoding;
 return surfaceCache[kind]=new THREE.MeshStandardMaterial({map:texture,roughness:kind==='gold-card'?.38:.64,metalness:kind==='gold-card'?.25:0,side:THREE.DoubleSide});
}
function detailPrize(kind,source){
  let parts=source.slice();const no={phys:false};
  const sculpt=(vertices,triangles,c)=>{
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(triangles);geo.computeVertexNormals();
    parts.push({t:'geo',geo,mat:prizeMat(kind,c),p:V(0,0,0),rot:[0,0,0],phys:false});
  };
  // A tapered feather has a raised spine, a curved tip, and a real silhouette.
  const feather=(a,b,width,c)=>{
    const axis=V(...b).sub(V(...a)),perp=V(-axis.z,0,axis.x).normalize().multiplyScalar(width),vertices=[],indices=[];
    for(let i=0;i<=5;i++){const t=i/5,center=V(...a).addScaledVector(axis,t);center.y+=Math.sin(t*Math.PI)*.009;
      const w=Math.sin(t*Math.PI)*.85+(i===0?.16:0);
      for(const side of [-1,0,1]){const q=center.clone().addScaledVector(perp,side*w);q.y+=side===0?.003:0;vertices.push(q.x,q.y,q.z)}
    }
    for(let i=0;i<5;i++)for(let j=0;j<2;j++){const k=i*3+j;indices.push(k,k+1,k+3,k+1,k+4,k+3)}
    sculpt(vertices,indices,c);
  };
  const ball=(r,p,c)=>parts.push(Bl(r,...p,c,no));
  const ell=(s,p,c)=>parts.push(El(s,p,c,no));
  const line=(r,a,b,c)=>parts.push(Cp(r,a,b,c,r,no));
  const box=(s,p,c,rot=[0,0,0])=>parts.push(Bx(s,p,c,rot,no));
  const ring=(r,t,p,c,sy=1,rot=[0,0,0])=>parts.push({...To(r,t,p,c,sy),rot,phys:false});
  if(kind.startsWith('duck-')){
    // Sculpted wing feathers, bill separation, nostrils, and curled tail.
    const c=source[0].col;
    for(const side of [-1,1])for(let i=0;i<3;i++)line(.006,[side*.146,.09+i*.014,-.032],[side*.147,.1+i*.013,.038],c);
    line(.004,[-.052,.177,.216],[.052,.177,.216],'#D87823');
    for(const x of [-.021,.021])ball(.004,[x,.203,.209],'#A85D23');
    ell([.04,.03,.062],[0,.137,-.132],c);
    if(kind==='duck-yellow')ell([.035,.009,.027],[0,.273,.102],'#FFF18A');
    if(kind==='duck-rainbow')for(let i=0;i<6;i++)ell([.009,.018,.012],[-.062+i*.025,.267,.12],['#FF7474','#FFAE54','#FFD55B','#7DEBA6','#79C9FF','#B89AFF'][i]);
    if(kind==='duck-galaxy')for(let i=0;i<16;i++){const a=i*2.4;ball(.0035,[Math.sin(a)*.11,.125+Math.cos(a)*.035,Math.cos(a)*.12],'#FCF3BF')}
    if(kind==='duck-ninja'){box([.10,.075,.019],[0,.195,.161],'#171B30');for(const side of [-1,1])line(.008,[.083,.24,.065],[.13,.2+side*.02,-.055],'#FF637D')}
    if(kind==='duck-seahawks'){box([.064,.025,.017],[0,.107,.153],'#69BE28');box([.018,.035,.018],[0,.108,.157],'#EAF6FF');box([.034,.008,.019],[0,.12,.159],'#EAF6FF')}
    if(kind==='duck-green')for(const side of [-1,1])ell([.02,.013,.005],[side*.059,.212,.164],'#D8FF89');
  }else switch(kind){
    case 'snitch':
      parts=parts.filter(p=>p.t!=='ell');
      for(const side of [-1,1]){
        for(let i=0;i<10;i++)feather([side*(.084+i*.012),.145,-.018],[side*(.16+i*.019),.158+i*.003,.038+i*.004],.012,i%2?'#FFF4BB':'#F0DB91');
        line(.008,[side*.082,.147,-.02],[side*.325,.176,-.012],'#D4A748');
      }
      for(const y of [.08,.12,.16])ring(Math.sqrt(.105**2-(y-.12)**2),.003,[0,y,0],'#B78224');
      for(const side of [-1,1])for(let i=0;i<5;i++)line(.0018,[side*(.1+i*.04),.153,-.014],[side*(.13+i*.04),.17,.044],'#B78224');
      break;
    case 'wand':case 'hat': break;
    case 'dumpling':case 'angry-dumpling':
      for(let i=-3;i<=3;i++){const a=i*.32;line(.003,[Math.sin(a)*.12,.16,Math.cos(a)*.065],[Math.sin(a)*.127,.12,Math.cos(a)*.087],'#E9CEA8')}
      for(const side of [-1,1])ell([.022,.01,.006],[side*.082,.086,.108],'#EE9E91');
      for(let i=-2;i<=2;i++)line(.0025,[i*.027,.173,.054],[i*.035,.13,.083],'#D8B692');
      break;
    case 'soccer':
      parts=source.filter(p=>p.t==='hit'||(p.t==='ball'&&p.col==='#F8FCFF'));
      parts.find(p=>p.t==='ball').mat=surfaceMat('soccer');break;
    case 'football':
      parts=source.filter(p=>p.t==='hit'||(p.t==='ell'&&p.col==='#69493A')||p.t==='box');
      parts.find(p=>p.t==='ell').mat=surfaceMat('football');break;
    case 'switch':
      // A tiny illustrated game scene, recessed between the two controllers.
      box([.185,.002,.004],[0,.068,.045],'#D8FAF0');
      for(let i=0;i<3;i++)box([.01,.002,.003],[-.085+i*.016,.069,.052],'#F4F8F2');
      box([.017,.002,.021],[-.034,.069,-.009],'#FAFCFF');box([.023,.002,.008],[-.034,.069,.007],'#D15A54');
      for(let i=0;i<3;i++)ell([.006,.002,.006],[.014+i*.025,.069,-.025],'#FFF0AA');
      for(const side of [-1,1])for(let i=0;i<4;i++)box([.008,.001,.001],[side*.119,.06,.065+i*.006],'#202945');
      box([.19,.002,.102],[0,.064,0],'#14274B');box([.065,.003,.06],[-.055,.066,-.01],'#7DDDA6');box([.065,.003,.06],[.025,.066,-.01],'#FFCF5E');
      for(const [x,z]of [[.166,-.04],[.15,-.02],[.182,-.02],[.166,0],[-.166,.023],[-.181,.038],[-.151,.038],[-.166,.053]])ell([.006,.004,.006],[x,.071,z],'#202945');
      for(const side of [-1,1])box([.017,.005,.003],[side*.167,.07,-.074],'#F4F8F2');
      break;
    case 'gold-card': {
      parts=source.filter(p=>p.t==='hit');
      box([.21,.022,.30],[0,.025,0],'#FFE34A');
      const geo=new THREE.PlaneGeometry(.20,.29);geo.rotateX(-Math.PI/2);
      parts.push({t:'geo',geo,mat:surfaceMat('gold-card'),p:V(0,.0365,0),rot:[0,0,0],phys:false});break;}
    case 'drone':
      for(const side of [-1,1]){line(.004,[side*.037,.077,.031],[side*.056,.11,.018],'#41BCD9');for(let i=0;i<3;i++)box([.025,.002,.003],[side*.039,.11,-.015+i*.009],'#23324D');ball(.006,[side*.058,.079,.04],side<0?'#FF637D':'#69BE28')}
      for(const [x,z]of [[-.12,-.11],[-.12,.11],[.12,-.11],[.12,.11]]){ring(.06,.004,[x,.083,z],'#41BCD9');ball(.011,[x,.095,z],'#DBF6FF');line(.005,[x,.055,z],[x,.015,z],'#23324D')}
      ell([.025,.018,.014],[0,.062,.065],'#23324D');ball(.011,[0,.065,.079],'#62CFEF');
      break;
    case 'pineapple':
      for(const side of [-1,1])for(let i=0;i<3;i++)line(.002,[side*.048,.385+i*.018,.022],[side*(.058+i*.012),.421+i*.015,.014],'#246C43');
      for(const side of [-1,1])line(.005,[side*.10,.266,.091],[side*.122,.267,.04],'#18223C');
      for(let row=0;row<5;row++)for(let col=0;col<5;col++){const x=(col-2)*.04+(row%2)*.018,y=.11+row*.042;if(Math.abs(x)>.095)continue;const z=.1*Math.sqrt(Math.max(0,1-(x/.13)**2-((y-.22)/.16)**2));line(.0025,[x-.012,y-.013,z+.003],[x+.012,y+.013,z+.003],'#D69B32');line(.0025,[x-.012,y+.013,z+.003],[x+.012,y-.013,z+.003],'#D69B32')}
      break;
    case 'avocado':case 'toilet':case 'capybara-burger': break;
  }
  return parts;
}

function makePlush(kind,variant){
  const K=ITEMS[kind],parts=detailPrize(kind,K.build());
  const sph=[];
  for(const p of parts){
    if(p.phys===false)continue;
    if(p.t==='ball'||p.t==='hit')sph.push([p.r,p.p.clone()]);
    else if(p.t==='cap'){const L=p.a.distanceTo(p.b),sp=Math.max(Math.min(p.r1,p.r2)*1.35,.09),n=Math.max(1,Math.ceil(L/sp));for(let i=0;i<=n;i++){const u=i/n;sph.push([p.r1+(p.r2-p.r1)*u,p.a.clone().lerp(p.b,u)])}}
  }
  const SC=K.scale||ITEM_SCALE;for(const q of sph){q[0]*=SC;q[1].multiplyScalar(SC)}
  let com=V(0,0,0),vol=0;for(const[r,pos]of sph){const w=r*r*r;com.addScaledVector(pos,w);vol+=w}com.divideScalar(vol);
  const mass=K.mass;
  const body=new CANNON.Body({mass,material:mPlush,linearDamping:.08,angularDamping:.35});
  if(kind==='gold-card')body.addShape(new CANNON.Box(new CANNON.Vec3(.105*SC,.011*SC,.15*SC)),new CANNON.Vec3(-com.x,.025*SC-com.y,-com.z));
  else for(const[r,pos]of sph)body.addShape(new CANNON.Sphere(r),new CANNON.Vec3(pos.x-com.x,pos.y-com.y,pos.z-com.z));
  body.collisionFilterGroup=GPL;body.collisionFilterMask=GS|GPL|GCL;body.sleepSpeedLimit=.22;body.sleepTimeLimit=.5;
  const group=new THREE.Group(),inner=new THREE.Group();group.add(inner);
  const matOf=col=>prizeMat(kind,col);
  for(const p of parts){let m;const mat=p.mat?(()=>p.mat):matOf;
    if(p.t==='ball'){m=new THREE.Mesh(geoFor(p.r),mat(p.col));m.scale.setScalar(p.r);m.position.copy(p.p)}
    else if(p.t==='ell'){m=new THREE.Mesh(sphereGeo,mat(p.col));m.scale.copy(p.s);m.position.copy(p.p)}
    else if(p.t==='cap'){const L=p.a.distanceTo(p.b),g=new THREE.Group();const cy=new THREE.Mesh(new THREE.CylinderGeometry(p.r2,p.r1,L,p.r1<.05?8:12,1,true),mat(p.col));
      cy.position.copy(p.a).lerp(p.b,.5);cy.quaternion.setFromUnitVectors(UP,p.b.clone().sub(p.a).normalize());
      const e1=new THREE.Mesh(geoFor(p.r1),mat(p.col));e1.scale.setScalar(p.r1);e1.position.copy(p.a);const e2=new THREE.Mesh(geoFor(p.r2),mat(p.col));e2.scale.setScalar(p.r2);e2.position.copy(p.b);
      [cy,e1,e2].forEach(x=>{x.castShadow=true;x.receiveShadow=true;g.add(x)});inner.add(g);continue}
    else if(p.t==='box'){m=new THREE.Mesh(new THREE.BoxGeometry(p.s.x,p.s.y,p.s.z),mat(p.col));m.position.copy(p.p);m.rotation.set(...p.rot)}
    else if(p.t==='cone'){m=new THREE.Mesh(new THREE.ConeGeometry(p.r,p.h,14),mat(p.col));m.position.copy(p.p);m.rotation.set(...p.rot)}
    else if(p.t==='surface'){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.vertices,3));g.setIndex(p.indices);g.computeVertexNormals();m=new THREE.Mesh(g,mat(p.col));m.position.copy(p.p||V(0,0,0));m.rotation.set(...(p.rot||[0,0,0]))}
    else if(p.t==='geo'){m=new THREE.Mesh(p.geo,p.mat);m.position.copy(p.p);m.rotation.set(...p.rot)}
    else if(p.t==='tor'){const g=new THREE.TorusGeometry(p.R,p.tb,14,32);g.rotateX(Math.PI/2);m=new THREE.Mesh(g,mat(p.col));m.position.copy(p.p);m.scale.y=p.sy;if(p.rot)m.rotation.set(...p.rot)}
    else if(p.t==='eye'){const e=new THREE.Mesh(sphereLo,eyeMat);e.scale.setScalar(p.r);e.position.copy(p.p);inner.add(e);
      const gl=new THREE.Mesh(sphereLo,glintMat);gl.scale.setScalar(p.r*.32);gl.position.copy(p.p).addScaledVector(p.d,p.r*.72).add(V(0,p.r*.35,0));inner.add(gl);continue}
    else continue;
    m.castShadow=true;m.receiveShadow=true;inner.add(m);
  }
  const merged=mergeGroup(inner);merged.scale.setScalar(SC);merged.position.copy(com).multiplyScalar(-1);group.remove(inner);group.add(merged);
  return{id:++uid,kind,name:K.name,body,group,dot:K.dot};
}
// collapse a plush into one mesh per material: 90 plush stay at a few hundred draw calls
function mergeGroup(root){
  root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),by=new Map();
  const out=new THREE.Group();
  root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));
    if(Array.isArray(o.material)){const m=new THREE.Mesh(g,o.material);m.castShadow=m.receiveShadow=true;out.add(m);return}
    if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(g)});
  for(const[mat,gs]of by){let n=0;gs.forEach(g=>n+=g.attributes.position.count);const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
    for(const g of gs){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);o+=g.attributes.position.count;g.dispose()}
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(pos,3));bg.setAttribute('normal',new THREE.BufferAttribute(nor,3));bg.setAttribute('uv',new THREE.BufferAttribute(uv,2));bg.computeBoundingSphere();
    const m=new THREE.Mesh(bg,mat);m.castShadow=mat!==eyeMat&&mat!==glintMat;m.receiveShadow=true;out.add(m)}
  return out;
}

function pickKind(){let total=PRIZES.reduce((s,p)=>s+p.weight,0),r=Math.random()*total;for(const p of PRIZES){r-=p.weight;if(r<=0)return p.id}return 'duck-yellow'}
function spawnPlush(x,y,z,kind){
  kind=kind||pickKind();
  const p=makePlush(kind);
  p.body.computeAABB();const reach=Math.max(p.body.aabb.upperBound.x-p.body.aabb.lowerBound.x,p.body.aabb.upperBound.z-p.body.aabb.lowerBound.z)/2+.04;
  const lim=Math.max(.2,P-reach);x=clamp(x,-lim,lim);z=clamp(z,-lim,lim);
  p.body.position.set(x,y,z);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-.5,.5),rnd(0,6.28),rnd(-.5,.5)));p.body.quaternion.set(q.x,q.y,q.z,q.w);
  world.addBody(p.body);scene.add(p.group);plushes.push(p);return p;
}
function removePlush(p){world.removeBody(p.body);scene.remove(p.group);p.group.traverse(o=>{if(o.isMesh)o.geometry.dispose()});plushes=plushes.filter(q=>q!==p);wakeNear(p.body.position.x,p.body.position.z,1.3)}
function wakeNear(x,z,r){for(const q of plushes)if(q.body.sleepState===CANNON.Body.SLEEPING&&Math.hypot(q.body.position.x-x,q.body.position.z-z)<r)q.body.wakeUp()}
function spawnSpot(m=1.72){let x,z,k=0;do{x=rnd(-m,m);z=rnd(-m,m);k++}while(k<40&&((x<-.85&&z>.85)||Math.hypot(x-C.tx,z-C.tz)<.7));return[x,z]}
const inChute=(x,z)=>x<-1&&z>1;

/* ================= claw ================= */
const L0=.7,LMAX=GY-.6-.02,HOME={x:-1.5,z:1.5},BOUND=1.72;
const head=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC,material:mClaw});
head.addShape(new CANNON.Sphere(.15),new CANNON.Vec3(0,.02,0));head.collisionFilterGroup=GCL;head.collisionFilterMask=GPL;head.allowSleep=false;
head.position.set(HOME.x,GY-L0,HOME.z);world.addBody(head);
const PR_PTS=[[.03,-.13],[.055,-.26],[.06,-.38],[.03,-.48],[-.04,-.55]];
const OPEN=.78,CLOSED=-.2;
const prongs=[0,1,2].map(i=>{
  const phi=Math.PI/2+i*Math.PI*2/3,r=new CANNON.Vec3(Math.cos(phi),0,Math.sin(phi)),t=new CANNON.Vec3(-Math.sin(phi),0,Math.cos(phi));
  const b=new CANNON.Body({mass:.22,material:mClaw,angularDamping:.4,linearDamping:.05});
  PR_PTS.forEach(([u,y],k)=>b.addShape(new CANNON.Sphere(k===PR_PTS.length-1?.045:.038),new CANNON.Vec3(r.x*u,y,r.z*u)));
  b.collisionFilterGroup=GCL;b.collisionFilterMask=GS|GPL;b.allowSleep=false;
  b.inertia.set(.028,.028,.028);b.invInertia.set(1/.028,1/.028,1/.028);b.updateInertiaWorld(true);
  const piv=new CANNON.Vec3(r.x*.12,-.08,r.z*.12);
  b.position.set(head.position.x+piv.x,head.position.y+piv.y,head.position.z+piv.z);b.quaternion.setFromAxisAngle(t,OPEN);
  world.addBody(b);
  const hc=new CANNON.HingeConstraint(head,b,{pivotA:piv,axisA:t,pivotB:new CANNON.Vec3(0,0,0),axisB:t,maxForce:1e6});world.addConstraint(hc);
  // visual
  const g=new THREE.Group();const pts=[[0,0],...PR_PTS].map(([u,y])=>V(r.x*u,y,r.z*u));
  for(let k=0;k<pts.length-1;k++){const a=pts[k],c=pts[k+1],L=a.distanceTo(c);const cy=new THREE.Mesh(new THREE.CylinderGeometry(.03,.034,L,10),M.chrome);cy.position.copy(a).lerp(c,.5);cy.quaternion.setFromUnitVectors(UP,c.clone().sub(a).normalize());cy.castShadow=true;g.add(cy);
    const j=new THREE.Mesh(sphereGeo,M.chrome);j.scale.setScalar(.034);j.position.copy(c);j.castShadow=true;g.add(j)}
  const tip=new THREE.Mesh(sphereGeo,M.rubber);tip.scale.setScalar(.046);tip.position.copy(pts[pts.length-1]);tip.castShadow=true;g.add(tip);
  scene.add(g);
  return{body:b,r,t,g,theta:OPEN};
});
const headG=new THREE.Group();
{const hb=new THREE.Mesh(new THREE.CylinderGeometry(.14,.17,.24,20),M.chrome);hb.castShadow=true;headG.add(hb);
 const cap=new THREE.Mesh(new THREE.CylinderGeometry(.06,.1,.1,14),M.enamel);cap.position.y=.17;cap.castShadow=true;headG.add(cap);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.02,8,24),M.enamelDark);ring.rotation.x=Math.PI/2;ring.position.y=-.1;headG.add(ring);
 const led=new THREE.Mesh(sphereGeo,new THREE.MeshBasicMaterial({color:'#5a1a22'}));led.scale.setScalar(.03);led.position.set(0,.02,.16);headG.add(led);headG.userData.led=led;
 const led2=led.clone();led2.material=led.material;led2.position.set(0,.02,-.16);headG.add(led2);
 const led3=led.clone();led3.position.set(.16,.02,0);headG.add(led3);const led4=led.clone();led4.position.set(-.16,.02,0);headG.add(led4);}
scene.add(headG);

const C={tx:HOME.x,tz:HOME.z,vx:0,vz:0,L:L0,Lv:0,ax:0,az:0,wx:0,wz:0,state:'idle',st:0,torque:0,Vp:0,Vc:0,strong:false,prongTouchT:0,lastPos:new CANNON.Vec3(HOME.x,GY-L0,HOME.z),lastQ:new CANNON.Quaternion(),timer:30,lastTick:99,held:0,wins:0,liftFrom:0};
const TMAX=7.5;
const keys={up:false,down:false,left:false,right:false};
const touchMove={x:0,y:0};
let movementControls;
const v1=new CANNON.Vec3(),v2=new CANNON.Vec3(),qc=new CANNON.Quaternion(),aw=new CANNON.Vec3(),DOWN=new CANNON.Vec3(0,-1,0),qT=new CANNON.Quaternion(),dirV=new CANNON.Vec3();

function setState(s){if(s!=='ready')clearKeys();C.state=s;C.st=0;B.onTurnState(s);if(s==='lift'){liftReveal=true;emptyReveal=false}else if(s==='ready'){liftReveal=false;emptyReveal=false}}
const CHUTE_Y=1.72;
function heldCount(){return plushes.filter(p=>p.body.position.y>head.position.y-1.1&&p.body.position.y<head.position.y+.2&&Math.hypot(p.body.position.x-head.position.x,p.body.position.z-head.position.z)<.7).length}
// Stick frame. Screen mode: up = into the screen at the current orbit angle.
// Machine mode: snapped to the gantry's two motor axes, with hysteresis so a 45-degree view doesn't flicker.
// Either way the frame latches the moment a direction is pressed and holds until every direction is released.
const stick={latched:false,az:0,snap:Math.PI/2*Math.round(Math.PI/4/(Math.PI/2))};
const angDiff=(a,b)=>{let d=(a-b)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
function liveStickAz(){if(S.stick==='machine'){if(Math.abs(angDiff(CV.az,stick.snap))>Math.PI/4+.14)stick.snap=Math.PI/2*Math.round(CV.az/(Math.PI/2));return stick.snap}return CV.az}
function stickAz(){return stick.latched?stick.az:liveStickAz()}
function prongAngle(pr){pr.body.quaternion.vmult(DOWN,v1);head.quaternion.conjugate(qc);qc.vmult(v1,v2);return Math.atan2(v2.x*pr.r.x+v2.z*pr.r.z,-v2.y)}
function voltsNow(){const s=C.state;if(s==='close'||s==='settle')return C.Vp;if(s==='lift'){const k=clamp((C.liftFrom-C.L)/Math.max(.01,C.liftFrom-L0),0,1);return k<.55?C.Vp:C.Vp+(C.Vc-C.Vp)*clamp((k-.55)/.3,0,1)}if(s==='bump')return C.strong?C.Vc:Math.round(C.Vc*(C.st<.14?.3:1));if(s==='carry'||s==='lower')return C.Vc;return 0}

function clawStep(dt){
  C.st+=dt;
  const cd=dt;
  // stick -> world, relative to camera
  let jx=(keys.right?1:0)-(keys.left?1:0)+touchMove.x,jy=(keys.up?1:0)-(keys.down?1:0)-touchMove.y;
  if(jx||jy){if(!stick.latched){stick.latched=true;stick.az=liveStickAz()}}else stick.latched=false;
  const saz=stickAz(),rx=Math.cos(saz),rz=-Math.sin(saz),fx=-Math.sin(saz),fz=-Math.cos(saz);
  let tvx=0,tvz=0;
  if(C.state==='ready'){const n=Math.max(1,Math.hypot(jx,jy));tvx=(rx*jx+fx*jy)/n*1.7;tvz=(rz*jx+fz*jy)/n*1.7}
  if(C.state==='carry'&&C.st>.25){const dx=HOME.x-C.tx,dz=HOME.z-C.tz,d=Math.hypot(dx,dz);const sp=Math.min(1.4,d*2.2);if(d>1e-4){tvx=dx/d*sp;tvz=dz/d*sp}}
  const pvx=C.vx,pvz=C.vz,A=(C.state==='carry'?3:5)*cd;
  C.vx+=clamp(tvx-C.vx,-A,A);C.vz+=clamp(tvz-C.vz,-A,A);
  C.tx+=C.vx*cd;C.tz+=C.vz*cd;
  if(C.tx<-BOUND){C.tx=-BOUND;C.vx=0}if(C.tx>BOUND){C.tx=BOUND;C.vx=0}if(C.tz<-BOUND){C.tz=-BOUND;C.vz=0}if(C.tz>BOUND){C.tz=BOUND;C.vz=0}
  const accx=(C.vx-pvx)/cd,accz=(C.vz-pvz)/cd;
  // cable length
  C.Lv=C.state==='drop'?2.2:(C.state==='lift'&&C.st>.2)?-1.5:C.state==='lower'?1.5:C.state==='rise'&&C.st>.1?-1.9:0;
  C.L=clamp(C.L+C.Lv*cd,L0,LMAX);if(C.L===L0&&C.Lv<0)C.Lv=0;
  // pendulum on the cable (Coriolis term makes lengthening damp the swing, like the real thing)
  const L=C.L;
  C.wx+=(-(G/L)*Math.sin(C.ax)-(accx/L)*Math.cos(C.ax)-2*(C.Lv/L)*C.wx-.35*C.wx)*cd;
  C.wz+=(-(G/L)*Math.sin(C.az)-(accz/L)*Math.cos(C.az)-2*(C.Lv/L)*C.wz-.35*C.wz)*cd;
  C.ax=clamp(C.ax+C.wx*cd,-.55,.55);C.az=clamp(C.az+C.wz*cd,-.55,.55);
  const sx=Math.sin(C.ax),sz=Math.sin(C.az),dy=-Math.sqrt(Math.max(.2,1-sx*sx-sz*sz));
  let px=C.tx+L*sx,py=GY+L*dy,pz=C.tz+L*sz;
  const HB=1.84;
  if(Math.abs(px)>HB){px=Math.sign(px)*HB;C.ax=Math.asin(clamp((px-C.tx)/L,-.55,.55));if(Math.abs(C.wx)>.6){sfx.glass();C.wx*=-.35}else C.wx=0}
  if(Math.abs(pz)>HB){pz=Math.sign(pz)*HB;C.az=Math.asin(clamp((pz-C.tz)/L,-.55,.55));if(Math.abs(C.wz)>.6){sfx.glass();C.wz*=-.35}else C.wz=0}
  if(C.state==='bump')py+=.07*Math.sin(Math.PI*clamp(C.st/.2,0,1));  // overshoots into the top stop, then drops back
  head.position.copy(C.lastPos);head.quaternion.copy(C.lastQ);
  head.velocity.set((px-C.lastPos.x)/dt,(py-C.lastPos.y)/dt,(pz-C.lastPos.z)/dt);
  dirV.set(sx,dy,sz);dirV.normalize();qT.setFromVectors(DOWN,dirV);
  {const q=head.quaternion,cx=-q.x,cy=-q.y,cz=-q.z,cw=q.w;let x=qT.w*cx+qT.x*cw+qT.y*cz-qT.z*cy,y=qT.w*cy-qT.x*cz+qT.y*cw+qT.z*cx,z=qT.w*cz+qT.x*cy-qT.y*cx+qT.z*cw,w=qT.w*cw-qT.x*cx-qT.y*cy-qT.z*cz;if(w<0){x=-x;y=-y;z=-z}head.angularVelocity.set(2*x/dt,2*y/dt,2*z/dt)}
  C.lastPos.set(px,py,pz);C.lastQ.copy(qT);
  // prong servos: constant-torque coil when closing, stiff spring when opening
  const closing=['settle','close','lift','bump','carry','lower'].includes(C.state)&&!(C.state==='settle'&&C.st<.12);
  const Tclose=closing?(voltsNow()/48)*TMAX:0;
  for(const pr of prongs){
    const th=prongAngle(pr);pr.theta=th;head.quaternion.vmult(pr.t,aw);
    const wrel=(pr.body.angularVelocity.x-head.angularVelocity.x)*aw.x+(pr.body.angularVelocity.y-head.angularVelocity.y)*aw.y+(pr.body.angularVelocity.z-head.angularVelocity.z)*aw.z;
    let tau;
    if(closing){tau=-Tclose+2.4*(OPEN-th)-.6*wrel;  // coil vs return spring: a weak coil lets the spring splay the prongs
     if(th<CLOSED)tau=Math.max(tau,40*(CLOSED-th)-1.5*wrel)}
    else tau=clamp(40*(OPEN-th)-1.8*wrel,-8,8);
    if(th>OPEN+.08)tau=Math.min(tau,-90*(th-OPEN-.08)-2*wrel);
    pr.body.torque.x+=aw.x*tau;pr.body.torque.y+=aw.y*tau;pr.body.torque.z+=aw.z*tau;
  }
}
function contactsFlags(){
  let headT=false,prFloor=false,prPlush=false;
  for(const c of world.contacts){const a=c.bi,b=c.bj;
    const ah=a===head,bh=b===head;if(ah||bh){headT=true;continue}
    const ap=prongs.some(p=>p.body===a),bp=prongs.some(p=>p.body===b);if(!ap&&!bp)continue;
    const o=ap?b:a;if(o.mass===0){if(o.stop)prFloor=true}else prPlush=true;  // glass walls don't count: prongs brushing glass used to fake a floor hit
  }
  return{headT,prFloor,prPlush};
}
function logic(dt){
  const f=contactsFlags();
  switch(C.state){
    case 'finishing':if(C.st>2)finishTurn();break;
    case 'ready':{C.timer-=dt;const s=Math.ceil(C.timer);if(s!==C.lastTick&&s<=5&&s>0){sfx.tick();C.lastTick=s}if(C.timer<=0)drop();break}
    case 'drop':{
      C.prongTouchT=f.prPlush?C.prongTouchT+dt:Math.max(0,C.prongTouchT-dt*.5);
      if(f.headT||f.prFloor||C.prongTouchT>.1||C.L>=LMAX){setState('settle');sfx.clunk()}
      break}
    case 'settle':if(C.st>.12){setState('close');sfx.clack()}break;
    case 'close':if(C.st>.8){C.liftFrom=C.L;setState('lift');say('Lifting...')}break;
    case 'lift':if(C.L<=L0+1e-4&&C.st>.4){C.heldTop=heldCount();
      // the top-stop smack: kinematic jolt + a random swing kick; on weak plays the coil flickers as the limit switch trips
      {const k=C.strong?.5:1.3;C.wx+=rnd(-k,k);C.wz+=rnd(-k,k)}sfx.clunk();sfx.thud();setState('bump')}break;
    case 'bump':if(C.st>.35){C.held=heldCount();
      if(C.heldTop&&!C.held)say('Knocked loose on the top bump!','warn');else say(C.held?'Holding on...':'Nothing. Coming home anyway.');
      setState('carry')}break;
    case 'carry':if(C.st>.25&&Math.hypot(HOME.x-C.tx,HOME.z-C.tz)<.01&&Math.hypot(C.vx,C.vz)<.05)setState('lower');break;
    case 'lower':if(GY-C.L<=CHUTE_Y||f.headT||f.prFloor||C.st>2.5){setState('release');sfx.clack()}break;  // lower the prize into the chute so it doesn't bounce off the walls
    case 'release':if(C.st>.85)setState('rise');break;
    case 'rise':if(C.L<=L0+1e-4&&C.st>.3)endTurn();break;
  }
}

function play(){
 initAudio();if(C.state!=='idle'||stocking||failed)return;
 if(returnedPrizes.length){B.requestRetrieval?.();return}
 if(B.profile().money<1){B.navigateATM();return}
 try{turnId=B.beginTurn();wonObjects.clear()}catch(e){B.reportError(e);return}
 C.strong=true;C.Vp=48;C.Vc=46;C.timer=30;C.lastTick=99;C.wins=0;C.held=0;
 sfx.coin();setState('ready');say('Your turn! Line up, then DROP.');
}
function drop(){if(C.state!=='ready')return;
 const nearby=plushes.filter(p=>Math.hypot(p.body.position.x-head.position.x,p.body.position.z-head.position.z)<.55)
 .sort((a,b)=>b.body.position.y-a.body.position.y);
 const tricky=nearby[0]&&ITEMS[nearby[0].kind].tricky;
 C.strong=!(tricky&&Math.random()<.22);C.Vp=48;C.Vc=C.strong?46:25;
 setState('drop');C.prongTouchT=0;wakeNear(C.tx,C.tz,1.1);say(tricky?'Tricky toy! Hold on...':'Dropping...');
}
function endTurn(){setState('finishing')}
function finishTurn(){
 try{B.finishTurn();turnId=null}catch(e){failed=true;B.reportError(e);return}
 if(!C.wins){say(C.held?'Almost! Try lining up from another view.':'Try a different view and aim for a clear toy.','warn');sfx.fail()}
 setState('idle');if(B.profile().completedPlays%5===0||!plushes.length){stocking=true;stockDoneT=0;restockT=0;say('Toy shower! Topping up the machine...')}
}
const thumbR=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});thumbR.setSize(256,256);
const thumbScene=new THREE.Scene();thumbScene.add(new THREE.HemisphereLight('#ffffff','#553366',.9));const tl=new THREE.DirectionalLight('#ffffff',.8);tl.position.set(2,3,3);thumbScene.add(tl);
const thumbCam=new THREE.PerspectiveCamera(30,1,.01,20);
function thumbOf(p){
  const g=p.group.clone();g.position.set(0,0,0);g.quaternion.identity();g.rotation.y=-.6;thumbScene.add(g);
  const bb=new THREE.Box3().setFromObject(g),c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()).length();
  thumbCam.position.set(c.x+sz*.35,c.y+sz*.55,c.z+sz*1.75);thumbCam.lookAt(c);thumbR.render(thumbScene,thumbCam);thumbScene.remove(g);
  try{
    // Trim transparent margins so even small ducks and long wands read well
    // on the shelf. Framing stays independent of their machine colliders.
    const source=thumbR.domElement,crop=document.createElement('canvas');crop.width=crop.height=256;
    const ctx=crop.getContext('2d');ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,256,256).data;
    let left=256,top=256,right=0,bottom=0;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
    ctx.clearRect(0,0,256,256);const w=right-left+1,h=bottom-top+1,scale=224/Math.max(w,h);
    if(w>0&&h>0)ctx.drawImage(source,left,top,w,h,(256-w*scale)/2,(256-h*scale)/2,w*scale,h*scale);
    return crop.toDataURL('image/webp',.9);
  }catch(e){return''}
}

const thumbCache={};
function thumbFor(kind){if(thumbCache[kind])return thumbCache[kind];const p=makePlush(kind);const image=thumbOf(p);p.group.traverse(o=>{if(o.isMesh)o.geometry.dispose()});return thumbCache[kind]=image}
function win(p){if(wonObjects.has(p.id)||!turnId)return;
 let item;try{item=B.awardPrize(p.kind,thumbFor(p.kind),`${turnId}:${p.id}`)}catch(e){failed=true;B.reportError(e);return}
 wonObjects.add(p.id);C.wins++;sfx.win(ITEMS[p.kind].tricky?'prize':'normal');
 say(`You won ${ITEMS[p.kind].name}! Tap it in the prize hatch.`,'win');
 if(item){retainReturnedPrize(p,item);B.onPrizeReturned?.(item)}
 const sp=project(new THREE.Vector3(-1.5,.2,1.5));confetti(sp,30);removePlush(p);
}
// Awards are durable before this independent return simulation starts.
// Cosmetic bodies cannot trigger another award or interfere with the claw.
const returnedPrizes=[];
const returnWorld=new CANNON.World();returnWorld.gravity.set(0,-G,0);
returnWorld.broadphase=new CANNON.NaiveBroadphase();returnWorld.allowSleep=true;
returnWorld.solver.iterations=12;
const returnToy=new CANNON.Material('return-toy'),returnTray=new CANNON.Material('return-tray');
returnWorld.addContactMaterial(new CANNON.ContactMaterial(returnToy,returnTray,{friction:.48,restitution:.18}));
returnWorld.addContactMaterial(new CANNON.ContactMaterial(returnToy,returnToy,{friction:.55,restitution:.08}));
function returnWall(x,y,z,hx,hy,hz){const b=new CANNON.Body({mass:0,material:returnTray});
 b.addShape(new CANNON.Box(new CANNON.Vec3(hx,hy,hz)));b.position.set(x,y,z);returnWorld.addBody(b)}
returnWall(-1.5,-1.89,1.62,.49,.08,.62);
returnWall(-2.02,-1.05,1.62,.03,.85,.62);
returnWall(-.98,-1.05,1.62,.03,.85,.62);
returnWall(-1.5,-1.05,.98,.5,.85,.03);
// The clear return flap contains bouncing toys behind the open hatch.
returnWall(-1.5,-1.05,2.25,.5,.85,.03);
box(.96,.09,.06,M.chrome,-1.5,-1.74,2.25,false);
box(.96,.58,.025,M.acrylic,-1.5,-1.43,2.25,false);
function retainReturnedPrize(p,item){
 const model=p.group.clone();model.traverse(o=>{if(o.isMesh)o.geometry=o.geometry.clone()});
 model.position.set(0,0,0);model.quaternion.identity();
 let bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 // Fit the narrow opening in any tumbling orientation, as the prior bay did.
 model.scale.multiplyScalar(Math.min(1,.78/Math.max(.01,size.length())));
 bounds=new THREE.Box3().setFromObject(model);size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const body=new CANNON.Body({mass:p.body.mass,material:returnToy,linearDamping:.16,angularDamping:.28});
 body.addShape(new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,size.z/2)),new CANNON.Vec3(center.x,center.y,center.z));
 body.position.copy(p.body.position);body.quaternion.copy(p.body.quaternion);
 // Preserve descent and spin while guiding the toy clear of the shaft edge.
 body.position.x=clamp(body.position.x,-1.62,-1.38);body.position.z=clamp(body.position.z,1.4,1.7);
 body.velocity.set(clamp(p.body.velocity.x,-.3,.3),Math.min(-.5,p.body.velocity.y),.35);
 body.angularVelocity.copy(p.body.angularVelocity);body.sleepSpeedLimit=.09;body.sleepTimeLimit=.45;
 const prize={item,model,body,landed:false,impacts:0};
 body.addEventListener('collide',e=>{const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());
  if(speed>.55&&prize.impacts<3){prize.impacts++;sfx.thud()}});
 returnWorld.addBody(body);scene.add(model);returnedPrizes.push(prize);syncReturned(prize);
}
function syncReturned(prize){prize.model.position.copy(prize.body.position);prize.model.quaternion.copy(prize.body.quaternion)}
function updateReturned(dt){
 if(!returnedPrizes.length)return;
 returnWorld.step(dt);
 for(const prize of returnedPrizes){syncReturned(prize);prize.landed=prize.body.sleepState===CANNON.Body.SLEEPING}
}
function collectReturned(instanceId){const at=returnedPrizes.findIndex(p=>p.item.instanceId===instanceId);if(at<0)return;
 const [{model,body}]=returnedPrizes.splice(at,1);returnWorld.removeBody(body);scene.remove(model);
 model.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
 for(const prize of returnedPrizes)prize.body.wakeUp();
}
const retrievalRay=new THREE.Raycaster(),retrievalPointer=new THREE.Vector2();
let hatchPointer=null;
canvas.addEventListener('pointerdown',e=>{hatchPointer={x:e.clientX,y:e.clientY}});
canvas.addEventListener('pointerup',e=>{if(!hatchPointer||Math.hypot(e.clientX-hatchPointer.x,e.clientY-hatchPointer.y)>10||C.state!=='idle'||!returnedPrizes.length)return;
 const rect=canvas.getBoundingClientRect();retrievalPointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);retrievalRay.setFromCamera(retrievalPointer,cinemaMix>.001?camP:cam);
 for(const p of returnedPrizes)if(retrievalRay.intersectObject(p.model,true).length){B.requestRetrieval?.(p.item.instanceId);break}
});
function project(v){const p=v.clone().project(cam);return{x:(p.x*.5+.5)*stage.clientWidth,y:(-p.y*.5+.5)*stage.clientHeight}}
function floatText(p,t){const d=document.createElement('div');d.className='float';d.textContent=t;d.style.left=p.x+'px';d.style.top=p.y+'px';stage.appendChild(d);setTimeout(()=>d.remove(),2300)}
function confetti(p,n){if(reduced)return;const cols=['#ff4f8b','#ffd24a','#7ff0b0','#8fd4ff','#c29bff','#fff3e4'];for(let i=0;i<n;i++){const d=document.createElement('i');d.className='conf';d.style.left=p.x+'px';d.style.top=p.y+'px';d.style.background=pick(cols);
  d.style.setProperty('--dx',rnd(-160,220)+'px');d.style.setProperty('--dy',rnd(-260,60)+'px');d.style.setProperty('--r',rnd(-720,720)+'deg');stage.appendChild(d);setTimeout(()=>d.remove(),1900)}}
function say(t,k=''){const el=$('ticker');el.textContent=t;el.className='ticker'+(k?' '+k:'')}
function syncVisuals(){

  for(const p of plushes){p.group.position.copy(p.body.position);p.group.quaternion.copy(p.body.quaternion)}
  headG.position.copy(head.position);headG.quaternion.copy(head.quaternion);
  for(const pr of prongs){pr.g.position.copy(pr.body.position);pr.g.quaternion.copy(pr.body.quaternion)}
  const on=['settle','close','lift','bump','carry','lower'].includes(C.state);headG.userData.led.material.color.set(on?'#ff3b4e':'#5a1a22');
  if(DETONATED){for(const pr of prongs){pr.g.position.copy(pr.body.position);pr.g.quaternion.copy(pr.body.quaternion)}return}
  bridge.position.x=C.tx;carriage.position.set(C.tx,GY-.02,C.tz);carLed.position.set(C.tx+.18,GY,C.tz);
  const moving=Math.hypot(C.vx,C.vz)>.05||C.Lv!==0;carLed.material.color.set(moving&&(performance.now()/60|0)%2?'#7ff0b0':'#1f5a3c');
  const top=new THREE.Vector3(C.tx,GY-.1,C.tz),bot=new THREE.Vector3(0,.2,0).applyQuaternion(headG.quaternion).add(headG.position);
  const len=top.distanceTo(bot);rope.position.copy(top).lerp(bot,.5);rope.scale.set(1,len,1);rope.quaternion.setFromUnitVectors(UP,bot.clone().sub(top).normalize());
}
let hudCache='';
function hud(){
  const sw=Math.min(1,Math.hypot(C.ax,C.az)/.4),vn=voltsNow();
  const s=[C.state,C.state==='ready'?Math.ceil(C.timer):'',vn|0,Math.round(sw*100),stocking,plushes.length,B.profile().money,returnedPrizes.length].join('|');if(s===hudCache)return;hudCache=s;
  const t=$('roTime');t.textContent=C.state==='ready'?String(Math.max(0,Math.ceil(C.timer))).padStart(2,'0'):'--';t.classList.toggle('low',C.state==='ready'&&C.timer<=5);
  $('roStock').textContent=plushes.length;
  $('roSwing').textContent=Math.round(sw*100)+'%';$('swingBar').style.width=sw*100+'%';
  const big=$('big');
  if(C.state==='idle'){big.innerHTML=returnedPrizes.length?'PRIZE<small>PICK UP</small>':B.profile().money>=1?'PLAY<small>$1</small>':'MATH<small>ATM →</small>';big.disabled=false;big.classList.add('throb')}
  else if(C.state==='ready'){big.innerHTML='DROP<small>'+Math.ceil(C.timer)+'s</small>';big.disabled=false;big.classList.add('throb')}
  else{big.innerHTML='WAIT<small>···</small>';big.disabled=true;big.classList.remove('throb')}
  if(C.state==='dead'){big.innerHTML='SOLD<small>·</small>';big.disabled=true;big.classList.remove('throb')}
  if(stocking&&C.state==='idle'){big.innerHTML='STOCK<small>ING</small>';big.disabled=true;big.classList.remove('throb')}
  const cd=$('countdown');if(C.state==='ready'&&C.timer<=5.5){cd.textContent=Math.ceil(C.timer);cd.style.opacity=.3+(C.timer%1)*.5}else cd.style.opacity=0;
}
const DT=1/100;let acc=0,last=performance.now(),restockT=0,view='claw';
let stocking=true,stockDoneT=0,simN=0,refilling=false;const REFILL_AT=20;
const ACTIVE=['drop','settle','close','lift','bump','carry','lower','release','rise'];
function simStep(){
  if(failed)return;simN++;clawStep(DT);updateTrapDoors(DT);world.step(DT);updateReturned(DT);
  if(ACTIVE.includes(C.state)&&simN%8===0)wakeNear(head.position.x,head.position.z,.95);
  if(C.graceT>0)C.graceT-=DT;
  const turnLive=C.state!=='idle'||C.graceT>0;
  for(const p of plushes.slice()){const b=p.body.position;
    if(b.y<-.45&&inChute(b.x,b.z)){
      if(turnLive&&!stocking){win(p);if(failed)return}
      else{const[x,z]=spawnSpot();b.set(x,3,z);p.body.velocity.set(0,0,0);p.body.angularVelocity.set(0,0,0);p.body.wakeUp()}  // leaked outside a turn: the attendant tosses it back
      continue}
    if(b.y<-3||!isFinite(b.y))removePlush(p);
  }
  if(simN%10===0)for(const q of plushes){const b=q.body.position;if(Math.abs(b.x)>P+.02||Math.abs(b.z)>P+.02||b.y>GY+.5){const[x,z]=spawnSpot(1.2);b.set(x,3,z);q.body.velocity.set(0,0,0);q.body.angularVelocity.set(0,0,0);q.body.wakeUp()}}
  if(simN%50===0)for(const q of plushes){const b=q.body.position;if(q.body.sleepState===CANNON.Body.SLEEPING&&b.y>.9&&(Math.abs(b.x)>1.6||Math.abs(b.z)>1.6))q.body.wakeUp()}
  logic(DT);if(failed)return;restockT-=DT;
  const target=S.stock;
  if(stocking){
    if(plushes.length<target&&restockT<=0){for(let i=0;i<3&&plushes.length<target;i++){const[x,z]=spawnSpot();spawnPlush(x,rnd(2.4,3.4),z,plushes.length<20?KIND_KEYS[plushes.length]:undefined)}restockT=.09;say(`Stocking the machine · ${plushes.length}/${target}`)}
    if(plushes.length>=target){stockDoneT+=DT;if(stockDoneT>2.4){stocking=false;say('Ready to play. Earn more at the MATH ATM!')}}
  }else if(!plushes.length&&C.state==='idle'){stocking=true;stockDoneT=0}
}
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(visible&&!document.hidden&&!failed){acc+=dt;let n=0;while(acc>=DT&&n<5&&!failed){simStep();acc-=DT;n++}if(n>=5)acc=0}
  if(visible){updateCam(dt);syncVisuals();placeCam(dt);renderer.render(scene,cinemaMix>.001?camP:cam);hud();drawMini()}
  if(view==='claw'){
    if(AC){const mv=(Math.hypot(C.vx,C.vz)>.05?.09:0)+(C.Lv?.08:0);motorGain.gain.setTargetAtTime(ENDED?0:mv,AC.currentTime,.05);motorOsc.frequency.setTargetAtTime(C.Lv>0?95:C.Lv<0?125:80,AC.currentTime,.05)}
  }else if(AC)motorGain.gain.setTargetAtTime(0,AC.currentTime,.05);
  tickWallet();
  requestAnimationFrame(frame);
}
// the machine stocks itself on load: plush rain
say('Stocking the machine...');

requestAnimationFrame(frame);
movementControls=bindMovementControls({joystick:$('joystick'),buttons:document.querySelectorAll('.dpad button'),onChange(x,y){touchMove.x=x;touchMove.y=y},onInteract(){initAudio();poke()}});
$('big').addEventListener('click',()=>{if(C.state==='idle')play();else drop()});

const KM={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
addEventListener('keydown',e=>{
  if($('prizeDialog').open||!$('errorOverlay').hidden)return;
  if(e.target.tagName==='SELECT')return;const k=e.key.toLowerCase();
  if(view==='claw'&&KM[k]){keys[KM[k]]=true;document.querySelector(`.dpad [data-k="${KM[k]}"]`).classList.add('on');e.preventDefault();return}
  if(view==='claw'&&(k===' '||k==='enter')&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat){if(C.state==='idle')play();else drop()}}
  else if(view==='claw'&&k===' '&&e.target.id==='big'){}
  if(view==='claw'){if(k==='q'&&!e.repeat)orbitStep(-1);if(k==='e'&&!e.repeat)orbitStep(1)}
  if(view==='claw'){if(k==='r'){CV.elT=clamp(CV.elT+.12,EL_MIN,EL_MAX);poke()}if(k==='f'){CV.elT=clamp(CV.elT-.12,EL_MIN,EL_MAX);poke()}if(k==='z')preset('iso')}
  if(k==='m'&&!e.repeat){muted=!muted;initAudio();if(AC)master.gain.setTargetAtTime(muted?0:.6,AC.currentTime,.03);say(muted?'Muted':'Sound on')}
});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(KM[k]){keys[KM[k]]=false;document.querySelector(`.dpad [data-k="${KM[k]}"]`).classList.remove('on')}});
// embedded (itch.io runs us in an iframe): keys only arrive once this frame has focus, so take it on load and on every press
const EMBED=window.self!==window.top;
function grabFocus(){try{window.focus()}catch(_){}}
function focusHint(){$('focusHint').hidden=!(EMBED&&!document.hasFocus())}
document.addEventListener('pointerdown',grabFocus,true);
addEventListener('focus',focusHint);
addEventListener('blur',()=>{clearKeys();focusHint()});
grabFocus();setTimeout(focusHint,300);


const FOCI={claw:{t:BASE_T.clone(),az:Math.PI/4,el:.6,zoom:1}};
let liftReveal=false,emptyReveal=false,cinemaMix=0;
const cinemaTarget=new THREE.Vector3(),cinemaPosition=new THREE.Vector3();
function cinematicShot(){
 if(returnedPrizes.length)return 'return';
 if(C.state==='lift'&&liftReveal){if(C.st>.85&&heldCount()===0){emptyReveal=true;return null}return 'lift'}
 if(!emptyReveal&&['bump','carry','lower','release'].includes(C.state))return 'carry';
 return null;
}
let lastInput=performance.now();const poke=()=>{lastInput=performance.now()};
function updateCam(dt){
  if(!drag.on){CV.azT+=CV.azV*dt;CV.azV*=Math.pow(.03,dt)}
  const attract=CV.focus==='claw'&&C.state==='idle'&&performance.now()-lastInput>12000&&!drag.on;
  if(attract)CV.azT+=.14*dt;
  CV.elT=clamp(CV.elT,EL_MIN,EL_MAX);CV.zoomT=clamp(CV.zoomT,.6,2.8);
  const k=1-Math.pow(.0006,dt);CV.az+=(CV.azT-CV.az)*k;CV.el+=(CV.elT-CV.el)*k;CV.zoom+=(CV.zoomT-CV.zoom)*k;
}
function placeCam(dt=1/60){
  // the look-point pans between the machine and the tables; on the machine, zooming in drifts it toward the claw
  const F=FOCI[CV.focus];focusT.lerp(F.t,1-Math.pow(.012,dt));
  const f=CV.focus==='claw'?clamp((CV.zoom-1.15)/1.4,0,.75):0;
  tmpT.set(focusT.x+(head.position.x-focusT.x)*f,focusT.y+(clamp(head.position.y,.4,3)-focusT.y)*f*.5,focusT.z+(head.position.z-focusT.z)*f);
  camTarget.lerp(tmpT,1-Math.pow(.0001,dt));
  const d=cam===camP?(VIEW*.56)/Math.tan(THREE.MathUtils.degToRad(camP.fov/2))/CV.zoom:40;
  cam.position.set(camTarget.x+d*Math.cos(CV.el)*Math.sin(CV.az),camTarget.y+d*Math.sin(CV.el),camTarget.z+d*Math.cos(CV.el)*Math.cos(CV.az));
  cam.lookAt(camTarget);
  if(cam===camO&&Math.abs(camO.zoom-CV.zoom)>1e-4){camO.zoom=CV.zoom;camO.updateProjectionMatrix()}
 const shot=cinematicShot(),blend=1-Math.pow(reduced?.000001:.004,dt);
 cinemaMix+=(Number(!!shot)-cinemaMix)*blend;
 if(shot==='return'){
  cinemaTarget.set(-1.5,-1.22,1.62);cinemaPosition.set(-1.5,-.8,5.4);
 }else if(shot){
  const chute=shot==='carry'&&['lower','release'].includes(C.state);
  cinemaTarget.set(head.position.x,head.position.y-.35,head.position.z);
  if(chute)cinemaTarget.lerp(new THREE.Vector3(-1.5,.2,1.5),.35);
  cinemaPosition.copy(cinemaTarget).add(new THREE.Vector3(2.5,1.1,4));
 }
 if(cinemaMix>.001){
  const normalTarget=camTarget.clone(),normalPosition=cam.position.clone();
  if(cam===camO){
   const equivalentDistance=(camO.top-camO.bottom)/(2*camO.zoom*Math.tan(THREE.MathUtils.degToRad(camP.fov/2)));
   normalPosition.sub(camTarget).normalize().multiplyScalar(equivalentDistance).add(camTarget);
  }
  // Perspective cinematic camera makes the shaft depth clear while preserving
  // the player's chosen aiming camera and preset underneath.
  camP.position.copy(normalPosition).lerp(cinemaPosition,cinemaMix);
  camP.lookAt(normalTarget.lerp(cinemaTarget,cinemaMix));
 }
 stage.classList.toggle('cinematic',!!shot);
}
const nearAng=(cur,t)=>t+Math.PI*2*Math.round((cur-t)/(Math.PI*2));
const PRESETS={front:{az:0,el:.08},side:{az:Math.PI/2,el:.08},iso:{az:Math.PI/4,el:.6,zoom:1},top:{el:EL_MAX}};
function preset(n){const p=n==='iso'?FOCI[CV.focus]:PRESETS[n];if(p.az!=null)CV.azT=nearAng(CV.azT,p.az);CV.elT=p.el;if(p.zoom)CV.zoomT=p.zoom;CV.azV=0;S.cameraPreset=n[0].toUpperCase()+n.slice(1);B.saveSettings({cameraPreset:S.cameraPreset});poke()}
function orbitStep(dir){const q=Math.PI/4;CV.azT=(Math.round(CV.azT/q)+dir)*q;CV.azV=0;poke()}
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));
$('rotL').addEventListener('click',()=>orbitStep(-1));$('rotR').addEventListener('click',()=>orbitStep(1));
function setProj(pr){S.proj=pr;persist();cam=pr==='persp'?camP:camO;$('proj').setAttribute('aria-pressed',pr==='persp');resize()}
$('proj').addEventListener('click',()=>{setProj(S.proj==='persp'?'ortho':'persp');poke()});setProj(S.proj);
const drag={on:false,pts:new Map(),lastX:0,lastY:0,lastT:0,pinch:0};
 canvas.addEventListener('pointerdown',e=>{initAudio();poke();if(cinemaMix>.05)return;canvas.setPointerCapture(e.pointerId);drag.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(drag.pts.size===1){drag.on=true;drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastT=performance.now();CV.azV=0;canvas.classList.add('drag')}
  if(drag.pts.size===2){const[a,b]=[...drag.pts.values()];drag.pinch=Math.hypot(a.x-b.x,a.y-b.y)}});
canvas.addEventListener('pointermove',e=>{if(!drag.pts.has(e.pointerId))return;drag.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});poke();
  if(drag.pts.size>=2){const[a,b]=[...drag.pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(drag.pinch)CV.zoomT*=d/drag.pinch;drag.pinch=d;return}
  const now=performance.now(),dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY,dt=Math.max(1,now-drag.lastT)/1000;
  const sens=5.2/Math.max(300,stage.clientWidth);
  CV.azT-=dx*sens;CV.elT=clamp(CV.elT+dy*sens*.8,EL_MIN,EL_MAX);CV.azV=clamp(-dx*sens/dt,-6,6);
  drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastT=now});
const endPtr=e=>{drag.pts.delete(e.pointerId);if(drag.pts.size===0){drag.on=false;canvas.classList.remove('drag');if(performance.now()-drag.lastT>90)CV.azV=0}drag.pinch=0};
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',e=>{e.preventDefault();poke();CV.zoomT*=Math.exp(-e.deltaY*.0012)},{passive:false});
canvas.addEventListener('dblclick',()=>preset('iso'));
function setStick(m){S.stick=m;persist();$('stScreen').setAttribute('aria-pressed',m==='screen');$('stMachine').setAttribute('aria-pressed',m==='machine');stick.snap=Math.PI/2*Math.round(CV.az/(Math.PI/2))}
$('stScreen').addEventListener('click',()=>setStick('screen'));$('stMachine').addEventListener('click',()=>setStick('machine'));setStick(S.stick);
document.addEventListener('keydown',poke);document.addEventListener('pointerdown',poke);

/* ================= stick gizmo + map ================= */
const giz=new THREE.Group();
{const mk=(col,op)=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthTest:false});
 const hot=mk('#ff5aa5',.95),cold=mk('#ffe6b0',.55);
 [[0,-1,hot],[1,0,cold],[0,1,cold],[-1,0,cold]].forEach(([x,z,m])=>{const a=new THREE.Group();
   const sh=new THREE.Mesh(new THREE.BoxGeometry(.05,.012,.16),m);sh.position.z=-.3;a.add(sh);const hd=new THREE.Mesh(new THREE.ConeGeometry(.07,.13,3),m);hd.rotation.x=-Math.PI/2;hd.position.z=-.43;a.add(hd);
   a.rotation.y=Math.atan2(-x,-z);a.renderOrder=20;a.children.forEach(c=>c.renderOrder=20);giz.add(a)})}
scene.add(giz);
const mini=$('mini'),mg=mini.getContext('2d');
function drawMini(){
  const W=mini.width,s=W/5,az=CV.az,rx=Math.cos(az),rz=-Math.sin(az),fx=-Math.sin(az),fz=-Math.cos(az);
  const P2=(x,z)=>[W/2+(x*rx+z*rz)*s,W/2-(x*fx+z*fz)*s];
  mg.clearRect(0,0,W,W);mg.lineJoin='round';
  const poly=(pts,fill,stroke)=>{mg.beginPath();pts.forEach(([x,z],i)=>{const[u,v]=P2(x,z);i?mg.lineTo(u,v):mg.moveTo(u,v)});mg.closePath();if(fill){mg.fillStyle=fill;mg.fill()}if(stroke){mg.strokeStyle=stroke;mg.lineWidth=3;mg.stroke()}};
  poly([[-2,-2],[2,-2],[2,2],[-2,2]],'rgba(255,156,192,.18)','rgba(255,230,176,.7)');
  poly([[-2,1],[-1,1],[-1,2],[-2,2]],'rgba(255,177,61,.35)','#ffb13d');
  const ps=plushes.slice().sort((a,b)=>a.body.position.y-b.body.position.y);
  for(const p of ps){const b=p.body.position;const[u,v]=P2(b.x,b.z);mg.globalAlpha=clamp(.45+b.y*.5,.45,1);mg.fillStyle=p.dot;mg.beginPath();mg.arc(u,v,5.5,0,7);mg.fill()}
  mg.globalAlpha=1;
  const[hu,hv]=P2(head.position.x,head.position.z),[tu,tv]=P2(C.tx,C.tz);
  mg.strokeStyle='rgba(255,255,255,.5)';mg.lineWidth=2;mg.beginPath();mg.moveTo(tu,tv);mg.lineTo(hu,hv);mg.stroke();
  mg.strokeStyle='#fff';mg.lineWidth=3;mg.beginPath();mg.arc(hu,hv,13,0,7);mg.stroke();mg.beginPath();mg.moveTo(hu-19,hv);mg.lineTo(hu-7,hv);mg.moveTo(hu+7,hv);mg.lineTo(hu+19,hv);mg.moveTo(hu,hv-19);mg.lineTo(hu,hv-7);mg.moveTo(hu,hv+7);mg.lineTo(hu,hv+19);mg.stroke();
  if(C.state==='ready'){const sa=stickAz(),ux=-Math.sin(sa),uz=-Math.cos(sa);const[au,av]=P2(C.tx+ux*.55,C.tz+uz*.55);mg.strokeStyle='#ff5aa5';mg.fillStyle='#ff5aa5';mg.lineWidth=5;mg.beginPath();mg.moveTo(tu,tv);mg.lineTo(au,av);mg.stroke();
    const ang=Math.atan2(av-tv,au-tu);mg.beginPath();mg.moveTo(au+Math.cos(ang)*10,av+Math.sin(ang)*10);mg.lineTo(au+Math.cos(ang+2.4)*12,av+Math.sin(ang+2.4)*12);mg.lineTo(au+Math.cos(ang-2.4)*12,av+Math.sin(ang-2.4)*12);mg.closePath();mg.fill()}
  // compass tick: which way the machine's front faces
  const[fu,fv]=P2(0,2.35);mg.fillStyle='#ffe6b0';mg.font='bold 20px Rubik, sans-serif';mg.textAlign='center';mg.textBaseline='middle';mg.fillText('F',fu,fv);
  giz.visible=C.state==='ready';giz.position.set(C.tx,GY+.16,C.tz);giz.rotation.y=stickAz();
}

/* ================= sound panel ================= */
{const btn=$('sndBtn'),pop=$('sndPop'),vm=$('volMusic'),vs=$('volSfx');
 const show=()=>{$('volMusicV').textContent=Math.round(S.vol.music*100);$('volSfxV').textContent=Math.round(S.vol.sfx*100)};
 vm.value=Math.round(S.vol.music*100);vs.value=Math.round(S.vol.sfx*100);show();
 btn.addEventListener('click',()=>{initAudio();pop.hidden=!pop.hidden;btn.setAttribute('aria-expanded',!pop.hidden)});
 vm.addEventListener('input',()=>{initAudio();setVol('music',vm.value/100);show()});
 vs.addEventListener('input',()=>{initAudio();setVol('sfx',vs.value/100);show();if(Math.random()<.3)sfx.chip()});
 document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!e.target.closest('.snd')){pop.hidden=true;btn.setAttribute('aria-expanded','false')}});}


document.addEventListener('visibilitychange',()=>{last=performance.now();acc=0;clearKeys();if(document.hidden&&AC)AC.suspend();else if(visible&&AC)AC.resume()});
function clearKeys(){movementControls?.reset();touchMove.x=touchMove.y=0;for(const k in keys)keys[k]=false;document.querySelectorAll('.dpad .on').forEach(b=>b.classList.remove('on'))}
const api={
 setProfile(){S.money=B.profile().money*100;hudCache='';failed=false;resize()},
 setVisible(on){visible=on;view=on?'claw':'other';last=performance.now();acc=0;clearKeys();if(AC)motorGain.gain.setTargetAtTime(0,AC.currentTime,.02);if(on)resize()},
 refreshHUD(){hudCache='';hud()},pauseForError(){failed=true;clearKeys()},isBusy:()=>C.state!=='idle',drop,thumbnail:thumbFor,sound(kind){initAudio();(sfx[kind]||sfx.cash)()},resize,
 collectReturned,returned:()=>returnedPrizes.map(p=>p.item),
 createPrizeModel(kind){return makePlush(kind).group},
 retry(){failed=false;last=performance.now()}
};
preset((S.cameraPreset||'Iso').toLowerCase());
window.__clawDebug={C,CV,keys,head,prongs,world,trapDoors,plushes:()=>plushes,play,drop,simStep,thumbFor,preset,api,stocking:()=>stocking,cinematicShot,returned:()=>returnedPrizes,renderCamera:()=>cinemaMix>.001?camP:cam};
B.onMachineReady(api);
})();
