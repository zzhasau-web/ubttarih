/* UBT TARIH — deterministic questions about the source learning objectives.
   Shared without changes by browser and server. */
export function makeLessonQuestions(plans, planIndex, number) {
  const plan=plans[planIndex];
  if(!plan)throw Error('Plan not found');
  const lesson=plan.lessons.find(x=>x.n===number);
  if(!lesson)throw Error('Lesson not found');
  const peers=plan.lessons.filter(x=>x.n!==number && x.title && x.goal && !/^\s*(ТЖБ|БЖБ)/.test(x.title));
  const title=lesson.title || ('№'+lesson.n+' — КТЖ-да тақырып көрсетілмеген');
  const goal=lesson.goal || 'КТЖ құжатында оқу мақсаты көрсетілмеген';
  const phrases=s=>String(s||'').split(/[;\n]+/).map(t=>t.trim()).filter(Boolean).map(t=>t.replace(/^\d{1,2}(?:\.\d+){2,4}\s*[-–.]?\s*/, '').trim()).filter(Boolean);
  const first=phrases(goal)[0]||goal;
  const second=phrases(goal)[1]||first;
  const titles=peers.map(x=>x.title).filter(x=>x!==title);
  const goals=peers.map(x=>phrases(x.goal)[0]).filter(x=>x!==first);
  function opts(right, pool, shift) {
    let others=[...new Set(pool.map(x=>String(x||'').trim()).filter(x=>x && x!==right))];
    if(!others.length)others=['Тақырыптан тыс деректерді ғана жаттау','Деректерді зерттемей бағалау','Мақсатқа қатысы жоқ тапсырмалар орындау'];
    const selected=[];
    for(let i=0; selected.length<3 && i<others.length*3;i++){
      const option=others[(i*7+shift*3)%others.length];
      if(!selected.includes(option))selected.push(option);
    }
    while(selected.length<3)selected.push('Басқа тақырыптың материалдарын оқу '+(selected.length+1));
    const slot=shift%4;selected.splice(slot,0,right);
    return {options:selected,answer:slot};
  }
  const objCodes=goal.match(/\b(?:10|11)\s*\.\s*\d\s*\.\s*\d\s*\.\s*\d\b/g)||[];
  const correctCode=objCodes[0]?.replace(/\s/g,'')||('№ '+lesson.n);
  const codePool=peers.flatMap(x=>(x.goal.match(/\b(?:10|11)\s*\.\s*\d\s*\.\s*\d\s*\.\s*\d\b/g)||[]).map(z=>z.replace(/\s/g,'')));
  const methodOptions=['тарихи деректерді талдау','салыстыру және себеп-салдарды анықтау','картамен жұмыс істеу','тарихи құбылысты сипаттау','уақыт пен өзгерістерді зерттеу'];
  const matched=methodOptions.find(x=>goal.toLowerCase().includes(x.split(' ')[0])) || methodOptions[(lesson.n+planIndex)%methodOptions.length];
  const focus=title.replace(/\s*БЖБ\s*№?\s*\d+/gi,'').replace(/\s*ТЖБ\s*№?\s*\d+/gi,'').trim();
  const questions=[
    ['КТЖ бойынша осы сабақтың нақты тақырыбы қайсы?',title,titles],
    ['Осы сабақтың оқу мақсатына сәйкес тұжырымды таңдаңыз.',first,goals],
    ['Бұл сабақта зерттелетін негізгі мәселені анықтаңыз.',focus,titles],
    ['Оқу бағдарламасында осы сабаққа сәйкес қандай мақсат берілген?',second,goals],
    ['Тақырыпты түсіндіретін тарихи зерттеу жұмысының нысанын таңдаңыз.',title,titles],
    ['Тақырыпқа сәйкес ғылыми талдау қай бағытты қамтиды?',first,goals],
    ['Осы сабақпен тікелей байланысты оқу тақырыбын табыңыз.',focus,titles],
    ['КТЖ-дағы оқу мақсатының кодын анықтаңыз.',correctCode,codePool],
    ['Қай тұжырым осы тақырыпты оқудың күтілетін нәтижесіне жақын?',second,goals],
    ['Қорытынды қай сабаққа қатысты жасалуы тиіс?',title,titles]
  ];
  return questions.map(([text,right,pool],i)=>({text,...opts(right,pool,i+lesson.n+planIndex)}));
}