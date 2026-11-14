/* Naciones Presentaciones Pro - IndexedDB v2 conserva las tiendas de la versión anterior */
const DB_NAME='naciones-presentaciones',DB_VERSION=2,CHANNEL='naciones-pro-live';
let db,media=[],songs=[],presentations=[],playlists=[],activePresentation=null,slides=[],selected=-1,activeSong=null,activeLibrary='presentations',projector=null,stageWindow=null,black=false,timerId=null,timerRemaining=600;
const $=id=>document.getElementById(id),bc=('BroadcastChannel'in window)?new BroadcastChannel(CHANNEL):null,urls=new Map();
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
async function load(){db=await openDB();media=await all('media');songs=await all('songs');presentations=await all('presentations');playlists=await all('playlists');if(!presentations.length){let p=defaultPresentation('Presentación principal');presentations.push(p);await put('presentations',p)}activePresentation=presentations[0];slides=structuredClone(activePresentation.slides||[]);renderAll();renderBrandLogo();document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x.dataset.library==='presentations'));renderLibraryList()}
function setView(v){document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id==='view-'+v));document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.dataset.view===v));if(v==='library')renderMedia();if(v==='songs')renderSongs();if(v==='editor')loadEditor()}
function currentSlide(){return slides[selected]||null}
function dataFor(s){if(!s)return null;if(s.type==='song'){let bg=mediaById(s.backgroundId);return{...s,background:bg||null}}if(s.mediaId){let m=mediaById(s.mediaId);return m?{...s,media:m}:s}return s}
function slideNode(target,s){target.replaceChildren();if(!s){target.innerHTML='<span>Sin diapositiva</span>';return}let d=dataFor(s);let bg=d.background||(d.media&&d.media.type!=='audio'?d.media:null);if(bg){let el=document.createElement(bg.type==='video'?'video':'img');el.src=objurl('bg-'+bg.id,bg.blob);el.className='';if(el.tagName==='VIDEO'){el.autoplay=true;el.loop=true;el.muted=target.id!=='projection-screen';el.playsInline=true;el.play().catch(()=>{})}target.append(el)}
if(d.type==='song'||d.type==='text'||d.text){let t=document.createElement('div');t.className='screen-text';t.textContent=d.text||'';t.style.fontSize=(d.fontSize||5)+'vw';t.style.color=d.color||'#fff';t.style.textAlign=d.align||'center';t.style.justifyItems=d.position==='top'?'center start':d.position==='bottom'?'center end':'center';t.style.textShadow=d.shadow===false?'none':'0 2px 9px #000';target.append(t)}
}
function handleExternalFileDrop(event){
 const files=event.dataTransfer?.files;
 if(!files||!files.length)return false;
 event.preventDefault();event.stopPropagation();
 importFiles(files,true);
 return true;
}
function renderSlides(){let g=$('slide-grid');$('slide-count').textContent=slides.length+' diapositivas';$('slide-position').textContent=slides.length?`${selected+1} / ${slides.length}`:'0 / 0';if(!slides.length){g.innerHTML='<div class="empty-state"><b>Tu presentación está vacía</b><p>Agrega una diapositiva, una canción o un archivo multimedia.</p><button class="btn primary" id="empty-add">＋ Crear diapositiva</button></div>';if($('empty-add'))$('empty-add').onclick=createTextSlide;return}
g.innerHTML=slides.map((s,i)=>{let d=dataFor(s),label=s.title||s.text?.slice(0,45)||d?.media?.name||'Diapositiva';let thumb='';if(d?.media?.type==='image')thumb=`<img src="${objurl('thumb'+d.media.id,d.media.blob)}">`;else if(d?.media?.type==='video')thumb='▶ VIDEO';else if(d?.background)thumb=`<img src="${objurl('thumbbg'+d.background.id,d.background.blob)}">`;return`<button class="slide-card ${i===selected?'selected':''}" data-slide="${i}" draggable="true"><div class="slide-thumb">${thumb}<span>${esc(s.text||label)}</span></div><div class="slide-label">${i+1}. ${esc(label)}</div></button>`}).join('');
g.querySelectorAll('[data-slide]').forEach(b=>{b.onclick=()=>selectSlide(+b.dataset.slide);b.ondblclick=()=>{selectSlide(+b.dataset.slide);setView('editor');loadEditor()};b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.slide);b.classList.add('dragging')};b.ondragend=()=>b.classList.remove('dragging');b.ondragover=e=>{e.preventDefault();b.classList.add('dragover')};b.ondragleave=()=>b.classList.remove('dragover');b.ondrop=e=>{if(e.dataTransfer.files?.length)return;e.preventDefault();let from=+e.dataTransfer.getData('text/plain'),to=+b.dataset.slide;if(Number.isInteger(from)&&from!==to){let [x]=slides.splice(from,1);slides.splice(to,0,x);selected=to;saveCurrent();renderAll()}}})}
function selectSlide(i){if(i<0||i>=slides.length)return;selected=i;black=false;renderAll();sendLive()}
function renderPreview(){slideNode($('operator-preview'),currentSlide());let s=currentSlide();$('preview-label').textContent=s?.title||s?.text?.slice(0,60)||'Selecciona una diapositiva'}

async function setBrandLogo(file){
 if(!file||!file.type.startsWith('image/')){toast('Selecciona un PNG o imagen válida');return}
 const item={id:uid(),name:file.name||'Naciones logo.png',type:'image',size:file.size,blob:file,brandLogo:true};
 await put('media',item);media.push(item);localStorage.setItem('naciones-brand-logo-id',item.id);renderBrandLogo();renderMedia();toast('Logotipo de Naciones guardado en este navegador')
}
function renderBrandLogo(){
 const trigger=$('brand-trigger');if(!trigger)return;
 let logoId=localStorage.getItem('naciones-brand-logo-id');
 let item=logoId?mediaById(logoId):null;
 if(!item)item=media.find(m=>m.type==='image'&&/naciones\\s*logo|logo\\s*naciones/i.test(m.name));
 if(item){localStorage.setItem('naciones-brand-logo-id',item.id);trigger.innerHTML=`<img alt="Naciones" src="${objurl('brand-logo-'+item.id,item.blob)}">`;trigger.classList.add('has-logo')}
 else{trigger.textContent='N';trigger.classList.remove('has-logo')}
}
function renderAll(){renderSlides();renderPreview();renderLibraryList();renderMedia();renderSongs();renderBackgroundSelect()}
async function saveCurrent(){if(!activePresentation)return;activePresentation.slides=structuredClone(slides);activePresentation.updated=Date.now();await put('presentations',activePresentation)}
function sendLive(){let s=currentSlide(),msg={type:'live',slide:s?{...s,media:s.mediaId?mediaById(s.mediaId):null,background:s.backgroundId?mediaById(s.backgroundId):null}:null,black,slidesCount:slides.length,position:selected+1,transition:$('transition-type')?.value||'fade',duration:Number($('transition-duration')?.value||500)};bc?.postMessage(msg);if(projector&&!projector.closed)projector.postMessage(msg,location.origin);if(stageWindow&&!stageWindow.closed)stageWindow.postMessage({...msg,type:'stage'},location.origin)}
function addSlide(s){slides.push({id:uid(),...s});selected=slides.length-1;saveCurrent();renderAll();toast('Diapositiva agregada')}
function createTextSlide(){let t=prompt('Texto de la diapositiva');if(t===null)return;addSlide({type:'text',title:t.slice(0,48)||'Texto',text:t,fontSize:5,color:'#ffffff',align:'center',position:'center',shadow:true})}
function addMediaSlide(m){addSlide({type:'media',title:m.name,mediaId:m.id})}
function addSongSlides(song){
 const groupId=uid(),start=slides.length,parts=normalizedSongParts(song);
 song.parts=parts;put('songs',song);
 parts.forEach((p,i)=>slides.push({id:uid(),type:'song',title:song.title+' · '+(i+1),text:p,backgroundId:song.backgroundId||null,songId:song.id,songGroupId:groupId,songGroupTitle:song.title,songPart:i+1,fontSize:5,color:'#ffffff',align:'center',position:'center',shadow:true}));
 selected=start;activeLibrary='presentations';document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x.dataset.library==='presentations'));saveCurrent();renderAll();sendLive();toast('Carpeta de canción agregada: '+song.title)
}
async function newPresentation(){let name=prompt('Nombre de la presentación');if(!name)return;let p=defaultPresentation(name);presentations.push(p);await put('presentations',p);activePresentation=p;slides=[];selected=-1;renderAll();toast('Presentación creada')}
async function switchPresentation(id){let p=presentations.find(x=>x.id===id);if(!p)return;await saveCurrent();activePresentation=p;slides=structuredClone(p.slides||[]);selected=slides.length?0:-1;renderAll()}
function renderLibraryList(){
 let items=$('library-items'),q=$('library-search').value.toLowerCase();
 $('song-count').textContent=songs.length;$('media-count').textContent=media.length;
 $('library-heading').textContent=({presentations:'Presentaciones',songs:'Canciones guardadas',media:'Medios',playlists:'Listas de servicio'})[activeLibrary];
 if(activeLibrary==='presentations'){
  const visiblePresentations=presentations.filter(p=>{
   const matchesSavedSong=songs.some(s=>(s.title||'').trim().toLocaleLowerCase()===(p.name||'').trim().toLocaleLowerCase());
   return !((p.slides||[]).length===0 && matchesSavedSong);
  });
  $('presentation-count').textContent=visiblePresentations.length;
  items.innerHTML=visiblePresentations.filter(p=>(p.name||'').toLowerCase().includes(q)).map(p=>{
   let active=p.id===activePresentation?.id,ps=p.slides||[],groups=[];
   ps.forEach((s,i)=>{if(s.songGroupId&&!groups.some(g=>g.id===s.songGroupId))groups.push({id:s.songGroupId,title:s.songGroupTitle||s.title,slides:ps.filter(x=>x.songGroupId===s.songGroupId)})});
   let nested=groups.map(g=>`<div class="tree-song"><button class="tree-song-head" data-songgroup="${g.id}"><span>▾</span> ♫ ${esc(g.title)} <small>${g.slides.length} diap.</small></button><div class="tree-song-children">${g.slides.map((s,i)=>`<button class="tree-slide" data-gslide="${s.id}">▤ ${esc(s.title||'Parte '+(i+1))}</button>`).join('')}</div></div>`).join('');
   return `<div class="presentation-folder ${active?'active':''}" data-presentation="${p.id}" data-drop-presentation="${p.id}" draggable="false"><button class="presentation-folder-head" data-open-presentation="${p.id}"><span class="folder-icon">▣</span><span class="folder-name"><b>${esc(p.name)}</b><small>Presentación · ${ps.length} diapositivas</small></span><span class="folder-more">⋯</span></button>${nested}</div>`
  }).join('')||'<p class="muted">No hay presentaciones.</p>';
  items.querySelectorAll('[data-open-presentation]').forEach(b=>b.onclick=()=>switchPresentation(b.dataset.openPresentation));
  items.querySelectorAll('[data-gslide]').forEach(b=>b.onclick=()=>{let i=slides.findIndex(s=>s.id===b.dataset.gslide);if(i>=0)selectSlide(i)});
  items.querySelectorAll('[data-songgroup]').forEach(b=>b.onclick=()=>{let id=b.dataset.songgroup;let i=slides.findIndex(s=>s.songGroupId===id);if(i>=0)selectSlide(i)});
  items.querySelectorAll('[data-drop-presentation]').forEach(el=>{
   el.ondragover=e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();el.classList.add('folder-drop-active')}};
   el.ondragleave=()=>el.classList.remove('folder-drop-active');
   el.ondrop=e=>{if(!e.dataTransfer.files?.length)return;e.preventDefault();el.classList.remove('folder-drop-active');let pid=el.dataset.dropPresentation;switchPresentation(pid).then(()=>importFiles(e.dataTransfer.files,true))};
  });
  return;
 }
 let list=activeLibrary==='songs'?songs:activeLibrary==='media'?media:playlists;
 items.innerHTML=list.filter(x=>(x.name||x.title||'').toLowerCase().includes(q)).map(x=>`<button class="libitem" data-libitem="${x.id}"><span class="libicon">${activeLibrary==='songs'?'♫':activeLibrary==='media'?'▧':'☷'}</span><span><b>${esc(x.name||x.title)}</b><small>${activeLibrary==='songs'?'Canción · al hacer clic se agrega como carpeta':activeLibrary==='media'?'Medio':'Lista'}</small></span></button>`).join('')||'<p class="muted">No hay elementos.</p>';
 items.querySelectorAll('[data-libitem]').forEach(b=>b.onclick=()=>{let id=b.dataset.libitem;if(activeLibrary==='songs'){let song=songs.find(x=>x.id===id);if(song)addSongSlides(song)}else if(activeLibrary==='media'){let m=mediaById(id);if(m)addMediaSlide(m)}else if(activeLibrary==='playlists')loadPlaylist(id)});
}
function renderMedia(){let q=$('media-search')?.value?.toLowerCase()||'',filter=$('media-filter')?.value||'all',arr=media.filter(m=>(filter==='all'||m.type===filter)&&m.name.toLowerCase().includes(q));let box=$('media-cards');if(!box)return;box.innerHTML=arr.map(m=>`<article class="media-card"><div class="media-preview">${m.type==='image'?`<img src="${objurl('mc'+m.id,m.blob)}">`:m.type==='video'?`<video src="${objurl('mc'+m.id,m.blob)}" muted></video>`:'♫ Audio'}</div><div class="media-info"><b>${esc(m.name)}</b><small>${m.type} · ${(m.size/1048576).toFixed(1)} MB</small></div><div class="media-actions"><button class="btn small" data-addmedia="${m.id}">Agregar</button><button class="btn small" data-delmedia="${m.id}">Eliminar</button></div></article>`).join('');$('media-empty').style.display=arr.length?'none':'block';box.querySelectorAll('[data-addmedia]').forEach(b=>b.onclick=()=>addMediaSlide(mediaById(b.dataset.addmedia)));box.querySelectorAll('[data-delmedia]').forEach(b=>b.onclick=async()=>{let id=b.dataset.delmedia;await del('media',id);media=media.filter(x=>x.id!==id);renderAll()})}
async function importFiles(fs,addToCurrent=false){let count=0;let added=[];for(let f of fs){let type=f.type.startsWith('image/')?'image':f.type.startsWith('video/')?'video':f.type.startsWith('audio/')?'audio':null;if(!type)continue;let m={id:uid(),name:f.name,type,size:f.size,blob:f};media.push(m);await put('media',m);added.push(m);count++}if(addToCurrent){added.forEach(m=>slides.push({id:uid(),type:'media',title:m.name,mediaId:m.id}));if(added.length)selected=slides.length-1;await saveCurrent()}renderAll();if(addToCurrent)sendLive();toast(addToCurrent?count+' archivo(s) agregados directamente a '+activePresentation.name:count+' archivo(s) importado(s)')}
function splitSongParts(value){
 const blocks=Array.isArray(value)?value.map(String).join('\n\n'):String(value||'');
 return blocks.split(/\r?\n[ \t]*\r?\n+/).map(x=>x.trim()).filter(Boolean);
}
function normalizedSongParts(song){
 const source=Array.isArray(song.parts)?song.parts:(song.lyrics||'');
 return splitSongParts(source);
}
function renderSongs(){let box=$('song-list');if(!box)return;let q=$('song-search').value.toLowerCase();box.innerHTML=songs.filter(s=>s.title.toLowerCase().includes(q)).map(s=>`<button class="song-row ${activeSong?.id===s.id?'active':''}" data-song="${s.id}"><b>${esc(s.title)}</b><small>${esc(s.artist||'Sin artista')} · ${normalizedSongParts(s).length} secciones</small></button>`).join('')||'<p class="muted">Todavía no hay canciones guardadas.</p>';box.querySelectorAll('[data-song]').forEach(b=>b.onclick=()=>selectSong(b.dataset.song))}
function selectSong(id){activeSong=songs.find(s=>s.id===id);if(!activeSong)return;activeSong.parts=normalizedSongParts(activeSong);$('song-name').value=activeSong.title;$('song-artist').value=activeSong.artist||'';$('song-lyrics').value=activeSong.parts.join('\n\n');$('song-background').value=activeSong.backgroundId||'';renderSongs()}
async function createSong(){let title=prompt('Nombre de la canción');if(!title)return;let s={id:uid(),title,artist:'',parts:[''],backgroundId:null,updated:Date.now()};songs.push(s);await put('songs',s);selectSong(s.id);renderAll()}
async function saveSong(){if(!activeSong){toast('Primero crea o selecciona una canción');return}activeSong.title=$('song-name').value.trim()||'Canción';activeSong.artist=$('song-artist').value.trim();activeSong.parts=$('song-lyrics').value.split(/\r?\n[ \t]*\r?\n+/).map(x=>x.trim()).filter(Boolean);activeSong.backgroundId=$('song-background').value||null;activeSong.updated=Date.now();await put('songs',activeSong);renderAll();toast('Canción guardada')}
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
  if(next!==outputScreen.text){
   outputScreen.text=next;text.textContent=next;text.style.fontSize=(d.fontSize||5)+'vw';text.style.color=d.color||'#fff';text.style.textAlign=d.align||'center';text.style.textShadow=d.shadow===false?'none':'0 2px 10px #000';
   if(fade&&ms){text.style.opacity=0;text.animate([{opacity:0},{opacity:1}],{duration:ms,easing:'ease-in-out',fill:'both'})}else text.style.opacity=1;
  }
 }
 if(bc)bc.onmessage=e=>receive(e.data);
 window.addEventListener('message',e=>{if(e.origin===location.origin)receive(e.data)});
 window.opener?.postMessage({type:'output-ready'},location.origin)
}
outputScreen.bgKey='';outputScreen.text='';
function openOutput(mode){let w=window.open(location.pathname+'?output='+mode,'naciones-'+mode,'popup,width=1280,height=720');if(!w)toast('Permite las ventanas emergentes para este sitio');else{if(mode==='stage')stageWindow=w;else projector=w;setTimeout(sendLive,700)}}
function goBlack(){black=!black;sendLive();toast(black?'Pantalla negra':'Proyección activa')}
function clearOutput(){black=false;selected=-1;renderAll();sendLive()}
function createBibleSlide(){let ref=$('bible-reference').value.trim(),txt=$('bible-text').value.trim(),ver=$('bible-version').value.trim();if(!txt){toast('Pega el texto del pasaje primero');return}addSlide({type:'text',title:ref||'Pasaje bíblico',text:(ref?ref+'\\n':'')+txt+(ver?'\\n'+ver:''),fontSize:4.4,color:'#fff',align:'center',position:'center',shadow:true});setView('show')}
function timerRender(){let m=Math.floor(timerRemaining/60),s=timerRemaining%60;$('timer-display').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function timerStart(){if(timerId)return;timerId=setInterval(()=>{if(timerRemaining>0){timerRemaining--;timerRender()}else{clearInterval(timerId);timerId=null;toast('Temporizador terminado')}},1000)}
function timerStop(){clearInterval(timerId);timerId=null}
function timerApply(){timerStop();timerRemaining=Math.max(0,Number($('timer-minutes').value)||0)*60;timerRender()}
async function backup(){let data={version:2,media:[],songs,presentations,playlists};for(let m of media){let b=await blobToData(m.blob);data.media.push({...m,blob:b})}let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.download='naciones-presentaciones-respaldo.json';a.click();URL.revokeObjectURL(a.href)}
function blobToData(b){return new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)})}
function dataBlob(s){let [h,d]=s.split(',');let mime=h.match(/:(.*?);/)[1],raw=atob(d),a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new Blob([a],{type:mime})}
async function restore(file){if(!file)return;try{let d=JSON.parse(await file.text());for(let m of d.media||[]){if(typeof m.blob==='string')m.blob=dataBlob(m.blob);await put('media',m)}for(let s of d.songs||[])await put('songs',s);for(let p of d.presentations||[])await put('presentations',p);for(let p of d.playlists||[])await put('playlists',p);media=await all('media');songs=await all('songs');presentations=await all('presentations');playlists=await all('playlists');if(presentations.length){activePresentation=presentations[0];slides=activePresentation.slides||[]}renderAll();toast('Respaldo restaurado')}catch(e){console.error(e);toast('No se pudo importar el respaldo')}}
function bind(){
 const dropArea=document.querySelector('.center-panel');
 if(dropArea){
  dropArea.addEventListener('dragenter',e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();dropArea.classList.add('file-drop-active')}});
  dropArea.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';dropArea.classList.add('file-drop-active')}});
  dropArea.addEventListener('dragleave',e=>{if(!dropArea.contains(e.relatedTarget))dropArea.classList.remove('file-drop-active')});
  dropArea.addEventListener('drop',e=>{dropArea.classList.remove('file-drop-active');handleExternalFileDrop(e)});
 }
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>{activeLibrary=b.dataset.library;document.querySelectorAll('[data-library]').forEach(x=>x.classList.toggle('active',x===b));renderLibraryList()});$('brand-trigger').onclick=()=>$('logo-input').click();
 $('logo-input').onchange=e=>{setBrandLogo(e.target.files?.[0]);e.target.value=''};
 $('library-search').oninput=renderLibraryList;$('new-presentation').onclick=newPresentation;$('add-library-item').onclick=()=>activeLibrary==='presentations'?newPresentation():activeLibrary==='songs'?createSong():activeLibrary==='media'?$('file-input').click():createPlaylist();$('add-slide').onclick=createTextSlide;if($('empty-add'))$('empty-add').onclick=createTextSlide;$('save-presentation').onclick=async()=>{await saveCurrent();toast('Presentación guardada')};$('prev-slide').onclick=()=>selectSlide(selected-1);$('next-slide').onclick=()=>selectSlide(selected+1);$('delete-slide').onclick=()=>{if(selected<0)return;slides.splice(selected,1);selected=Math.min(selected,slides.length-1);saveCurrent();renderAll();sendLive()};$('duplicate-slide').onclick=()=>{let s=currentSlide();if(s){let c=structuredClone(s);c.id=uid();slides.splice(selected+1,0,c);selectSlide(selected+1);saveCurrent()}};$('go-live').onclick=()=>{if(selected<0&&slides.length)selected=0;sendLive();toast('Enviado a proyección')};$('blackout').onclick=$('quick-black').onclick=goBlack;$('clear-output').onclick=$('quick-clear').onclick=clearOutput;$('quick-logo').onclick=()=>{let m=media.find(x=>/logo/i.test(x.name)&&x.type==='image');if(m)addMediaSlide(m);else toast('Importa un archivo con “logo” en el nombre')};$('quick-preach').onclick=()=>{setView('editor');createTextSlide()};$('open-audience').onclick=()=>openOutput('audience');$('open-stage').onclick=()=>openOutput('stage');$('import-media').onclick=()=>$('file-input').click();$('import-png').onclick=()=>{$('file-input').accept='image/png';$('file-input').click();setTimeout(()=>$('file-input').accept='image/*,video/*,audio/*',1000)};$('file-input').onchange=e=>{importFiles(e.target.files);e.target.value=''};let drop=$('media-drop-panel');if(drop){drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-active')};drop.ondragleave=()=>drop.classList.remove('drag-active');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag-active');importFiles(e.dataTransfer.files)}}$('media-search').oninput=renderMedia;$('media-filter').onchange=renderMedia;$('create-song').onclick=createSong;$('song-search').oninput=renderSongs;$('save-song').onclick=saveSong;$('song-to-show').onclick=()=>{if(activeSong){addSongSlides(activeSong);setView('show')}else toast('Selecciona una canción')};$('editor-new').onclick=createTextSlide;$('apply-slide').onclick=applyEditor;['slide-text','slide-font-size','slide-color','slide-align','slide-position','slide-shadow'].forEach(id=>$(id).addEventListener('input',renderEditorPreview));$('bible-add').onclick=createBibleSlide;$('backup-btn').onclick=$('backup-btn').onclick=backup;$('timer-start').onclick=timerStart;$('timer-stop').onclick=timerStop;$('timer-reset').onclick=()=>{timerStop();timerRemaining=0;timerRender()};$('timer-set').onclick=timerApply;$('modal-close').onclick=()=>$('modal').classList.add('hidden');document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='ArrowRight')selectSlide(selected+1);if(e.key==='ArrowLeft')selectSlide(selected-1);if(e.key.toLowerCase()==='b')goBlack();if(e.key==='Escape')clearOutput();if(e.key==='F4')$('quick-logo').click();if(e.key==='F6')$('quick-preach').click()});}
async function init(){if(new URLSearchParams(location.search).has('output')){outputScreen(new URLSearchParams(location.search).get('output'));return}await load();bind();$('import-backup')?.addEventListener('change',e=>restore(e.target.files[0]))}
init().catch(e=>{console.error(e);toast('Error al iniciar: '+e.message)});

if('serviceWorker' in navigator && location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn))}
