function joined(left,right) {
  if(!right)return left;
  return left + (left && !/\s$/.test(left) && !/^[,.!?;:]/.test(right) ? ' ' : '') + right;
}
export function readSpeechEvent(previous,event) {
  const next = previous.slice(0,event.resultIndex);
  for(let i=event.resultIndex;i<event.results.length;i++){
    const result=event.results[i];
    const old=previous[i];
    const text=result[0]?.transcript?.trim() || '';
    // An engine may revise or re-emit a slot after a pause. A final slot is stable.
    next[i]=old?.final?old:{text:text||old?.text||'',final:result.isFinal};
  }
  for(let i=next.length;i<previous.length;i++) if(previous[i]?.final)next[i]=previous[i];
  return next;
}
export function dictation(callbacks) {
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  let engine=null, active=false, timer, base='', slots=[], latest='', retries=0;
  const publish=()=>{
    latest=slots.reduce((text,slot)=>joined(text,slot?.text||''),base);
    callbacks.change(latest);
  };
  function finish() {
    if(!active)return;
    active=false;
    clearTimeout(timer);
    const previous=engine;engine=null;
    if(previous){try{previous.abort();}catch{}}
    callbacks.active(false);
  }
  function begin() {
    if(!active)return;
    const current=new Speech();
    engine=current;
    slots=[];
    current.lang='ru-RU';
    current.interimResults=true;
    current.continuous=true;
    current.onresult=event=>{
      if(engine!==current||!active)return;
      retries=0;
      slots=readSpeechEvent(slots,event);
      publish();
    };
    current.onerror=event=>{
      if(engine!==current||!active||event.error==='aborted'||event.error==='no-speech')return;
      callbacks.error(event.error==='not-allowed'||event.error==='service-not-allowed'?'Разреши доступ к микрофону в браузере.':'Диктовка прервана. Попробуй снова.');
      finish();
    };
    current.onend=()=>{
      if(engine!==current||!active)return;
      engine=null;
      base=latest;
      clearTimeout(timer);
      timer=setTimeout(begin,Math.min(1200,160+retries++*100));
    };
    try{current.start();}
    catch{callbacks.error('Не удалось включить диктовку.');finish();}
  }
  return {
    get active(){return active;},
    start(value){
      if(active)return;
      if(!Speech){callbacks.error('В этом браузере диктовка недоступна. Можно использовать микрофон на клавиатуре.');return;}
      base=latest=value;active=true;retries=0;callbacks.active(true);begin();
    },
    stop:finish
  };
}
