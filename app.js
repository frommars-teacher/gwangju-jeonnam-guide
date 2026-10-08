'use strict';
const $ = id => document.getElementById(id);
const bookmarkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4Z"/></svg>';
const featuredOrder = [14,10,6,7,24,23,9,12,5,0,4,8,17,19,18,13,11,15,16,20,21,22,25,26,1,2,3];
const state = {query:'',area:'all',category:'all',savedOnly:false,selected:null,sort:'featured',map:'all',hero:14,detail:null};
let saved = new Set();
let storageAvailable=true;
try {const a=JSON.parse(localStorage.getItem('namdo-saved-v1')||'[]');if(Array.isArray(a))saved=new Set(a.filter(x=>Number.isInteger(x)&&REGIONS.some(r=>r.id===x)));} catch {storageAvailable=false;}
let lastFocus=null,toastTimer;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalized(s){return s.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g,'');}
function getResults(){
 const q=normalized(state.query);
 let rows=REGIONS.filter(r=>(state.area==='all'||r.area===state.area)&&(state.category==='all'||r.categories.includes(state.category))&&(!state.savedOnly||saved.has(r.id))&&(state.selected===null||r.id===state.selected)&&(!q||normalized([r.name,r.name+(r.group==='자치구'?'':r.group),r.area,r.rep,r.desc,...r.tags,...r.keywords].join(' ')).includes(q)));
 return rows.sort(state.sort==='name'?(a,b)=>a.name.localeCompare(b.name,'ko'):(a,b)=>featuredOrder.indexOf(a.id)-featuredOrder.indexOf(b.id));
}
function photoMarkup(r,loading='lazy',extra=''){
 return `<img src="${esc(r.photo.url)}" data-photo="${r.id}" alt="${esc(r.photo.caption)}" loading="${loading}" decoding="async" width="960" height="640" ${extra}>`;
}
function installImageRecovery(root){
 root.querySelectorAll('img[data-photo]').forEach(img=>{
  img.addEventListener('error',()=>{
   const r=REGIONS[Number(img.dataset.photo)];
   if(!img.dataset.retried){img.dataset.retried='1';img.src=r.photo.original;return;}
   img.hidden=true;
   if(!img.parentElement.querySelector('.image-fallback')){
    const fallback=document.createElement('div');fallback.className='image-fallback';
    fallback.innerHTML=`<strong>${esc(r.name)}</strong><span>사진을 불러오지 못했어요.</span>`;img.parentElement.appendChild(fallback);
   }
  });
 });
}
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function persist(){try{localStorage.setItem('namdo-saved-v1',JSON.stringify([...saved]));}catch{storageAvailable=false;}}
function updateSavedControls(){
 $('savedCount').textContent=saved.size;$('savedNav').setAttribute('aria-pressed',String(state.savedOnly));
 document.querySelectorAll('[data-save]').forEach(b=>{const id=Number(b.dataset.save),r=REGIONS[id];b.setAttribute('aria-pressed',String(saved.has(id)));b.setAttribute('aria-label',`${r.name} ${saved.has(id)?'담기 취소':'담기'}`);if(b.classList.contains('detail-save'))b.textContent=saved.has(id)?'담은 지역 ✓':'관심 지역 담기';});
}
function toggleSave(id){const r=REGIONS[id];saved.has(id)?saved.delete(id):saved.add(id);persist();updateSavedControls();if(state.savedOnly)renderResults();notify(`${r.name}${saved.has(id)?' 지역을 담았어요.':' 담기를 취소했어요.'}${!storageAvailable?' 이 창을 닫으면 저장되지 않을 수 있어요.':''}`);}
function renderResults(){
 const rows=getResults(),active=state.query||state.area!=='all'||state.category!=='all'||state.savedOnly||state.selected!==null;
 const summary=state.savedOnly?'담은 지역':state.selected!==null?`${REGIONS[state.selected].name} 지역`:state.query?`“${state.query}” 검색`:state.area==='all'?'전체 지역':state.area==='광주'?'광주광역시':'전라남도';
 $('resultSummary').innerHTML=`${esc(summary)} <strong>${rows.length}</strong>곳`;
 $('resetFilters').hidden=!active;$('clearSearch').hidden=!$('searchInput').value;
 $('activeFilters').innerHTML=[state.savedOnly?'<button class="active-filter" data-remove="saved">담은 지역<b>×</b></button>':'',state.selected!==null?`<button class="active-filter" data-remove="selected">지도 선택 · ${esc(REGIONS[state.selected].name)}<b>×</b></button>`:''].join('');
 if(!rows.length){
  $('results').innerHTML=`<div class="empty-state"><span class="empty-number">0</span><h3>${state.savedOnly?'아직 만날 지역이 남아 있어요':'검색 결과가 없어요'}</h3><p>${state.savedOnly?'카드 오른쪽 위의 책갈피를 눌러 관심 지역을 담아 보세요.':'지역 이름이나 대표 항목을 바꿔 보세요. 예: 완도, 전복, 녹차'}</p><button data-reset>전체 지역 보기</button></div>`;
 } else {
  $('results').innerHTML=rows.map((r,index)=>`<article class="region-card${r.id===state.selected?' selected':''}" data-region="${r.id}"><button class="card-open" data-detail="${r.id}" aria-label="${esc(r.name)} · ${esc(r.rep)} 자세히 보기"><div class="card-photo" style="--position:${r.photo.position}">${photoMarkup(r,index<4?'eager':'lazy')}<span class="card-badge">${r.area==='광주'?'GWANGJU':'JEONNAM'}</span><span class="card-photo-caption">${esc(r.photo.caption)}</span></div><div class="card-info"><span class="card-sub">${r.area==='광주'?'광주광역시':'전라남도'} · ${r.group}</span><div class="card-title-row"><h3 class="card-name">${esc(r.name)}</h3><span class="card-arrow" aria-hidden="true">↗</span></div><p class="card-rep">${esc(r.rep)}</p><p class="card-headline">${esc(r.headline)}</p><div class="card-tags">${r.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></button><button class="bookmark" data-save="${r.id}" aria-pressed="${saved.has(r.id)}" aria-label="${esc(r.name)} ${saved.has(r.id)?'담기 취소':'담기'}">${bookmarkIcon}</button></article>`).join('');
 }
 installImageRecovery($('results'));
 $('catalogEnd').hidden=!rows.length;
 document.querySelectorAll('[data-area]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.area===state.area)));
 document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===state.category)));
 updateSavedControls();renderMap(rows);
}
function renderMap(rows){
 const isG=state.map==='gwangju',visible=REGIONS.filter(r=>!isG||r.area==='광주'),ids=new Set(rows.map(r=>r.id));
 let box='0 0 640 460';
 if(isG){const bs=visible.map(r=>r.geometry.bounds),x=Math.min(...bs.map(b=>b[0]))-5,y=Math.min(...bs.map(b=>b[1]))-8,w=Math.max(...bs.map(b=>b[2]))-x+5,h=Math.max(...bs.map(b=>b[3]))-y+10;box=[x,y,w,h].join(' ');}
 let body=visible.map(r=>{
 const g=r.geometry;let [x,y]=g.center;
 if(r.name==='목포'){x-=8;y+=7;}if(r.name==='무안'){x+=5;y-=2;}
 const label=isG?r.name.replace('광주 ',''):r.name;
 return `<g class="map-region ${r.area==='광주'?'gwangju':''}${ids.has(r.id)?'':' dimmed'}${state.selected===r.id?' selected':''}" role="button" tabindex="0" data-map-region="${r.id}" aria-label="지도에서 ${esc(r.name)} 선택" aria-pressed="${state.selected===r.id}"><title>${esc(r.name)} · ${esc(r.rep)}</title><path d="${g.path}"/>${!isG&&r.area==='광주'?'':`<text x="${x}" y="${y}">${esc(label)}</text>`}</g>`;
 }).join('');
 if(!isG){const g=REGIONS[1].geometry.center;body+=`<g class="map-region gwangju-label" tabindex="0" role="button" aria-label="광주 5개 구 확대" data-zoom-gwangju><rect x="${g[0]-23}" y="${g[1]-11}" width="46" height="23" rx="3" fill="#f4f6eb" stroke="#afbf9d"/><text x="${g[0]}" y="${g[1]+1}">광주 +</text></g><text class="sea-label" x="155" y="225">서해</text><text class="sea-label" x="430" y="440">남해</text><text class="map-label" x="29" y="350">흑산도</text>`;}
 $('mapCanvas').innerHTML=`<svg class="region-map ${isG?'gwangju-map':''}" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-label="${isG?'광주 5개 구':'전남 22개 시·군과 광주'} 지역 선택 지도">${body}</svg>`;
 document.querySelectorAll('[data-map]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.map===state.map)));
 $('selectedNote').innerHTML=state.selected===null?'<span class="small-line"></span><p>지역의 모양도 살펴보세요.<br>바다와 맞닿은 곳은 어디일까요?</p>':`<span class="small-line"></span><p><strong>${esc(REGIONS[state.selected].name)}</strong> 지역을 골랐어요.<br>사진 카드를 열어 이야기를 만나 보세요.</p>`;
}
function resetFilters(){Object.assign(state,{query:'',area:'all',category:'all',savedOnly:false,selected:null});$('searchInput').value='';renderResults();}
function applySearch(value){state.query=value.trim();state.selected=null;state.savedOnly=false;state.area='all';state.category='all';$('searchInput').value=value;renderResults();}
function chooseRegion(id){Object.assign(state,{query:'',area:'all',category:'all',savedOnly:false,selected:id});$('searchInput').value='';renderResults();if(matchMedia('(max-width:850px)').matches)document.querySelector('.catalog').scrollIntoView({behavior:'smooth',block:'start'});}
function setHero(id){state.hero=id;const r=REGIONS[id],img=$('heroImage');img.src=r.photo.url;img.dataset.photo=id;delete img.dataset.retried;img.alt=r.photo.caption;img.style.objectPosition=r.photo.position;$('heroKicker').textContent={14:'초록이 겹겹이 쌓이는 곳',6:'바다 위로 번지는 도시의 불빛',10:'바람이 쉬어 가는 대나무 숲'}[id];$('heroDetail').innerHTML=esc({14:'보성, 녹차밭',6:'여수, 밤바다',10:'담양, 죽녹원'}[id])+' <span aria-hidden="true">↗</span>';document.querySelectorAll('[data-hero]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hero)===id)));}
function openDetail(id){
 state.detail=id;const r=REGIONS[id];if(!$('detailDialog').open)lastFocus=document.activeElement;
 $('detailContent').innerHTML=`<div class="detail-grid"><figure class="detail-figure" style="--position:${r.photo.position}">${photoMarkup(r,'eager')}<figcaption>${esc(r.photo.caption)}</figcaption></figure><div class="detail-text"><span class="detail-area">${r.area==='광주'?'광주광역시':'전라남도'} / ${r.group}</span><h2 id="detailTitle">${esc(r.name)}</h2><p class="detail-headline">${esc(r.headline)}</p><p class="detail-description">${esc(r.desc)}</p><dl class="detail-facts"><div><dt>대표하는 것</dt><dd>${esc(r.rep)}</dd></div><div><dt>찾아볼 주제</dt><dd>${r.tags.map(esc).join(' · ')}</dd></div></dl><div class="detail-actions"><button data-locate="${id}">지도에서 보기 ↗</button><button class="detail-save" data-save="${id}" aria-pressed="${saved.has(id)}" aria-label="${esc(r.name)} ${saved.has(id)?'담기 취소':'담기'}">${saved.has(id)?'담은 지역 ✓':'관심 지역 담기'}</button></div><div class="photo-credit">사진 © ${esc(r.photo.author)}<br><a href="${esc(r.photo.source)}" target="_blank" rel="noopener">원본 사진</a> · <a href="${esc(r.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a> · 화면 비율에 맞게 일부 잘림</div><div class="detail-nav"><button data-prev-detail>← 이전 지역</button><button data-next-detail>다음 지역 →</button></div></div></div>`;
 installImageRecovery($('detailContent'));if(!$('detailDialog').open)$('detailDialog').showModal();$('detailDialog').scrollTop=0;$('closeDetail').focus({preventScroll:true});
}
function adjacentDetail(dir){const rows=getResults(),order=rows.length>1?rows:featuredOrder.map(i=>REGIONS[i]);const i=order.findIndex(r=>r.id===state.detail);openDetail(order[(Math.max(0,i)+dir+order.length)%order.length].id);}
function showSaved(){state.savedOnly=true;state.query='';state.selected=null;state.area='all';state.category='all';$('searchInput').value='';renderResults();$('explore').scrollIntoView({behavior:'smooth'});}
function openCredits(){lastFocus=document.activeElement;$('creditsList').innerHTML=REGIONS.map(r=>`<div class="credit-row">${photoMarkup(r)}<div><h3>${esc(r.name)} · ${esc(r.photo.caption)}</h3><p>${esc(r.photo.author)} / <a href="${esc(r.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a><br><a href="${esc(r.photo.source)}" target="_blank" rel="noopener">${esc(r.photo.file)}</a></p></div></div>`).join('');installImageRecovery($('creditsList'));$('creditsDialog').showModal();}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();applySearch($('searchInput').value);});
$('searchInput').addEventListener('input',()=>{$('clearSearch').hidden=!$('searchInput').value;});
$('clearSearch').addEventListener('click',()=>{applySearch('');$('searchInput').focus();});
$('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderResults();});
$('resetFilters').addEventListener('click',resetFilters);
$('resetMap').addEventListener('click',()=>{state.selected=null;renderResults();});
$('savedNav').addEventListener('click',()=>{state.savedOnly?resetFilters():showSaved();});
$('showSavedBottom').addEventListener('click',showSaved);
$('heroDetail').addEventListener('click',()=>openDetail(state.hero));
$('closeDetail').addEventListener('click',()=>$('detailDialog').close());
$('closeCredits').addEventListener('click',()=>$('creditsDialog').close());
$('openCredits').addEventListener('click',openCredits);
for(const d of [$('detailDialog'),$('creditsDialog')]){
 d.addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
}
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-map-region],[data-zoom-gwangju]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-query],[data-area],[data-category],[data-detail],[data-save],[data-map],[data-map-region],[data-zoom-gwangju],[data-reset],[data-remove],[data-hero],[data-locate],[data-prev-detail],[data-next-detail]');if(!b)return;
 if(b.hasAttribute('data-save')){toggleSave(Number(b.dataset.save));return;}
 if(b.hasAttribute('data-detail')){openDetail(Number(b.dataset.detail));return;}
 if(b.hasAttribute('data-hero')){setHero(Number(b.dataset.hero));return;}
 if(b.hasAttribute('data-query')){applySearch(b.dataset.query);return;}
 if(b.hasAttribute('data-area')){state.area=b.dataset.area;state.selected=null;state.map=state.area==='광주'?'gwangju':'all';renderResults();return;}
 if(b.hasAttribute('data-category')){state.category=b.dataset.category;state.selected=null;renderResults();return;}
 if(b.hasAttribute('data-map')){state.map=b.dataset.map;renderMap(getResults());return;}
 if(b.hasAttribute('data-zoom-gwangju')){state.map='gwangju';renderMap(getResults());return;}
 if(b.hasAttribute('data-map-region')){chooseRegion(Number(b.dataset.mapRegion));return;}
 if(b.hasAttribute('data-reset')){resetFilters();return;}
 if(b.hasAttribute('data-remove')){if(b.dataset.remove==='saved')state.savedOnly=false;else state.selected=null;renderResults();return;}
 if(b.hasAttribute('data-locate')){const id=Number(b.dataset.locate);$('detailDialog').close();state.map=REGIONS[id].area==='광주'?'gwangju':'all';chooseRegion(id);document.querySelector('.map-card').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(b.hasAttribute('data-prev-detail'))adjacentDetail(-1);
 if(b.hasAttribute('data-next-detail'))adjacentDetail(1);
});
setHero(14);installImageRecovery(document.querySelector('.hero-visual'));renderResults();
