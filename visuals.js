export const palettes = {
  white:['Белый','#ffffff'], silver:['Серебро','#d6d9e0'], ice:['Лёд','#abc2f0'],
  lavender:['Лаванда','#c9b5ff'], rose:['Роза','#ffb0d1'], amber:['Янтарь','#ffc978'],
  sage:['Шалфей','#b8d6a3'], mint:['Мята','#94e6d4'], coral:['Коралл','#ffb094']
};
export const covers = [['Графит','#47474d'],['Бордо','#5e3838'],['Шалфей','#3b544d'],['Индиго','#3b4a6b'],['Песок','#786347']];
export const finishes = {classic:['Классика',0],linen:['Лён',8],paper:['Матовая бумага',12],embossed:['Тиснение',18]};
export const forms = {moon:'Луна',cat:'Кот',bear:'Медведь',eye:'Глаз'};
export const tones = {pearl:['Жемчуг','#d9d6c9'],peach:['Персик','#e08c6e'],mint:['Мята','#8cbfa3'],lilac:['Сирень','#b297d1'],blue:['Синий','#7aa3cf']};
export const textures = {fibers:'Волокна',ripples:'Кольца',shards:'Кристалл'};
export const pupils = {round:['Круглый',0],vortex:['Алый вихрь',12],double:['Двойной',16],star:['Звёздный',20]};
export const flowers = {daisy:'Ромашка',rose:'Роза',lily:'Лилия',tulip:'Тюльпан',poppy:'Мак',lavender:'Лаванда',iris:'Ирис',sunflower:'Подсолнух',bell:'Колокольчик',lotus:'Лотос'};

const paths = {
  back:'M15 4l-8 8 8 8', next:'m9 5 7 7-7 7', close:'m6 6 12 12m0-12L6 18', check:'m5 12 4 4L19 6',
  book:'M5 4h14v14H7a3 3 0 0 0 0 6h12m0-6v6M8 4v14M5 4v16', books:'M3 5h4v16H3zM8 9h4v12H8zM13 3h4v18h-4zM17 5l4-1 3 16-4 1z',
  star:'M12 2l2.8 6.5 7.2.7-5.5 4.8 1.7 7-6.2-3.7-6.2 3.7 1.7-7L2 9.2l7.2-.7z',
  calendar:'M4 4h16a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 4 4zM3 8h18M6 12h1m4 0h1m4 0h1M6 16h1m4 0h1m4 0h1',
  bookmark:'M6 3h12v18l-6-4-6 4z', select:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-13 0 3 3 5-6',
  search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zm-2 5 6 6', plus:'M12 4v16M4 12h16',
  list:'M9 5h12M9 12h12M9 19h12M4 3v4M3 11q3-3 3 0l-3 3h3M3 17h3l-2 2h2v2H3',
  text:'M3 6h17M3 12h13M3 18h10', trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  microphone:'M12 2a4 4 0 0 1 4 4v6a4 4 0 1 1-8 0V6a4 4 0 0 1 4-4zm-7 9v1a7 7 0 1 0 14 0v-1M12 19v3m-4 0h8',
  stop:'M6 6h12v12H6z', reset:'M3 10a9 9 0 1 1 2 8M3 4v6h6', pin:'M9 4h6l-1 6 3 4H7l3-4zM12 14v7',
  photo:'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8h1', pencil:'m5 15-1 5 5-1L20 8l-4-4zm8-8 4 4',
  profile:'M20 20c-1-4-4-6-8-6s-7 2-8 6m12-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'
};
const sparkPath = Array.from({length:128},(_,i) => {
  const a = i * Math.PI / 64;
  const r = 11 * (.37 + .63 * Math.abs(Math.cos(4*a))**6);
  return (i ? 'L':'M') + (12+r*Math.cos(a)).toFixed(2) + ' ' + (12+r*Math.sin(a)).toFixed(2);
}).join(' ') + 'Z';
export function icon(name, size=22) {
  const filled = name === 'spark' || name === 'star';
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${name === 'spark' ? sparkPath : paths[name] || paths.back}" fill="${filled ? 'currentColor' : 'none'}" stroke="${filled ? 'none' : 'currentColor'}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const flowerHeads = {
  daisy:'M14 7q4-7 7 0 7-1 5 5 4 4-2 7-1 6-7 2-5 4-7-2-7-1-3-7-2-6 5-5Z M21 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  rose:'M9 7q7-5 12 0 7 0 6 7-2 9-8 11-9-2-11-9-3-6 1-9Z M9 8q8 1 12 9m3-7q-8 1-12 9m6-13 3 4',
  lily:'M18 24Q6 21 6 10q8 1 12 11Q11 13 18 4q7 9 0 17 5-10 12-11-1 11-12 14Z M13 13l4 7m7-8-4 8',
  tulip:'M18 24C8 23 7 15 8 7l6 7 4-9 4 9 6-7c1 8 0 16-10 17Z M14 14l3 8m5-8-3 8',
  poppy:'M18 23Q9 27 8 19 1 16 7 10 6 4 14 7q4-6 9 0 8-2 8 5 4 6-4 7-2 7-9 4Z M14 14q4-6 8 0-4 6-8 0Z',
  lavender:'M18 24V4m0 8q-8-2-7-6 6 0 7 6Zm0 3q8-3 7-7-6 1-7 7Zm0 5q-10-1-9-6 6 0 9 6Zm0 2q10-2 9-7-7 1-9 7Z',
  iris:'M18 22Q9 25 6 18q0-6 7-7-4-7 2-8l3 6 4-6q5 2 1 8 7 0 7 7-4 6-12 4Z M12 15q6 1 6 7m7-7q-5 1-7 7',
  sunflower:'M24 14a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z M15 8q-1-8 4-6 4 1 1 7m3 1q5-6 8-3 3 3-5 6m0 2q9 0 7 5-2 4-9-2m-2 2q4 6 0 7-4 1-4-6m-3-1q-1 7-5 5-4-2 1-7m0-2q-7 4-8 0 0-4 8-3m1-2Q4 9 6 5q2-3 8 4',
  bell:'M12 8q5-5 12 0 3 4 2 10l4 5-6-1-5 2-5-2-6 1 3-5q-2-6 1-10Zm4 15q2 5 5 0',
  lotus:'M18 25Q6 25 4 14l8 4-2-9 6 4 2-9 3 9 6-4-2 9 7-4q-2 11-14 11Zm-6-7 6 7 7-7'
};
export function bloomIcon(id, size=34) {
  const path = flowerHeads[id] || flowerHeads.daisy;
  return `<svg class="bloom" aria-hidden="true" viewBox="0 0 36 52" width="${size}" height="${Math.round(size*1.35)}"><path d="${path} M18 25q2 11 0 23m1-8Q9 40 8 31q8 0 11 9Zm0 2q1-9 10-10-1 9-10 10Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function mountAvatar(canvas, design, animated=true) {
  const g=canvas.getContext('2d');
  if (!g) return () => {};
  const n=canvas.width;
  const half=n/2;
  const tone=tones[design.tone]?.[1] || tones.pearl[1];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eye=design.form==='eye';
  const iris = document.createElement('canvas');
  iris.width=iris.height=n;
  const i=iris.getContext('2d');
  if (!i) return () => {};
  const t = new Uint8ClampedArray(n*n*4);
  const channel=[1,3,5].map(k=>parseInt(tone.slice(k,k+2),16)/255);
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const dx=(x-half)/half,dy=(y-half)/half,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const noise=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    const lines=Math.sin(143*a+6*Math.sin(31*a+r*19)+r*18)*.14+Math.sin(301*a+r*42)*.09;
    const rings=Math.sin(55*r+3*Math.sin(a*17))*.12;
    const pattern=design.texture==='ripples' ? rings+lines*.4 : design.texture==='shards' ? Math.sign(lines+rings)*.16 : lines+rings*.4;
    const z=Math.max(0,1-r*r);
    const ink=.21+.36*z+.11*Math.sin(10*r)+pattern+noise*.16;
    const ix=(y*n+x)*4;
    for(let c=0;c<3;c++)t[ix+c]=255*Math.max(0,ink*(.46+.54*channel[c]));
    t[ix+3]=Math.round(255*Math.max(0,Math.min(1,(1-r)*n*.3)));
  }
  i.putImageData(new ImageData(t,n,n),0,0);
  let frame=0, stopped=false, gazeX=0,gazeY=0,live=null;
  const circle=(x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2)};
  function draw(time) {
    if(stopped || !canvas.isConnected) return;
    const u=time/1000;
    gazeX+=( (live?.x ?? (animated && !reduce ? Math.sin(u*.63)*.58+Math.sin(u*1.11)*.25 : 0))-gazeX)*.075;
    gazeY+=( (live?.y ?? (animated && !reduce ? Math.sin(u*.47+1)*.48 : 0))-gazeY)*.075;
    g.clearRect(0,0,n,n);
    const surface=g.createRadialGradient(n*.34,n*.30,n*.1,half,half,n*.48);
    if(eye){surface.addColorStop(0,'#212124');surface.addColorStop(.76,'#111115');surface.addColorStop(.96,'#303034');surface.addColorStop(1,'#666669');}
    else {surface.addColorStop(0,'#f5eee4');surface.addColorStop(.4,tone);surface.addColorStop(1,'#3a3338');}
    if(!eye && design.form!=='moon'){
      g.fillStyle=tone;
      for(const side of [-1,1]){
        const x=half+side*n*.27;
        if(design.form==='bear'){circle(x,n*.26,n*.16);g.fill();}
        else{g.beginPath();g.moveTo(x-n*.15,n*.40);g.lineTo(x,n*.05);g.lineTo(x+n*.18,n*.38);g.closePath();g.fill();}
      }
    }
    circle(half,eye?half:n*.55,n*(eye?.48:.41));
    g.fillStyle=surface;g.fill();
    if(eye){
      const x=half+gazeX*n*.16,y=half+gazeY*n*.14,r=n*.29;
      g.save();circle(half,half,n*.48);g.clip();
      g.drawImage(iris,x-r,y-r,r*2,r*2);
      g.fillStyle='#080808';
      if(design.pupil==='double'){circle(x-r*.22,y,r*.235);g.fill();circle(x+r*.22,y,r*.235);g.fill();}
      else if(design.pupil==='star'){
        g.beginPath();
        for(let k=0;k<8;k++){const a=k*Math.PI/4;const size=r*(k%2?.13:.46);g.lineTo(x+Math.cos(a)*size,y+Math.sin(a)*size);}
        g.closePath();g.fill();
      } else {
        circle(x,y,r*.36);g.fill();
        if(design.pupil==='vortex'){
          g.strokeStyle='#b44c49';g.lineWidth=r*.18;circle(x,y,r*.66);g.stroke();
          for(let k=0;k<3;k++){const a=k*Math.PI*2/3;circle(x+Math.cos(a)*r*.67,y+Math.sin(a)*r*.67,r*.16);g.fill();}
        }
      }
      g.restore();
    } else {
      g.fillStyle='#26212b';
      const blink=live?.blink ?? (animated && !reduce && Math.sin(u*1.35)>.995 ? .2 : 1);
      for(const side of [-1,1]){
        g.beginPath();g.ellipse(half+side*n*.13+gazeX*n*.04,n*.52+gazeY*n*.04,n*.042,n*.055*blink,0,0,Math.PI*2);g.fill();
      }
      g.strokeStyle='#49313d';g.lineWidth=n*.018;
      g.beginPath();g.ellipse(half,n*.66,n*.09,n*.06*(live?.smile || 1),0,.1,Math.PI-.1);g.stroke();
      if(design.freckles)for(const side of [-1,1])for(let k=0;k<3;k++){circle(half+side*(.17+.027*k)*n,(.64+.014*(k%2))*n,n*.008);g.fill();}
    }
    if(animated || live) frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);
  canvas.setExpression=value=>{live=value;};
  return () => { stopped=true;cancelAnimationFrame(frame); };
}
