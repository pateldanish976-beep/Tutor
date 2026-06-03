// Main front-end JS for EasyGrade (client-side demo) with optional Firebase integration
const TestPortal = (function(){
  let questions = [];
  let answers = {};
  let current = 0;
  let total = 0;
  let timerInterval = null;
  let secondsLeft = 0;

  function bindUI(){
    document.getElementById('prevBtn').addEventListener('click', prev);
    document.getElementById('nextBtn').addEventListener('click', next);
    document.getElementById('submitBtn').addEventListener('click', submitTest);
    document.getElementById('retakeBtn')?.addEventListener('click', retake);
    document.getElementById('backSetup')?.addEventListener('click', backToSetup);
    document.getElementById('closeHistory')?.addEventListener('click', closeHistory);
  }

  function start(qs, timeMinutes=10){
    if(!qs || !qs.length) return alert('No questions available for this subject.');
    questions = qs.slice();
    total = questions.length;
    answers = {};
    current = 0;
    secondsLeft = Math.max(30, timeMinutes*60);

    document.getElementById('totalQuestions').textContent = total;
    document.getElementById('currentIndex').textContent = current+1;
    document.getElementById('test-setup').classList.add('d-none');
    document.getElementById('historyArea').classList.add('d-none');
    document.getElementById('results-area').classList.add('d-none');
    document.getElementById('test-area').classList.remove('d-none');

    renderQuestion();
    startTimer();
  }

  function renderQuestion(){
    const q = questions[current];
    document.getElementById('currentIndex').textContent = current+1;
    const card = document.getElementById('questionCard');
    card.innerHTML = '';
    const qEl = document.createElement('div');
    qEl.className = 'mb-3';
    qEl.innerHTML = `<strong>${q.text}</strong>`;
    card.appendChild(qEl);

    if(q.type === 'mcq'){
      const list = document.createElement('div');
      q.options.forEach((opt, idx)=>{
        const id = `opt-${q.id}-${idx}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'form-check';
        wrapper.innerHTML = `<input class="form-check-input" type="radio" name="q-${q.id}" id="${id}" value="${idx}" ${answers[q.id]==idx?'checked':''}>
          <label class="form-check-label" for="${id}">${opt}</label>`;
        list.appendChild(wrapper);
      });
      card.appendChild(list);

      // attach change handlers
      const inputs = card.querySelectorAll('input[type=radio]');
      inputs.forEach(inp=> inp.addEventListener('change', (e)=>{
        answers[q.id] = parseInt(e.target.value,10);
        saveProgressToLocal();
      }));
    }
  }

  function prev(){ if(current>0){ current--; renderQuestion(); } }
  function next(){ if(current<total-1){ current++; renderQuestion(); } }

  function startTimer(){
    updateTimerDisplay();
    timerInterval = setInterval(()=>{
      secondsLeft--;
      if(secondsLeft<=0){ clearInterval(timerInterval); submitTest(); }
      updateTimerDisplay();
    },1000);
  }
  function updateTimerDisplay(){
    const m = String(Math.floor(secondsLeft/60)).padStart(2,'0');
    const s = String(secondsLeft%60).padStart(2,'0');
    const el = document.getElementById('timer'); if(el) el.textContent = `${m}:${s}`;
  }

  async function submitTest(){
    clearInterval(timerInterval);
    // score
    let score = 0;
    questions.forEach(q=>{
      if(answers[q.id] !== undefined && answers[q.id] === q.answer) score++;
    });
    const percent = Math.round((score/questions.length)*100);

    // feedback
    const feedback = `You scored ${score} out of ${questions.length} (${percent}%).`;
    document.getElementById('scoreText').textContent = feedback;

    const fbEl = document.getElementById('feedback');
    fbEl.innerHTML = '';
    questions.forEach(q=>{
      const correct = q.options[q.answer];
      const your = answers[q.id]!==undefined ? q.options[answers[q.id]] : '<em>Not answered</em>';
      const row = document.createElement('div');
      row.innerHTML = `<strong>${q.text}</strong><div>Correct: <em>${correct}</em> — Your answer: <em>${your}</em></div><hr>`;
      fbEl.appendChild(row);
    });

    const resultPayload = { date: new Date().toISOString(), total: questions.length, score, percent, subject: (document.getElementById('subjectSelect')?.value||'') };

    // save result: try Firebase if enabled, else localStorage
    if(window.FirebaseHelpers && FirebaseHelpers.isEnabled()){
      try{
        const user = null; // we can't access auth user directly here; FirebaseHelpers handles server-side docs
        await FirebaseHelpers.saveTestResult('anonymous', resultPayload);
      }catch(e){ console.warn('Failed to save to Firebase, falling back to localStorage', e); saveResultLocal(resultPayload); }
    } else {
      saveResultLocal(resultPayload);
    }

    // show results view
    document.getElementById('test-area').classList.add('d-none');
    document.getElementById('results-area').classList.remove('d-none');
    document.getElementById('retakeBtn').addEventListener('click', ()=>{ backToSetup(); });
  }

  function saveResultLocal(result){
    const results = JSON.parse(localStorage.getItem('easygrade_results')||'[]');
    results.unshift(result);
    localStorage.setItem('easygrade_results', JSON.stringify(results));
  }

  function retake(){ backToSetup(); }
  function backToSetup(){
    clearInterval(timerInterval);
    document.getElementById('results-area').classList.add('d-none');
    document.getElementById('test-area').classList.add('d-none');
    document.getElementById('historyArea').classList.add('d-none');
    document.getElementById('test-setup').classList.remove('d-none');
  }

  function showHistory(){
    const results = JSON.parse(localStorage.getItem('easygrade_results')||'[]');
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if(results.length===0){ list.innerHTML = '<li class="list-group-item">No past results.</li>'; }
    results.forEach(r=>{
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<div><strong>${r.score}/${r.total}</strong><div class="text-muted small">${new Date(r.date).toLocaleString()}</div></div><span class="badge bg-primary rounded-pill">${r.percent}%</span>`;
      list.appendChild(li);
    });
    document.getElementById('test-setup').classList.add('d-none');
    document.getElementById('historyArea').classList.remove('d-none');
  }

  function closeHistory(){ document.getElementById('historyArea').classList.add('d-none'); document.getElementById('test-setup').classList.remove('d-none'); }

  function saveProgressToLocal(){
    const progress = { questions, answers, current };
    localStorage.setItem('easygrade_progress', JSON.stringify(progress));
  }

  return { bindUI, start, showHistory };
})();

// Careers form handling with optional Firebase integration
const CareersForm = (function(){
  function bind(){
    const form = document.getElementById('tutorForm');
    form.addEventListener('submit', handleSubmit);

    // simple bootstrap validation visual
    form.addEventListener('input', (e)=>{
      if(e.target.checkValidity()) e.target.classList.remove('is-invalid');
    });
  }

  async function handleSubmit(e){
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const bio = form.bio.value.trim();
    const resume = form.resume.files[0];

    if(!name || !email || !subject){
      if(!name) form.name.classList.add('is-invalid');
      if(!email) form.email.classList.add('is-invalid');
      if(!subject) form.subject.classList.add('is-invalid');
      return;
    }

    if(window.FirebaseHelpers && FirebaseHelpers.isEnabled()){
      try{
        await FirebaseHelpers.saveTutorApplication({ name, email, subject, bio, resumeFile: resume });
        document.getElementById('formMessage').innerHTML = '<div class="alert alert-success">Application submitted. We will review and contact you soon.</div>';
        form.reset();
      }catch(err){
        console.error(err);
        document.getElementById('formMessage').innerHTML = '<div class="alert alert-danger">Failed to submit application. Please try again later.</div>';
      }
    } else {
      const apps = JSON.parse(localStorage.getItem('easygrade_apps')||'[]');
      const app = { id: Date.now(), name, email, subject, bio, resumeName: resume?resume.name:'', date: new Date().toISOString() };
      apps.unshift(app);
      localStorage.setItem('easygrade_apps', JSON.stringify(apps));
      const msg = document.getElementById('formMessage');
      msg.innerHTML = '<div class="alert alert-success">Application submitted (demo mode). We will review and contact you soon.</div>';
      form.reset();
    }
  }

  return { bind };
})();

// Sample questions (kept in the page scripts) and startup
document.addEventListener('DOMContentLoaded', () => {
  // bind UI
  TestPortal.bindUI();
  CareersForm.bind();

  // wire start/test buttons if present
  const startBtn = document.getElementById('startTest');
  if(startBtn){
    const sampleQuestions = {
      math: [
        { id: 1, type: 'mcq', text: 'What is 8 × 7?', options: ['54', '56', '58', '64'], answer: 1 },
        { id: 2, type: 'mcq', text: 'Solve: 12 ÷ 3 + 4', options: ['8', '6', '7', '4'], answer: 0 },
        { id: 3, type: 'mcq', text: 'What is the square root of 81?', options: ['7', '8', '9', '10'], answer: 2 }
      ],
      english: [
        { id: 1, type: 'mcq', text: 'Choose the correct form: "She ___ to the store yesterday."', options: ['go', 'goes', 'went', 'gone'], answer: 2 },
        { id: 2, type: 'mcq', text: 'Select the synonym of "happy".', options: ['sad', 'elated', 'angry', 'tired'], answer: 1 }
      ],
      science: [
        { id: 1, type: 'mcq', text: 'Water boils at what temperature at sea level?', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1 }
      ]
    };

    startBtn.addEventListener('click', () => {
      const sub = document.getElementById('subjectSelect').value;
      const time = parseInt(document.getElementById('timeLimit').value, 10) || 10;
      TestPortal.start(sampleQuestions[sub], time);
    });
    document.getElementById('viewResults').addEventListener('click', () => TestPortal.showHistory());
  }

});
