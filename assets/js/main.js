// Main front-end JS for EasyGrade (client-side demo)
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

  function prev(){
    if(current>0){ current--; renderQuestion(); }
  }
  function next(){
    if(current<total-1){ current++; renderQuestion(); }
  }

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

  function submitTest(){
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

    // save result
    const results = JSON.parse(localStorage.getItem('easygrade_results')||'[]');
    results.unshift({ date: new Date().toISOString(), total: questions.length, score, percent });
    localStorage.setItem('easygrade_results', JSON.stringify(results));

    // show results view
    document.getElementById('test-area').classList.add('d-none');
    document.getElementById('results-area').classList.remove('d-none');
    document.getElementById('retakeBtn').addEventListener('click', ()=>{
      // reset and go back to setup
      backToSetup();
    });
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

// Careers form handling
const CareersForm = (function(){
  function bind(){
    const form = document.getElementById('tutorForm');
    form.addEventListener('submit', handleSubmit);

    // simple bootstrap validation visual
    form.addEventListener('input', (e)=>{
      if(e.target.checkValidity()) e.target.classList.remove('is-invalid');
    });
  }

  function handleSubmit(e){
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

    const apps = JSON.parse(localStorage.getItem('easygrade_apps')||'[]');
    const app = { id: Date.now(), name, email, subject, bio, resumeName: resume?resume.name:'', date: new Date().toISOString() };
    apps.unshift(app);
    localStorage.setItem('easygrade_apps', JSON.stringify(apps));

    const msg = document.getElementById('formMessage');
    msg.innerHTML = '<div class="alert alert-success">Application submitted. We will review and contact you soon.</div>';
    form.reset();
  }

  return { bind };
})();
