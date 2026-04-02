let questions = [];
let timerInterval;
let seconds = 0;

// Dark Mode
const themeToggle = document.getElementById('theme-toggle');
themeToggle.onclick = () => {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
};

// Fayl emalı
async function processFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Fayl seçin!");

    document.getElementById('loading').classList.remove('hidden');
    
    // Burada mətni oxuma simulyasiyası və sual yaradılması
    setTimeout(() => {
        generateMockQuestions();
        startTimer();
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('stats-bar').style.display = 'flex';
        document.getElementById('submit-btn').classList.remove('hidden');
    }, 2000);
}

function generateMockQuestions() {
    questions = [];
    const count = 10; // Minimum 10 sual
    for (let i = 1; i <= count; i++) {
        questions.push({
            q: `${i}. Fayldakı məlumata əsasən hansı fikir doğrudur?`,
            a: "A bəndi: Tədqiqat nəticəsi",
            b: "B bəndi: Analiz nəticəsi",
            c: "C bəndi: Eksperiment",
            d: "D bəndi: Heç biri",
            correct: "b"
        });
    }
    renderQuiz();
    document.getElementById('q-count').innerText = questions.length;
}

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = questions.map((item, i) => `
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
    timerInterval = setInterval(() => {
        seconds++;
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        document.getElementById('timer').innerText = 
            `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
    }, 1000);
}

function checkResults() {
    clearInterval(timerInterval);
    let correct = 0;
    questions.forEach((item, i) => {
        const ans = document.querySelector(`input[name="q${i}"]:checked`);
        if (ans && ans.value === item.correct) correct++;
    });

    const resultPopup = document.getElementById('result-popup');
    const scoreText = document.getElementById('score-text');
    resultPopup.classList.remove('hidden');
    scoreText.innerHTML = `
        Düzgün cavab: ${correct} <br>
        Səhv cavab: ${questions.length - correct} <br>
        Sərf olunan vaxt: ${document.getElementById('timer').innerText}
    `;
}
