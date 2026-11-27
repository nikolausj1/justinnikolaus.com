import {createStore, generateQuestion} from './state.js';
import {PRIZES} from './catalog.js';
import {ROOM_PAGE_SIZE} from './contracts.js';
import {createPrizeViewer} from './prize-viewer.js';
const $=id=>document.getElementById(id), names={vinny:'Vinny',chase:'Chase'};
const qaMode=new URLSearchParams(location.search).has('qa');
const storage={getItem:k=>localStorage.getItem(qaMode?k+'-qa':k),setItem:(k,v)=>localStorage.setItem(qaMode?k+'-qa':k,v)};
const catalog=Object.fromEntries(PRIZES.map(p=>[p.id,p]));
let store,machine,viewer,screen='start',question,input='',questionTimer,toastTimer;
let pendingATMRewards=0;const atmFlights=new Set();
let turnId=null,turnState='idle',page=0,inspection=null,inspectionNew=false,loading=false,justShelved=null;
function notice(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000)}
function reportError(error){
 machine?.pauseForError?.();$('errorTitle').textContent=/SAVE|STOR/.test(error.code||'')?'Progress could not be saved':'The arcade could not start';
 $('errorText').textContent=error.message||String(error);$('retry').textContent=error.code==='SAVE_CONFLICT'?'Reload latest progress':'Retry';
 $('retry').dataset.reload=error.code==='SAVE_CONFLICT'?'true':'false';$('errorOverlay').hidden=false;
}
function transact(fn){try{return fn()}catch(e){reportError(e);return null}}
function initStore(){try{store=createStore(storage);const recovered=store.recoverTurns();store.subscribe(refresh);if(recovered.some(r=>r.refunded))notice('Your interrupted play was refunded.');$('errorOverlay').hidden=true;return true}catch(e){reportError(e);return false}}
initStore();
function refresh(){
 if(!store)return;
 const volume=store.snapshot().deviceSettings.vol;$('muteMusic').textContent=volume.music===0?'Unmute music':'Mute music';$('muteEffects').textContent=volume.sfx===0?'Unmute effects':'Mute effects';
 const p=store.profile(),name=names[p.id];$('playerName').textContent=`${name}’s Arcade`;$('avatar').textContent=name[0];const balance=`${p.money} ${p.money===1?'Token':'Tokens'}`;$('wallet').textContent=balance;const bankCount=Math.max(0,p.money-pendingATMRewards);$('atmBalance').textContent=`${bankCount} ${bankCount===1?'Token':'Tokens'}`;
 const back=$('backToClaw');back.disabled=p.money===0;back.classList.toggle('token-ready',p.money>=3);$('tokenHint').textContent=p.money===0?'Answer a question to earn your first token.':p.money>=3?'You’re ready for a few rounds!':`${3-p.money} more ${3-p.money===1?'token':'tokens'} to light up your next visit.`;$('collectionCount').textContent=p.collection.length;renderTokenPile(p.money);
 if(screen==='room')renderRoom();machine?.refreshHUD?.();updateRetrieval();
}
// Exact balances stay authoritative; the capped pile is a visual companion.
function renderTokenPile(count){
 const offsets=[[-8,13,-18],[19,20,15],[4,-1,-7],[34,0,25],[-17,-8,-24],[20,-17,12],[44,17,30],[0,28,-12]];
 const coins=offsets.slice(0,Math.min(count,offsets.length)),xs=coins.map(p=>p[0]);
 const centerOffset=coins.length?45-(Math.min(...xs)+Math.max(...xs)+51)/2:0;
 $('tokenPile').replaceChildren(...coins.map(([x,y,r])=>{const image=document.createElement('img');image.src='assets/arcade-token-n.svg';image.alt='';image.className='pile-coin';image.style.cssText=`--coin-x:${x+centerOffset}px;--coin-y:${y}px;--coin-rotate:${r}deg`;return image}));
 $('machineTokenCount').textContent=`${count} ${count===1?'token':'tokens'}`;$('machineTokens').setAttribute('aria-label',`${count} ${count===1?'token':'tokens'} available`);
}
let tokenFlight=null;
function animateTokenSpend(source){
 let coin;
 // Decoration must never interrupt a successfully saved play transaction.
 try{
  if(!source?.width||!document.body?.append)return;
  const target=machine?.tokenInsertPoint?.();if(!target)return;
  tokenFlight?.cancel();
  coin=document.createElement('img');coin.src='assets/arcade-token-n.svg';coin.alt='';coin.className='flying-token';coin.setAttribute('aria-hidden','true');
  coin.style.left=`${source.left+source.width/2-27}px`;coin.style.top=`${source.top+source.height/2-27}px`;document.body.append(coin);
  const dx=target.x-(source.left+source.width/2),dy=target.y-(source.top+source.height/2);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frames=reduced?[{opacity:1},{opacity:0}]:[
   {transform:'translate(0,0) rotate(-18deg) scale(1)',opacity:1},
   {transform:`translate(${dx*.48}px,${dy*.48-100}px) rotate(160deg) scale(1.2)`,opacity:1,offset:.48},
   {transform:`translate(${dx}px,${dy}px) rotate(340deg) scale(.16,.65)`,opacity:1,offset:.92},
   {transform:`translate(${dx}px,${dy}px) rotate(360deg) scale(.02,.3)`,opacity:0}
  ];
  if(!coin.animate){coin.remove();return}
  const animation=coin.animate(frames,{duration:reduced?120:750,easing:'cubic-bezier(.3,.05,.55,1)',fill:'forwards'});tokenFlight=animation;
  animation.finished.catch(()=>{}).finally(()=>{coin.remove();if(tokenFlight===animation)tokenFlight=null});
 }catch{coin?.remove(); /* A visual failure cannot charge twice or block the machine. */ }
}
function settleATMFlights(){for(const flight of [...atmFlights])flight.settle()}
function animateATMReward(){
 let coin,entry,settled=false;
 const settle=()=>{if(settled)return;settled=true;entry?.animation?.cancel();coin?.remove();if(entry)atmFlights.delete(entry);pendingATMRewards=Math.max(0,pendingATMRewards-1);refresh()};
 try{
  const sourceImage=$('cashNote').querySelector?.('.dispensed-token img');
  const targetImage=document.querySelector?.('.bank > .token-art');
  if(!sourceImage||!targetImage||!document.body?.append){settle();return}
  $('cashNote').style.animation='none';
  const source=sourceImage.getBoundingClientRect(),target=targetImage.getBoundingClientRect();
  if(!source.width||!target.width){settle();return}
  coin=document.createElement('img');coin.src='assets/arcade-token-n.svg';coin.alt='';coin.className='flying-token atm-reward-flight';coin.setAttribute('aria-hidden','true');
  coin.style.left=`${source.left+source.width/2-27}px`;coin.style.top=`${source.top+source.height/2-27}px`;document.body.append(coin);
  if(!coin.animate){settle();return}
  sourceImage.style.visibility='hidden';
  const dx=target.left+target.width/2-(source.left+source.width/2),dy=target.top+target.height/2-(source.top+source.height/2);
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frames=reduced?[{opacity:1},{opacity:0}]:[
   {transform:'translate(0,12px) scale(.8)',opacity:0},
   {transform:'translate(0,-45px) rotate(-25deg) scale(1)',opacity:1,offset:.22},
   {transform:`translate(${dx*.5}px,${dy*.5-80}px) rotate(140deg) scale(1.1)`,opacity:1,offset:.58},
   {transform:`translate(${dx}px,${dy}px) rotate(360deg) scale(.55)`,opacity:0}
  ];
  entry={animation:coin.animate(frames,{duration:reduced?120:1050,easing:'cubic-bezier(.25,.1,.45,1)',fill:'forwards'}),settle};atmFlights.add(entry);
  entry.animation.finished.then(settle,settle);
 }catch{settle()}
}
function updateRetrieval(){
 const count=machine?.returned?.().length||0,b=$('retrievePrize');b.hidden=!count||turnState!=='idle';
 b.firstChild.textContent=count>1?`You won ${count} toys! `:'Tap your prize! ';
}
window.ClawBridge={
 profile:()=>store.profile(),settings:()=>store.snapshot().deviceSettings,
 beginTurn(){const source=$('tokenPile').lastElementChild?.getBoundingClientRect?.();turnId=store.beginTurn();refresh();animateTokenSpend(source);return turnId},
 awardPrize(id,thumb,eventId){return store.awardPrize(turnId,id,thumb,eventId)},
 finishTurn(){const result=store.finishTurn(turnId);turnId=null;return result},
 saveSettings(patch){transact(()=>store.setSettings(patch))},navigateATM:()=>navigate('atm'),reportError,
 onMachineReady(api){machine=api;machine.setVisible(screen==='machine');refresh();window.dispatchEvent(new Event('claw-machine-ready'))},
 onTurnState(state){turnState=state;document.querySelectorAll('.tabs button,#home,#earnLink').forEach(b=>b.dataset.busy=state==='idle'?'false':'true');updateRetrieval()},
 onPrizeReturned(){updateRetrieval()},requestRetrieval:retrieve,
};
async function loadMachine(){if(machine||loading)return;loading=true;try{if(!window.THREE||!window.CANNON)throw Error('The 3D engine could not load. Check your connection, then retry.');await import('./machine.js')}catch(e){reportError(e)}finally{loading=false}}
async function choose(id){
 settleATMFlights();
 if(!store||!transact(()=>store.select(id)))return;
 // Visual return copies belong to the previous player; the saved toys stay theirs.
 machine?.returned?.().forEach(item=>machine.collectReturned(item.instanceId));
 page=0;clearTimeout(questionTimer);question=null;input='';$('start').hidden=true;$('app').hidden=false;await navigate('machine');machine?.setProfile();refresh();
}
async function navigate(next){
 if(machine?.isBusy()){notice(turnState==='ready'?'Use DROP to finish this turn before leaving.':'Your claw is coming home. Try again in a moment.');return}
 if(next!=='machine')tokenFlight?.cancel();if(next!=='atm')settleATMFlights();screen=next;for(const id of ['machine','atm','room'])$(id).hidden=id!==next;
 document.querySelectorAll('[data-screen]').forEach(b=>{if(b.dataset.screen===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 machine?.setVisible(next==='machine');if(next==='machine')await loadMachine();
 if(next==='atm'){if(!question||question.resolved)nextMath();else renderMath()}if(next==='room')renderRoom();refresh();
}
function nextMath(){clearTimeout(questionTimer);question=generateQuestion(store.profile().id,Math.random,question);input='';$('mathFeedback').textContent='Take your time. There’s no timer.';$('mathFeedback').className='';$('cashNote').textContent='TOKENS COME OUT HERE';$('cashNote').className='';renderMath()}
function renderMath(){
 $('equation').textContent=`${question.a} ${question.operation} ${question.b}`;$('answerDisplay').textContent=input||'?';
 $('submitAnswer').disabled=!input||question.resolved;$('submitAnswer').hidden=question.resolved;$('nextQuestion').hidden=!question.resolved;
 document.querySelectorAll('.keypad button').forEach(b=>b.disabled=question.resolved);$('mathLabel').textContent=store.profile().id==='vinny'?'ADDITION & SUBTRACTION':'TIMES TABLES & DIVISION';
}
function digit(d){if(!question||question.resolved||input.length>=3)return;input=input==='0'?d:input+d;renderMath()}
function submit(){
 if(!input||question.resolved)return;const rewardExpected=Number(input)===question.correctAnswer;if(rewardExpected)pendingATMRewards++;
 const result=transact(()=>store.answer(question,Number(input)));if(!result){if(rewardExpected)pendingATMRewards=Math.max(0,pendingATMRewards-1);refresh();return}renderMath();
 if(result.correct){$('mathFeedback').textContent='Nice work! +1 token saved for your next play.';$('mathFeedback').className='correct';$('cashNote').innerHTML='<span class="dispensed-token"><img class="token-art" src="assets/arcade-token-n.svg" alt="Gold Nikolaus Arcade token"></span><span>+1 TOKEN</span>';$('cashNote').className='cash-award';animateATMReward();machine?.sound('coin');questionTimer=setTimeout(()=>{if(screen==='atm')nextMath()},2000)}
 else{$('mathFeedback').textContent=`The answer is ${question.a} ${question.operation} ${question.b} = ${question.correctAnswer}. Let’s try another!`;$('mathFeedback').className='answer-help'}
}
function imageFor(item){const image=document.createElement('img');image.src=machine?.thumbnail(item.prizeId)||item.thumbnail||'';image.alt=catalog[item.prizeId].name;return image}
function retrieve(instanceId){
 if(machine?.isBusy()){notice('Almost there! Wait for the claw to finish.');return}
 const items=machine?.returned?.()||[],item=items.find(i=>i.instanceId===instanceId)||items[0];if(item)inspect(item,true);
}
function inspect(item,isNew=false){
 inspection=item;inspectionNew=isNew;$('prizeTitle').textContent=catalog[item.prizeId].name;$('prizeDescription').textContent=catalog[item.prizeId].description;
 $('prizeMoment').textContent=isNew?'LOOK WHAT YOU WON!':'ONE OF YOUR FAVORITES';$('selectPrize').textContent=isNew?'Put on my shelf →':'Back to shelf →';
 $('prizeFallback').hidden=true;$('prizeCanvas').hidden=false;$('prizeFallback').src=item.thumbnail;
 $('prizeDialog').showModal();machine?.setVisible(false);
 try{viewer??=createPrizeViewer({canvas:$('prizeCanvas'),makeModel:id=>machine.createPrizeModel(id)});viewer.open(item.prizeId)}
 catch(e){$('prizeCanvas').hidden=true;$('prizeFallback').hidden=false;notice('The 3D view could not open. Your toy is safely saved.')}
}
function orderedRoomItems(){const p=store.profile(),positions=new Map(p.placements.map(s=>[s.instanceId,s.page*12+s.slot]));return p.collection.slice().sort((a,b)=>(positions.get(a.instanceId)??Infinity)-(positions.get(b.instanceId)??Infinity))}
function renderRoom(){
 const p=store.profile(),items=orderedRoomItems(),pageCount=Math.max(1,Math.ceil(items.length/ROOM_PAGE_SIZE));page=Math.max(0,Math.min(page,pageCount-1));
 $('roomTitle').textContent=`${names[p.id]}’s Room`;$('uniqueCount').textContent=`${new Set(items.map(i=>i.prizeId)).size} / 20 designs`;
 $('prevPage').disabled=page===0;$('nextPage').disabled=page===pageCount-1;$('pageNumber').textContent=`Shelf ${page+1} of ${pageCount}`;$('emptyRoom').hidden=!!items.length;
 const shelf=$('shelf');shelf.replaceChildren();
 for(const item of items.slice(page*ROOM_PAGE_SIZE,(page+1)*ROOM_PAGE_SIZE)){
  const b=document.createElement('button');b.className='shelf-spot'+(justShelved===item.instanceId?' new-arrival':'');b.setAttribute('aria-label',`Pick up ${catalog[item.prizeId].name}`);b.append(imageFor(item));
  const label=document.createElement('span');label.textContent=catalog[item.prizeId].name;b.append(label);b.addEventListener('click',()=>inspect(item));shelf.append(b);
 }
 // Keep shelf planks visible without turning empty positions into controls.
 for(let i=items.slice(page*ROOM_PAGE_SIZE,(page+1)*ROOM_PAGE_SIZE).length;i<ROOM_PAGE_SIZE;i++){const space=document.createElement('div');space.className='shelf-space';space.setAttribute('aria-hidden','true');shelf.append(space)}
}
function closeInspection(){viewer?.close();machine?.setVisible(screen==='machine')}
$('prizeDialog').addEventListener('close',closeInspection);
$('selectPrize').addEventListener('click',async()=>{
 if(!inspection)return;
 if(inspectionNew)machine?.collectReturned(inspection.instanceId);
 justShelved=inspection.instanceId;page=Math.floor(orderedRoomItems().findIndex(i=>i.instanceId===justShelved)/ROOM_PAGE_SIZE);
 $('prizeDialog').close();await navigate('room');setTimeout(()=>{justShelved=null;if(screen==='room')renderRoom()},1800);
});
$('closePrize').addEventListener('click',()=>$('prizeDialog').close());$('resetPrize').addEventListener('click',()=>viewer?.reset());$('retrievePrize').addEventListener('click',()=>retrieve());
document.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.profile)));
document.querySelectorAll('[data-screen],[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.screen||b.dataset.go)));
$('earnLink').addEventListener('click',()=>navigate('atm'));
$('home').addEventListener('click',()=>{if(machine?.isBusy()){notice(turnState==='ready'?'Use DROP to finish this turn before choosing another player.':'Your claw is coming home. Try again in a moment.');return}settleATMFlights();clearTimeout(questionTimer);screen='start';machine?.setVisible(false);$('app').hidden=true;$('start').hidden=false});
document.querySelectorAll('[data-digit]').forEach(b=>b.addEventListener('click',()=>digit(b.dataset.digit)));
$('backspace').addEventListener('click',()=>{input=input.slice(0,-1);renderMath()});$('clearAnswer').addEventListener('click',()=>{input='';renderMath()});$('submitAnswer').addEventListener('click',submit);$('nextQuestion').addEventListener('click',nextMath);
document.addEventListener('keydown',e=>{if(screen!=='atm'||!$('errorOverlay').hidden||e.target.tagName==='INPUT')return;if(/^\d$/.test(e.key)){e.preventDefault();digit(e.key)}else if(e.key==='Backspace'){e.preventDefault();input=input.slice(0,-1);renderMath()}else if(e.key==='Enter'){e.preventDefault();if(question.resolved)nextMath();else submit()}});
$('prevPage').addEventListener('click',()=>{page--;renderRoom()});$('nextPage').addEventListener('click',()=>{page++;renderRoom()});
$('retry').addEventListener('click',()=>{if($('retry').dataset.reload==='true'){location.reload();return}if(!store){if(initStore())refresh()}else{try{store.setSettings({});$('errorOverlay').hidden=true;if(machine)machine.retry();else location.reload()}catch(e){reportError(e)}}});
$('muteMusic').addEventListener('click',()=>{const slider=$('volMusic');slider.value=slider.value==='0'?'50':'0';slider.dispatchEvent(new Event('input'));$('muteMusic').textContent=slider.value==='0'?'Unmute music':'Mute music'});
$('muteEffects').addEventListener('click',()=>{const slider=$('volSfx');slider.value=slider.value==='0'?'80':'0';slider.dispatchEvent(new Event('input'));$('muteEffects').textContent=slider.value==='0'?'Unmute effects':'Mute effects'});
refresh();

document.addEventListener('visibilitychange',()=>{if(document.hidden)settleATMFlights()});
