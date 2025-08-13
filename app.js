// BlueQuiz - simple client-side quiz for GitHub Pages
// Storage keys
const DB_KEY = 'bluequiz_questions_v1';
const ADMIN_KEY = 'bluequiz_admin_v1';
const ACTIVE_KEY = 'bluequiz_active_v1';

// Helpers
const $ = id => document.getElementById(id);
const save = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
const load = k => {
  const s = localStorage.getItem(k);
  return s ? JSON.parse(s) : null;
};

// Init default data
if(!load(DB_KEY)){
  const sample = [
    {id:1,text:"Stolicą Polski jest?",opts:{A:"Warszawa",B:"Kraków",C:"Gdańsk",D:"Poznań"},correct:"A"},
    {id:2,text:"2+2 = ?",opts:{A:"3",B:"4",C:"5",D:"2"},correct:"B"},
    {id:3,text:"Kolor nieba za dnia:",opts:{A:"Zielony",B:"Czerwony",C:"Niebieski",D:"Czarny"},correct:"C"}
  ];
  save(DB_KEY,sample);
}
// default admin pass
if(!load(ADMIN_KEY)){
  save(ADMIN_KEY,{password:"admin123"});
}
if(!load(ACTIVE_KEY)) save(ACTIVE_KEY,[]);

// Theme
const themeSwitch = $('themeSwitch');
const themePref = localStorage.getItem('bluequiz_theme') || 'light';
if(themePref==='dark') document.body.classList.add('dark'), themeSwitch.checked=true;
themeSwitch.addEventListener('change',()=>{
  if(themeSwitch.checked){ document.body.classList.add('dark'); localStorage.setItem('bluequiz_theme','dark');}
  else { document.body.classList.remove('dark'); localStorage.setItem('bluequiz_theme','light');}
});

// App state
let state = {
  currentTest:null,
  participantName:null,
  participantAnswers:{},
  currentIndex:0,
  timer: null,
  remaining:0
};

// UI refs
const landing = $('landing');
const adminBtn = $('adminBtn');
const joinBtn = $('joinBtn');
const joinCodeInput = $('joinCode');
const participantNameInput = $('participantName');

const participantArea = $('participantArea');
const questionBox = $('questionBox');
const nextBtn = $('nextBtn');
const submitBtn = $('submitBtn');
const countdown = $('countdown');

const resultArea = $('resultArea');
const scoreText = $('scoreText');
const backHome = $('backHome');

const adminLogin = $('adminLogin');
const adminLoginBtn = $('adminLoginBtn');
const adminCancel = $('adminCancel');
const adminPass = $('adminPass');
const adminArea = $('adminArea');
const addQBtn = $('addQBtn');
const qText = $('qText');
const optA = $('optA'); const optB = $('optB'); const optC = $('optC'); const optD = $('optD'); const correctOpt = $('correctOpt');
const questionsList = $('questionsList');
const clearDbBtn = $('clearDbBtn');

const createTestBtn = $('createTestBtn'); const testName = $('testName'); const numQuestions = $('numQuestions'); const totalTime = $('totalTime'); const randomMode = $('randomMode');
const viewActiveBtn = $('viewActiveBtn'); const activeTests = $('activeTests'); const activeList = $('activeList'); const closeActive = $('closeActive');

const logoutAdmin = $('logoutAdmin');
const adminLoginSection = $('adminLogin');
const newAdminPass = $('newAdminPass'); const changePassBtn = $('changePassBtn');

const questionsDB = () => load(DB_KEY) || [];
const activeDB = () => load(ACTIVE_KEY) || [];
const setActiveDB = (v)=>save(ACTIVE_KEY,v);

// Landing actions
adminBtn.addEventListener('click', ()=> { landing.classList.add('hidden'); adminLogin.classList.remove('hidden'); });
joinBtn.addEventListener('click', () => {
  const code = joinCodeInput.value.trim();
  const name = participantNameInput.value.trim();
  if(!code || !name){ alert('Wprowadź kod testu i swoje imię i nazwisko'); return; }
  const active = activeDB().find(t=>t.code===code && t.open);
  if(!active){ alert('Nie znaleziono aktywnego testu o tym kodzie'); return; }
  startParticipant(active, name);
});

// Admin login
adminLoginBtn.addEventListener('click', ()=>{
  const pw = adminPass.value || '';
  const admin = load(ADMIN_KEY);
  if(!admin || pw !== admin.password){ alert('Błędne hasło'); return; }
  adminLogin.classList.add('hidden');
  adminArea.classList.remove('hidden');
  landing.classList.add('hidden');
  renderQuestionList();
});
adminCancel.addEventListener('click', ()=>{
  adminLogin.classList.add('hidden'); landing.classList.remove('hidden');
});

// Admin CRUD questions
function renderQuestionList(){
  const arr = questionsDB();
  questionsList.innerHTML='';
  arr.forEach(q=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${q.text}</strong><div class="muted small">${q.opts.A||''} | ${q.opts.B||''} | ${q.opts.C||''} | ${q.opts.D||''}</div></div>
      <div>
        <button class="secondary" data-id="${q.id}" onclick="editQ(this)">Edytuj</button>
        <button class="secondary" data-id="${q.id}" onclick="delQ(this)">Usuń</button>
      </div>`;
    questionsList.appendChild(li);
  });
}
window.editQ = function(btn){
  const id = +btn.getAttribute('data-id');
  const q = questionsDB().find(x=>x.id===id);
  if(!q) return;
  qText.value = q.text; optA.value=q.opts.A; optB.value=q.opts.B; optC.value=q.opts.C||''; optD.value=q.opts.D||''; correctOpt.value=q.correct;
  // on add, replace existing if id same
  addQBtn.onclick = ()=>{
    q.text = qText.value.trim();
    q.opts = {A:optA.value, B:optB.value, C:optC.value, D:optD.value};
    q.correct = (correctOpt.value||'').toUpperCase();
    const db = questionsDB();
    save(DB_KEY, db);
    renderQuestionList(); clearQuestionForm();
    addQBtn.onclick = addQuestion;
  };
};
window.delQ = function(btn){
  if(!confirm('Usuń pytanie?')) return;
  const id = +btn.getAttribute('data-id');
  const db = questionsDB().filter(x=>x.id!==id);
  save(DB_KEY,db);
  renderQuestionList();
};

function clearQuestionForm(){
  qText.value=''; optA.value=''; optB.value=''; optC.value=''; optD.value=''; correctOpt.value='';
}
function addQuestion(){
  const text = qText.value.trim();
  const A = optA.value.trim(); const B = optB.value.trim();
  const C = optC.value.trim(); const D = optD.value.trim();
  const corr = (correctOpt.value||'').toUpperCase();
  if(!text || !A || !B || !corr){ alert('Wypełnij minimum pole pytania i dwie odpowiedzi oraz prawidłową'); return; }
  const db = questionsDB();
  const id = db.length ? Math.max(...db.map(x=>x.id))+1 : 1;
  db.push({id,text,opts:{A,B,C,D},correct:corr});
  save(DB_KEY,db);
  renderQuestionList(); clearQuestionForm();
}
addQBtn.addEventListener('click', addQuestion);
clearDbBtn.addEventListener('click', ()=>{
  if(confirm('Wyczyścić całą bazę pytań?')){ save(DB_KEY,[]); renderQuestionList(); }
});

// Admin change pass
changePassBtn.addEventListener('click', ()=>{
  const np = newAdminPass.value.trim();
  if(!np){ alert('Wpisz nowe hasło'); return; }
  save(ADMIN_KEY,{password:np});
  alert('Hasło zmienione');
  newAdminPass.value='';
});

// Create test
createTestBtn.addEventListener('click', ()=>{
  const name = (testName.value||'Test').trim();
  const total = Math.max(0, parseInt(totalTime.value)||0);
  let count = Math.max(1, parseInt(numQuestions.value)||3);
  const random = randomMode.checked;

  const pool = questionsDB();
  if(pool.length===0){ alert('Brak pytań w bazie'); return; }
  if(random){
    if(count>pool.length) count = pool.length;
    // shuffle
    const shuffled = pool.slice().sort(()=>Math.random()-0.5).slice(0,count);
    createActiveTest(name,shuffled,total);
  } else {
    // take first N
    const selected = pool.slice(0, Math.min(count, pool.length));
    createActiveTest(name, selected, total);
  }
  alert('Test utworzony i uruchomiony — użytkownicy dołączają za pomocą kodu.');
  renderActiveTests();
});

function createActiveTest(name, questions, totalSeconds){
  const code = (''+Math.floor(Math.random()*900000+100000));
  const active = activeDB();
  const test = {
    id: Date.now(),
    code,
    name,
    open:true,
    totalSeconds,
    questions: questions.map(q=>({id:q.id,text:q.text,opts:q.opts,correct:q.correct})),
    startedAt: Date.now(),
    results: [] // {name,scorePercent,answers,finishedAt}
  };
  active.push(test);
  setActiveDB(active);
}

// Active tests show
viewActiveBtn.addEventListener('click', ()=> { landing.classList.add('hidden'); adminArea.classList.add('hidden'); activeTests.classList.remove('hidden'); renderActiveTests(); });
closeActive.addEventListener('click', ()=>{ activeTests.classList.add('hidden'); adminArea.classList.remove('hidden'); });

function renderActiveTests(){
  const arr = activeDB();
  activeList.innerHTML='';
  if(arr.length===0){ activeList.innerHTML='<li class="muted">Brak aktywnych testów</li>'; return; }
  arr.forEach(t=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${t.name}</strong><div class="muted small">Kod: <code>${t.code}</code> • Pyt.: ${t.questions.length} • Czas: ${t.totalSeconds||'brak'}</div></div>
      <div>
        <button class="secondary" data-code="${t.code}" onclick="endTest(this)">Zakończ</button>
        <button class="secondary" data-code="${t.code}" onclick="showResults(this)">Wyniki</button>
      </div>`;
    activeList.appendChild(li);
  });
}
window.endTest = function(btn){
  const code = btn.getAttribute('data-code');
  const arr = activeDB();
  const idx = arr.findIndex(x=>x.code===code);
  if(idx>=0){
    arr[idx].open = false;
    setActiveDB(arr);
    renderActiveTests();
  }
};
window.showResults = function(btn){
  const code = btn.getAttribute('data-code');
  const arr = activeDB();
  const t = arr.find(x=>x.code===code);
  if(!t){ alert('Brak testu'); return; }
  // show simple results in prompt (could be improved)
  const lines = t.results.length ? t.results.map(r=>`${r.name}: ${r.scorePercent}% (${r.correctCount}/${r.total})`) : ['Brak wyników'];
  alert(`Wyniki dla ${t.name}:\n` + lines.join('\n'));
};

// Participant flow
function startParticipant(test, name){
  landing.classList.add('hidden');
  participantArea.classList.remove('hidden');
  state.currentTest = test;
  state.participantName = name;
  state.participantAnswers = {};
  state.currentIndex = 0;
  renderQuestion();
  if(test.totalSeconds && test.totalSeconds>0){
    state.remaining = test.totalSeconds;
    countdown.textContent = `Pozostały czas: ${formatTime(state.remaining)}`;
    state.timer = setInterval(()=>{
      state.remaining--;
      if(state.remaining<=0){ clearInterval(state.timer); finishTest(); }
      countdown.textContent = `Pozostały czas: ${formatTime(state.remaining)}`;
    },1000);
  } else { countdown.textContent = ''; }
}

function formatTime(s){
  const mm = Math.floor(s/60); const ss = s%60; return `${mm}:${ss.toString().padStart(2,'0')}`;
}

function renderQuestion(){
  const t = state.currentTest;
  const i = state.currentIndex;
  const q = t.questions[i];
  $('testTitle').textContent = `${t.name} — pytanie ${i+1}/${t.questions.length}`;
  questionBox.innerHTML = `<div><strong>${q.text}</strong></div>`;
  const opts = q.opts || {};
  ['A','B','C','D'].forEach(letter=>{
    if(!opts[letter]) return;
    const btn = document.createElement('div');
    btn.className='choice';
    btn.dataset.letter = letter;
    btn.innerHTML = `<strong>${letter}</strong>. ${opts[letter]}`;
    btn.onclick = ()=> {
      // select
      document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      state.participantAnswers[i] = letter;
    };
    questionBox.appendChild(btn);
  });
  // prev/next
  nextBtn.disabled = i >= (t.questions.length - 1);
}

nextBtn.addEventListener('click', ()=>{
  if(state.currentIndex < state.currentTest.questions.length - 1){
    state.currentIndex++;
    renderQuestion();
  }
});
submitBtn.addEventListener('click', ()=> {
  if(!confirm('Zakończyć test i wysłać wynik?')) return;
  finishTest();
});

function finishTest(){
  if(state.timer) { clearInterval(state.timer); state.timer = null; }
  participantArea.classList.add('hidden');
  // grade
  const t = state.currentTest;
  let correct=0;
  t.questions.forEach((q,idx)=>{
    const ans = state.participantAnswers[idx];
    if(ans && ans.toUpperCase() === q.correct) correct++;
  });
  const total = t.questions.length;
  const percent = Math.round((correct/total)*100);
  scoreText.textContent = `${state.participantName}, Twój wynik: ${percent}% — poprawne: ${correct}/${total}`;
  resultArea.classList.remove('hidden');

  // save result into activeDB
  const arr = activeDB();
  const idx = arr.findIndex(x=>x.code===t.code);
  if(idx>=0){
    arr[idx].results.push({
      name: state.participantName,
      scorePercent: percent,
      correctCount: correct,
      total,
      answers: state.participantAnswers,
      finishedAt: Date.now()
    });
    setActiveDB(arr);
  }
}

backHome.addEventListener('click', ()=> {
  resultArea.classList.add('hidden');
  landing.classList.remove('hidden');
  joinCodeInput.value=''; participantNameInput.value='';
});

// Logout admin
logoutAdmin.addEventListener('click', ()=> {
  adminArea.classList.add('hidden');
  landing.classList.remove('hidden');
});

// initial render
renderQuestionList();
