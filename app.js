import {emptyState, resume, saveIdea, changeIdea, sectionOf, pinPrice, completionReward, storageKey} from './state.js';
import {mountNotebook} from './notebook.js';
import {palettes,covers,finishes,forms,tones,textures,pupils,flowers,icon,bloomIcon,mountAvatar} from './visuals.js';
import {dictation} from './dictation.js';

const $ = (selector, root=document) => root.querySelector(selector);
const screen = $('#screen'), menu = $('#menu'), sheet = $('#sheet');
const sections = {active:'Активные',completed:'Выполненные',archived:'Архив'};
const fullDate = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'});
const time = new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'});
const weekday = new Intl.DateTimeFormat('ru-RU',{weekday:'short'});
const monthLabel = new Intl.DateTimeFormat('ru-RU',{month:'long'});
const escape = (value='') => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const keyDate = value => {
  const d = new Date(value);
  return [d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
};
const addDays = (date,delta) => { const d=new Date(date);d.setDate(d.getDate()+delta);return d; };
const button = (action,label,html,cls='icon',extra='') => `<button type="button" class="${cls}" data-action="${action}" aria-label="${escape(label)}" ${extra}>${html}</button>`;
const heading = (title,back='',last='') => `<header class="top">${back?button(back,'Назад',icon('back')):'<span></span>'}<span>${title}</span>${last||'<span></span>'}</header>`;
const option = (action,key,label,selected=false) => button(action,label,escape(label),'',`data-value="${key}" aria-pressed="${selected}"`);
const bookDefaults = {title:'',shade:0,photo:null,finish:'classic'};
const avatarDefaults = {form:'moon',tone:'pearl',freckles:false,pupil:'round',texture:'fibers'};
let state = emptyState();
let page = 'home', section = 'active', selectedId=null, find='', dateFilter=null, yearFilter=null, bookmarks=false, selecting=false;
let selected = new Set(), editor = null, cover = null, setupStep = null, coverEditing=false, avatar = null;
let calendar, lastPastId, renderCleanup = [], sheetCleanup = [], noticeTimer, entered=false;
let storageFailed = false;

function notice(message) {
  $('#notice').textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(()=>{$('#notice').textContent='';},3300);
}
try {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const saved = JSON.parse(stored);
    if (!Array.isArray(saved.ideas) || typeof saved.balance !== 'number') throw Error('Invalid notebook');
    state = {...state,...saved};
  } else {
    const early = JSON.parse(localStorage.getItem('think.notebook.v1') || 'null');
    if (Array.isArray(early?.ideas)) {
      state.ideas = early.ideas.filter(item=>item?.id && item?.date).map(item=>({
        id:item.id, created:item.date, award:item.points||0, additions:[],
        text:[item.title,item.body].filter(Boolean).join('\n\n')
      }));
      state.balance = Number.isFinite(early.stars) ? early.stars : 0;
    }
  }
} catch { storageFailed = true; }
function apply(change) {
  if (storageFailed) {
    notice('Не удалось прочитать дневник. Сохранение недоступно.');
    return false;
  }
  const next = structuredClone(state);
  const result = change(next);
  if (result === false) return false;
  try { localStorage.setItem(storageKey,JSON.stringify(next)); }
  catch { notice('Не удалось сохранить данные. Проверь свободное место в браузере.');return false; }
  state=next;
  return true;
}
if (state.cover) apply(next=>resume(next,Date.now()));
else {setupStep='intro';cover={...bookDefaults};}
if (storageFailed) notice('Не удалось прочитать сохранённый дневник.');
document.addEventListener('visibilitychange',()=>{
  if (!document.hidden && state.cover) apply(next=>resume(next,Date.now()));
});

function showSheet(title,body,setup) {
  sheetCleanup.splice(0).forEach(clean=>clean());
  sheet.innerHTML = `<header><h2>${title}</h2>${button('close','Закрыть',icon('close'))}</header>${body}`;
  if (!sheet.open) sheet.showModal();
  setup?.();
}
sheet.addEventListener('close',()=>{if(!sheet.open)sheetCleanup.splice(0).forEach(clean=>clean());});
sheet.addEventListener('click',event=>{
  if (event.target !== sheet) return;
  const {left,right,top,bottom}=sheet.getBoundingClientRect();
  if(event.clientX<left||event.clientX>right||event.clientY<top||event.clientY>bottom)sheet.close();
});
function jump(next) {
  if (sheet.open) sheet.close();
  if (editor) {voice.stop();editor=null;}
  page=next;
  if (page!=='ideas') {selectedId=null;selecting=false;selected.clear();}
  render();
}
function startEditor(idea) {
  editor={id:idea?.id || null, text:idea?.text ?? state.draft.text, bloom:idea?.bloom ?? (idea ? null : state.draft.bloom), from:page};
  page='editor';
  render();
}
function persistDraft() {
  if (editor && !editor.id) apply(next=>{next.draft={text:editor.text,bloom:editor.bloom};});
}
function render() {
  renderCleanup.splice(0).forEach(clean=>clean());
  document.documentElement.style.setProperty('--ink',palettes[state.palette]?.[1]||'#fff');
  screen.className = setupStep ? 'setup' : page;
  if (entered) { screen.classList.add('enter');entered=false; }
  menu.hidden=Boolean(setupStep || page==='editor');
  if (!menu.hidden) renderMenu();
  if (setupStep) renderSetup();
  else if (page==='home') renderHome();
  else if (page==='ideas') renderIdeas();
  else if (page==='editor') renderEditor();
  else renderSettings();
}
function renderMenu() {
  const current = x => page===x?'aria-current="page"':'';
  const profile = state.avatar ? `<canvas class="avatar" width="74" height="74" style="width:34px;height:34px"></canvas>` : `<span class="initial">${escape((state.cover?.title||'T').slice(0,1).toUpperCase())}</span>`;
  menu.innerHTML = button('home','Главная',icon('spark',29),'',current('home'))
    + button('ideas','Мои идеи',icon('books',25),'',current('ideas'))
    + button('rewards',`Звёзды, ${state.balance}`,`<span class="wallet">${icon('star',12)} ${state.balance}</span>`,'')
    + button('settings','Профиль и настройки',profile,'',current('settings'));
  const canvas=$('canvas',menu);
  if(canvas) renderCleanup.push(mountAvatar(canvas,state.avatar));
}
function modelMarkup(title) {
  return `<button type="button" class="notebook" aria-label="${escape(title)}"><div class="book-fallback"><span></span></div><canvas aria-hidden="true"></canvas></button>`;
}
function mountBook(data,options) {
  const node=$('.notebook',screen);
  const color=covers[data.shade]?.[1] || covers[0][1];
  const fallback=$('.book-fallback',node);
  fallback.style.backgroundColor=color;
  if(data.photo)fallback.style.backgroundImage=`url("${data.photo}")`;
  $('span',fallback).textContent=data.title;
  renderCleanup.push(mountNotebook(node,{...data,color},options));
}
function renderHome() {
  screen.innerHTML = `<div class="brand">${icon('spark',18)}thinkinbrain</div><div class="home-center">
    ${modelMarkup('Открыть редактор идеи')}
    ${button('past','Из прошлых страниц',icon('book',17)+' Из прошлых страниц','past')}
  </div>`;
  mountBook(state.cover,{rotate:true,activate:()=>startEditor(),hold:past});
}
function renderSetup() {
  const photo = cover.photo ? 'Заменить фото' : 'Добавить фото';
  screen.innerHTML = (setupStep==='intro'?'':heading(setupStep==='title'?'Название':'Обложка','back'))+
    '<div class="preview-slot">'+modelMarkup(setupStep==='intro'?'Создать дневник идей':'Предпросмотр дневника')+'</div>'+
    (setupStep==='intro' ? button('setup-title','создай свой дневник идей','создай свой дневник идей','pill enter-prompt') :
      setupStep==='title' ? `<form id="name-form" class="stack cover-controls"><input class="field" id="name" aria-label="Название дневника" placeholder="Название дневника" maxlength="55" value="${escape(cover.title)}"><button class="primary" ${cover.title.trim()?'':'disabled'}>Далее</button></form>` :
      `<div class="stack cover-controls"><div class="swatches">${covers.map(([name,color],i)=>button('cover-color',name,cover.shade===i?icon('check',16):'','',`data-value="${i}" style="--swatch:${color}" aria-pressed="${cover.shade===i}"`)).join('')}</div>
        <div class="actions">${button('photo',photo,icon('photo',18)+' '+photo,'')}${cover.photo?button('remove-photo','Убрать фото','Убрать фото',''):''}</div>
        <input type="file" id="photo" accept="image/*" hidden>
        <div class="actions">${button('finish','Фактура обложки',escape(finishes[cover.finish]?.[0]||finishes.classic[0]),'outline')}${coverEditing?button('setup-title','Изменить название','Изменить название','outline'):''}</div>
        ${button('cover-save',coverEditing?'Сохранить':'Создать дневник',coverEditing?'Сохранить':'Создать дневник','primary')}
      </div>`);
  mountBook(cover,{activate:setupStep==='intro'?toTitle:undefined});
  const name=$('#name');
  name?.addEventListener('input',()=>{
    cover.title=name.value;
    $('#name-form button').disabled=!cover.title.trim();
    const fallback=$('.book-fallback span');
    if(fallback) fallback.textContent=cover.title;
  });
  $('#name-form')?.addEventListener('submit',event=>{
    event.preventDefault();
    if (!cover.title.trim()) return;
    setupStep='cover';render();
  });
  $('#photo')?.addEventListener('change',async event=>{
    const file=event.target.files[0];
    if(!file)return;
    const taskCover=cover;
    const shortcut = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src=shortcut;
      await image.decode();
      const scale=Math.min(1,800/Math.max(image.width,image.height));
      const bitmap=document.createElement('canvas');
      bitmap.width=Math.max(1,Math.round(image.width*scale));
      bitmap.height=Math.max(1,Math.round(image.height*scale));
      const ctx=bitmap.getContext('2d');
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,bitmap.width,bitmap.height);
      ctx.drawImage(image,0,0,bitmap.width,bitmap.height);
      if(cover===taskCover){cover.photo=bitmap.toDataURL('image/jpeg',.82);render();}
    } catch {notice('Не удалось открыть фото. Попробуй JPG или PNG.');}
    finally{URL.revokeObjectURL(shortcut);}
  });
}
function toTitle(){setupStep='title';render();}
function beginCover() {
  if (sheet.open) sheet.close();
  cover={...bookDefaults,...state.cover};coverEditing=true;setupStep='cover';render();
}
function chooseFinish() {
  const options=Object.entries(finishes).map(([id,[label,price]])=>
    button('finish-pick',label,`<span>${label}</span><span class="sub">${state.finishes.includes(id)?'Открыта':price+' ★'}</span>`,'row',`data-value="${id}" aria-pressed="${cover.finish===id}"`)).join('');
  showSheet('Фактуры обложки',`<p class="muted">${state.balance} ★</p><div class="stack">${options}</div>`);
}
function renderEditor() {
  screen.innerHTML = heading(editor.id?'Редактирование':'Новая мысль','back',button('save','Готово','Готово','',editor.text.trim()?'':'disabled'))+
    (editor.bloom?bloomIcon(editor.bloom,42):'')+
    '<textarea id="words" aria-label="Текст идеи" placeholder="О чём ты думаешь?" spellcheck="true"></textarea>'+
    `<div class="editor-tools">${button('numbered','Нумерованный список',icon('list'))}${button('flowers','Выбрать цветок',bloomIcon(editor.bloom,20))}
      <span id="speech-state" class="sub" aria-live="polite"></span>
      ${button('voice','Диктовать',icon('microphone',26),'mic','aria-pressed="false"')}</div>`;
  const words=$('#words');
  words.value=editor.text;
  words.addEventListener('input',()=>{
    voice.stop();
    updateEditor(words.value,false);
  });
  words.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.isComposing&&!event.shiftKey) {
      const match=words.value.slice(0,words.selectionStart).split('\n').at(-1).match(/^(\d+)\. (.*)$/);
      if(match){
        event.preventDefault();
        if(match[2].trim()) insertText('\n'+(Number(match[1])+1)+'. ');
        else {words.setRangeText('',words.selectionStart-match[0].length,words.selectionEnd,'end');updateEditor(words.value,false);}
      }
    }
  });
  refreshMic(voice.active);
}
function updateEditor(value,updateField=true) {
  if (!editor) return;
  editor.text=value;
  if(updateField && $('#words')) $('#words').value=value;
  const done=$('[data-action=save]',screen);
  if(done) done.disabled=!value.trim();
  persistDraft();
}
function insertText(text) {
  const field=$('#words');
  voice.stop();
  field.setRangeText(text,field.selectionStart,field.selectionEnd,'end');
  field.focus();
  updateEditor(field.value,false);
}
function refreshMic(active) {
  const mic=$('[data-action=voice]',screen);
  if (!mic) return;
  mic.innerHTML=icon(active?'stop':'microphone',26);
  mic.setAttribute('aria-label',active?'Остановить диктовку':'Диктовать');
  mic.setAttribute('aria-pressed',String(active));
  $('#speech-state').textContent=active?'Слушаю…':'';
}
const voice=dictation({change:value=>updateEditor(value),active:refreshMic,error:notice});

function ideaList() {
  const found = find.trim().toLocaleLowerCase('ru');
  return state.ideas.filter(item=>(bookmarks?item.bookmarked:sectionOf(item)===section)
    && (!dateFilter || keyDate(item.created)===keyDate(dateFilter))
    && (!yearFilter || new Date(item.created).getFullYear()===yearFilter)
    && (!found || [item.text,...(item.additions||[]).map(add=>add.text)].join('\n').toLocaleLowerCase('ru').includes(found)))
    .sort((a,b)=>b.created-a.created);
}
function renderIdeas() {
  const current=state.ideas.find(item=>item.id===selectedId);
  if (current) { renderDetail(current);return; }
  screen.innerHTML = heading(button('calendar','Календарь',icon('calendar',18)+' Календарь',''),'',
    button('bookmarks','Закладки',icon('bookmark'),'icon',`aria-pressed="${bookmarks}"`))+
    (dateFilter||yearFilter?button('clear-date','Сбросить дату',escape(dateFilter?fullDate.format(dateFilter):yearFilter)+' '+icon('close',14),'pill'):'')+
    (state.ideas.length?`<label class="search">${icon('search',21)}<input class="field" id="find" type="search" aria-label="Поиск по идеям" placeholder="Поиск по идеям" value="${escape(find)}"></label>`:'')+
    (bookmarks?'<h2>Закладки</h2>':`<div class="segments" aria-label="Состояние идей">${Object.entries(sections).map(([id,label])=>option('section',id,label,section===id)).join('')}</div>`)+
    `<section id="ideas-list" class="ideas"></section><div id="selection-bar"></div>`;
  renderIdeaList();
  $('#find')?.addEventListener('input',event=>{find=event.target.value;renderIdeaList();});
}
function renderIdeaList() {
  const items=ideaList();
  const target=$('#ideas-list');
  const empty=bookmarks?'Закладок пока нет.':find||dateFilter||yearFilter?'Идей не найдено.':section==='archived'?'Архив пуст.':section==='completed'?'Выполненных идей пока нет.':'Здесь появятся твои идеи. Начни с первой записи.';
  let date='';
  target.innerHTML=items.length?`<div class="actions between"><span></span>${button(selecting?'selection-cancel':'selection-start',selecting?'Отмена':'Выбрать идеи',selecting?'Отмена':icon('select'),'icon')}</div>`+
    items.map(item=>{
      const created=keyDate(item.created);
      const group=date!==created?`<h2 class="date">${fullDate.format(item.created)}</h2>`:'';
      date=created;
      return group+button('idea',item.text.slice(0,110),`<span class="preview"><span class="meta">${item.bloom?bloomIcon(item.bloom,12):''}
        ${icon('text',14)} Текст · ${time.format(item.created)} ${item.bookmarked?icon('bookmark',13):''}${item.pinnedUntil>Date.now()?icon('pin',13):''}
        </span><span class="excerpt">${escape(item.text)}</span></span>${icon(selecting?(selected.has(item.id)?'check':'select'):'next',20)}`,
        'idea',`data-value="${escape(item.id)}" ${selecting?`aria-pressed="${selected.has(item.id)}"`:''}`);
    }).join(''):`<p class="muted">${empty}</p>`;
  $('#selection-bar').innerHTML=selecting?button('delete-selected','Удалить выбранные',icon('trash',16)+' Удалить · '+selected.size,'primary',selected.size?'':'disabled'):'';
}
function renderDetail(item) {
  const current=sectionOf(item);
  const buttons=[
    current==='active'?button('complete','Выполнить',icon('check',18)+` Выполнить · +${completionReward} ★`,'outline'):'',
    current==='active'?(item.pinnedUntil>Date.now()?`<p class="muted">Закреплена до ${fullDate.format(item.pinnedUntil)}</p>`:button('pin','Закрепить на 30 дней',icon('pin',18)+` Закрепить на 30 дней · ${pinPrice} ★`,'outline')):'',
    current==='archived'?button('restore','Вернуть в активные','Вернуть в активные','outline'):'',
    button('edit','Редактировать',icon('pencil',18)+' Редактировать','outline'),
    button('add','Дополнить',icon('plus',18)+' Дополнить','outline')
  ];
  screen.innerHTML = heading('Идея','back',`<div class="actions">${button('bookmark','Закладка',icon('bookmark'),'icon',`aria-pressed="${Boolean(item.bookmarked)}"`)}${button('delete','Удалить идею',icon('trash'))}</div>`)+
    `<article id="detail-content"><p class="sub">Дата создания<br>${fullDate.format(item.created)} · ${time.format(item.created)}</p>
    ${item.bloom?bloomIcon(item.bloom,48):''}<p class="detail">${escape(item.text)}</p>`+
    (item.additions||[]).map(add=>`<div class="addition"><span class="sub">${fullDate.format(add.created)} · ${time.format(add.created)}</span><p class="detail">${escape(add.text)}</p></div>`).join('')+
    '<div class="detail-actions">'+buttons.join('')+'</div></article>';
}
function past() {
  const choices=state.ideas.filter(x=>keyDate(x.created)!==keyDate(Date.now()));
  const group=choices.length>1?choices.filter(x=>x.id!==lastPastId):choices;
  const idea=group[Math.floor(Math.random()*group.length)];
  if(!idea){showSheet('Из прошлых страниц','<p>Здесь будут появляться идеи, записанные в предыдущие дни.</p>');return;}
  lastPastId=idea.id;
  showSheet('Из прошлых страниц',`<p class="sub">${fullDate.format(idea.created)}</p><p class="detail">${escape(idea.text)}</p>${button('add','Дополнить','Дополнить','primary',`data-value="${escape(idea.id)}"`)}`);
}
function addToIdea(id) {
  showSheet('Дополнение',`<p class="sub">${fullDate.format(Date.now())}</p><form id="add-form" class="stack">
    <textarea class="field" aria-label="Текст дополнения" required></textarea><button class="primary">Сохранить</button></form>`);
  $('#add-form').addEventListener('submit',event=>{
    event.preventDefault();
    const value=$('textarea',sheet).value.trim();
    if (!value) return;
    if(apply(next=>{
      const item=next.ideas.find(idea=>idea.id===id);
      if (!item) return false;
      (item.additions??=[]).push({id:crypto.randomUUID(),created:Date.now(),text:value});
    })){sheet.close();render();}
  });
}
function openCalendar() {
  calendar={mode:yearFilter?'year':'week',date:new Date(dateFilter||new Date()),year:yearFilter||new Date().getFullYear()};
  showSheet('Календарь','<div id="calendar"></div>');
  renderCalendar();
}
function renderCalendar() {
  const view=$('#calendar',sheet);
  if(!view)return;
  const date=calendar.date;
  const month=monthLabel.format(date);
  const markers=new Set(state.ideas.map(x=>keyDate(x.created)));
  const dayButton=(d,offset=0,showWeek=false)=>{
    const dateKey=keyDate(d);
    return button('day',fullDate.format(d),`${showWeek?`<span class="sub">${weekday.format(d)}</span>`:''}<span class="day ${markers.has(dateKey)?'marked':''}">${d.getDate()}</span>`,'',
      `data-value="${d.getTime()}" aria-pressed="${dateKey===keyDate(calendar.date)}" style="--drop:${offset*offset*1.7}px"`);
  };
  const yearStart=Math.max(1900,Math.min(date.getFullYear()-8,...state.ideas.map(x=>new Date(x.created).getFullYear())));
  const yearEnd=Math.max(new Date().getFullYear()+4,date.getFullYear()+3,yearStart+12);
  const daysInMonth=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  const offset=(new Date(date.getFullYear(),date.getMonth(),1).getDay()+6)%7;
  view.innerHTML=`<div class="segments">${option('calendar-mode','week','Неделя',calendar.mode==='week')}${option('calendar-mode','month','Месяц',calendar.mode==='month')}${option('calendar-mode','year','Год',calendar.mode==='year')}</div>`+
    (calendar.mode==='year'? `<div class="calendar-head"><span class="calendar-month">${calendar.year}</span></div>
      <div class="year-grid">${Array.from({length:yearEnd-yearStart+1},(_,i)=>yearEnd-i).map(y=>option('calendar-year',y,String(y),calendar.year===y)).join('')}</div>` :
      `<div class="calendar-head"><div><div class="calendar-month">${month[0].toUpperCase()+month.slice(1)}</div><span class="sub">${date.getFullYear()}</span></div><span class="calendar-day">${date.getDate()}</span></div>`+
      (calendar.mode==='week'?`<div class="wheel">${Array.from({length:7},(_,i)=>dayButton(addDays(date,i-3),i-3,true)).join('')}</div>`:
        `<div class="actions between">${button('month-prev','Предыдущий месяц',icon('back'))}${button('month-next','Следующий месяц',icon('next'))}</div>
        <div class="month-grid">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span class="sub">${d}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:daysInMonth},(_,i)=>dayButton(new Date(date.getFullYear(),date.getMonth(),i+1))).join('')}</div>`))+
    `<div class="actions between">${button('clear-date','Все даты','Все даты','')}${button('date-apply','Показать идеи','Показать идеи','pill')}</div>`;
  const strip=$('.wheel',view);
  if(!strip)return;
  let anchor=null, delta=0, suppress=false;
  strip.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    anchor={x:event.clientX,y:event.clientY,id:event.pointerId};
    delta=0;suppress=false;
  });
  strip.addEventListener('pointermove',event=>{
    if(anchor?.id!==event.pointerId)return;
    const dx=event.clientX-anchor.x,dy=event.clientY-anchor.y;
    if(!suppress && (Math.abs(dx)<7 || Math.abs(dx)<Math.abs(dy)))return;
    if(!suppress){suppress=true;strip.setPointerCapture(event.pointerId);}
    delta=dx;
    for(const [i,node] of Array.from(strip.children).entries()) {
      node.style.transform=`translate(${Math.max(-60,Math.min(60,delta))}px,${(i-3)**2*1.7}px)`;
    }
  });
  const settle=event=>{
    if(anchor?.id!==event.pointerId)return;
    anchor=null;
    if(!suppress)return;
    const moved=Math.sign(-delta)*Math.max(1,Math.round(Math.abs(delta)/Math.max(26,strip.clientWidth/7)));
    calendar.date=addDays(calendar.date,moved);
    setTimeout(renderCalendar,0);
  };
  strip.addEventListener('pointerup',settle);
  strip.addEventListener('pointercancel',()=>{anchor=null;if(suppress)renderCalendar();});
  strip.addEventListener('click',event=>{if(suppress){event.preventDefault();event.stopPropagation();}},true);
  strip.addEventListener('wheel',event=>{
    if(Math.abs(event.deltaX)<Math.abs(event.deltaY))return;
    event.preventDefault();
    calendar.date=addDays(calendar.date,Math.sign(event.deltaX));
    renderCalendar();
  },{passive:false});
}

function renderSettings() {
  screen.innerHTML = `<section class="settings stack"><h1>Профиль и настройки</h1>`+
    button('avatar',state.avatar?'Изменить аватар':'Создать аватар',
      `<span class="actions">${state.avatar?'<canvas class="avatar" width="74" height="74" style="width:36px;height:36px"></canvas>':icon('profile',28)}
      ${state.avatar?'Изменить аватар':'Создать аватар'}</span>${icon('next',16)}`,'row')+
    button('cover-edit','Название и обложка',`<span>${escape(state.cover.title)}<br><span class="sub">Название и обложка</span></span>${icon('next',16)}`,'row')+
    `<h2>Цвет приложения</h2><div class="palette">${Object.entries(palettes).map(([id,[name,color]])=>button('palette',name,
      `<span class="color-dot" style="--swatch:${color}">${state.palette===id?icon('check',14):''}</span>${name}`,'',`data-value="${id}" aria-pressed="${state.palette===id}"`)).join('')}</div>`+
    button('rewards','Звёзды',`<span>${icon('spark',18)} Звёзды</span><span>${state.balance} ${icon('next',16)}</span>`,'row')+
    button('reset','Сбросить приложение',`<span>${icon('reset',18)} Сбросить приложение</span>${icon('next',16)}`,'row')+'</section>';
  const canvas=$('canvas',screen);
  if(canvas)renderCleanup.push(mountAvatar(canvas,state.avatar));
}
function rewards() {
  const row=(title,detail,value,action)=>`<${action?'button type="button" data-action="'+action+'"':'div'} class="reward-row"><span>${title}<span class="sub">${detail}</span></span><strong>${value}</strong></${action?'button':'div'}>`;
  showSheet('Звёзды',`<div class="reward-balance"><div class="sub">Твой баланс</div>${icon('spark',25)} ${state.balance}</div><h2>Как заработать</h2>`+
    row('Записать идею','1 ★ за запись, 2 ★ от 80 знаков, 3 ★ от 200.','+1–3 ★')+
    row('Выполнить идею','Отметь идею выполненной.','+5 ★')+
    '<h2>На что потратить</h2>'+
    row('Закрепить идею','На 30 дней. Закрепление включается внутри идеи.','12 ★','ideas')+
    row('Фактуры обложки','Лён 8 ★ · Матовая бумага 12 ★ · Тиснение 18 ★','от 8 ★','reward-cover')+
    row('Зрачки аватара','Алый вихрь 12 ★ · Двойной 16 ★ · Звёздный 20 ★','от 12 ★','reward-avatar'));
}
function avatarSheet() {
  const eye=avatar.form==='eye';
  const [label,price]=pupils[avatar.pupil];
  const locked=eye&&!state.pupils.includes(avatar.pupil);
  showSheet('Твой аватар',`<div class="avatar-preview"><canvas class="avatar" width="300" height="300" style="width:${eye?218:167}px"></canvas></div>
    <p class="sub">Форма</p><div class="segments">${Object.entries(forms).map(([id,name])=>option('avatar-form',id,name,avatar.form===id)).join('')}</div>
    <p class="sub">${eye?'Цвет радужки':'Цвет'}</p><div class="swatches">${Object.entries(tones).map(([id,[name,color]])=>
      button('avatar-tone',name,avatar.tone===id?icon('check',14):'','',`data-value="${id}" aria-pressed="${avatar.tone===id}" style="--swatch:${color}"`)).join('')}</div>
    ${eye?`<p class="sub">Фактура</p><div class="segments">${Object.entries(textures).map(([id,name])=>option('avatar-texture',id,name,avatar.texture===id)).join('')}</div>
    <p class="sub">Зрачок · ${state.balance} ★</p><div class="option-grid">${Object.entries(pupils).map(([id,[name,cost]])=>
      button('avatar-pupil',name,`${name}<br><span class="sub">${state.pupils.includes(id)?(cost?'Открыт':'Бесплатно'):cost+' ★'}</span>`,'',`data-value="${id}" aria-pressed="${avatar.pupil===id}"`)).join('')}</div>
    ${locked?button('buy-pupil',label,'Открыть за '+price+' ★','primary',state.balance<price?'disabled':''):''}`:
    `<p><label><input id="freckles" type="checkbox" ${avatar.freckles?'checked':''}> Веснушки</label></p>
    ${('FaceDetector' in window && navigator.mediaDevices?.getUserMedia)?button('track','Оживить мимикой','Оживить мимикой','outline'):''}`}
    <p>${button('save-avatar','Готово','Готово','primary',locked?'disabled':'')}</p>`,()=>{
      sheetCleanup.push(mountAvatar($('canvas',sheet),avatar));
      $('#freckles')?.addEventListener('change',event=>{avatar.freckles=event.target.checked;avatarSheet();});
    });
}
async function activateTracking() {
  const target=$('canvas',sheet);
  const caller=$('[data-action=track]',sheet);
  if(!caller || !target)return;
  caller.disabled=true;
  let stream;
  try {
    const detector=new window.FaceDetector({maxDetectedFaces:1,fastMode:true});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
    if(!target.isConnected||!sheet.open){stream.getTracks().forEach(track=>track.stop());return;}
    const video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.srcObject=stream;
    let active=true;
    let timer;
    sheetCleanup.push(()=>{
      active=false;clearTimeout(timer);video.pause();stream.getTracks().forEach(track=>track.stop());
      video.srcObject=null;
    });
    await video.play();
    const tick=async()=>{
      if(!active)return;
      try {
        const [face]=await detector.detect(video);
        if(face){const b=face.boundingBox;target.setExpression?.({
          x:Math.max(-1,Math.min(1,1-(b.x+b.width/2)*2/video.videoWidth)),
          y:Math.max(-1,Math.min(1,(b.y+b.height/2)*2/video.videoHeight-1))
        });}else target.setExpression?.(null);
      } catch {target.setExpression?.(null);}
      if(active)timer=setTimeout(tick,90);
    };
    tick();
    caller.textContent='Камера включена';
  } catch {
    stream?.getTracks().forEach(track=>track.stop());
    caller.disabled=false;
    notice('Камера недоступна. Проверь разрешение в браузере.');
  }
}
function confirmAction(title,message,label,confirm,cancel) {
  showSheet(title,`<p>${escape(message)}</p><div class="actions between">
    ${button('confirm-cancel','Отмена','Отмена','outline')}
    ${button('confirm-yes',label,escape(label),'outline')}</div>`);
  $('[data-action=confirm-yes]',sheet).addEventListener('click',()=>{sheet.close();confirm();},{once:true});
  $('[data-action=confirm-cancel]',sheet).addEventListener('click',()=>{sheet.close();cancel?.();},{once:true});
}
function deleteIdeas(ids) {
  if(!ids.length)return;
  confirmAction('Удалить идеи?',ids.length===1?'Идея и её дополнения будут удалены.':`Будут удалены выбранные идеи (${ids.length}) и их дополнения.`,'Удалить',()=>{
    if(apply(next=>{next.ideas=next.ideas.filter(x=>!ids.includes(x.id));})){
      if(ids.includes(selectedId))selectedId=null;
      selecting=false;selected.clear();render();
    }
  });
}
function changeCurrent(action) {
  if(apply(next=>changeIdea(next,selectedId,action,Date.now())))render();
}
function goBack() {
  if(sheet.open) {sheet.close();return;}
  if(setupStep){
    if(setupStep==='title')setupStep=coverEditing?'cover':'intro';
    else if(setupStep==='cover')setupStep=coverEditing?null:'title';
    if(!setupStep){cover=null;coverEditing=false;}
  } else if(page==='editor'){
    const from=editor.from;
    voice.stop();persistDraft();editor=null;page=from;
  } else if(selectedId) selectedId=null;
  else if(selecting){selecting=false;selected.clear();}
  else if(page!=='home') page='home';
  render();
}

document.addEventListener('click',event=>{
  const control=event.target.closest('button[data-action]');
  if(!control || control.disabled)return;
  const {action,value}=control.dataset;
  switch(action) {
    case 'home':case 'ideas':case 'settings': jump(action);break;
    case 'back':goBack();break;
    case 'close':sheet.close();break;
    case 'setup-title':toTitle();break;
    case 'cover-color':cover.shade=Number(value);render();break;
    case 'photo':$('#photo').click();break;
    case 'remove-photo':cover.photo=null;render();break;
    case 'finish':chooseFinish();break;
    case 'finish-pick': {
      const [label,price]=finishes[value];
      const select=()=>{cover.finish=value;sheet.close();render();};
      if(state.finishes.includes(value))select();
      else if(state.balance<price)notice('Пока не хватает звёзд.');
      else confirmAction(label,`Открыть фактуру за ${price} ★?`,'Открыть',()=>{
        if(apply(next=>{if(next.balance<price||next.finishes.includes(value))return false;next.balance-=price;next.finishes.push(value);}))select();
      },chooseFinish);
      break;
    }
    case 'reward-cover': beginCover();chooseFinish();break;
    case 'cover-edit':beginCover();break;
    case 'cover-save':
      if(apply(next=>{next.cover={...cover,title:cover.title.trim()};if(!coverEditing)resume(next,Date.now());})){
        page=coverEditing?'settings':'home';coverEditing=false;setupStep=null;cover=null;entered=true;render();
      }break;
    case 'past':past();break;
    case 'save': {
      voice.stop();
      const prior=editor.id;
      let saved;
      if(apply(next=>{saved=saveIdea(next,prior,editor.text,editor.bloom,Date.now(),crypto.randomUUID());return Boolean(saved);})){
        editor=null;page='ideas';selectedId=prior?saved.id:null;
        if(!prior){section='active';find='';bookmarks=false;dateFilter=null;yearFilter=null;}
        render();
      }break;
    }
    case 'flowers':
      voice.stop();
      showSheet('Цветок идеи',`<div class="flower-grid">${Object.entries(flowers).map(([id,name])=>button('flower',name,bloomIcon(id,24)+name,'',`data-value="${id}" aria-pressed="${editor.bloom===id}"`)).join('')}</div>`+
        (editor.bloom?button('flower','Убрать цветок','Убрать цветок','outline'):''));
      break;
    case 'flower':
      editor.bloom=value||null;persistDraft();sheet.close();render();break;
    case 'numbered': {
      const field=$('#words');
      const before=field.value.slice(0,field.selectionStart);
      const numbers=Array.from(before.matchAll(/^\s*(\d+)\. /gm));
      insertText((before && !before.endsWith('\n')?'\n':'')+(numbers.length?Number(numbers.at(-1)[1])+1:1)+'. ');
      break;
    }
    case 'voice':
      if(voice.active)voice.stop();
      else {$('#words').blur();voice.start(editor.text);}
      break;
    case 'idea':
      if(selecting){if(selected.has(value))selected.delete(value);else selected.add(value);renderIdeaList();}
      else {selectedId=value;render();window.scrollTo(0,0);}
      break;
    case 'section':section=value;selecting=false;selected.clear();render();break;
    case 'bookmarks':bookmarks=!bookmarks;selecting=false;selected.clear();render();break;
    case 'selection-start':selecting=true;renderIdeaList();break;
    case 'selection-cancel':selecting=false;selected.clear();renderIdeaList();break;
    case 'delete':deleteIdeas([selectedId]);break;
    case 'delete-selected':deleteIdeas([...selected]);break;
    case 'bookmark':case 'complete':case 'restore':changeCurrent(action);break;
    case 'pin':
      if(state.balance<pinPrice) notice('Для закрепления нужно 12 ★.');
      else confirmAction('Закрепить идею?','Идея останется в активных на 30 дней.','Потратить 12 ★',()=>changeCurrent('pin'));
      break;
    case 'edit': {
      const item=state.ideas.find(x=>x.id===selectedId);
      if(item)startEditor(item);
      break;
    }
    case 'add':addToIdea(value||selectedId);break;
    case 'calendar':openCalendar();break;
    case 'calendar-mode':
      calendar.mode=value;calendar.year=calendar.date.getFullYear();renderCalendar();break;
    case 'calendar-year':calendar.year=Number(value);renderCalendar();break;
    case 'day':calendar.date=new Date(Number(value));renderCalendar();break;
    case 'month-prev':case 'month-next':
      calendar.date=new Date(calendar.date.getFullYear(),calendar.date.getMonth()+(action==='month-prev'?-1:1),1);renderCalendar();break;
    case 'clear-date':
      dateFilter=null;yearFilter=null;if(sheet.open)sheet.close();render();break;
    case 'date-apply':
      dateFilter=calendar.mode==='year'?null:calendar.date;
      yearFilter=calendar.mode==='year'?calendar.year:null;
      sheet.close();render();break;
    case 'palette':if(apply(next=>{next.palette=value;}))render();break;
    case 'rewards':rewards();break;
    case 'avatar':case 'reward-avatar':
      avatar={...avatarDefaults,...state.avatar};
      if(action==='reward-avatar')avatar.form='eye';
      avatarSheet();break;
    case 'avatar-form':case 'avatar-tone':case 'avatar-texture':case 'avatar-pupil':
      avatar[action.slice(7)]=value;avatarSheet();break;
    case 'buy-pupil': {
      const id=avatar.pupil;
      const [label,price]=pupils[id];
      confirmAction(label,`Открыть зрачок за ${price} ★?`,'Открыть',()=>{
        apply(next=>{if(next.balance<price||next.pupils.includes(id))return false;next.balance-=price;next.pupils.push(id);});
        render();avatarSheet();
      },avatarSheet);break;
    }
    case 'save-avatar':
      if(apply(next=>{if(avatar.form==='eye'&&!next.pupils.includes(avatar.pupil))return false;next.avatar={...avatar};})){
        sheet.close();render();
      }break;
    case 'track':activateTracking();break;
    case 'reset':
      confirmAction('Сбросить приложение?','Дневник, идеи, черновик и звёзды будут удалены с этого устройства.','Удалить данные',()=>{
        if(apply(next=>Object.assign(next,emptyState()))){
          setupStep='intro';cover={...bookDefaults};page='home';selectedId=null;find='';dateFilter=null;yearFilter=null;bookmarks=false;section='active';selecting=false;selected.clear();lastPastId=null;render();
        }
      });break;
  }
});
let edge;
document.addEventListener('touchstart',event=>{
  const t=event.touches[0];
  edge=event.touches.length===1&&t.clientX<=20?{x:t.clientX,y:t.clientY}:null;
},{passive:true});
document.addEventListener('touchend',event=>{
  if(!edge)return;
  const t=event.changedTouches[0], dx=t.clientX-edge.x,dy=t.clientY-edge.y;
  edge=null;
  if(dx>75&&dx>Math.abs(dy)*1.6)goBack();
},{passive:true});
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline setup failed',error));
