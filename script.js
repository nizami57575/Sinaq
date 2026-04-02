let questions = [];
let seconds = 0;
let timer;

// Dark/Light Rejim
document.getElementById('theme-btn').onclick = () => {
    const body = document.body;
    body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};

async function startProcessing() {
    const file = document.getElementById('fileInput').files[0];
    if(!file) return alert("Fayl seçin!");

    document.getElementById('loader').classList.remove('hidden');
    
    // Test yaratmaq (Simulyasiya - Həqiqi AI üçün API lazımdır)
    setTimeout(() => {
        for(let i=1; i<=10; i++) {
            questions.push({
                q: `${i}. Fayl əsasında hazırlanmış sual mətni?`,
                a: "Doğru cavab variantı", b: "Yanlış variant 1", c: "Yanlış variant 2", d: "Yanlış variant 3",
                correct: "a"
            });
        }
        renderQuiz();
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('status-bar').classList.remove('hidden');
        document.getElementById('finish-btn').classList.remove('hidden');
        document.getElementById('q-total').innerText = questions.length;
        startTimer();
    }, 2000);
}

function renderQuiz() {
    const box = document.getElementById('quiz-box');
    box.innerHTML = questions.map((item, i) => `
        <div class="question-block">
            <p><b>${item.q}</b></p>
            <div class="options">
                <label><input type="radio" name="q${i}" value="a"> A) ${item.a}</label>
                <label><input type="radio" name="q${i}" value="b"> B) ${item.b}</label>
                <label><input type="radio" name="q${i}" value="c"> C) ${item.c}</label>
                <label><input type="radio" name="q${i}" value="d"> D) ${item.d}</label>
            </div>
        </div>
    `).join('');
}

function startTimer() {
    timer = setInterval(() => {
        seconds++;
        let m = Math.floor(seconds/60), s = seconds%60;
        document.getElementById('timer').innerText = `${m}:${s<10?'0'+s:s}`;
    }, 1000);
}

function showResults() {
    clearInterval(timer);
    let correct = 0;
    questions.forEach((item, i) => {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        if(sel && sel.value === item.correct) correct++;
    });
    
    document.getElementById('res-modal').classList.remove('hidden');
    document.getElementById('res-text').innerHTML = `
        ✅ Düzgün: ${correct} <br>
        ❌ Səhv: ${questions.length - correct} <br>
        ⏱ Vaxt: ${document.getElementById('timer').innerText}
    `;
}
