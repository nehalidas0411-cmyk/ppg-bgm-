const $=id=>document.getElementById(id),cv=$("trace"),ctx=cv.getContext("2d");
let timer,anim;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function draw(d,upto){
  const {samples:s,beats,fs}=d,W=cv.width,H=cv.height,mn=Math.min(...s),mx=Math.max(...s);
  const X=i=>i/(s.length-1)*W,Y=v=>H-12-(v-mn)/(mx-mn||1)*(H-24);
  ctx.clearRect(0,0,W,H);ctx.lineWidth=2.5;ctx.strokeStyle=css("--trace");ctx.beginPath();
  s.slice(0,upto).forEach((v,i)=>i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)));ctx.stroke();
  ctx.fillStyle=css("--teal");ctx.font="14px sans-serif";
  beats.filter(b=>b<upto).forEach(b=>{ctx.beginPath();ctx.arc(X(b),Y(s[b]),5,0,7);ctx.fill()});
}
async function run(){
  const r=await fetch(`/api/ppg?bpm=${$("b").value}&noise=${$("n").value}`);const d=await r.json();
  cancelAnimationFrame(anim);const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  let i=reduce?d.samples.length:0;
  (function step(){i=Math.min(i+8,d.samples.length);draw(d,i);if(i<d.samples.length)anim=requestAnimationFrame(step)})();
  $("bpm").textContent=d.bpm??"--";$("status").textContent=d.status;
}
["b","n"].forEach(id=>$(id).addEventListener("input",()=>{$("bv").textContent=$("b").value;$("nv").textContent=$("n").value;clearTimeout(timer);timer=setTimeout(run,250)}));
document.querySelectorAll(".calc form").forEach(f=>f.addEventListener("submit",async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(f)),o=f.querySelector(".out");
  const d=await (await fetch("/api/calc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})).json();
  o.textContent=d.bpm!==undefined?`${d.bpm} BPM`:d.voltage!==undefined?`${d.voltage} V`:d.error_pct!==undefined?`${d.error_pct}% error`:"Enter a valid value";
}));
run();
