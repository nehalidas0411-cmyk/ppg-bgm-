const $=id=>document.getElementById(id),FS=100,N=600,WIN=5,REFR=300;
const S={run:false,n:0,phase:0,raw:[],sm:[],beats:[],lastT:null,lastOk:-9e9,bpms:[],shown:null,thr:2048,amp:0,motion:0,beepAt:0,alert:false};
const rnd=()=>Math.random()-.5;
function log(t){const li=document.createElement("li");li.textContent=t;$("log").prepend(li);while($("log").children.length>6)$("log").lastChild.remove()}
function gen(){
  S.phase=(S.phase+S.bpm/60/FS*(1+.03*Math.sin(S.n/180)))%1;const p=S.phase;
  const v=Math.exp(-(((p-.2)/.07)**2))+.35*Math.exp(-(((p-.48)/.1)**2));
  let c=2048+(S.finger?v*500-150+rnd()*14:rnd()*8);
  if(S.motion>0){c+=Math.sin(S.n/6)*400*Math.random()+rnd()*320;S.motion--}
  return Math.max(0,Math.min(4095,Math.round(c)));
}
function tick(c){
  S.n++;S.raw.push(c);const w=S.raw.slice(-WIN),sm=w.reduce((a,b)=>a+b)/w.length;S.sm.push(sm);
  if(S.raw.length>N){S.raw.shift();S.sm.shift();S.beats=S.beats.map(b=>b-1).filter(b=>b>=0)}
  const seg=S.sm.slice(-200),mx=Math.max(...seg),mn=Math.min(...seg);S.thr=(mx+mn)/2;S.amp=Math.round(mx-mn);
  const L=S.sm.length,t=S.n*1000/FS;
  if(L>1&&S.amp>150&&S.sm[L-2]<S.thr&&sm>=S.thr&&(S.lastT===null||t-S.lastT>=REFR)){
    if(S.lastT!==null){const ibi=t-S.lastT;
      if(ibi>=300&&ibi<=2000){const b=60000/ibi;S.bpms.push(b);S.bpms=S.bpms.slice(-4);S.ibi=Math.round(ibi);S.lastOk=t;S.beats.push(L-1);S.nb=(S.nb||0)+1;
        S.shown=Math.round(S.bpms.reduce((a,b)=>a+b)/S.bpms.length);log(`beat · IBI ${S.ibi} ms → ${Math.round(b)} BPM`)}
      else log(`rejected IBI ${Math.round(ibi)} ms`)}
    S.lastT=t}
  if(t-S.lastOk>3000&&S.shown!==null){S.shown=null;S.bpms=[];log("timeout → Searching")}
  S.adc=c;
}
const status=()=>!S.finger||S.amp<150?"SEARCHING":S.amp>900?"MOTION":S.shown?"SIGNAL OK":"SEARCHING";
function oled(){const c=$("oled").getContext("2d");c.fillStyle="#000";c.fillRect(0,0,256,128);c.fillStyle="#bfeaff";c.textBaseline="top";
  c.font="14px 'IBM Plex Mono'";c.fillText("HEART RATE",4,4);c.font="bold 44px 'IBM Plex Mono'";c.fillText(S.run&&S.shown?S.shown:"--",4,22);
  c.font="14px 'IBM Plex Mono'";c.fillText("BPM",150,48);c.fillText(S.run?status():"OFF",4,72);
  if(S.run){c.strokeStyle="#bfeaff";c.beginPath();S.sm.slice(-160).forEach((v,i)=>{const x=i*1.6,y=124-Math.max(0,Math.min(1,(v-1800)/700))*26;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}}
function scope(){const cv=$("scope"),c=cv.getContext("2d"),W=cv.width,H=cv.height,Y=v=>H-(Math.max(1400,Math.min(2800,v))-1400)/1400*H,X=i=>i/(N-1)*W;
  c.clearRect(0,0,W,H);c.strokeStyle="#1b262b";c.lineWidth=1;for(let i=1;i<6;i++){c.beginPath();c.moveTo(0,i*H/6);c.lineTo(W,i*H/6);c.stroke()}
  const line=(a,col,lw)=>{c.strokeStyle=col;c.lineWidth=lw;c.beginPath();a.forEach((v,i)=>i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v)));c.stroke()};
  line(S.raw,"#4b6a7a",1);line(S.sm,"#ff4d5e",2.5);
  c.setLineDash([6,5]);c.strokeStyle="#ffb347";c.lineWidth=1;c.beginPath();c.moveTo(0,Y(S.thr));c.lineTo(W,Y(S.thr));c.stroke();c.setLineDash([]);
  c.fillStyle="#8fdcff";S.beats.forEach(b=>{c.beginPath();c.arc(X(b),Y(S.sm[b]),6,0,7);c.fill()})}
function ui(){$("adc").textContent=S.run?S.adc:"--";$("volt").textContent=S.run?(S.adc*3.3/4095).toFixed(2)+" V":"--";
  $("ibi").textContent=S.ibi&&S.shown?S.ibi+" ms":"--";$("avg").textContent=S.shown??"--";$("nb").textContent=S.nb||0;$("amp").textContent=S.run?S.amp:"--";
  $("l1").classList.toggle("on",S.run);$("l2").classList.toggle("on",S.run);
  const a=S.run&&S.shown&&(S.shown<+$("lo").value||S.shown>+$("hi").value);$("l3").classList.toggle("on",!!a);
if(a&&performance.now()-S.beepAt>1500){S.beepAt=performance.now();beep()}}
let prev=0;
function frame(now){if(S.run){let k=Math.min((now-prev)/10,10);for(;k>=1;k--)tick(gen())}prev=now;scope();oled();ui();requestAnimationFrame(frame)}
S.bpm=75;S.finger=true;
$("go").onclick=()=>{S.run=!S.run;$("go").textContent=S.run?"■ Power off":"▶ Power on";
  if(S.run){S.ac=S.ac||new (window.AudioContext||window.webkitAudioContext)();S.raw=[];S.sm=[];S.beats=[];S.lastT=null;S.lastOk=-9e9;S.shown=null;S.bpms=[];S.nb=0;log("boot · ADC, TIM2, I²C init")}else log("power off")};
$("fing").onchange=e=>{S.finger=e.target.checked;log(S.finger?"finger placed":"finger removed")};
$("mot").onclick=()=>{S.motion=150;log("motion disturbance")};
$("pulse").oninput=e=>{S.bpm=+e.target.value;$("pv").textContent=S.bpm};
async function rows(){const d=await (await fetch("/api/readings")).json();$("rows").innerHTML=d.slice(0,5).map(r=>`<tr><td>${r.bpm}</td><td>${r.reference_bpm??"-"}</td><td>${r.error_pct??"-"}${r.error_pct!=null?"%":""}</td></tr>`).join("")}
$("save").onclick=async()=>{if(!S.run||!S.shown){$("msg").textContent="No valid BPM yet. Power on and wait for SIGNAL OK.";return}
  const r=await fetch("/api/readings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bpm:S.shown,reference_bpm:$("ref").value})});
  const d=await r.json();$("msg").textContent=d.error_pct!=null?`Error vs manual count: ${d.error_pct}%`:"Saved";rows()};
rows();requestAnimationFrame(frame);
