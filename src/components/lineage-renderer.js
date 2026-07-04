const dataPath = new URL(import.meta.url).searchParams.get("data") || "assets/data/global-lineage.json";
const DATA = await fetch(dataPath).then((response) => {
  if (!response.ok) throw new Error(`No se pudo cargar linaje: ${response.status}`);
  return response.json();
});
const canvas=document.getElementById('canvas'),svg=document.getElementById('links'),workspace=document.getElementById('workspace');
document.getElementById('cUp').textContent=DATA.counts.upstream;
document.getElementById('cDown').textContent=DATA.counts.downstream;
document.getElementById('cNb').textContent=DATA.counts.neighborhood;

// ---- layout por carriles ----
const LANE_START_X=150;
const LANE_GAP_X=600;
const LANES=[
 {role:'source',label:'Fuentes'},
 {role:'staging',label:'Staging / proceso'},
 {role:'delta',label:'Delta temporal'},
 {role:'model',label:'Data Vault'},
 {role:'consume',label:'Consumo / downstream'}
];
const laneTop=64, vgap=26;
const presentRoles=new Set(DATA.nodes.map(n=>n.role));
const VISIBLE_LANES=LANES.filter(l=>presentRoles.has(l.role)).map((lane,index)=>({...lane,x:LANE_START_X+(index*LANE_GAP_X)}));

const nodeById={};
const portMap={};
function buildNode(n){
  const sec=document.createElement('section');
  sec.className='node '+n.role;sec.id=n.id;sec.setAttribute('data-tnode','1');
  let h='<div class="head">'+n.label+' <span class="kind">'+n.kind+'</span></div>';
  h+='<div class="fields">';
  n.fields.forEach((f,i)=>{
    h+='<div class="field" data-node="'+n.id+'" data-idx="'+i+'" data-field="'+f.name.replace(/"/g,'&quot;')+'">'+
       '<i class="port left"></i><span class="nm">'+f.name+'</span><span class="type">'+(f.type||'')+'</span><i class="port right"></i></div>';
  });
  if(!n.fields.length)h+='<div class="field"><span class="nm" style="color:#94a3b8">(nivel tabla)</span></div>';
  h+='</div>';
  sec.innerHTML=h;
  canvas.appendChild(sec);
  nodeById[n.id]=n;
  // registrar puertos por referencia directa
  sec.querySelectorAll('.field[data-idx]').forEach(el=>{
    portMap[n.id+'\u0007'+n.fields[+el.dataset.idx].name]=el;
  });
  portMap[n.id+'\u0007__head__']=sec.querySelector('.head');
  return sec;
}
// stack por carril
const byLane={};VISIBLE_LANES.forEach(l=>byLane[l.role]=[]);
DATA.nodes.forEach(n=>{(byLane[n.role]||(byLane[n.role]=[])).push(n)});
VISIBLE_LANES.forEach(l=>{
  let top=laneTop;
  byLane[l.role].forEach(n=>{
    const el=buildNode(n);
    el.style.left=(l.x - el.offsetWidth/2)+'px';
    el.style.top=top+'px';
    top+=el.offsetHeight+vgap;
  });
});

// ---- relaciones ----
const fieldRels=DATA.canvasRel;
const tableRels=DATA.tableRel||[];
let rels=tableRels.length?tableRels:fieldRels;
let zoom=1;
const defaults=new Map();
document.querySelectorAll('[data-tnode]').forEach(n=>{if(n.id)defaults.set(n.id,{left:n.style.left,top:n.style.top})});

function portEl(nodeId,field){
  if(field==null)return portMap[nodeId+'\u0007__head__'];
  return portMap[nodeId+'\u0007'+field];
}
function rect(el){const c=canvas.getBoundingClientRect(),r=el.getBoundingClientRect();return{left:(r.left-c.left)/zoom,right:(r.right-c.left)/zoom,cy:(r.top-c.top+r.height/2)/zoom}}
function endpoints(a,b){const ra=rect(a),rb=rect(b),ltr=(ra.left+ra.right)/2<(rb.left+rb.right)/2;return{x1:ltr?ra.right:ra.left,y1:ra.cy,x2:ltr?rb.left:rb.right,y2:rb.cy,dir:ltr?1:-1}}
function pathFor(p){const gap=Math.abs(p.x2-p.x1),c=Math.max(50,Math.min(180,gap*.5));return`M ${p.x1} ${p.y1} C ${p.x1+c*p.dir} ${p.y1}, ${p.x2-c*p.dir} ${p.y2}, ${p.x2} ${p.y2}`}
function marker(color){return 'm'+color.replace('#','')}
function defs(){
  const cols=[...new Set(rels.map(r=>r.color))];
  svg.innerHTML='<defs>'+cols.map(c=>`<marker id="${marker(c)}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" fill="${c}"/></marker>`).join('')+'</defs>';
}
function draw(){
  defs();
  rels.forEach(rel=>{
    const a=portEl(rel.fromNode,rel.fromField),b=portEl(rel.toNode,rel.toField);
    if(!a||!b)return;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',pathFor(endpoints(a,b)));
    p.setAttribute('class','link');p.dataset.relId=rel.id;
    p.setAttribute('stroke',rel.color);p.setAttribute('stroke-width','2.1');
    p.setAttribute('fill','none');p.setAttribute('opacity','.9');p.setAttribute('stroke-linecap','round');
    p.setAttribute('marker-end',`url(#${marker(rel.color)})`);
    if(rel.stroke==='dashed')p.setAttribute('stroke-dasharray','8 6');
    p.addEventListener('mouseenter',()=>hiRel(rel.id));
    p.addEventListener('mouseleave',clearHi);
    svg.appendChild(p);
  });
}
function hiRel(id){
  document.querySelectorAll('path.link').forEach(p=>{p.classList.toggle('active',p.dataset.relId===id);p.classList.toggle('faded',p.dataset.relId!==id)});
}
function clearHi(){document.querySelectorAll('path.link').forEach(p=>p.classList.remove('active','faded'));document.querySelectorAll('.field').forEach(f=>f.classList.remove('route-active'))}
function setZoom(value){
  zoom=Math.max(.1,Math.min(2.25,value));
  canvas.style.zoom=zoom;
  document.getElementById('zoomPct').textContent=Math.round(zoom*100)+'%';
  ensureSize();draw();
}
function setRelationMode(mode,nodeId,field){
  if(mode==='field'&&nodeId&&field){
    rels=fieldRelationsFor(nodeId,field);
    document.getElementById('relMode').textContent='Vista campo: '+field;
  }else{
    const source=(activeScopeTableRels&&activeScopeTableRels.length)?activeScopeTableRels:(activeScopeFieldRels||((tableRels.length?tableRels:fieldRels)));
    rels=filterVisibleRels(source);
    document.getElementById('relMode').textContent=activeTableLabel?'Vista tabla: '+activeTableLabel:'Vista tabla';
  }
  draw();
}
let activeNodeIds=new Set(DATA.nodes.map(n=>n.id));
let activeTableLabel='';
let activeScopeFieldRels=null;
let activeScopeTableRels=null;
function filterVisibleRels(source){
  return source.filter(r=>activeNodeIds.has(r.fromNode)&&activeNodeIds.has(r.toNode));
}
function fieldRelationsFor(nodeId,field){
  const source=activeScopeFieldRels||fieldRels;
  const exact=source.filter(r=>(r.fromNode===nodeId&&r.fromField===field)||(r.toNode===nodeId&&r.toField===field));
  return filterVisibleRels(exact);
}
function layoutVisibleNodes(ids){
  document.querySelectorAll('[data-tnode]').forEach(el=>{el.style.display=ids.has(el.id)?'block':'none'});
  const grouped={};VISIBLE_LANES.forEach(l=>grouped[l.role]=[]);
  DATA.nodes.forEach(n=>{if(ids.has(n.id))(grouped[n.role]||(grouped[n.role]=[])).push(n)});
  VISIBLE_LANES.forEach(l=>{
    let top=laneTop;
    (grouped[l.role]||[]).forEach(n=>{
      const el=document.getElementById(n.id);
      if(!el)return;
      el.style.left=(l.x-el.offsetWidth/2)+'px';
      el.style.top=top+'px';
      top+=el.offsetHeight+vgap;
    });
  });
  ensureSize();
}
function directNodeIds(nodeId){
  const ids=new Set([nodeId]);
  const source=(activeScopeTableRels&&activeScopeTableRels.length)?activeScopeTableRels:(activeScopeFieldRels||((tableRels.length?tableRels:fieldRels)));
  source.forEach(r=>{if(r.fromNode===nodeId||r.toNode===nodeId){ids.add(r.fromNode);ids.add(r.toNode)}});
  return ids;
}
function findTableNode(query){
  const q=(query||'').trim().toLowerCase();
  if(!q)return null;
  return DATA.nodes.find(n=>n.table.toLowerCase()===q||n.label.toLowerCase()===q)
      || DATA.nodes.find(n=>n.table.toLowerCase().includes(q)||n.label.toLowerCase().includes(q));
}
function scopeForQuery(query,node){
  const q=(query||'').trim().toLowerCase();
  if(!q)return null;
  const scopes=DATA.scopes||{};
  const key=scopes[q]?q:(node&&(scopes[node.table.toLowerCase()]?node.table.toLowerCase():(scopes[node.label.toLowerCase()]?node.label.toLowerCase():null)));
  return key?{key,ids:scopes[key]}:null;
}
function applyTableSearch(query){
  const node=findTableNode(query);
  const scope=scopeForQuery(query,node);
  if(scope&&scope.ids&&scope.ids.length){
    activeNodeIds=new Set(scope.ids);
    activeScopeFieldRels=(DATA.scopeRels||{})[scope.key]||null;
    activeScopeTableRels=(DATA.scopeTableRels||{})[scope.key]||null;
    activeTableLabel=node?node.label:(query||'').trim();
  }else if(node){
    activeScopeFieldRels=null;
    activeScopeTableRels=null;
    activeNodeIds=directNodeIds(node.id);
    activeTableLabel=node.label;
  }else{
    activeScopeFieldRels=null;
    activeScopeTableRels=null;
    activeNodeIds=new Set(DATA.nodes.map(n=>n.id));
    activeTableLabel='';
  }
  clearHi();
  layoutVisibleNodes(activeNodeIds);
  setRelationMode('table');
  const s=document.getElementById('scrollArea');s.scrollTop=0;s.scrollLeft=0;
}
function clearTableSearch(){
  const input=document.getElementById('tableSearch');
  if(input)input.value='';
  applyTableSearch('');
}
function selectTableNode(nodeId){
  const node=nodeById[nodeId];
  if(!node)return;
  const input=document.getElementById('tableSearch');
  if(input)input.value=node.table;
  applyTableSearch(node.table);
}
function bindTableSelection(){
  document.querySelectorAll('[data-tnode] .head').forEach(head=>{
    let down=null;
    head.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY}});
    head.addEventListener('pointerup',event=>{
      if(!down)return;
      const moved=Math.abs(event.clientX-down.x)+Math.abs(event.clientY-down.y);
      down=null;
      if(moved>6)return;
      const node=head.closest('[data-tnode]');
      if(node)selectTableNode(node.id);
    });
  });
}
function initTableSearch(){
  const input=document.getElementById('tableSearch'),list=document.getElementById('tableOptions'),clear=document.getElementById('clearTableSearch');
  if(!input||!list||!clear)return;
  (DATA.lineageTables||[]).forEach(item=>{
    const option=document.createElement('option');
    option.value=item.name;
    option.label=item.target;
    list.appendChild(option);
  });
  let timer=null;
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>applyTableSearch(input.value),180)});
  input.addEventListener('change',()=>{clearTimeout(timer);applyTableSearch(input.value)});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);applyTableSearch(input.value)}});
  clear.addEventListener('click',clearTableSearch);
}
function csvCell(value){
  const text=String(value??'');
  return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;
}
function downloadLineageCsv(){
  const headers=['direction','source_table','source_field','target_table','target_field','relation_type','transform','path_index','notes'];
  const lines=[headers.join(',')].concat((DATA.all||[]).map(row=>headers.map(h=>csvCell(row[h])).join(',')));
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='linaje_'+(DATA.short||'coinpro')+'.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function hiPort(nodeId,field){
  const key=nodeId+'\u0007'+field;
  const current=typeof fieldRelationsFor==='function'?fieldRelationsFor(nodeId,field):[];
  const ids=(current.length?current:rels.filter(r=>(r.fromNode===nodeId&&r.fromField===field)||(r.toNode===nodeId&&r.toField===field))).map(r=>r.id);
  document.querySelectorAll('path.link').forEach(p=>{const on=ids.includes(p.dataset.relId);p.classList.toggle('active',on);p.classList.toggle('faded',!on)});
}

// ---- detalle ----
const roleLabel={source:'Campo de origen (raw)',transform:'Campo de staging técnico',staging:'Columna de staging DV',delta:'Columna del delta temporal',model:'Campo del satélite Data Vault',pivot:'Campo de pivote temporal Crystal',consume:'Columna de tabla Crystal CD'};
const chipByRole={source:'green',transform:'blue',staging:'blue',delta:'purple',model:'purple',pivot:'red',consume:'orange'};
function setField(nodeId,field){
  const node=nodeById[nodeId];
  document.querySelectorAll('.field').forEach(f=>f.classList.remove('field-selected-active'));
  const el=portEl(nodeId,field);
  if(el&&el.classList.contains('field'))el.classList.add('field-selected-active');
  setRelationMode('field',nodeId,field);hiPort(nodeId,field);
  document.getElementById('dFull').textContent=node.label+'.'+field;
  document.getElementById('dCtx').textContent=node.table;
  document.getElementById('dName').textContent=field;
  document.getElementById('dTable').textContent=node.table;
  const f=node.fields.find(x=>x.name===field);
  document.getElementById('dType').textContent=(f&&f.type)?f.type.toUpperCase():'—';
  document.getElementById('dDescription').textContent=(f&&f.description)?f.description:'—';
  document.getElementById('detailBadge').textContent=node.role;
  // origins: relaciones que terminan en este campo
  const detailRels=activeScopeFieldRels||fieldRels;
  const inc=detailRels.filter(r=>r.toNode===nodeId&&r.toField===field);
  document.getElementById('dOrigins').innerHTML=inc.length?inc.map(r=>{
    const src=nodeById[r.fromNode];const chip=chipByRole[src.role]||'slate';
    return item(chip,src.label+'.'+(r.fromField||''),'evidencia path_index '+r.path_index+' · '+r.rtype);
  }).join(''):empty('Sin origen directo en el diagrama (revisa upstream del satélite o vecindario).');
  // formula
  const fx=inc.find(r=>r.full&&r.full.trim());
  document.getElementById('dFormula').textContent=fx?fx.full:'Sin transformación registrada para este campo.';
  // impacto: relaciones que salen de este campo, o nivel tabla si es modelo
  let out=detailRels.filter(r=>r.fromNode===nodeId&&r.fromField===field);
  if(!out.length&&node.role==='model')out=detailRels.filter(r=>r.fromNode===nodeId&&r.fromField==null);
  document.getElementById('dImpact').innerHTML=out.length?out.map(r=>{
    const tg=nodeById[r.toNode];const chip=chipByRole[tg.role]||'slate';
    return item(chip,tg.label+(r.toField?('.'+r.toField):''),(r.direction==='downstream'?'downstream estructural · ':'')+'path_index '+r.path_index);
  }).join(''):empty('Sin consumo directo conectado en el diagrama.');
  showDetail();
}
function item(chip,title,note){return '<div class="path-item"><span class="chip '+chip+'">'+chip[0].toUpperCase()+'</span><div><strong>'+title+'</strong><br><span style="color:#64748b">'+note+'</span></div></div>'}
function empty(t){return '<div class="path-item"><span class="chip slate">—</span><div><span style="color:#64748b">'+t+'</span></div></div>'}

function bindFields(){
  document.querySelectorAll('.field[data-idx]').forEach(f=>{
    f.addEventListener('mouseenter',()=>hiPort(f.dataset.node,f.dataset.field));
    f.addEventListener('mouseleave',()=>{if(!f.classList.contains('field-selected-active'))clearHi()});
    f.addEventListener('click',event=>{event.stopPropagation();setField(f.dataset.node,f.dataset.field)});
  });
  // click en header del modelo => impacto nivel tabla
  document.querySelectorAll('.node.consume .head, .node.model .head').forEach(h=>{
    h.addEventListener('dblclick',()=>{const id=h.closest('[data-tnode]').id;const n=nodeById[id];if(n.fields[0])setField(id,n.fields[0].name)});
  });
}

// ---- drag ----
function ensureSize(){
  let maxW=LANE_START_X+(VISIBLE_LANES.length*LANE_GAP_X)+260,maxH=1600;
  document.querySelectorAll('[data-tnode]').forEach(n=>{
    maxW=Math.max(maxW,(parseFloat(n.style.left)||0)+n.offsetWidth+160);
    maxH=Math.max(maxH,(parseFloat(n.style.top)||0)+n.offsetHeight+160);
  });
  canvas.style.width=maxW+'px';canvas.style.height=maxH+'px';
  svg.setAttribute('width',maxW);svg.setAttribute('height',maxH);
}
function draggable(node){
  const h=node.querySelector('.head');if(!h)return;let drag=false,sx,sy,l,t,raf=null;
  h.addEventListener('pointerdown',e=>{e.preventDefault();drag=true;node.classList.add('dragging');h.setPointerCapture(e.pointerId);sx=e.clientX;sy=e.clientY;l=parseFloat(node.style.left)||0;t=parseFloat(node.style.top)||0});
  h.addEventListener('pointermove',e=>{if(!drag)return;node.style.left=Math.max(8,l+e.clientX-sx)+'px';node.style.top=Math.max(8,t+e.clientY-sy)+'px';ensureSize();if(!raf)raf=requestAnimationFrame(()=>{draw();raf=null})});
  h.addEventListener('pointerup',e=>{drag=false;node.classList.remove('dragging');try{h.releasePointerCapture(e.pointerId)}catch(_){}draw()});
  h.addEventListener('pointercancel',()=>{drag=false;node.classList.remove('dragging');draw()});
}
document.querySelectorAll('[data-tnode]').forEach(draggable);
bindTableSelection();

// ---- toggles ----
document.getElementById('toggleSidebar').addEventListener('click',function(){
  const app=document.getElementById('app');app.classList.toggle('sidebar-collapsed');
  this.textContent=app.classList.contains('sidebar-collapsed')?'›':'‹';setTimeout(draw,240);
});
const toggleDetail=document.getElementById('toggleDetail');
toggleDetail.addEventListener('click',()=>{workspace.classList.toggle('detail-collapsed');const c=workspace.classList.contains('detail-collapsed');toggleDetail.textContent=c?'<':'>';setTimeout(draw,240)});
function showDetail(){if(workspace.classList.contains('detail-collapsed')){workspace.classList.remove('detail-collapsed');toggleDetail.textContent='>';setTimeout(draw,240)}}
document.getElementById('reset').addEventListener('click',()=>{
  document.querySelectorAll('[data-tnode]').forEach(n=>{const p=defaults.get(n.id);if(p){n.style.left=p.left;n.style.top=p.top}});
  clearTableSearch();const s=document.getElementById('scrollArea');s.scrollTop=0;s.scrollLeft=0;clearHi();setRelationMode('table');setZoom(1);ensureSize();draw();
});

// ---- neighborhood table ----
function dirTag(d){return d==='upstream'?'<span class="dir-tag dir-up">upstream</span>':d==='downstream'?'<span class="dir-tag dir-down">downstream</span>':'<span class="dir-tag dir-nb">neighborhood</span>'}
(function(){
  const rowsH=DATA.all.map(r=>'<tr><td>'+dirTag(r.direction)+'</td><td><code>'+r.source_table+'</code><br><span style="color:#64748b">'+r.source_field+'</span></td><td><code>'+r.target_table+'</code><br><span style="color:#64748b">'+r.target_field+'</span></td><td>'+r.relation_type+'</td><td>'+(r.transform.length>120?r.transform.slice(0,119)+'…':r.transform)+'</td><td><code>'+r.path_index+'</code></td></tr>').join('');
  document.getElementById('nbBody').innerHTML='<table class="nbt"><thead><tr><th>Dir</th><th>Origen</th><th>Destino</th><th>Tipo</th><th>Transformación</th><th>path_index</th></tr></thead><tbody>'+rowsH+'</tbody></table>';
})();
const nbBody=document.getElementById('nbBody'),nbToggle=document.getElementById('nbToggle');
document.getElementById('nbHead').addEventListener('click',()=>{const open=nbBody.classList.toggle('open');nbToggle.textContent=open?'▾ ocultar':'▸ mostrar'});
document.getElementById('downloadCsv').addEventListener('click',downloadLineageCsv);
document.getElementById('zoomOut').addEventListener('click',()=>setZoom(zoom-.1));
document.getElementById('zoomIn').addEventListener('click',()=>setZoom(zoom+.1));

// ---- init ----
bindFields();ensureSize();
window.addEventListener('load',()=>{initTableSearch();ensureSize();setZoom(1);setRelationMode('table')});
window.downloadLineageCsv = downloadLineageCsv;
window.addEventListener('resize',draw);
document.getElementById('scrollArea').addEventListener('scroll',draw);
draw();
