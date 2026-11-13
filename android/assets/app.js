'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,c='₽')=>(n/100).toLocaleString('ru-RU',{maximumFractionDigits:2})+' '+c;
const count=n=>n.toLocaleString('ru-RU');
const date=v=>new Date(v).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'});
const buttons=(a,id,text,cls='soft')=>'<button type="button" class="'+cls+'" data-act="'+a+'" data-id="'+esc(id)+'">'+text+'</button>';
const options=values=>values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
const field=(name,title,value='',type='text',required=true)=>'<label>'+title+'<input name="'+name+'" value="'+esc(value)+'" type="text" '+(type==='num'?'inputmode="decimal" ':'maxlength="200" ')+(required?'required':'')+' autocomplete="off"></label>';
const select=(name,title,values)=>'<label>'+title+'<select name="'+name+'">'+options(values)+'</select></label>';
const stat=(l,v)=>'<div class="spread statline"><span>'+l+'</span><b>'+v+'</b></div>';
const metric=(l,v,page)=>buttons('tab',page,'<span>'+l+'</span><strong>'+v+'</strong>','metric');
const pages={home:'Обзор',stock:'Склад',money:'Долги',claims:'Брак',journal:'Журнал'};
const icons={home:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',stock:'m3 7 9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10',money:'M3 6h18v13H3z M3 9h18 M15 14h3',claims:'m12 3 10 17H2z M12 9v4 M12 15v2',journal:'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5'};
const eventNames={buy:'Закупка',move:'Перемещение',sale:'Продажа',pay:'Платёж',defect:'Регистрация брака',resolve:'Решение по браку',return:'Возврат от клиента'};
let mode=localStorage.getItem('sar-mode')==='demo'?'demo':'work', tab='home', filter='Все', query='', events=[], state, importCandidate, timer, storedSnapshot=null;
const storageKey=()=>'sar-expo-74-v1-'+mode;
function demo() {
 const day=(n)=>new Date(Date.now()-n*86400000).toISOString();
 return [
 {id:'example-a',type:'buy',time:day(5),partner:'Поставщик А',place:'Гуанчжоу',rate:130000,fees:1040000,paid:100000,items:[{name:'DDR4 16 ГБ · 3200',sku:'RAM-16-32',qty:20,price:20000},{name:'SSD 1 ТБ · NVMe',sku:'SSD-N1',qty:10,price:40000}]},
 {id:'example-b',type:'buy',time:day(4),partner:'Поставщик Б',place:'В пути',rate:131000,fees:360000,paid:120000,items:[{name:'Настольная лампа',sku:'LT-04',qty:12,price:10000}]},
 {id:'example-c',type:'move',time:day(3),lot:'example-a-0',qty:12,from:'Гуанчжоу',to:'Москва'},
 {id:'example-d',type:'sale',time:day(2),lot:'example-a-0',qty:4,from:'Москва',partner:'Покупатель А',price:480000,paid:1000000},
 {id:'example-e',type:'defect',time:day(1),lot:'example-a-0',from:'Москва',qty:1,reason:'Ошибка при проверке памяти'}];
}
function load() {
 let raw=localStorage.getItem(storageKey());
 const data=raw===null?(mode==='demo'?demo():[]):JSON.parse(raw);
 const next=Ledger.project(data);
 if(raw===null){raw=JSON.stringify(data);localStorage.setItem(storageKey(),raw)}
 state=next;events=data;storedSnapshot=raw;
}
function write(data) {
 if(localStorage.getItem(storageKey())!==storedSnapshot){
   load();render();throw Error('База изменилась. Проверь операцию и повтори.');
 }
 const next=Ledger.project(data), raw=JSON.stringify(data);
 try{localStorage.setItem(storageKey(),raw)}catch{throw Error('Не удалось сохранить запись. Проверь свободное место и сделай резервную копию.')}
 storedSnapshot=raw;events=data;state=next;
}
function append(e) {
 e.id=Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
 e.time=new Date().toISOString();write([...events,e]);closeSheet();render();toast('Операция сохранена');
}
function toast(s){$('#toast').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('#toast').textContent='',2600)}
function sheet(title,html){$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();$('#dialog').scrollTop=0}
function closeSheet(){$('#dialog').close();importCandidate=null}
const vals=Object.values, sum=(list,fn)=>list.reduce((a,x)=>a+fn(x),0);
const orderNo=id=>'SE–'+String(Object.keys(state.orders).indexOf(id)+1).padStart(4,'0');
function pageHeading(title,action='',text=''){return '<div class="top"><div><div class="kicker">'+new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})+'</div><h1>'+title+'</h1></div>'+(action?buttons(action,'',text,'new'):'')+'</div>'}
const section=(s,more='')=>'<div class="section"><h2>'+s+'</h2>'+more+'</div>';
const blank=(title,txt)=>'<div class="note"><h3>'+title+'</h3><p class="sub">'+txt+'</p></div>';
function eventCard(e) {
 const l=state.lots[e.lot],o=state.orders[e.ref],s=state.sales[e.ref],c=state.claims[e.ref];
 let title=e.partner||l?.name||o?.partner||s?.partner||(c&&state.lots[c.lot].name)||'';
 let info='',amount='';
 if(e.type==='buy'){info=orderNo(e.id)+' · '+e.items.length+' поз.';amount=fmt(state.orders[e.id].total)}
 if(e.type==='move'){info=e.from+' → '+e.to;amount=e.qty+' шт.'}
 if(e.type==='sale'){info=l.name+' · '+e.qty+' шт.';amount=fmt(state.sales[e.id].value)}
 if(e.type==='defect'){info=e.reason;amount=e.qty+' шт.'}
 if(e.type==='pay'){info=e.side==='supplier'?'Поставщику':e.side==='client'?'От клиента':e.side==='refund'?'Возврат денег клиенту':'Компенсация';amount=fmt(e.amount,e.side==='supplier'?'¥':'₽')}
 if(e.type==='return'){const r=state.returns[e.id];title=r.partner;info=state.lots[r.lot].name+' · '+e.qty+' шт.';amount=fmt(r.credit)}
 if(e.type==='pay'&&e.side==='refund') title=state.returns[e.ref].partner;
 if(e.type==='resolve'){info=e.result==='replace'?'Замена на склад':'Списание';amount=e.qty+' шт.'}
 return buttons('event',e.id,'<div class="row"><div><span class="ref">'+esc(eventNames[e.type])+' · '+date(e.time)+'</span><h3>'+esc(title)+'</h3><span class="sub">'+esc(info)+'</span></div><span class="amount">'+amount+'</span></div>','card');
}
function home(){
 const lots=vals(state.lots), orders=vals(state.orders), sales=vals(state.sales),claims=vals(state.claims);
 const route=Ledger.places.map(p=>'<div class="stop"><i class="dot"></i>'+p+'<b>'+count(sum(lots,l=>l.qtyAt[p]))+' шт.</b></div>').join('');
 return pageHeading('Обзор','buy','+ Закупка')+'<article class="hero"><small>СТОИМОСТЬ ОСТАТКОВ</small><div class="big">'+fmt(state.stock)+'</div><div class="sub">'+count(state.units)+' шт. доступно · брак отдельно</div><div class="route">'+route+'</div></article><div class="metrics">'+metric('Мне должны',fmt(sum(sales,x=>x.due)+sum(claims,x=>x.due)),'money')+metric('Я должен',fmt(sum(orders,x=>x.due),'¥')+(sum(vals(state.returns),x=>x.due)?' + '+fmt(sum(vals(state.returns),x=>x.due)):''),'money')+metric('Прибыль по учёту',fmt(state.profit),'journal')+metric('Брак на проверке',count(sum(claims,x=>x.open))+' шт.','claims')+'</div>'+(!events.length?'<div class="note"><h3>Первая партия</h3><p class="sub">Внеси закупку или попробуй учёт на примере готовой партии.</p>'+buttons('switch','demo','Открыть демобазу')+'</div>':'')+section('Последние операции',buttons('tab','journal','Весь журнал →','link'))+'<div class="cards">'+(events.slice(-4).reverse().map(eventCard).join('')||'<p class="sub">Здесь появятся закупки, продажи и платежи.</p>')+'</div>';
}
function stockList(){
 const data=vals(state.lots).reverse().filter(l=>(filter==='Все'||l.qtyAt[filter]>0)&&[l.name,l.sku,state.orders[l.order].partner,orderNo(l.order)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 return data.map(l=>buttons('lot',l.id,'<div class="row"><div><span class="ref">'+orderNo(l.order)+' · '+esc(l.sku||'Без артикула')+'</span><h3>'+esc(l.name)+'</h3><div class="sub">'+esc(state.orders[l.order].partner)+' · '+fmt(Math.round(l.cost/l.qty))+'/шт.</div></div><span class="tag">'+(filter==='Все'?sum(vals(l.qtyAt),n=>n):l.qtyAt[filter])+' шт.</span></div>','card')).join('')||blank('Нет позиций','Добавь закупку или измени условия поиска.');
}
function stock(){return pageHeading('Склад','buy','+ Закупка')+'<input id="search" class="search" placeholder="Товар, артикул или поставщик" aria-label="Поиск по складу" value="'+esc(query)+'"><div class="seg">'+['Все',...Ledger.places].map(p=>buttons('filter',p,p,filter===p?'on':'')).join('')+'</div><div id="stockList" class="cards">'+stockList()+'</div>'}
function debts() {
 const group=(title,list,side)=>{const open=list.filter(x=>x.due>0);const currency=side==='supplier'?'¥':'₽';return section(title)+'<div class="cards">'+(open.map(x=>{const o=side==='supplier'?x:state.orders[state.lots[x.lot].order];return buttons('pay',side+'|'+x.id,'<div class="row"><div><span class="ref">'+orderNo(o.id)+' · '+date(x.time)+'</span><h3>'+esc(x.partner||o.partner)+'</h3><span class="small">Внести платёж →</span></div><b>'+fmt(x.due,currency)+'</b></div>','card')}).join('')||'<p class="sub">Открытых долгов нет.</p>')+'</div>'};
 return pageHeading('Долги')+group('Мне должны клиенты',vals(state.sales),'client')+group('Мне должны за брак',vals(state.claims),'claim')+group('Я должен поставщикам',vals(state.orders),'supplier')+group('Вернуть деньги клиентам',vals(state.returns),'refund');
}
function claims(){return pageHeading('Брак')+'<div class="panel">'+stat('Себестоимость на проверке',fmt(state.quarantine))+'</div><p class="sub">Для регистрации выбери товар на складе. Решение и компенсацию можно оформить позже.</p>'+section('Обращения')+'<div class="cards">'+(vals(state.claims).reverse().map(x=>buttons('claim',x.id,'<div class="row"><div><span class="ref">'+orderNo(state.lots[x.lot].order)+' · '+date(x.time)+'</span><h3>'+esc(state.lots[x.lot].name)+'</h3><div class="sub">'+esc(x.reason)+'</div></div><span class="tag">'+(x.open?'В работе · '+x.open:x.due?'Ждём выплату':'Закрыто')+'</span></div>','card')).join('')||blank('Брака пока нет','Все обращения привязываются к исходной партии.'))+'</div>'+buttons('tab','stock','Перейти на склад','link')}
function journal(){return pageHeading('Журнал')+'<div class="panel">'+stat('Выручка по продажам',fmt(state.turnover))+stat('Прибыль по учёту',fmt(state.profit))+'<p class="hint">Выручка минус себестоимость проданного и списанного товара, плюс согласованные компенсации. Частичные оплаты отражаются в долгах.</p></div><div class="cards">'+([...events].reverse().map(eventCard).join('')||blank('Журнал пуст','Добавь первую закупку на главном экране.'))+'</div>'}
function render(){
 $('#mode').textContent=mode==='demo'?'Демобаза':'Моя база';
 $('#main').innerHTML=({home,stock,money:debts,claims,journal}[tab])();
 $('#nav').innerHTML=Object.entries(pages).map(([k,t])=>'<button data-act="tab" data-id="'+k+'" class="'+(k===tab?'selected':'')+'" '+(k===tab?'aria-current="page"':'')+'><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="'+icons[k]+'"/></svg>'+t+'</button>').join('');
}
function form(title,kind,content,submit,ref=''){sheet(title,'<form data-kind="'+kind+'" data-ref="'+esc(ref)+'">'+content+'<p class="error" role="alert"></p><button class="primary" type="submit">'+submit+'</button></form>')}
function itemRow(){return '<div class="lineItem"><div class="spread"><span class="ref">ПОЗИЦИЯ</span>'+buttons('remove','','Убрать','link')+'</div>'+field('name','Товар')+field('sku','Артикул (необязательно)','','text',false)+'<div class="pair">'+field('qty','Количество, шт.','1','num')+field('price','Цена за шт., ¥','','num')+'</div></div>'}
function buy(){form('Новая закупка','buy',field('partner','Поставщик')+select('place','Местонахождение',Ledger.places)+'<div id="items">'+itemRow()+'</div>'+buttons('add','','+ Ещё товар','link')+'<div class="pair">'+field('rate','Курс, ₽ за 1 ¥','','num')+field('fees','Доставка и расходы, ₽','0','num')+'</div>'+field('paid','Уже оплачено поставщику, ¥','0','num')+'<div class="panel" id="preview"></div>','Сохранить закупку');preview()}
function readBuy(f) {
 const v=name=>f.elements.namedItem(name).value, num=Ledger.numeric;
 return {type:'buy',partner:v('partner').trim(),place:v('place'),rate:num(v('rate'),4,true),fees:num(v('fees'),2),paid:num(v('paid'),2),items:$$('.lineItem').map(el=>{const get=n=>el.querySelector('[name="'+n+'"]').value;return {name:get('name').trim(),sku:get('sku').trim(),qty:num(get('qty'),0,true),price:num(get('price'),2,true)}})};
}
function preview(){const panel=$('#preview');if(!panel)return;
 try {const e=readBuy($('form')), y=sum(e.items,i=>i.qty*i.price);
 panel.innerHTML=stat('Закупка',fmt(y,'¥'))+stat('Себестоимость партии',fmt(Ledger.scale(y,e.rate,10000)+e.fees))+stat('Осталось оплатить',fmt(y-e.paid,'¥'));
 } catch {panel.innerHTML='<span class="sub">Введи цену и курс для расчёта себестоимости.</span>'}}
function lot(id){const l=state.lots[id],o=state.orders[l.order],n=sum(vals(l.qtyAt),v=>v);
 sheet(l.name,'<div class="panel"><div class="ref">'+orderNo(o.id)+' · '+esc(l.sku||'Без артикула')+'</div>'+stat('Поставщик',esc(o.partner))+stat('Закупка за шт.',fmt(l.price,'¥'))+stat('Себестоимость за шт.',fmt(Math.round(l.cost/l.qty)))+Ledger.places.map(p=>stat(p,l.qtyAt[p]+' шт.')).join('')+'</div><div class="actions">'+(n?[['sale','Продать'],['move','Переместить'],['defect','Оформить брак']].map(([k,t])=>buttons(k,id,t)).join(''):'')+buttons('event',o.id,'Открыть закупку')+'</div>')}
function operation(kind,id){
 const l=state.lots[id], available=Ledger.places.filter(p=>l.qtyAt[p]>0);
 let inner='<div class="panel"><h3>'+esc(l.name)+'</h3><span class="sub">'+orderNo(l.order)+'</span></div>'+select('from','С какого склада',available)+'<p id="available" class="hint"></p>'+field('qty','Количество, шт.','1','num');
 if(kind==='move')inner+=select('to','Куда',Ledger.places.filter(p=>p!==available[0]));
 if(kind==='sale')inner+=field('partner','Клиент')+'<div class="pair">'+field('price','Цена за шт., ₽','','num')+field('paid','Получено, ₽','0','num')+'</div><div id="salePreview" class="hint"></div>';
 if(kind==='defect')inner+=field('reason','Причина брака');
 form(eventNames[kind],kind,inner,'Сохранить',id);
 if(available.includes(filter)) $('form').elements.from.value=filter;
 updateOperation();
}
function updateOperation(){const f=$('form');if(!f || !$('#available')) return;
 const l=state.lots[f.dataset.ref], p=f.elements.from.value;$('#available').textContent='Доступно на складе: '+l.qtyAt[p]+' шт.';
 if(f.elements.to && ![...f.elements.to.options].every(o=>o.value!==p))f.elements.to.innerHTML=options(Ledger.places.filter(x=>x!==p));
 else if(f.elements.to){const prev=f.elements.to.value;f.elements.to.innerHTML=options(Ledger.places.filter(x=>x!==p));if(prev!==p)f.elements.to.value=prev}
 if($('#salePreview')){try{const total=Ledger.numeric(f.elements.price.value,2)*Ledger.numeric(f.elements.qty.value,0);$('#salePreview').textContent='Сумма продажи '+fmt(total)+' · в долг '+fmt(total-Ledger.numeric(f.elements.paid.value,2));}catch{$('#salePreview').textContent=''}}}
function debt(ref){const [side,id]=ref.split('|');const x=({supplier:state.orders,client:state.sales,claim:state.claims,refund:state.returns}[side])[id],c=side==='supplier'?'¥':'₽';
 form('Внести платёж','pay','<div class="panel">'+stat('Остаток долга',fmt(x.due,c))+'</div>'+field('amount','Сумма платежа, '+c,String(x.due/100),'num'),'Записать платёж',ref)}
function customerReturn(id){
 const sale=state.sales[id], places=[sale.from,...Ledger.places.filter(p=>p!==sale.from)];
 form('Возврат от клиента','return','<div class="panel"><h3>'+esc(sale.partner)+'</h3><p class="hint">'+esc(state.lots[sale.lot].name)+' · можно вернуть '+(sale.qty-sale.returned)+' шт.</p></div>'+field('qty','Количество, шт.','1','num')+select('to','Куда принят товар',places)+'<label>Состояние<select name="condition"><option value="defect">Брак — на проверку</option><option value="stock">Исправен — на склад</option></select></label>'+field('reason','Причина возврата')+'<div class="panel" id="returnPreview"></div>','Принять возврат',id);
 returnPreview();
}
function returnPreview(){
 const box=$('#returnPreview');if(!box)return;
 const f=$('form'),sale=state.sales[f.dataset.ref];
 try{const qty=Ledger.numeric(f.elements.qty.value,0,true);
 if(qty>sale.qty-sale.returned) throw Error();
 const credit=qty*sale.price,offset=Math.min(credit,sale.due);
 box.innerHTML=stat('Уменьшится долг клиента',fmt(offset))+stat('Деньги к возврату',fmt(credit-offset));
 }catch{box.textContent='Проверь количество возврата'}
}
function claim(id){const x=state.claims[id];
 sheet('Карточка брака','<div class="panel"><span class="ref">'+orderNo(state.lots[x.lot].order)+'</span><h3>'+esc(state.lots[x.lot].name)+'</h3><p class="hint">'+esc(x.reason)+'</p>'+stat('На проверке',x.open+' шт.')+stat('Заменено',x.recovered+' шт.')+stat('Списано',x.lost+' шт.')+stat('К получению',fmt(x.due))+'</div><div class="actions">'+(x.open?buttons('replace',id,'Принять замену')+buttons('loss',id,'Списать товар'):'')+(x.due?buttons('pay','claim|'+id,'Получить компенсацию'):'')+'</div>')}
function resolve(kind,id){const x=state.claims[id];form(kind==='replace'?'Принять замену':'Списать товар',kind,'<p class="hint">На проверке '+x.open+' шт.</p>'+field('qty','Количество, шт.',String(x.open),'num')+(kind==='replace'?select('to','Склад приёмки',[x.from,...Ledger.places.filter(p=>p!==x.from)]):field('comp','Согласовано компенсации за все списываемые шт., ₽','0','num')+'<p class="hint">Компенсация попадёт в долги до получения платежа.</p>'),'Подтвердить',id)}
function eventDetail(id){const e=events.find(x=>x.id===id);
 if(e.type==='defect')return claim(id);
 let data='';
 if(e.type==='buy'){const o=state.orders[id];data='<h3>'+esc(o.partner)+' · '+orderNo(id)+'</h3>'+stat('Закупка',fmt(o.yuan,'¥'))+stat('Курс, ₽/¥',o.rate/10000)+stat('Доставка и расходы',fmt(o.fees))+stat('Себестоимость партии',fmt(o.total))+stat('Долг поставщику',fmt(o.due,'¥'))+section('Товары')+o.items.map((i,k)=>buttons('lot',id+'-'+k,esc(i.name)+' · '+i.qty+' шт. →','soft toolrow')).join('');}
 else{const l=state.lots[e.lot]||(e.type==='resolve'&&state.lots[state.claims[e.ref].lot]);if(l)data+=stat('Товар',esc(l.name));
 if(e.partner)data+=stat('Контрагент',esc(e.partner));if(e.qty)data+=stat('Количество',esc(e.qty)+' шт.');if(e.from)data+=stat('Склад',esc(e.from));if(e.to)data+=stat('Куда',esc(e.to));
 if(e.type==='sale'){const s=state.sales[id];data+=stat('Продажа',fmt(s.value))+stat('Себестоимость',fmt(s.base))+stat('Прибыль',fmt(s.value-s.base))+stat('Долг клиента',fmt(s.due))+stat('Возвращено',s.returned+' из '+s.qty+' шт.');
 if(s.returned){data+=stat('Выручка после возвратов',fmt(s.value-s.price*s.returned))+stat('Прибыль после возвратов',fmt(s.value-s.price*s.returned-s.base+s.restoredCost))}
 if(s.qty>s.returned)data+=buttons('customerReturn',id,'Оформить возврат','soft toolrow')}
 if(e.type==='return'){const r=state.returns[id];data+=stat('Клиент',esc(r.partner))+stat('Товар',esc(state.lots[r.lot].name))+stat('Состояние',e.condition==='stock'?'На склад':'На проверку')+stat('Уменьшен долг клиента',fmt(r.offset))+stat('Осталось вернуть клиенту',fmt(r.due))+stat('Причина',esc(e.reason));
 if(r.due)data+=buttons('pay','refund|'+id,'Вернуть деньги клиенту','soft toolrow');
 if(e.condition==='defect')data+=buttons('claim',id,'Карточка брака','soft toolrow')}
 if(e.type==='pay'){const partner=e.side==='supplier'?state.orders[e.ref].partner:e.side==='client'?state.sales[e.ref].partner:e.side==='refund'?state.returns[e.ref].partner:state.orders[state.lots[state.claims[e.ref].lot].order].partner;data+=stat('Контрагент',esc(partner))+stat('Платёж',fmt(e.amount,e.side==='supplier'?'¥':'₽'));}
 if(e.type==='resolve')data+=stat('Решение',e.result==='replace'?'Замена':'Списание')+(e.result==='loss'?stat('Компенсация',fmt(e.comp)):'');}
 sheet(eventNames[e.type],'<div class="panel"><p class="hint">'+esc(new Date(e.time).toLocaleString('ru-RU'))+'</p>'+data+'</div>');
}
function switchMode(id){
 const previous=mode;mode=id;
 try{load()}catch(err){mode=previous;throw err}
 localStorage.setItem('sar-mode',mode);tab='home';filter='Все';query='';closeSheet();render();window.scrollTo(0,0);
}
function settings(){sheet('База и копии','<div class="panel"><span class="ref">SAR EXPO 74 · 0.2.0</span><h3>'+ (mode==='demo'?'Демонстрационная база':'Моя рабочая база')+'</h3><p class="hint">Записей: '+events.length+'. Данные сохраняются на этом телефоне. Демобаза ведётся отдельно.</p>'+buttons('switch',mode==='demo'?'work':'demo',mode==='demo'?'Открыть мою базу':'Открыть демобазу')+'</div>'+section('Резервная копия')+'<p class="hint">Файл содержит все операции текущей базы. Сохрани копию перед удалением приложения или заменой телефона.</p>'+buttons('export','','Сохранить копию в файл','soft toolrow')+buttons('import','','Восстановить из файла','soft toolrow'))}
function exportData(){const text=JSON.stringify({format:'sar-expo-74',version:1,mode,events});if(window.SarFiles){SarFiles.exportData(text);return}const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SarExpo74-'+mode+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
window.receiveBackup=text=>{try{const data=JSON.parse(text);if(data.format!=='sar-expo-74'||data.version!==1||data.mode!==mode)throw Error('Выбери копию той же базы (рабочая или демо)');Ledger.project(data.events);
 importCandidate=data.events;sheet('Восстановить базу?','<p class="hint">Текущие записи ('+events.length+') будут заменены данными из копии ('+data.events.length+').</p>'+buttons('restore','','Заменить записи','primary')+buttons('settings','','Отмена','soft toolrow'));}catch(e){sheet('Копия не принята','<p class="error">'+esc(e.message)+'</p>')}};
$('#file').addEventListener('change',async e=>{const f=e.target.files[0];if(f){if(f.size>12*1024*1024)toast('Слишком большой файл');else window.receiveBackup(await f.text())}e.target.value=''});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#stockList').innerHTML=stockList()}else if($('#dialog').open){preview();updateOperation();returnPreview()}});
document.addEventListener('submit',e=>{
 e.preventDefault();const f=e.target,kind=f.dataset.kind,ref=f.dataset.ref,v=k=>f.elements.namedItem(k).value,n=(k,d=2)=>Ledger.numeric(v(k),d);
 try{
 let x={type:kind};
 if(kind==='buy')x=readBuy(f);
 else if(kind==='return')x={type:'return',ref,qty:n('qty',0),to:v('to'),condition:v('condition'),reason:v('reason').trim()};
 else if(kind==='pay'){const [side,id]=ref.split('|');Object.assign(x,{side,ref:id,amount:n('amount')})}
 else if(kind==='replace'||kind==='loss'){x={type:'resolve',ref,result:kind,qty:n('qty',0)};if(kind==='replace')x.to=v('to');else x.comp=n('comp')}
 else {Object.assign(x,{lot:ref,from:v('from'),qty:n('qty',0)});if(kind==='sale')Object.assign(x,{partner:v('partner').trim(),price:n('price'),paid:n('paid')});if(kind==='move')x.to=v('to');if(kind==='defect')x.reason=v('reason').trim()}
 append(x);
 }catch(err){f.querySelector('.error').textContent=err.message}
});
document.addEventListener('click',e=>{const btn=e.target.closest('button[data-act]');if(!btn)return;const {act,id}=btn.dataset;
 const run={tab:()=>{closeSheet();tab=id;render();window.scrollTo(0,0)},filter:()=>{filter=id;render()},buy,add:()=>$('#items').insertAdjacentHTML('beforeend',itemRow()),remove:()=>{if($$('.lineItem').length>1){btn.closest('.lineItem').remove();preview()}else toast('Нужна хотя бы одна позиция')},lot:()=>lot(id),sale:()=>operation(act,id),move:()=>operation(act,id),defect:()=>operation(act,id),customerReturn:()=>customerReturn(id),claim:()=>claim(id),loss:()=>resolve(act,id),replace:()=>resolve(act,id),pay:()=>debt(id),event:()=>eventDetail(id),settings,close:closeSheet,switch:()=>switchMode(id),export:exportData,import:()=>window.SarFiles?SarFiles.importData():$('#file').click(),restore:()=>{if(importCandidate){write(importCandidate);closeSheet();render();toast('База восстановлена')}}};
 try{run[act]?.()}catch(err){toast(err.message)}
});
window.sarBack=()=>{if($('#dialog').open){closeSheet();return true}if(tab!=='home'){tab='home';render();return true}return false};
try{load();render()}catch(err){
 storedSnapshot=localStorage.getItem(storageKey());events=[];state=Ledger.project([]);
 $('#mode').textContent=mode==='demo'?'Демобаза':'Моя база';
 $('#main').innerHTML=blank('Не удалось открыть базу',esc(err.message))+
 buttons('import','','Восстановить из файла','soft toolrow');
}
