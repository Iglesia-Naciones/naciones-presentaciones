/* Naciones Presentaciones Pro - IndexedDB v2 conserva las tiendas de la versión anterior */
const DB_NAME='naciones-presentaciones',DB_VERSION=2,CHANNEL='naciones-pro-live';
let db,media=[],songs=[],presentations=[],playlists=[],activePresentation=null,slides=[],selected=-1,activeSong=null,activeLibrary='presentations',projector=null,stageWindow=null,black=false,timerId=null,timerRemaining=600;
const $=id=>document.getElementById(id),bc=('BroadcastChannel'in window)?new BroadcastChannel(CHANNEL):null,urls=new Map();
const DEFAULT_HOTKEYS={next:'ArrowRight',previous:'ArrowLeft',blackout:'b',clear:'Escape',logo:'F4',preach:'F6',quick1:'F7',quick2:'F8',quick3:'F9'};
const DEFAULT_APP_SETTINGS={hotkeys:{...DEFAULT_HOTKEYS},transition:'fade',duration:500,autoLive:true,confirmClear:false};
let appSettings={...DEFAULT_APP_SETTINGS,...JSON.parse(localStorage.getItem('naciones-presentaciones-settings')||'{}')};
appSettings.hotkeys={...DEFAULT_HOTKEYS,...(appSettings.hotkeys||{})};
let capturingShortcut=null;

const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(s){let e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2300)}
function openDB(){return new Promise((resolve,reject)=>{let r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{let d=r.result;for(let n of ['media','songs','presentations','playlists'])if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function all(n){return new Promise((res,rej)=>{let r=db.transaction(n).objectStore(n).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(n,v){return new Promise((res,rej)=>{let r=db.transaction(n,'readwrite').objectStore(n).put(v);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function del(n,k){return new Promise((res,rej)=>{let r=db.transaction(n,'readwrite').objectStore(n).delete(k);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function objurl(k,b){if(!b)return'';let x=urls.get(k);if(x?.blob===b)return x.url;if(x)URL.revokeObjectURL(x.url);let u=URL.createObjectURL(b);urls.set(k,{blob:b,url:u});return u}
function mediaById(k){return media.find(m=>m.id===k)}
function defaultPresentation(name='Nueva presentación'){return{id:uid(),name,slides:[],updated:Date.now()}}
async function load(){db=await openDB();media=await all('media');songs=await all('songs');presentations=await all('presentations');playlists=await all('playlists');if(!presentations.length){let p=defaultPresentation('Presentación principal');presentations.push(p);await put('presentations',p)}activePresentation=presentations[0];slides=structuredClone(activePresentation.slides||[]);renderAll();document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x.dataset.library==='presentations'));renderLibraryList()}
function setView(v){document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id==='view-'+v));document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.dataset.view===v));if(v==='library')renderMedia();if(v==='songs'){renderSongs();populateSongTargets();if(activeSong)loadSongEditor()}if(v==='editor')loadEditor();if(v==='settings')loadSettingsUI()}
function currentSlide(){return slides[selected]||null}
function dataFor(s){if(!s)return null;if(s.type==='song'){let bg=mediaById(s.backgroundId);return{...s,background:bg||null}}if(s.mediaId){let m=mediaById(s.mediaId);return m?{...s,media:m}:s}return s}
function slideNode(target,s){
 target.replaceChildren();
 if(!s){target.innerHTML='<span>Sin diapositiva</span>';return}
 let d=dataFor(s),bg=d.background||(d.media&&d.media.type!=='audio'?d.media:null);
 if(bg){let el=document.createElement(bg.type==='video'?'video':'img');el.src=objurl('bg-'+bg.id,bg.blob);el.className='screen-background';if(el.tagName==='VIDEO'){el.autoplay=true;el.loop=true;el.muted=target.id!=='projection-screen';el.playsInline=true;el.play().catch(()=>{})}target.append(el)}
 if(d.type==='song'||d.type==='text'||d.text){
  let t=document.createElement('div');t.className='screen-text';t.textContent=d.text||'';
  t.style.fontFamily=d.fontFamily||'Montserrat';
  const designSize=Number(d.fontSize)||5;
  const isCompactPreview=target.id==='operator-preview'||target.id==='editor-preview';
  t.style.fontSize=isCompactPreview
   ? `${designSize*(target.clientWidth/(window.innerWidth||1920))}vw`
   : designSize+'vw';
  t.style.color=d.color||'#fff';t.style.textAlign=d.align||'center';
  t.style.padding=`${d.marginY??8}% ${d.marginX??8}%`;t.style.lineHeight=d.lineHeight||1.3;
  t.style.alignContent=d.position==='top'?'start':d.position==='bottom'?'end':'center';
  t.style.textShadow=d.shadow===false?'none':'0 2px 9px #000';target.append(t)
 }
}
function handleExternalFileDrop(event){
 const files=event.dataTransfer?.files;
 if(!files||!files.length)return false;
 event.preventDefault();event.stopPropagation();
 importFiles(files,true);
 return true;
}
function renderSlides(){let g=$('slide-grid');$('slide-count').textContent=slides.length+' diapositivas';$('slide-position-counter').textContent=slides.length?`${selected+1} / ${slides.length}`:'0 / 0';if(!slides.length){g.innerHTML='<div class="empty-state"><b>Tu presentación está vacía</b><p>Agrega una diapositiva, una canción o un archivo multimedia.</p><button class="btn primary" id="empty-add">＋ Crear diapositiva</button></div>';if($('empty-add'))$('empty-add').onclick=createTextSlide;return}
g.innerHTML=slides.map((s,i)=>{let d=dataFor(s),label=s.title||s.text?.slice(0,45)||d?.media?.name||'Diapositiva';let thumb='';if(d?.media?.type==='image')thumb=`<img src="${objurl('thumb'+d.media.id,d.media.blob)}">`;else if(d?.media?.type==='video')thumb='▶ VIDEO';else if(d?.background)thumb=`<img src="${objurl('thumbbg'+d.background.id,d.background.blob)}">`;return`<button class="slide-card ${i===selected?'selected':''}" data-slide="${i}" draggable="true"><div class="slide-thumb">${thumb}<span style="color:${esc(s.color||'#ffffff')};font-family:${esc(s.fontFamily||'Montserrat')};font-size:${Math.min(13,Math.max(8,(Number(s.fontSize)||5)*1.8))}px;line-height:${Number(s.lineHeight)||1.2};padding:${Math.min(12,Math.max(3,(Number(s.marginY)||8)/2))}px ${Math.min(16,Math.max(4,(Number(s.marginX)||8)/2))}px;text-shadow:${s.shadow===false?'none':'0 1px 4px #000'}">${esc(s.text||label)}</span></div><div class="slide-label">${i+1}. ${esc(label)}</div></button>`}).join('');
g.querySelectorAll('[data-slide]').forEach(b=>{b.onclick=()=>selectSlide(+b.dataset.slide);b.ondblclick=()=>{selectSlide(+b.dataset.slide);setView('editor');loadEditor()};b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.slide);b.classList.add('dragging')};b.ondragend=()=>b.classList.remove('dragging');b.ondragover=e=>{e.preventDefault();b.classList.add('dragover')};b.ondragleave=()=>b.classList.remove('dragover');b.ondrop=e=>{if(e.dataTransfer.files?.length)return;e.preventDefault();let from=+e.dataTransfer.getData('text/plain'),to=+b.dataset.slide;if(Number.isInteger(from)&&from!==to){let [x]=slides.splice(from,1);slides.splice(to,0,x);selected=to;saveCurrent();renderAll()}}})}
function selectSlide(i){if(i<0||i>=slides.length)return;selected=i;black=false;renderAll();if(appSettings.autoLive!==false)sendLive()}
function renderPreview(){slideNode($('operator-preview'),currentSlide());let s=currentSlide();$('preview-label').textContent=s?.title||s?.text?.slice(0,60)||'Selecciona una diapositiva'}

function renderAll(){renderSlides();renderPreview();renderLibraryList();renderMedia();renderSongs();renderBackgroundSelect();renderQuickImages();populateSongTargets()}
async function saveCurrent(){if(!activePresentation)return;activePresentation.slides=structuredClone(slides);activePresentation.updated=Date.now();await put('presentations',activePresentation)}
function sendLive(){let s=currentSlide(),msg={type:'live',slide:s?{...s,media:s.mediaId?mediaById(s.mediaId):null,background:s.backgroundId?mediaById(s.backgroundId):null}:null,black,slidesCount:slides.length,position:selected+1,transition:$('transition-type')?.value||appSettings.transition||'fade',duration:Number($('transition-duration')?.value||appSettings.duration||500)};bc?.postMessage(msg);if(projector&&!projector.closed)projector.postMessage(msg,location.origin);if(stageWindow&&!stageWindow.closed)stageWindow.postMessage({...msg,type:'stage'},location.origin)}
async function addSlide(s){slides.push({id:uid(),...s});selected=slides.length-1;await saveCurrent();renderAll();sendLive();toast('Diapositiva agregada')}
function createTextSlide(){let t=prompt('Texto de la diapositiva');if(t===null)return;addSlide({type:'text',title:t.slice(0,48)||'Texto',text:t,fontSize:5,color:'#ffffff',align:'center',position:'center',shadow:true})}
function addMediaSlide(m){addSlide({type:'media',title:m.name,mediaId:m.id})}
function getSongStyle(song){
 return {fontFamily:'Montserrat',fontSize:5,color:'#ffffff',align:'center',position:'center',marginX:8,marginY:8,lineHeight:1.3,shadow:true,...(song?.style||{})};
}
function readSongStyleForm(){
 return {fontFamily:$('song-font-family').value,fontSize:Number($('song-font-size').value),color:$('song-font-color').value,align:$('song-align').value,position:$('song-position').value,marginX:Number($('song-margin-x').value),marginY:Number($('song-margin-y').value),lineHeight:Number($('song-line-height').value),shadow:$('song-shadow').checked};
}
function writeSongStyleForm(style){
 let s={...getSongStyle({style})};
 $('song-font-family').value=s.fontFamily;$('song-font-size').value=s.fontSize;$('song-font-size-value').textContent=s.fontSize+'vw';
 $('song-font-color').value=s.color;$('song-align').value=s.align;$('song-position').value=s.position;
 $('song-margin-x').value=s.marginX;$('song-margin-x-value').textContent=s.marginX+'%';
 $('song-margin-y').value=s.marginY;$('song-margin-y-value').textContent=s.marginY+'%';
 $('song-line-height').value=s.lineHeight;$('song-line-height-value').textContent=s.lineHeight;
 $('song-shadow').checked=s.shadow;
}
function renderSongStylePreview(){
 const box=$('song-style-preview');if(!box)return;
 const raw=$('song-lyrics')?.value||'';
 const sample=splitSongParts(raw)[0]||'Vista previa de la letra';
 const style=readSongStyleForm();
 box.textContent=sample;box.style.fontFamily=style.fontFamily;box.style.fontSize=Math.max(10,Math.min(25,style.fontSize*3.2))+'px';
 box.style.color=style.color;box.style.textAlign=style.align;box.style.padding=`${Math.max(4,style.marginY/2)}% ${Math.max(4,style.marginX/2)}%`;
 box.style.lineHeight=style.lineHeight;box.style.textShadow=style.shadow?'0 2px 7px #000':'none';
}
function loadSongEditor(){
 if(!activeSong)return;
 $('song-editor-title').textContent='Editando: '+activeSong.title;
 renderBackgroundSelect();
 writeSongStyleForm(getSongStyle(activeSong));
 $('song-background').value=activeSong.backgroundId||'';
 populateSongTargets();renderSongStylePreview();
}
async function addSongSlides(song,targetPresentationId=activePresentation?.id){
 if(addSongSlides.busy){toast('Agregando canción…');return false}
 if(!song){toast('No se encontró la canción');return false}
 addSongSlides.busy=true;
 if(activeSong?.id===song.id){
  const saved=await saveSong();
  if(!saved){addSongSlides.busy=false;return false}
 }
 const parts=normalizedSongParts(song);
 if(!parts.length){addSongSlides.busy=false;toast('Esta canción no tiene letra. Escribe sus bloques y guarda primero.');return false}
 await saveCurrent();
 let target=presentations.find(p=>p.id===targetPresentationId);
 if(!target){addSongSlides.busy=false;toast('Selecciona una presentación de destino');return false}
 if(activePresentation?.id!==target.id){
  activePresentation=target;slides=structuredClone(target.slides||[]);selected=slides.length-1;
 }
 const style=getSongStyle(song),groupId=uid(),start=slides.length;
 song.parts=parts;await put('songs',song);
 parts.forEach((text,i)=>slides.push({
  id:uid(),type:'song',title:song.title+' · '+(i+1),text,
  backgroundId:song.backgroundId||null,songId:song.id,songGroupId:groupId,
  songGroupTitle:song.title,songPart:i+1,...style
 }));
 selected=start;
 activeLibrary='presentations';
 document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x.dataset.library==='presentations'));
 await saveCurrent();renderAll();sendLive();setView('show');
 toast(`“${song.title}” se agregó a “${target.name}” (${parts.length} diapositivas)`);
 addSongSlides.busy=false;return true;
}
async function addSongSlidesToPresentation(songId,presentationId){
 const song=songs.find(s=>s.id===songId);
 if(!song){toast('No se encontró la canción');return}
 hideSongContextMenu();
 return addSongSlides(song,presentationId);
}
function populateSongTargets(){
 const select=$('song-target-presentation');if(!select)return;
 const current=activePresentation?.id||'';
 select.innerHTML=presentations.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
 if(current&&presentations.some(p=>p.id===current))select.value=current;
}
function showSongContextMenu(event,songId){
 event.preventDefault();
 const menu=$('song-context-menu');if(!menu)return;
 const song=songs.find(s=>s.id===songId);if(!song)return;
 menu.innerHTML=`<div class="context-title">Agregar “${esc(song.title)}” a</div>`+
  presentations.map(p=>`<button class="context-item" data-target-song="${song.id}" data-target-presentation="${p.id}">▣ ${esc(p.name)}${p.id===activePresentation?.id?' · Actual':''}</button>`).join('')+
  `<div class="context-divider"></div><button class="context-item" data-edit-song="${song.id}">✎ Editar canción</button>`;
 menu.style.left=Math.max(8,Math.min(event.clientX,window.innerWidth-260))+'px';
 menu.style.top=Math.max(8,Math.min(event.clientY,window.innerHeight-320))+'px';
 menu.classList.remove('hidden');
 menu.querySelectorAll('[data-target-song]').forEach(b=>b.onclick=()=>addSongSlidesToPresentation(b.dataset.targetSong,b.dataset.targetPresentation));
 menu.querySelector('[data-edit-song]').onclick=()=>{hideSongContextMenu();setView('songs');selectSong(songId);loadSongEditor()};
}
function hideSongContextMenu(){$('song-context-menu')?.classList.add('hidden')}
async function newPresentation(){let name=prompt('Nombre de la presentación');if(!name)return;let p=defaultPresentation(name);presentations.push(p);await put('presentations',p);activePresentation=p;slides=[];selected=-1;renderAll();toast('Presentación creada')}
async function switchPresentation(id){let p=presentations.find(x=>x.id===id);if(!p)return;await saveCurrent();activePresentation=p;slides=structuredClone(p.slides||[]);selected=slides.length?0:-1;renderAll()}
async function renamePresentation(id){
 const presentation=presentations.find(p=>p.id===id);
 if(!presentation)return;
 const proposed=prompt('Nuevo nombre de la presentación:',presentation.name||'');
 if(proposed===null)return;
 const name=proposed.trim();
 if(!name){toast('El nombre no puede quedar vacío');return}
 const duplicate=presentations.find(p=>p.id!==id&&(p.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());
 if(duplicate){toast('Ya existe una presentación con ese nombre');return}
 if(activePresentation?.id===id)await saveCurrent();
 presentation.name=name;
 presentation.updated=Date.now();
 await put('presentations',presentation);
 if(activePresentation?.id===id)activePresentation=presentation;
 renderAll();
 toast('Presentación renombrada a “'+name+'”');
}
function renderLibraryList(){
 let items=$('library-items'),q=$('library-search').value.toLowerCase();
 $('song-count').textContent=songs.length;$('media-count').textContent=media.length;
 $('library-heading').textContent=({presentations:'Presentaciones',songs:'Canciones guardadas',media:'Medios',playlists:'Listas de servicio'})[activeLibrary];
 $('library-search').placeholder=({presentations:'Buscar presentaciones…',songs:'Buscar canciones…',media:'Buscar imágenes y videos…',playlists:'Buscar listas…'})[activeLibrary];
 if(activeLibrary==='presentations'){
  const visiblePresentations=presentations.filter(p=>{
   const matchesSavedSong=songs.some(s=>(s.title||'').trim().toLocaleLowerCase()===(p.name||'').trim().toLocaleLowerCase());
   return !((p.slides||[]).length===0 && matchesSavedSong);
  });
  $('presentation-count').textContent=visiblePresentations.length;
  const presentationCards=visiblePresentations.filter(p=>(p.name||'').toLowerCase().includes(q)).map(p=>{
   const ps=p.slides||[],active=p.id===activePresentation?.id;
   return `<div class="presentation-folder ${active?'active':''}" data-drop-presentation="${p.id}">
    <div class="presentation-folder-actions">
     <button class="presentation-folder-head" data-open-presentation="${p.id}">
      <span class="folder-icon">▣</span>
      <span class="folder-name"><b>${esc(p.name)}</b><small>Presentación · ${ps.length} diapositivas</small></span>
     </button>
     <button class="presentation-rename-btn" data-rename-presentation="${p.id}" title="Cambiar nombre" aria-label="Cambiar nombre">✎</button>
    </div>
   </div>`;
  }).join('')||'<p class="muted sidebar-empty">No hay presentaciones.</p>';

  const groups=[];
  (slides||[]).forEach(s=>{
   if(s.songGroupId&&!groups.some(g=>g.id===s.songGroupId)){
    groups.push({id:s.songGroupId,title:s.songGroupTitle||s.title,slides:slides.filter(x=>x.songGroupId===s.songGroupId)});
   }
  });
  const visibleGroups=groups.filter(g=>!q||g.title.toLowerCase().includes(q));
  const songFolders=visibleGroups.map(g=>`
   <div class="song-library-folder">
    <button class="song-library-folder-head" data-songgroup="${g.id}">
     <span class="folder-icon">♫</span><span class="folder-name"><b>${esc(g.title)}</b><small>Canción · ${g.slides.length} diapositivas</small></span><span class="folder-more">⌄</span>
    </button>
    <div class="song-library-folder-children">
     ${g.slides.map((s,i)=>`<button class="tree-slide" data-gslide="${s.id}">▤ ${esc(s.title||'Parte '+(i+1))}</button>`).join('')}
    </div>
   </div>`).join('');

  items.innerHTML=`<div class="sidebar-section-label">PRESENTACIONES</div>${presentationCards}
   <div class="sidebar-section-label songs-section-label">CANCIONES AGREGADAS <small>${esc(activePresentation?.name||'')}</small></div>
   ${songFolders||'<div class="sidebar-empty-hint">Las canciones que agregues a esta presentación aparecerán aquí como carpetas, con sus diapositivas dentro.</div>'}`;

  items.querySelectorAll('[data-open-presentation]').forEach(b=>b.onclick=()=>switchPresentation(b.closest('[data-drop-presentation]').dataset.dropPresentation));
  items.querySelectorAll('[data-rename-presentation]').forEach(b=>{
   b.onclick=e=>{e.preventDefault();e.stopPropagation();renamePresentation(b.dataset.renamePresentation)};
  });
  items.querySelectorAll('[data-open-presentation]').forEach(b=>{
   b.oncontextmenu=e=>{e.preventDefault();renamePresentation(b.closest('[data-drop-presentation]').dataset.dropPresentation)};
  });
  items.querySelectorAll('[data-gslide]').forEach(b=>b.onclick=()=>{let i=slides.findIndex(s=>s.id===b.dataset.gslide);if(i>=0)selectSlide(i)});
  items.querySelectorAll('[data-songgroup]').forEach(b=>b.onclick=()=>{let i=slides.findIndex(s=>s.songGroupId===b.dataset.songgroup);if(i>=0)selectSlide(i)});
  items.querySelectorAll('[data-drop-presentation]').forEach(el=>{
   el.ondragover=e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';el.classList.add('folder-drop-active')}};
   el.ondragleave=()=>el.classList.remove('folder-drop-active');
   el.ondrop=e=>{if(!e.dataTransfer.files?.length)return;e.preventDefault();el.classList.remove('folder-drop-active');let pid=el.dataset.dropPresentation;switchPresentation(pid).then(()=>importFiles(e.dataTransfer.files,true))};
  });
  return;
 }
 let list=activeLibrary==='songs'?songs:activeLibrary==='media'?media:playlists;
 items.innerHTML=list.filter(x=>(x.name||x.title||'').toLowerCase().includes(q)).map(x=>{
  const label=activeLibrary==='songs'?'Canción · clic para agregar, clic derecho para elegir destino':activeLibrary==='media'?'Medio':'Lista';
  const base=`<button class="libitem" data-libitem="${x.id}"><span class="libicon">${activeLibrary==='songs'?'♫':activeLibrary==='media'?'▧':'☷'}</span><span><b>${esc(x.name||x.title)}</b><small>${label}</small></span></button>`;
  return activeLibrary==='media'?`<div class="libitem-wrap">${base}${x.type==='image'?`<button class="pin-side ${x.pinned?'pinned':''}" data-side-pin="${x.id}" title="${x.pinned?'Quitar de imágenes fijas':'Fijar imagen abajo'}">${x.pinned?'★':'☆'}</button>`:''}</div>`:base;
 }).join('')||'<p class="muted">No hay elementos.</p>';
 items.querySelectorAll('[data-libitem]').forEach(b=>{
  b.onclick=()=>{let id=b.dataset.libitem;if(activeLibrary==='songs'){let song=songs.find(x=>x.id===id);if(song)addSongSlides(song,activePresentation?.id)}else if(activeLibrary==='media'){let m=mediaById(id);if(m)addMediaSlide(m)}else if(activeLibrary==='playlists')loadPlaylist(id)};
  if(activeLibrary==='songs')b.oncontextmenu=e=>showSongContextMenu(e,b.dataset.libitem);
 });
 items.querySelectorAll('[data-side-pin]').forEach(b=>b.onclick=()=>togglePinnedMedia(b.dataset.sidePin));
}
function renderMedia(){
 let q=$('media-search')?.value?.toLowerCase()||'',filter=$('media-filter')?.value||'all',arr=media.filter(m=>(filter==='all'||m.type===filter)&&m.name.toLowerCase().includes(q));
 let box=$('media-cards');if(!box)return;
 box.innerHTML=arr.map(m=>`<article class="media-card"><div class="media-preview">${m.type==='image'?`<img src="${objurl('mc'+m.id,m.blob)}">`:m.type==='video'?`<video src="${objurl('mc'+m.id,m.blob)}" muted></video>`:'♫ Audio'}</div><div class="media-info"><b>${esc(m.name)}</b><small>${m.type} · ${(m.size/1048576).toFixed(1)} MB</small></div><div class="media-actions"><button class="btn small" data-addmedia="${m.id}">Agregar</button>${m.type==='image'?`<button class="btn small" data-pinmedia="${m.id}">${m.pinned?'★ Fijo':'☆ Fijar'}</button>`:''}<button class="btn small" data-delmedia="${m.id}">Eliminar</button></div></article>`).join('');
 $('media-empty').style.display=arr.length?'none':'block';
 box.querySelectorAll('[data-addmedia]').forEach(b=>b.onclick=()=>addMediaSlide(mediaById(b.dataset.addmedia)));
 box.querySelectorAll('[data-pinmedia]').forEach(b=>b.onclick=()=>togglePinnedMedia(b.dataset.pinmedia));
 box.querySelectorAll('[data-delmedia]').forEach(b=>b.onclick=async()=>{let id=b.dataset.delmedia;await del('media',id);media=media.filter(x=>x.id!==id);renderAll()});
}
async function togglePinnedMedia(id){
 let m=mediaById(id);if(!m||m.type!=='image')return;
 m.pinned=!m.pinned;await put('media',m);renderMedia();renderQuickImages();renderLibraryList();toast(m.pinned?'Imagen añadida a Imágenes fijas':'Imagen quitada de Imágenes fijas');
}
function renderQuickImages(){
 const dock=$('quick-images-grid');if(!dock)return;
 const pinned=media.filter(m=>m.type==='image'&&m.pinned);
 if(!pinned.length){dock.innerHTML='<span class="muted">Aún no hay imágenes fijas. En Biblioteca, pulsa “Fijar” en una imagen.</span>';return}
 dock.innerHTML=pinned.map((m,i)=>`<button class="quick-image-shortcut" data-quick-image="${m.id}" title="Agregar ${esc(m.name)} (${appSettings.hotkeys['quick'+(i+1)]||''})"><img src="${objurl('quick'+m.id,m.blob)}"><span>${esc(m.name)}</span><kbd>${esc(appSettings.hotkeys['quick'+(i+1)]||'')}</kbd></button>`).join('');
 dock.querySelectorAll('[data-quick-image]').forEach(b=>b.onclick=()=>{let m=mediaById(b.dataset.quickImage);if(m)addMediaSlide(m)});
}
async function importFiles(fs,addToCurrent=false){let count=0;let added=[];for(let f of fs){let type=f.type.startsWith('image/')?'image':f.type.startsWith('video/')?'video':f.type.startsWith('audio/')?'audio':null;if(!type)continue;let m={id:uid(),name:f.name,type,size:f.size,blob:f};media.push(m);await put('media',m);added.push(m);count++}if(addToCurrent){added.forEach(m=>slides.push({id:uid(),type:'media',title:m.name,mediaId:m.id}));if(added.length)selected=slides.length-1;await saveCurrent()}renderAll();if(addToCurrent)sendLive();toast(addToCurrent?count+' archivo(s) agregados directamente a '+activePresentation.name:count+' archivo(s) importado(s)')}
function splitSongParts(value){
 const blocks=Array.isArray(value)?value.map(String).join('\n\n'):String(value||'');
 return blocks.split(/\r?\n[ \t]*\r?\n+/).map(x=>x.trim()).filter(Boolean);
}
function normalizedSongParts(song){
 const source=Array.isArray(song.parts)&&song.parts.length?song.parts:(song.lyrics||song.text||'');
 return splitSongParts(source);
}
function renderSongs(){
 let box=$('song-list');if(!box)return;
 let q=$('song-search').value.toLowerCase();
 box.innerHTML=songs.filter(s=>s.title.toLowerCase().includes(q)).map(s=>`<div class="song-row-wrap"><button class="song-row ${activeSong?.id===s.id?'active':''}" data-song="${s.id}"><b>${esc(s.title)}</b><small>${esc(s.artist||'Sin artista')} · ${normalizedSongParts(s).length} diapositivas</small></button><button class="song-menu-trigger" data-song-menu="${s.id}" title="Agregar a…">⋯</button></div>`).join('')||'<p class="muted">Todavía no hay canciones guardadas.</p>';
 box.querySelectorAll('[data-song]').forEach(b=>b.onclick=()=>selectSong(b.dataset.song));
 box.querySelectorAll('[data-song-menu]').forEach(b=>b.onclick=e=>{let fake={clientX:e.clientX||b.getBoundingClientRect().right,clientY:e.clientY||b.getBoundingClientRect().top,preventDefault(){}};showSongContextMenu(fake,b.dataset.songMenu)});
 box.querySelectorAll('.song-row').forEach(b=>b.oncontextmenu=e=>showSongContextMenu(e,b.dataset.song));
}
function selectSong(id){
 activeSong=songs.find(s=>s.id===id);if(!activeSong)return;
 activeSong.parts=normalizedSongParts(activeSong);
 $('song-name').value=activeSong.title;$('song-artist').value=activeSong.artist||'';
 $('song-lyrics').value=activeSong.parts.join('\n\n');
 $('song-background').value=activeSong.backgroundId||'';
 loadSongEditor();renderSongs();
}
async function createSong(){
 let title=prompt('Nombre de la canción');if(!title)return;
 let s={id:uid(),title,artist:'',parts:[],backgroundId:null,style:{},updated:Date.now()};
 songs.push(s);await put('songs',s);selectSong(s.id);renderAll();
}
async function saveSong(){
 if(!activeSong){toast('Primero crea o selecciona una canción');return false}
 activeSong.title=$('song-name').value.trim()||'Canción';
 activeSong.artist=$('song-artist').value.trim();
 activeSong.parts=$('song-lyrics').value.split(/\r?\n[ \t]*\r?\n+/).map(x=>x.trim()).filter(Boolean);
 activeSong.backgroundId=$('song-background').value||null;
 activeSong.style=readSongStyleForm();activeSong.updated=Date.now();
 if(!activeSong.parts.length){toast('Escribe al menos una diapositiva, separando bloques con una línea en blanco.');return false}
 await saveCurrent();
 await put('songs',activeSong);
 // Keep any instance of this song already inside a presentation synchronized:
 // lyric blocks, visual style and selected background are updated in every song folder.
 const style=getSongStyle(activeSong);
 for(const p of presentations){
  if(!Array.isArray(p.slides))p.slides=[];
  const groupIds=[...new Set((p.slides||[]).filter(s=>s.songId===activeSong.id).map(s=>s.songGroupId||'legacy-'+activeSong.id))];
  let changed=false;
  for(const groupId of groupIds){
   const isLegacy=groupId==='legacy-'+activeSong.id;
   const matches=s=>s.songId===activeSong.id&&(isLegacy?!s.songGroupId:s.songGroupId===groupId);
   const oldGroup=(p.slides||[]).filter(matches);
   if(!oldGroup.length)continue;
   const firstIndex=p.slides.findIndex(matches);
   const actualGroupId=isLegacy?(oldGroup[0].songGroupId||uid()):groupId;
   const replacement=activeSong.parts.map((text,i)=>({
    ...(oldGroup[i]||{}),id:oldGroup[i]?.id||uid(),type:'song',
    title:activeSong.title+' · '+(i+1),text,backgroundId:activeSong.backgroundId||null,
    songId:activeSong.id,songGroupId:actualGroupId,songGroupTitle:activeSong.title,
    songPart:i+1,...style
   }));
   const filtered=p.slides.filter(s=>!matches(s));
   filtered.splice(Math.min(firstIndex,filtered.length),0,...replacement);
   p.slides=filtered;changed=true;
  }
  if(changed){p.updated=Date.now();await put('presentations',p)}
 }
 if(activePresentation){
  const latest=presentations.find(p=>p.id===activePresentation.id);
  if(latest){activePresentation=latest;slides=structuredClone(latest.slides||[]);selected=Math.min(selected,slides.length-1)}
 }
 renderAll();loadSongEditor();toast('Canción guardada con '+activeSong.parts.length+' diapositivas');return true;
}
function renderBackgroundSelect(){let opts='<option value="">Negro / ninguno</option>'+media.filter(m=>m.type==='image'||m.type==='video').map(m=>`<option value="${m.id}">${m.type==='video'?'Video':'Imagen'} · ${esc(m.name)}</option>`).join('');let s=$('song-background'),e=$('slide-background');if(s){let v=s.value;s.innerHTML=opts;s.value=v}if(e){let v=e.value;e.innerHTML=opts;e.value=v}}
function loadEditor(){let s=currentSlide();if(!s){$('slide-text').value='';return}$('slide-text').value=s.text||'';$('slide-kind').value=s.type==='media'?'image':s.type||'text';$('slide-background').value=s.backgroundId||'';$('slide-font-size').value=s.fontSize||5;$('slide-color').value=s.color||'#ffffff';$('slide-align').value=s.align||'center';$('slide-position').value=s.position||'center';$('slide-shadow').checked=s.shadow!==false;renderEditorPreview()}
function renderEditorPreview(){let fake={type:'text',text:$('slide-text').value,fontSize:$('slide-font-size').value,color:$('slide-color').value,align:$('slide-align').value,position:$('slide-position').value,shadow:$('slide-shadow').checked};slideNode($('editor-preview'),fake)}
function applyEditor(){let s=currentSlide();if(!s){addSlide({type:'text',title:'Texto',text:$('slide-text').value});s=currentSlide()}s.text=$('slide-text').value;s.type='text';s.title=s.text.slice(0,48)||'Texto';s.backgroundId=$('slide-background').value||null;s.fontSize=+$('slide-font-size').value;s.color=$('slide-color').value;s.align=$('slide-align').value;s.position=$('slide-position').value;s.shadow=$('slide-shadow').checked;saveCurrent();renderAll();sendLive();toast('Diapositiva actualizada')}
function renderPlaylists(){/* Playlist panel shares library list; create/load from modal */}
async function createPlaylist(){let name=prompt('Nombre de la lista de servicio');if(!name)return;let p={id:uid(),name,slides:structuredClone(slides)};playlists.push(p);await put('playlists',p);activeLibrary='playlists';renderLibraryList();toast('Lista guardada')}
async function loadPlaylist(id){let p=playlists.find(x=>x.id===id);if(!p)return;slides=structuredClone(p.slides||[]);selected=slides.length?0:-1;renderAll();setView('show')}
function openModal(title,html,action){$('modal-title').textContent=title;$('modal-body').innerHTML=html;$('modal-body').querySelector('[data-confirm]').onclick=()=>{action();$('modal').classList.add('hidden')};$('modal').classList.remove('hidden')}
function outputScreen(mode){
 document.body.innerHTML=`<main class="output ${mode}" id="output"><div class="output-bg" id="output-bg"></div><div class="output-text" id="output-text"></div><div class="output-status" id="output-status">${mode==='stage'?'VISTA DE ESCENARIO':'ESPERANDO PROYECCIÓN'}</div></main>`;
 function animateIn(el,ms,enabled){if(!enabled||!ms){el.style.opacity=1;return}el.style.opacity=0;el.animate([{opacity:0},{opacity:1}],{duration:ms,easing:'ease-in-out',fill:'both'});}
 function receive(m){
  if(!m||!['live','stage'].includes(m.type))return;
  let root=$('output');root.classList.toggle('is-black',m.black);if(m.black)return;
  $('output-status').style.display='none';
  let d=m.slide;if(!d){$('output-bg').replaceChildren();$('output-text').textContent='';return}
  let fade=m.transition!=='none',ms=Math.max(0,Number(m.duration)||500);
  let bg=d.background||(d.media&&d.media.type!=='audio'?d.media:null),key=bg?.id||'';
  if(key!==outputScreen.bgKey){
   outputScreen.bgKey=key;
   let layer=$('output-bg'),old=layer.firstElementChild;
   if(bg){
    let el=document.createElement(bg.type==='video'?'video':'img');el.src=URL.createObjectURL(bg.blob);
    if(el.tagName==='VIDEO'){el.autoplay=true;el.loop=true;el.playsInline=true;el.muted=true;el.play().catch(()=>{})}
    el.style.opacity=fade&&ms?0:1;layer.append(el);
    if(fade&&ms){el.animate([{opacity:0},{opacity:1}],{duration:ms,easing:'ease-in-out',fill:'both'});if(old){old.animate([{opacity:1},{opacity:0}],{duration:ms,easing:'ease-in-out',fill:'both'});setTimeout(()=>old.remove(),ms+30)}}else if(old)old.remove();
   }else{if(old&&fade&&ms){old.animate([{opacity:1},{opacity:0}],{duration:ms,fill:'both'});setTimeout(()=>old.remove(),ms+30)}else layer.replaceChildren()}
  }
  let text=$('output-text'),next=d.text||'';
  const signature=[next,d.fontFamily,d.fontSize,d.color,d.align,d.position,d.marginX,d.marginY,d.lineHeight,d.shadow].join('|');
  if(signature!==outputScreen.signature){
   outputScreen.signature=signature;outputScreen.text=next;text.textContent=next;text.style.fontSize=(d.fontSize||5)+'vw';text.style.fontFamily=d.fontFamily||'Montserrat';text.style.color=d.color||'#fff';text.style.textAlign=d.align||'center';text.style.padding=`${d.marginY??8}% ${d.marginX??8}%`;text.style.lineHeight=d.lineHeight||1.3;text.style.justifyItems=d.position==='top'?'center start':d.position==='bottom'?'center end':'center';text.style.textShadow=d.shadow===false?'none':'0 2px 10px #000';
   if(fade&&ms){text.style.opacity=0;text.animate([{opacity:0},{opacity:1}],{duration:ms,easing:'ease-in-out',fill:'both'})}else text.style.opacity=1;
  }
 }
 if(bc)bc.onmessage=e=>receive(e.data);
 window.addEventListener('message',e=>{if(e.origin===location.origin)receive(e.data)});
 window.opener?.postMessage({type:'output-ready'},location.origin)
}
outputScreen.bgKey='';outputScreen.text='';outputScreen.signature='';
function openOutput(mode){let w=window.open(location.pathname+'?output='+mode,'naciones-'+mode,'popup,width=1280,height=720');if(!w)toast('Permite las ventanas emergentes para este sitio');else{if(mode==='stage')stageWindow=w;else projector=w;setTimeout(sendLive,700)}}
function goBlack(){black=!black;sendLive();toast(black?'Pantalla negra':'Proyección activa')}
function clearOutput(){if(appSettings.confirmClear&&!confirm('¿Limpiar la salida de proyección?'))return;black=false;selected=-1;renderAll();sendLive()}
function createBibleSlide(){let ref=$('bible-reference').value.trim(),txt=$('bible-text').value.trim(),ver=$('bible-version').value.trim();if(!txt){toast('Pega el texto del pasaje primero');return}addSlide({type:'text',title:ref||'Pasaje bíblico',text:(ref?ref+'\\n':'')+txt+(ver?'\\n'+ver:''),fontSize:4.4,color:'#fff',align:'center',position:'center',shadow:true});setView('show')}
function timerRender(){let m=Math.floor(timerRemaining/60),s=timerRemaining%60;$('timer-display').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function timerStart(){if(timerId)return;timerId=setInterval(()=>{if(timerRemaining>0){timerRemaining--;timerRender()}else{clearInterval(timerId);timerId=null;toast('Temporizador terminado')}},1000)}
function timerStop(){clearInterval(timerId);timerId=null}
function timerApply(){timerStop();timerRemaining=Math.max(0,Number($('timer-minutes').value)||0)*60;timerRender()}
async function backup(){let data={version:2,media:[],songs,presentations,playlists};for(let m of media){let b=await blobToData(m.blob);data.media.push({...m,blob:b})}let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.download='naciones-presentaciones-respaldo.json';a.click();URL.revokeObjectURL(a.href)}
function blobToData(b){return new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)})}
function dataBlob(s){let [h,d]=s.split(',');let mime=h.match(/:(.*?);/)[1],raw=atob(d),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new Blob([a],{type:mime})}
async function restore(file){if(!file)return;try{let d=JSON.parse(await file.text());for(let m of d.media||[]){if(typeof m.blob==='string')m.blob=dataBlob(m.blob);await put('media',m)}for(let s of d.songs||[])await put('songs',s);for(let p of d.presentations||[])await put('presentations',p);for(let p of d.playlists||[])await put('playlists',p);media=await all('media');songs=await all('songs');presentations=await all('presentations');playlists=await all('playlists');if(presentations.length){activePresentation=presentations[0];slides=activePresentation.slides||[]}renderAll();toast('Respaldo restaurado')}catch(e){console.error(e);toast('No se pudo importar el respaldo')}}
function persistAppSettings(){localStorage.setItem('naciones-presentaciones-settings',JSON.stringify(appSettings))}
function keyLabel(key){return ({ArrowRight:'→',ArrowLeft:'←',Escape:'Esc',' ':'Espacio'})[key]||key}
function loadSettingsUI(){
 document.querySelectorAll('[data-shortcut]').forEach(b=>{b.textContent=keyLabel(appSettings.hotkeys[b.dataset.shortcut]||'');b.classList.remove('capturing')});
 $('settings-transition').value=appSettings.transition||'fade';
 $('settings-duration').value=String(appSettings.duration||500);
 $('settings-auto-live').checked=appSettings.autoLive!==false;
 $('settings-confirm-clear').checked=!!appSettings.confirmClear;
}
function saveSettingsUI(){
 appSettings.transition=$('settings-transition').value;
 appSettings.duration=Number($('settings-duration').value);
 appSettings.autoLive=$('settings-auto-live').checked;
 appSettings.confirmClear=$('settings-confirm-clear').checked;
 persistAppSettings();
 if($('transition-type'))$('transition-type').value=appSettings.transition;
 if($('transition-duration'))$('transition-duration').value=String(appSettings.duration);
 renderQuickImages();toast('Configuración guardada');
}
function captureShortcut(name,button){
 capturingShortcut=name;button.textContent='Presiona una tecla…';button.classList.add('capturing');
}
function performShortcut(e){
 const key=String(e.key||'').toLowerCase(),hot=appSettings.hotkeys||DEFAULT_HOTKEYS;
 const match=name=>String(hot[name]||'').toLowerCase()===key;
 if(match('next')){selectSlide(selected+1);return true}
 if(match('previous')){selectSlide(selected-1);return true}
 if(match('blackout')){goBlack();return true}
 if(match('clear')){clearOutput();return true}
 if(match('logo')){$('quick-logo').click();return true}
 if(match('preach')){$('quick-preach').click();return true}
 const pinned=media.filter(m=>m.type==='image'&&m.pinned);
 for(let i=0;i<3;i++){if(match('quick'+(i+1))&&pinned[i]){addMediaSlide(pinned[i]);return true}}
 return false;
}
function shortcutKeyCapture(e){
 if(!capturingShortcut)return false;
 e.preventDefault();e.stopPropagation();
 if(['Control','Alt','Shift','Meta'].includes(e.key))return true;
 const conflict=Object.entries(appSettings.hotkeys).find(([name,value])=>name!==capturingShortcut&&String(value).toLowerCase()===String(e.key).toLowerCase());
 if(conflict){toast('Esa tecla ya está asignada a otro atajo');return true}
 appSettings.hotkeys[capturingShortcut]=e.key;capturingShortcut=null;persistAppSettings();loadSettingsUI();renderQuickImages();toast('Atajo actualizado');return true;
}
function bind(){
 const dropArea=document.querySelector('.center-panel');
 if(dropArea){
  dropArea.addEventListener('dragenter',e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();dropArea.classList.add('file-drop-active')}});
  dropArea.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';dropArea.classList.add('file-drop-active')}});
  dropArea.addEventListener('dragleave',e=>{if(!dropArea.contains(e.relatedTarget))dropArea.classList.remove('file-drop-active')});
  dropArea.addEventListener('drop',e=>{dropArea.classList.remove('file-drop-active');handleExternalFileDrop(e)});
 }
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>{activeLibrary=b.dataset.library;document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x===b));renderLibraryList()});$('library-search').oninput=renderLibraryList;$('new-presentation').onclick=newPresentation;$('add-library-item').onclick=()=>activeLibrary==='presentations'?newPresentation():activeLibrary==='songs'?createSong():activeLibrary==='media'?$('file-input').click():createPlaylist();$('add-slide').onclick=createTextSlide;if($('empty-add'))$('empty-add').onclick=createTextSlide;$('save-presentation').onclick=async()=>{await saveCurrent();toast('Presentación guardada')};$('transition-type').onchange=()=>{appSettings.transition=$('transition-type').value;persistAppSettings()};$('transition-duration').onchange=()=>{appSettings.duration=Number($('transition-duration').value);persistAppSettings()};$('prev-slide').onclick=()=>selectSlide(selected-1);$('next-slide').onclick=()=>selectSlide(selected+1);$('delete-slide').onclick=()=>{if(selected<0)return;slides.splice(selected,1);selected=Math.min(selected,slides.length-1);saveCurrent();renderAll();sendLive()};$('duplicate-slide').onclick=()=>{let s=currentSlide();if(s){let c=structuredClone(s);c.id=uid();slides.splice(selected+1,0,c);selectSlide(selected+1);saveCurrent()}};$('go-live').onclick=()=>{if(selected<0&&slides.length)selected=0;sendLive();toast('Enviado a proyección')};$('blackout').onclick=$('quick-black').onclick=goBlack;$('clear-output').onclick=$('quick-clear').onclick=clearOutput;$('quick-logo').onclick=async()=>{let m=media.find(x=>/logo/i.test(x.name)&&x.type==='image');if(!m){try{let r=await fetch('./naciones-logo.png');if(!r.ok)throw new Error('logo');let blob=await r.blob();m={id:uid(),name:'Naciones logo.png',type:'image',size:blob.size,blob};media.push(m);await put('media',m);renderMedia()}catch(_){toast('No se pudo cargar el logo incluido')}}if(m)addMediaSlide(m)};$('quick-preach').onclick=()=>{setView('editor');createTextSlide()};$('open-audience').onclick=()=>openOutput('audience');$('open-stage').onclick=()=>openOutput('stage');$('import-media').onclick=()=>$('file-input').click();$('import-png').onclick=()=>{$('file-input').accept='image/png';$('file-input').click();setTimeout(()=>$('file-input').accept='image/*,video/*,audio/*',1000)};$('file-input').onchange=e=>{importFiles(e.target.files);e.target.value=''};let drop=$('media-drop-panel');if(drop){drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-active')};drop.ondragleave=()=>drop.classList.remove('drag-active');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag-active');importFiles(e.dataTransfer.files)}}$('media-search').oninput=renderMedia;$('media-filter').onchange=renderMedia;$('manage-quick-images').onclick=()=>setView('library');$('create-song').onclick=createSong;$('song-search').oninput=renderSongs;$('song-font-size').oninput=e=>$('song-font-size-value').textContent=e.target.value+'vw';$('song-margin-x').oninput=e=>$('song-margin-x-value').textContent=e.target.value+'%';$('song-margin-y').oninput=e=>$('song-margin-y-value').textContent=e.target.value+'%';$('song-line-height').oninput=e=>$('song-line-height-value').textContent=e.target.value;['song-font-family','song-font-size','song-font-color','song-align','song-position','song-margin-x','song-margin-y','song-line-height','song-shadow','song-lyrics'].forEach(id=>$(id).addEventListener('input',renderSongStylePreview));$('save-song').onclick=saveSong;$('import-song-bg').onclick=()=>$('song-bg-input').click();$('song-bg-input').onchange=async e=>{let files=[...e.target.files];if(files.length){await importFiles(files,false);let picked=[...media].reverse().find(m=>m.type==='image'||m.type==='video');if(activeSong&&picked){activeSong.backgroundId=picked.id;$('song-background').value=picked.id;await put('songs',activeSong);renderBackgroundSelect();$('song-background').value=picked.id;toast('Fondo asignado a '+activeSong.title)}}e.target.value=''};$('song-to-show').onclick=async()=>{if(activeSong){const targetId=$('song-target-presentation').value||activePresentation?.id;const saved=await saveSong();if(saved)await addSongSlides(activeSong,targetId)}else toast('Selecciona una canción')};$('editor-new').onclick=createTextSlide;$('apply-slide').onclick=applyEditor;['slide-text','slide-font-size','slide-color','slide-align','slide-position','slide-shadow'].forEach(id=>$(id).addEventListener('input',renderEditorPreview));$('bible-add').onclick=createBibleSlide;$('backup-btn').onclick=$('backup-btn').onclick=backup;$('timer-start').onclick=timerStart;$('timer-stop').onclick=timerStop;$('timer-reset').onclick=()=>{timerStop();timerRemaining=0;timerRender()};$('timer-set').onclick=timerApply;$('modal-close').onclick=()=>$('modal').classList.add('hidden');$('save-settings').onclick=saveSettingsUI;$('reset-shortcuts').onclick=()=>{appSettings.hotkeys={...DEFAULT_HOTKEYS};persistAppSettings();loadSettingsUI();renderQuickImages();toast('Atajos restaurados')};document.querySelectorAll('[data-shortcut]').forEach(b=>b.onclick=()=>captureShortcut(b.dataset.shortcut,b));$('settings-transition').onchange=()=>{appSettings.transition=$('settings-transition').value;if($('transition-type'))$('transition-type').value=appSettings.transition;persistAppSettings()};$('settings-duration').onchange=()=>{appSettings.duration=Number($('settings-duration').value);if($('transition-duration'))$('transition-duration').value=String(appSettings.duration);persistAppSettings()};$('settings-auto-live').onchange=()=>{appSettings.autoLive=$('settings-auto-live').checked;persistAppSettings()};$('settings-confirm-clear').onchange=()=>{appSettings.confirmClear=$('settings-confirm-clear').checked;persistAppSettings()};$('export-backup').onclick=backup;document.addEventListener('pointerdown',e=>{if(!e.target.closest('#song-context-menu'))hideSongContextMenu()});document.addEventListener('keydown',e=>{
 if(shortcutKeyCapture(e))return;
 if(e.target.matches('input,textarea,select,[contenteditable="true"]'))return;
 if(performShortcut(e))e.preventDefault();
});}
async function init(){if(new URLSearchParams(location.search).has('output')){outputScreen(new URLSearchParams(location.search).get('output'));return}await load();bind();$('transition-type').value=appSettings.transition||'fade';$('transition-duration').value=String(appSettings.duration||500);loadSettingsUI();$('import-backup')?.addEventListener('change',e=>restore(e.target.files[0]))}
init().catch(e=>{console.error(e);toast('Error al iniciar: '+e.message)});

if('serviceWorker' in navigator && location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn))}
