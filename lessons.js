/* Standalone lessons feature; existing quizzes and site layout remain unchanged. */
const lessonState={stage:'pick',grade:10,plan:-1,quarter:1,number:null,pos:0,answers:{},first:{},saved:null,busy:false};
let lessonPlans=null, lessonLoading=null, lessonQuizCore=null, lessonQuiz=[];
const lessonEndpoint='https://bbtwnhfshlpewbbgfifg.supabase.co/functions/v1/ubt-lesson-results';
const lessonEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadLessons(){
 if(lessonPlans)return lessonPlans;
 if(lessonLoading)return lessonLoading;
 lessonLoading=(async()=>{
  const r=await fetch('/lessons-data.b64',{cache:'force-cache'});
  if(!r.ok)throw Error('КТЖ материалдары жүктелмеді');
  const str=(await r.text()).trim();
  const zipped=Uint8Array.from(atob(str),c=>c.charCodeAt(0));
  const txt=await new Response(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  lessonPlans=JSON.parse(txt);
  lessonQuizCore=await import('/lesson-quiz-core.js');
  return lessonPlans;
 })();
 try{return await lessonLoading}finally{lessonLoading=null}
}
function lessonButtons(title,back){return '<div class="lesson-toolbar"><button class="btn" data-lesson-action="'+back+'">← Артқа</button><b>'+lessonEsc(title)+'</b></div>'}
function lessonCurrent(){return lessonPlans?.[lessonState.plan]?.lessons.find(x=>x.n===lessonState.number)}
function lessonTheory(lesson,plan){
 const title=lesson.title||'Бұл сабақтың тақырыбы құжатта бос қалдырылған';
 const goal=lesson.goal||'Оқу мақсаты құжатта берілмеген';
 const t=title.toLowerCase();
 const explain=[];
 if(/орталық азия|ұлы дала/.test(t))explain.push('Орталық Азия мен Ұлы Дала — табиғи ортасы, көші-қон жолдары және мәдени өзара байланыстары арқылы дамыған тарихи кеңістіктер. Тарихи-географиялық аймақты зерттегенде карта, археологиялық дерек және жазба деректерді салыстыру маңызды.');
 if(/қазақ хандығы|ақ орда|ш(ы|і)ңғысхан|түркі/.test(t))explain.push('Ортағасырлық мемлекеттілікті қарастырғанда мемлекеттің құрылу алғышарттары, билік институттары, саяси сабақтастық және көрші елдермен байланыс ажыратылады. Әр тұжырымды тарихи дерекпен негіздеу керек.');
 if(/экономик|нарық|шаруашылық|егіншілік|өндіріс/.test(t))explain.push('Экономикалық жүйелерді талдаудың негізгі сұрақтары: нені өндіреді, қалай өндіреді және өнім кімге арналған? Дәстүрлі, нарықтық, жоспарлы және аралас жүйелердің ерекшелігін меншік, ресурс және еңбек қатынастары арқылы салыстырады.');
 if(/құқық|заң|сот|азаматтық|мемлекет/.test(t))explain.push('Құқықтық және мемлекеттік институттарды зерделеу үшін негізгі ұғымдарды анықтап, олардың қызметін нақты жағдайлармен байланыстырады. Заң нормасы, өкілеттік, құқық пен міндет айырмашылығын ажыратуға назар аударыңыз.');
 if(/мәдениет|өркениет|өнер|әдеби|музык|ғылым|білім/.test(t))explain.push('Мәдени жетістіктер тарихи жағдаймен тығыз байланысты. Материалдық және рухани мәдениетті ажыратып, шығармалар мен ескерткіштердің қоғам өміріндегі орнын, олардың дәуірлер арасындағы сабақтастығын талдаңыз.');
 if(/дүниежүзі|халықаралық|жаһандан|бейбітшілік/.test(t))explain.push('Халықаралық үдерістерді талдағанда оқиғалардың алғышарттарын, қатысушылардың мүдделерін, салдарын және әртүрлі тарихи көзқарастарды салыстырыңыз. Тұжырымды нақты мысалмен дәлелдеңіз.');
 if(!explain.length)explain.push('Бұл тарихи тақырыпты меңгеру үшін негізгі ұғымдарды анықтап, оқиғалар мен құбылыстардың себептері мен салдарын салыстырып, уақыт пен кеңістік аясындағы өзгерістерді талдау қажет.');
 const objectives=goal.split(/;\s*/).filter(Boolean);
 return '<div class="lesson-paper"><h2>📖 '+lessonEsc(title)+'</h2><p class="lead">'+plan.grade+'-сынып · '+lessonEsc(plan.subject)+' · '+lesson.q+'-тоқсан · №'+lesson.n+'</p><h3>Сабақтың теориясы</h3>'+explain.map(x=>'<p>'+lessonEsc(x)+'</p>').join('')+'<h3>КТЖ-дағы оқу мақсаттары (өзгеріссіз)</h3><div class="lesson-objective">'+objectives.map(x=>'<p>'+lessonEsc(x)+'</p>').join('')+'</div><h3>Тақырыпты меңгеру қадамдары</h3><ol><li>Тақырыптағы негізгі терминдер мен тарихи нысанды анықтаңыз.</li><li>Тарихи кезең, себеп пен салдар және деректер арасындағы байланысты қарастырыңыз.</li><li>Оқу мақсатында көрсетілген талдау, түсіндіру немесе салыстыру әрекетін орындаңыз.</li><li>Қорытынды жасап, 10 сұрақтан тұратын тестті тапсырыңыз.</li></ol><p class="notice">Теория КТЖ оқу мақсаттары негізінде дайындалған қысқаша түсіндірме. Тақырыпты тереңдетіп оқу үшін оқулық пен тарихи дереккөздерді пайдаланыңыз.</p><button class="btn" data-lesson-action="test">10 тестті бастау →</button></div>';
}
function renderLessonView(el){
 if(!lessonPlans){el.innerHTML='<h1>📚 Сабақтар</h1><p class="lead">КТЖ жүктелуде...</p>';loadLessons().then(()=>{if(view==='lessons')render()}).catch(err=>{if(view==='lessons')el.innerHTML='<h1>Сабақтар</h1><p role="alert">'+lessonEsc(err.message)+'</p><button class="btn" onclick="lessonLoading=null;renderLessonView(document.querySelector(\'#main\'))">Қайта жүктеу</button>'});return}
 const s=lessonState;
 if(s.stage==='pick'){el.innerHTML='<h1>📚 Сабақтар</h1><p class="lead">Сыныпты, пәнді және КТЖ нұсқасын таңдаңыз</p><div class="lesson-grade">'+[10,11].map(n=>'<button class="lesson-grade-btn '+(s.grade===n?'active':'')+'" data-lesson-grade="'+n+'">'+n+'-сынып</button>').join('')+'</div><div class="cards">'+lessonPlans.map((p,i)=>({...p,i})).filter(p=>p.grade===s.grade).map(p=>'<div class="card exam-card"><div class="type">'+p.grade+'-СЫНЫП · '+lessonEsc(p.variant)+'</div><h3>'+lessonEsc(p.subject)+'</h3><p>'+p.lessons.length+' сабақ · 4 тоқсан</p><button class="btn" data-lesson-plan="'+p.i+'">Сабақтарды таңдау →</button></div>').join('')+'</div>';return}
 const plan=lessonPlans[s.plan];
 if(!plan){s.stage='pick';renderLessonView(el);return}
 if(s.stage==='list'){const items=plan.lessons.filter(x=>x.q===s.quarter).sort((a,b)=>a.n-b.n);el.innerHTML=lessonButtons('Сабақтар · '+plan.grade+'-сынып','pick')+'<h1>'+lessonEsc(plan.subject)+' · '+lessonEsc(plan.variant)+'</h1><p class="lead">Сабақтың атауы мен оқу мақсаты КТЖ-дан алынған</p><div class="lesson-quarters">'+[1,2,3,4].map(n=>'<button class="lesson-quarter '+(s.quarter===n?'active':'')+'" data-lesson-quarter="'+n+'">'+n+'-тоқсан</button>').join('')+'</div><div class="lesson-list">'+items.map(x=>'<button class="lesson-list-item" data-lesson-open="'+x.n+'"><span class="lesson-number">№'+x.n+'</span><span><strong>'+lessonEsc(x.title||'КТЖ-да тақырып ұяшығы бос')+'</strong><small>'+lessonEsc(x.goal||'Оқу мақсаты берілмеген')+'</small></span><span class="lesson-arrow">›</span></button>').join('')+'</div>';return}
 const topic=lessonCurrent();if(!topic){s.stage='list';renderLessonView(el);return}
 if(s.stage==='detail'){el.innerHTML=lessonButtons('№'+topic.n+' · '+plan.grade+'-сынып','list')+'<h1>'+lessonEsc(topic.title||'КТЖ-дағы сабақ')+'</h1><p class="lead">'+s.quarter+'-тоқсан · '+lessonEsc(plan.subject)+'</p><div class="cards"><button class="card exam-card" data-lesson-action="theory"><h3>📖 Теория</h3><p>Сабақтың түсіндірмесі мен оқу мақсаты</p><span class="btn">Теорияны ашу →</span></button><button class="card exam-card" data-lesson-action="test"><h3>✅ 10 тест</h3><p>Тақырып бойынша білімді тексеру, нәтижені сақтау</p><span class="btn">Тестті бастау →</span></button></div><div class="lesson-objective"><b>Оқу мақсаты (КТЖ түпнұсқасы):</b><p>'+lessonEsc(topic.goal||'КТЖ-да мақсат көрсетілмеген')+'</p></div>';return}
 if(s.stage==='theory'){el.innerHTML=lessonButtons('Теория','detail')+lessonTheory(topic,plan);return}
 if(s.stage==='test'){const q=lessonQuiz[s.pos];if(!q){el.innerHTML='<p>Сұрақ жүктелмеді.</p>';return}const v=s.answers[s.pos];el.innerHTML=lessonButtons('10 тест · '+plan.grade+'-сынып','detail')+'<div class="quiz"><h1>'+lessonEsc(topic.title||'Сабақ')+'</h1><p class="lead">Сұрақ '+(s.pos+1)+' / 10 · №'+topic.n+'</p><div class="progressbar"><div style="width:'+((s.pos+1)*10)+'%"></div></div><div class="question-card"><h2>'+lessonEsc(q.text)+'</h2>'+q.options.map((o,i)=>'<button class="choice '+(v===i?(i===q.answer?'correct':'retry'):'')+'" data-lesson-choice="'+i+'"><b>'+('АБВГ'[i])+')</b><span>'+lessonEsc(o)+'</span></button>').join('')+'<div class="quiz-actions"><button class="btn" data-lesson-action="prev">← Артқа</button><button class="btn" data-lesson-action="'+(s.pos===9?'save':'next')+'" '+(s.busy?'disabled':'')+'>'+(s.pos===9?'Нәтижені сақтау':'Келесі →')+'</button></div><p id="lesson-msg" role="status">'+(v!==undefined?(v===q.answer?'Дұрыс, жарайсың!':'Ойлан, басқа жауапты таңда.'):'')+'</p></div></div>';return}
 if(s.stage==='done'){el.innerHTML=lessonButtons('Сақталған нәтиже','detail')+'<div class="result-card"><h1>✅ Нәтиже сақталды</h1><h2>'+lessonEsc(topic.title||'КТЖ сабағы')+'</h2><h1>'+s.saved.correct+' / '+s.saved.total+'</h1><p>'+plan.grade+'-сынып · '+lessonEsc(plan.subject)+' · '+s.quarter+'-тоқсан · №'+topic.n+'</p><button class="btn" data-lesson-action="list">Сабақтарға оралу</button></div>';return}
}
async function submitLessonResult(){const s=lessonState;if(s.busy)return;if(Object.keys(s.answers).length!==10){document.querySelector('#lesson-msg').textContent='Барлық 10 сұраққа жауап беріңіз.';return}s.busy=true;const b=document.querySelector('[data-lesson-action="save"]');if(b)b.disabled=true;document.querySelector('#lesson-msg').textContent='Нәтиже серверге сақталуда...';try{const response=await fetch(lessonEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:crypto.randomUUID(),student,plan:s.plan,number:s.number,answers:Array.from({length:10},(_,i)=>s.first[i])})});const body=await response.json();if(!response.ok)throw Error(body.error||'Сақтау қатесі');s.saved=body;s.stage='done';const stamp=new Date();history.push({title:'Сабақтар · '+lessonPlans[s.plan].grade+'-сынып · '+lessonPlans[s.plan].subject+' · №'+s.number+' · '+(lessonCurrent()?.title||'КТЖ сабағы'),student,correct:body.correct,total:body.total,questions:10,savedAt:stamp.toISOString(),date:stamp.toLocaleString('kk-KZ')});try{localStorage.setItem('ubttarih_results',JSON.stringify(history))}catch{}render()}catch(e){const msg=document.querySelector('#lesson-msg');if(msg)msg.textContent='Нәтиже сақталмады: '+e.message}finally{s.busy=false;if(b&&b.isConnected)b.disabled=false}}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-lesson-grade],[data-lesson-plan],[data-lesson-quarter],[data-lesson-open],[data-lesson-choice],[data-lesson-action]');if(!btn||view!=='lessons'||lessonState.busy)return;
 const s=lessonState;
 if(btn.hasAttribute('data-lesson-grade')){s.grade=Number(btn.dataset.lessonGrade);s.stage='pick'}
 else if(btn.hasAttribute('data-lesson-plan')){s.plan=Number(btn.dataset.lessonPlan);s.quarter=1;s.stage='list'}
 else if(btn.hasAttribute('data-lesson-quarter')){s.quarter=Number(btn.dataset.lessonQuarter);s.stage='list'}
 else if(btn.hasAttribute('data-lesson-open')){s.number=Number(btn.dataset.lessonOpen);s.stage='detail'}
 else if(btn.hasAttribute('data-lesson-choice')){const value=Number(btn.dataset.lessonChoice);s.answers[s.pos]=value;if(s.first[s.pos]===undefined)s.first[s.pos]=value}
 else {
  const a=btn.dataset.lessonAction;
  if(a==='save'){await submitLessonResult();return}
  if(a==='pick'){s.stage='pick'}
  if(a==='list'){s.stage='list'}
  if(a==='detail'){s.stage='detail'}
  if(a==='theory'){s.stage='theory'}
  if(a==='test'){s.stage='test';s.pos=0;s.answers={};s.first={};s.saved=null;lessonQuiz=lessonQuizCore.makeLessonQuestions(lessonPlans,s.plan,s.number)}
  if(a==='prev'){if(s.pos>0)s.pos--;else s.stage='detail'}
  if(a==='next'){if(s.answers[s.pos]===undefined){document.querySelector('#lesson-msg').textContent='Жауап таңдаңыз.';return}if(s.pos<9)s.pos++}
 }
 render();
});