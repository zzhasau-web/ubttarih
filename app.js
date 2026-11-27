const resultsEndpoint = "https://bbtwnhfshlpewbbgfifg.supabase.co/functions/v1/ubt-results";
let student = sessionStorage.getItem("ubttarih_student") || "";
let firstAnswers = {}, feedback = {}, teacherRows = null, busy = false;
const yearAgo = new Date();
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
let DB={world:[],contexts:[],dates:[],people:[]},view="home",quiz=null,pos=0,answers={};let history=[];try{history=JSON.parse(localStorage.getItem("ubttarih_results")||"[]")}catch{}
history = history.filter(row => !row.savedAt || new Date(row.savedAt) > yearAgo);
const sections={home:"Басты бет",subjects:"Оқу бағыттары",tests:"ҰБТ тесттері",contexts:"Қазақстан тарихы — контекст",people:"Тарихи тұлғалар",dates:"100 дата",materials:"Материалдар",qmj:"ҚМЖ",lessons:"Сабақтар",videos:"Видео сабақ",map:"Карта",aitools:"Жасанды интеллект құралдары",progress:"Менің нәтижелерім",teacher:"Мұғалім панелі"};
const icons={home:"⌂",subjects:"▦",tests:"☷",contexts:"▤",people:"♛",dates:"◷",materials:"▣",qmj:"▤",lessons:"📚",videos:"▶",map:"🗺️",aitools:"🤖",progress:"◴",teacher:"▣"};
const $=s=>document.querySelector(s),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.querySelector("#nav").innerHTML=Object.entries(sections).map(([k,v])=>'<button data-go="'+k+'">'+icons[k]+' &nbsp; '+v+'</button>').join("");
document.querySelector("#menu").onclick=()=>document.querySelector("#sidebar").classList.toggle("open");
document.addEventListener("click", event => {
  if (event.target.closest("#switch-student") && !busy) {
    student = "";
    sessionStorage.removeItem("ubttarih_student");
    go("home");
  }
  const link = event.target.closest("[data-go]");
  if (link) go(link.dataset.go);
  const test = event.target.closest("[data-start]");
  if (test) {
    const [kind, index] = test.dataset.start.split(":");
    start(kind, Number(index));
  }
  const choice = event.target.closest("[data-choice]");
  if (choice) choose(choice.dataset.choice);
});
document.addEventListener("submit", event => {
  if (event.target.id === "student-form") {
    event.preventDefault();
    const name = new FormData(event.target).get("student").trim().replace(/\s+/g, " ");
    if (name.length < 3 || !name.includes(" ")) {
      $("#student-message").textContent = "Атыңыз бен тегіңізді жазыңыз.";
      return;
    }
    student = name;
    sessionStorage.setItem("ubttarih_student", name);
    render();
  }
  if (event.target.id === "teacher-form") {
    event.preventDefault();
    openTeacher(event.target);
  }
});
function go(k) {
  if (busy) return;
  teacherRows = null;
  quiz = null;
  view = k;
  $("#sidebar").classList.remove("open");
  render();
  scrollTo(0,0);
}
function start(k,i) {
  if (!student || busy) return;
  quiz = {kind:k, key:k+":"+i, id:crypto.randomUUID(), ...DB[k][i]};
  view = "quiz";
  pos = 0;
  answers = {};
  firstAnswers = {};
  feedback = {};
  render();
  scrollTo(0,0);
}
function choose(value) {
  if (busy || view !== "quiz" || feedback[pos] === "correct") return;
  const question = quiz.questions[pos];
  answers[pos] = value;
  firstAnswers[pos] ??= value;
  if (isGradable(question)) feedback[pos] = question.answer === value ? "correct" : "retry";
  render();
}
function back() {
  if (busy) return;
  if (pos) {
    pos--;
    render();
  } else go(quiz.kind === "world" ? "tests" : quiz.kind);
}
function next() {
  if (!answers[pos]) {
    $("#quiz-message").textContent = "Жауап нұсқасын таңдаңыз.";
    return;
  }
  pos++;
  render();
}
async function resultRequest(payload) {
  const response = await fetch(resultsEndpoint, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Сервер қатесі");
  return body;
}
async function saveResult() {
  if (busy) return;
  if (!answers[pos]) {
    $("#quiz-message").textContent = "Соңғы сұраққа жауап беріңіз.";
    return;
  }
  busy = true;
  $("#save-result").disabled = true;
  $("#quiz-message").textContent = "Нәтиже сақталуда…";
  try {
    const result = await resultRequest({
      action:"save", id:quiz.id, quizId:quiz.key, student,
      answers:quiz.questions.map((_, index) => firstAnswers[index] ?? null),
    });
    const savedAt = new Date();
    history.push({...result, title:quiz.title, student, questions:quiz.questions.length,
      savedAt:savedAt.toISOString(), date:savedAt.toLocaleString("kk-KZ")});
    try { localStorage.setItem("ubttarih_results",JSON.stringify(history)); } catch {}
    view = "done";
    render();
  } catch {
    $("#save-result").disabled = false;
    $("#quiz-message").textContent = "Нәтиже сақталмады. Байланысты тексеріп, қайта басыңыз.";
  } finally {
    busy = false;
  }
}
async function openTeacher(form) {
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const result = await resultRequest({action:"teacher", pin:new FormData(form).get("pin")});
    if (view === "teacher" && form.isConnected) {
      teacherRows = result.rows;
      render();
    }
  } catch (error) {
    if (form.isConnected) $("#teacher-message").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}
function exportResults() {
  if (!teacherRows) return;
  const cell = value => {
    const text = String(value ?? "");
    const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [["Оқушы", "Нұсқа", "Дұрыс жауап", "Барлығы", "Тапсырған күні"],
    ...teacherRows.map(row => [row.student, row.title, row.correct, row.total, resultDate(row.created_at)])];
  const file = new Blob(["\uFEFF", rows.map(row => row.map(cell).join(";")).join("\r\n")],
    {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ubt-tarih-natizhe.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function resultDate(value) {
  return new Date(value).toLocaleString("kk-KZ", {timeZone:"Asia/Qyzylorda"});
}
function myHistory() {
  return history.filter(row => !row.student || row.student === student);
}
function renderTeacher() {
  if (!teacherRows) return '<div class="result-card"><h1>Мұғалім панелі</h1><form id="teacher-form"><label for="teacher-pin">PIN-код</label><input class="search" id="teacher-pin" name="pin" type="password" inputmode="numeric" required maxlength="3"><button class="btn">Кіру</button><p id="teacher-message" role="status"></p></form></div>';
  const rows = teacherRows.map(row => '<tr><td>'+esc(row.student)+'</td><td>'+esc(row.title)+'</td><td>'+row.correct+' / '+row.total+'</td><td>'+esc(resultDate(row.created_at))+'</td></tr>').join("");
  return '<h1>Мұғалім панелі</h1><p class="lead">Соңғы бір жылдағы нәтижелер</p><div class="quiz-actions"><button class="btn" onclick="exportResults()">Excel үшін CSV жүктеу</button><button class="btn" data-go="teacher">Шығу</button></div>'+
    (rows ? '<div class="table-scroll"><table><thead><tr><th>Оқушы</th><th>Нұсқа</th><th>Балл</th><th>Күні</th></tr></thead><tbody>'+rows+'</tbody></table></div>' : '<p>Әзірге нәтиже жоқ.</p>');
}
function face(text){return '<div class="cover" style="background:linear-gradient(120deg,#4259c8,#a16bd6);display:grid;place-content:center;color:white;font-size:55px">'+text+'</div>'}
function render(){
let el=$("#main");$("#page-title").textContent=sections[view]||"Тест тапсыру";document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===view));
if (view === "teacher") {
  el.innerHTML = renderTeacher();
  return;
}
if (!student) {
  el.innerHTML = '<div class="result-card"><h1>ҰБТ тарих</h1><form id="student-form"><label for="student-name">Аты-жөніңіз</label><input class="search" id="student-name" name="student" autocomplete="name" maxlength="100" required placeholder="Атыңыз бен тегіңіз"><p>Сақталған нәтиже мұғалім панелінде бір жыл сақталады.</p><button class="btn">Кіру</button><p id="student-message" role="status"></p></form></div>';
  return;
}
if(view==="lessons"){renderLessonView(el);return}
if(view==="quiz"&&quiz){let q=quiz.questions[pos];el.innerHTML='<div class="quiz"><h1>'+esc(quiz.title)+'</h1><p class="lead">Сұрақ '+(pos+1)+' / '+quiz.questions.length+'</p><div class="progressbar"><div style="width:'+Math.round((pos+1)*100/quiz.questions.length)+'%"></div></div>'+(quiz.intro?'<div class="context-text">'+esc(quiz.intro)+'</div>':"")+'<div class="question-card"><h2>'+esc(q.text)+'</h2>'+q.options.map(([k,v])=>'<button class="choice '+(answers[pos]===k ? (feedback[pos] || "selected") : "")+'" data-choice="'+esc(k)+'"><b>'+esc(k)+')</b><span>'+esc(v)+'</span></button>').join("")+'<div class="quiz-actions"><button class="btn" onclick="back()">← Артқа</button><button class="btn" '+(pos===quiz.questions.length-1?'id="save-result" onclick="saveResult()">Нәтижені сақтау':'onclick="next()">Келесі →')+'</button></div><p id="quiz-message" role="status">'+(feedback[pos]==="correct"?"Дұрыс, жарайсың!":feedback[pos]==="retry"?"Ойлан! Жауапты қайта таңдап көр.":"")+'</p></div><div class="notice">Кілті жоқ немесе сәйкестендіру/көпжауапты тапсырмалар автоматты бағаланбайды.</div></div>';return}
if(view==="done"){let r=history.at(-1);el.innerHTML='<div class="result-card"><h1>🎉 Нәтиже сақталды!</h1><h2>'+esc(r.title)+'</h2><h1>'+(r.total?r.correct+" / "+r.total:"Жауап кілті жоқ")+'</h1><p class="lead">'+r.questions+' тапсырма қаралды. Балл бағаланатын сұрақтарға берген алғашқы жауаптарың бойынша есептелді.</p><button class="btn" data-go="progress">Нәтижелерім →</button></div>';return}
if(view==="home"){el.innerHTML='<h1>Сәлем, болашақ талапкер! 👋</h1><div class="hero"><div class="copy"><small>✦ UBT TARIH ПЛАТФОРМАСЫ</small><h2>ҰБТ ТАРИХ сайтына қош келдіңіз!</h2><p>Тарихты меңгер, біліміңді шыңда, <b>140 балға ұмтыл!</b></p><button class="btn gold" data-go="tests">Дайындықты бастау →</button></div><div class="scene" aria-label="Үш өлшемді тарих кітабы"><div class="book">UBT<br>TARIH</div><div class="orbit"></div><div class="year-bubble y1">1465</div><div class="year-bubble y2">1991</div></div></div><div class="stats"><div class="stat"><b>'+DB.world.length+'</b><span>Дүниежүзі тарихы нұсқасы</span></div><div class="stat"><b>'+DB.contexts.length+'</b><span>Қазақстан тарихы контексті</span></div><div class="stat"><b>'+DB.dates.length+'</b><span>Маңызды дата</span></div><div class="stat"><b>'+myHistory().length+'</b><span>Аяқталған тест</span></div></div><h2 class="section-title">📚 Оқу бағыттары</h2><div class="cards"><button class="card" data-go="contexts">'+face("🏛️")+'<h3>Қазақстан тарихы</h3><p>Контекст пен тарихи тұлғалар</p></button><button class="card" data-go="tests">'+face("🌍")+'<h3>Дүниежүзі тарихы</h3><p>'+DB.world.length+' тест нұсқасы</p></button><button class="card" data-go="dates">'+face("📜")+'<h3>Мәдениет және хронология</h3><p>100 тарихи дата</p></button></div>';return}
if(view==="subjects"){el.innerHTML='<h1>Оқу бағыттары</h1><div class="cards"><button class="card" data-go="contexts">'+face("🏛️")+'<h3>Қазақстан тарихы</h3></button><button class="card" data-go="tests">'+face("🌍")+'<h3>Дүниежүзі тарихы</h3></button><button class="card" data-go="dates">'+face("📜")+'<h3>Хронология</h3></button></div>';return}
if(view==="tests"||view==="contexts"||view==="people"){const key={tests:"world",contexts:"contexts",people:"people"}[view],list=DB[key];el.innerHTML='<h1>'+sections[view]+'</h1><p class="lead">'+list.length+' жинақ қолжетімді</p><div class="cards">'+list.map((x,i)=>'<div class="card exam-card"><div class="type">'+(key==="world"?"ДҮНИЕЖҮЗІ ТАРИХЫ":key==="contexts"?"ҚАЗАҚСТАН ТАРИХЫ":"ТАРИХИ ТҰЛҒА")+'</div><h3>'+esc(x.title)+'</h3><p>'+x.questions.length+' тапсырма</p><button class="btn" data-start="'+key+':'+i+'">Тестті бастау →</button></div>').join("")+'</div>';return}
if(view==="dates"){el.innerHTML='<h1>🗓️ 100 маңызды дата</h1><p class="lead">Дүниежүзі тарихы бойынша маңызды тарихи оқиғалар</p><input class="search" id="searchdate" placeholder="Датаны немесе оқиғаны іздеу..." oninput="filterDates()"><div class="date-grid" id="dategrid">'+DB.dates.map(x=>'<div class="date-item"><b>'+x.n+'</b><span>'+esc(x.text)+'</span></div>').join("")+'</div>';return}
if(view==="qmj"){el.innerHTML="<h1>📁 ҚМЖ — қысқа мерзімді жоспарлар</h1><p class=\"lead\">11-сынып · Қазақстан тарихы және дүниежүзі тарихы · 1–2-тоқсан</p><div class=\"cards\"><div class=\"card exam-card\"><div class=\"type\">11-СЫНЫП · ҚМЖ</div><h3>🏛️ Қазақстан тарихы · 1-тоқсан</h3><p>Түпнұсқа Word құжаты · кестелер мен суреттер өзгеріссіз</p><a class=\"btn\" style=\"display:inline-block;margin-top:12px\" href=\"/qmj/word/kazakhstan-11-q1.doc\" download>Word құжатын ашу / жүктеу ↗</a><p style=\"margin-top:12px\"><a href=\"/qmj/kazakhstan-11-q1.html\">Мәтіндік нұсқасы</a></p></div><div class=\"card exam-card\"><div class=\"type\">11-СЫНЫП · ҚМЖ</div><h3>🏛️ Қазақстан тарихы · 2-тоқсан</h3><p>Түпнұсқа Word құжаты · кестелер мен суреттер өзгеріссіз</p><a class=\"btn\" style=\"display:inline-block;margin-top:12px\" href=\"/qmj/word/kazakhstan-11-q2.docx\" download>Word құжатын ашу / жүктеу ↗</a><p style=\"margin-top:12px\"><a href=\"/qmj/kazakhstan-11-q2.html\">Мәтіндік нұсқасы</a></p></div><div class=\"card exam-card\"><div class=\"type\">11-СЫНЫП · ҚМЖ</div><h3>🌍 Дүниежүзі тарихы · 1-тоқсан</h3><p>Түпнұсқа Word құжаты · кестелер мен суреттер өзгеріссіз</p><a class=\"btn\" style=\"display:inline-block;margin-top:12px\" href=\"/qmj/word/world-11-q1.doc\" download>Word құжатын ашу / жүктеу ↗</a><p style=\"margin-top:12px\"><a href=\"/qmj/world-11-q1.html\">Мәтіндік нұсқасы</a></p></div><div class=\"card exam-card\"><div class=\"type\">11-СЫНЫП · ҚМЖ</div><h3>🌍 Дүниежүзі тарихы · 2-тоқсан</h3><p>Түпнұсқа Word құжаты · кестелер мен суреттер өзгеріссіз</p><a class=\"btn\" style=\"display:inline-block;margin-top:12px\" href=\"/qmj/word/world-11-q2.docx\" download>Word құжатын ашу / жүктеу ↗</a><p style=\"margin-top:12px\"><a href=\"/qmj/world-11-q2.html\">Мәтіндік нұсқасы</a></p></div></div>";return}
if(view==="videos"){
const videos=[{"platform":"youtube","id":"l-wLGl4HyvM","url":"https://youtu.be/l-wLGl4HyvM?si=sUPTUXxawMNm5az3"},{"platform":"instagram","id":"DfmizI0jvOa","url":"https://www.instagram.com/p/DfmizI0jvOa/?img_index=7&bqrl=MTJ5MGh1bzlheXZrMA==","post":true},{"platform":"instagram","id":"DgIhB0lihQB","url":"https://www.instagram.com/reel/DgIhB0lihQB/?evlk=MTA2bTFpemlxcjFhcw=="},{"platform":"youtube","id":"7MtQrDViiPQ","url":"https://youtu.be/7MtQrDViiPQ?si=YJg7O2y5pdKpz9Rh"},{"platform":"youtube","id":"XAC_sxIjSfU","url":"https://youtu.be/XAC_sxIjSfU?si=Sap5uo6ghwX1Fzka"}];
el.innerHTML='<h1>🎬 Видео сабақ</h1><p class="lead">Сабаққа арналған 5 бейне және Instagram материалы</p><div class="video-lessons-grid">'+videos.map((v,i)=>{
const name=(v.platform==="youtube"?"YouTube · Видео сабақ ":"Instagram · ")+(i+1);
const player=v.platform==="youtube"
?'<div class="video-embed"><iframe loading="lazy" title="'+esc(name)+'" src="https://www.youtube-nocookie.com/embed/'+v.id+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>'
: '<div class="video-embed instagram-embed"><iframe loading="lazy" title="'+esc(name)+'" src="https://www.instagram.com/'+(v.post?'p':'reel')+'/'+v.id+'/embed/" allowfullscreen></iframe></div>';
return '<article class="video-lesson-card"><div class="video-lesson-header"><span class="video-lesson-number">'+(i+1)+'</span><div><h3>'+esc(name)+'</h3><p>'+(v.platform==="youtube"?"Видеоны осы жерден көріңіз":"Instagram жазбасы · ашылмаса, түпнұсқа сілтемені қолданыңыз")+'</p></div></div>'+player+'<a class="video-original-link" href="'+esc(v.url)+'" target="_blank" rel="noopener noreferrer">'+(v.platform==="youtube"?"YouTube-та ашу ↗":"Instagram-да ашу ↗")+'</a></article>';
}).join("")+'</div><div class="notice">Instagram материалдары аккаунттың жариялылығына және Instagram шектеулеріне байланысты сайт ішінде көрсетілмеуі мүмкін. Ондай жағдайда «Instagram-да ашу» сілтемесін басыңыз.</div>';
return;
}
if(view==="map"){renderHistoryMap(el);return}
if(view==="aitools"){renderHistoryAiTools(el);return}
if(view==="materials"){el.innerHTML='<h1>📁 Материалдар</h1><div class="cards"><button class="card" data-go="tests"><h3>Дүниежүзі тарихы</h3><p>'+DB.world.length+' тест нұсқасы</p></button><button class="card" data-go="contexts"><h3>Қазақстан тарихы</h3><p>21 контекст</p></button><button class="card" data-go="dates"><h3>100 дата</h3><p>Маңызды хронология</p></button><button class="card" data-go="people"><h3>Тарихи тұлғалар</h3><p>Құжат негізіндегі тапсырмалар</p></button></div><div class="notice">Қазақстан тарихынан 50 тест нұсқасының файлы жүктелген материалдардың арасында жоқ. Қосымша оқу ресурсы: <a href="https://ubt140.kz/kk/materials/" target="_blank" rel="noopener noreferrer">ҰБТ 140 материалдары</a>.</div>';return}
if(view==="progress"){el.innerHTML='<h1>📊 Менің нәтижелерім</h1><p class="lead">Осы браузерден тапсырған тест нәтижелеріңіз.</p><button id="switch-student" class="btn">Оқушыны ауыстыру</button><div class="results-list">'+(myHistory().length?myHistory().reverse().map(x=>'<div class="result-row"><strong>'+esc(x.title)+'</strong><span>'+x.correct+' / '+x.total+' · '+esc(x.date)+'</span></div>').join(""):'<div class="result-row">Әзірге тест нәтижелері жоқ</div>')+'</div>';return}
}
function filterDates(){let s=$("#searchdate").value.toLocaleLowerCase("kk");document.querySelectorAll(".date-item").forEach(x=>x.style.display=x.textContent.toLocaleLowerCase("kk").includes(s)?"":"none")}
(async()=>{try{const names=["world","contexts","dates","people"];const values=await Promise.all(names.map(async n=>{let r=await fetch("/data/"+n+".json");if(!r.ok)throw Error(n);return r.json()}));names.forEach((n,i)=>DB[n]=n === "world" ? makeWorldVariants(values[i]) : values[i]);render()}catch(e){document.querySelector("#main").innerHTML='<h2>Материалдар жүктелмеді</h2><p>Сайтты веб-сервер арқылы ашыңыз. '+esc(e.message)+'</p>'}})();