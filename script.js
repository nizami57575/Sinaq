let currentQuestions = [];

async function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const loading = document.getElementById('loading');

    if (!file) {
        alert("Zəhmət olmasa fayl seçin!");
        return;
    }

    loading.style.display = "block";
    document.getElementById('quiz-container').innerHTML = "";

    let extractedText = "";

    if (file.type === "application/pdf") {
        extractedText = await readPDF(file);
    } else {
        const result = await Tesseract.recognize(file, 'aze+eng');
        extractedText = result.data.text;
    }

    loading.style.display = "none";
    if (extractedText.trim().length < 20) {
        alert("Fayldan kifayət qədər mətn oxuna bilmədi.");
        return;
    }

    createMockQuestions(extractedText);
}

// PDF oxuma funksiyası
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

// Mətndən sual yaradan (Simulyasiya)
function createMockQuestions(text) {
    currentQuestions = [];
    // Mətni sözlərə bölüb təsadüfi suallar yaradırıq (Real AI üçün API lazımdır)
    for (let i = 1; i <= 10; i++) {
        currentQuestions.push({
            q: `Sual ${i}: Mətndəki məlumata görə aşağıdakılardan hansı doğrudur?`,
            options: { a: "Məlumat 1", b: "Məlumat 2", c: "Məlumat 3", d: "Məlumat 4" },
            correct: "a"
        });
    }
    displayQuestions();
}

function displayQuestions() {
    const container = document.getElementById('quiz-container');
    currentQuestions.forEach((item, index) => {
        const html = `
            <div class="question-block">
                <p><strong>${item.q}</strong></p>
                <div class="options">
                    <label><input type="radio" name="q${index}" value="a"> A) ${item.options.a}</label>
                    <label><input type="radio" name="q${index}" value="b"> B) ${item.options.b}</label>
                    <label><input type="radio" name="q${index}" value="c"> C) ${item.options.c}</label>
                    <label><input type="radio" name="q${index}" value="d"> D) ${item.options.d}</label>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
    document.getElementById('submit-btn').style.display = "block";
}

function checkResults() {
    let correct = 0;
    currentQuestions.forEach((item, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected && selected.value === item.correct) correct++;
    });
    const wrong = currentQuestions.length - correct;
    document.getElementById('result').innerText = `✅ Düz: ${correct} | ❌ Səhv: ${wrong}`;
}

