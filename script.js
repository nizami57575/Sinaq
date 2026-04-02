let questions = [];
let timerInterval;
let seconds = 0;

const API_KEY = "AIzaSyCuwiJOIINwW_cTRnbfV7kR0Js4E6yPZNU";

// Dark Mode Toggle
document.getElementById('theme-toggle').onclick = () => {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
};

async function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return alert("Zəhmət olmasa bir PDF və ya Şəkil seçin!");

    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('quiz-container').innerHTML = "";

    let text = "";
    try {
        if (file.type === "application/pdf") {
            text = await readPDF(file);
        } else {
            const result = await Tesseract.recognize(file, 'aze+eng');
            text = result.data.text;
        }
        
        if (text.length < 50) throw new Error("Mətn çox qısadır.");
        await generateAIQuestions(text);
    } catch (error) {
        alert("Xəta baş verdi: " + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

async function readPDF(file) {
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ");
            }
            resolve(text);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function generateAIQuestions(extractedText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const prompt = `Sən bir müəllimsən. Aşağıdakı mətndən istifadə edərək 10 dənə məntiqli test sualı hazırla. 
    Hər sualın A, B, C, D variantları olsun. Cavabları mütləq bu JSON formatında ver, başqa heç nə yazma:
    [{"q": "sual...", "a": "..", "b": "..", "c": "..", "d": "..", "correct": "a"}]
    Mətn: ${extractedText}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    
    questions = JSON.parse(cleanJson);
    renderQuiz();
    startTimer();
    document.getElementById('stats-bar').style.display = 'flex';
    document.getElementById('submit-btn').classList.remove('hidden');
    document.getElementById('q-count').innerText = questions.length;
}

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = questions.map((item, i) => `
        <div class="question-block">
            <p><b>${i+1}. ${item.q}</b></p>
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
    if(timerInterval) clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        let m = Math.floor(seconds / 60), s = seconds % 60;
        document.getElementById('timer').innerText = `${m}:${s < 10 ? '0'+s : s}`;
    }, 1000);
}

function checkResults() {
    clearInterval(timerInterval);
    let correct = 0;
    questions.forEach((item, i) => {
        const ans = document.querySelector(`input[name="q${i}"]:checked`);
        if (ans && ans.value === item.correct) correct++;
    });
    alert(`İmtahan Bitdi!\nDüz: ${correct}\nSəhv: ${questions.length - correct}\nVaxt: ${document.getElementById('timer').innerText}`);
}
