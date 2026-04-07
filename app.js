// ==========================================
// 1. SETUP SUPABASE & VARIABEL GLOBAL
// ==========================================
const supabaseUrl = 'https://wpsozespennfqtgokixt.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc296ZXNwZW5uZnF0Z29raXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzMzMTQsImV4cCI6MjA5MTE0OTMxNH0.ZVX-dI0soI-sgNNWuSii2B3UJffrnwxETkXz6TnrajQ'; 
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let allWordsDB = [], activeWords = [];
let score = 0, timeLeft = 0, correctCount = 0, wrongCount = 0;
let timerInterval, autoHideTimeout;
let isPlaying = false, isWordVisible = true, isMusicPlaying = false;
let currentPlayer = "", currentWordText = "", hideMechanism = "manual";

// ==========================================
// 2. MUSIK BACKGROUND
// ==========================================
const bgMusic = document.getElementById("bgMusic");
const btnMusic = document.getElementById("btnMusic");

bgMusic.volume = 0.5; // Set volume 50%
btnMusic.addEventListener("click", () => {
    if (isMusicPlaying) {
        bgMusic.pause();
        btnMusic.innerText = "🔈";
    } else {
        bgMusic.play().catch(e => console.log("Autoplay dicegah browser", e));
        btnMusic.innerText = "🔊";
    }
    isMusicPlaying = !isMusicPlaying;
});

// ==========================================
// 3. INIT & NAVIGASI
// ==========================================
async function fetchWordsFromDatabase() {
    const btnStart = document.getElementById("btnStartGame");
    btnStart.innerText = "MEMUAT DATA...";
    btnStart.disabled = true;

    const { data, error } = await db.from('words').select('*');
    if (error) {
        alert("Gagal memuat database! Coba refresh.");
    } else {
        allWordsDB = data;
        btnStart.innerText = "MULAI GAME";
        btnStart.disabled = false;
    }
}
fetchWordsFromDatabase();

function showScreen(screenId) {
    const screens = ['screen-setup', 'screen-game', 'screen-result', 'screen-leaderboard'];
    screens.forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
}

function toggleCustomHide() {
    const mech = document.getElementById("hideMechanism").value;
    document.getElementById("customHideGroup").style.display = (mech === "auto") ? "block" : "none";
}

// ==========================================
// 4. LOGIKA GAME
// ==========================================
function getWordsByType(type) {
    if (type === "campur") return allWordsDB.map(w => w.word);
    return allWordsDB.filter(w => w.length === parseInt(type)).map(w => w.word);
}

function startGame() {
    currentPlayer = document.getElementById("playerName").value.trim();
    if (!currentPlayer) return alert("Isi Nama Peserta dulu ya!");

    // Hitung Waktu (Nilai * Unit)
    const timeValue = parseInt(document.getElementById("timeValue").value);
    const timeUnit = parseInt(document.getElementById("timeUnit").value);
    timeLeft = timeValue * timeUnit;

    hideMechanism = document.getElementById("hideMechanism").value;
    activeWords = getWordsByType(document.getElementById("wordType").value);
    
    if (activeWords.length === 0) return alert("Belum ada kata di database untuk kategori ini!");

    // Reset Statistik
    score = 0; correctCount = 0; wrongCount = 0;
    isPlaying = true;

    document.getElementById("currentScore").innerText = score;
    document.getElementById("timerDisplay").innerText = timeLeft;
    document.getElementById("timerDisplay").style.color = "inherit";

    const hintText = hideMechanism === "manual" 
        ? "💡 Tekan <b>SPASI</b> untuk menyembunyikan, lalu <b>SPASI lagi</b> jika benar."
        : `💡 Otomatis sembunyi dalam ${document.getElementById("autoHideDuration").value} detik.`;
    document.getElementById("gameHint").innerHTML = hintText;

    showScreen('screen-game');
    clearInterval(timerInterval);
    timerInterval = setInterval(countDown, 1000);
    
    showNewWord();
}

function showNewWord() {
    clearTimeout(autoHideTimeout);
    
    if (activeWords.length === 0) activeWords = getWordsByType(document.getElementById("wordType").value);
    
    const randomIndex = Math.floor(Math.random() * activeWords.length);
    currentWordText = activeWords.splice(randomIndex, 1)[0];
    
    document.getElementById("wordDisplay").innerText = currentWordText;
    isWordVisible = true;
    
    const btnSpace = document.getElementById("btnSpace");
    btnSpace.className = "btn-action btn-action-hide";
    btnSpace.style.opacity = "1";
    document.getElementById("btnPass").innerText = "GANTI / LEWATI (X)";

    if (hideMechanism === "manual") {
        btnSpace.innerText = "SEMBUNYIKAN (SPASI)";
    } else {
        btnSpace.innerText = "TUNGGU (OTOMATIS)...";
        btnSpace.style.opacity = "0.6"; // Efek disable sementara
        const autoDuration = parseInt(document.getElementById("autoHideDuration").value) * 1000;
        autoHideTimeout = setTimeout(() => {
            if (isWordVisible && isPlaying) executeHideWord();
        }, autoDuration);
    }
}

function executeHideWord() {
    isWordVisible = false;
    document.getElementById("wordDisplay").innerText = currentWordText.split('').map(() => '_').join(' ');

    const btnSpace = document.getElementById("btnSpace");
    btnSpace.className = "btn-action btn-action-correct";
    btnSpace.style.opacity = "1";
    btnSpace.innerText = "BENAR! (SPASI)";
    document.getElementById("btnPass").innerText = "SALAH / LEWATI (X)";
}

function handleAction(action) {
    if (!isPlaying) return;

    if (action === 'SPACE') {
        if (isWordVisible) {
            // Mencegah pencet spasi kalau mode otomatis
            if (hideMechanism === "manual") {
                clearTimeout(autoHideTimeout); 
                executeHideWord();
            }
        } else {
            // Jika kata sudah tersembunyi, berarti poin masuk
            score++;
            correctCount++;
            document.getElementById("currentScore").innerText = score;
            showNewWord(); 
        }
    } else if (action === 'X') {
        wrongCount++;
        clearTimeout(autoHideTimeout);
        showNewWord(); 
    }
}

function countDown() {
    timeLeft--;
    const timerEl = document.getElementById("timerDisplay");
    timerEl.innerText = timeLeft;

    if (timeLeft <= 10) timerEl.style.color = "var(--danger)";

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        clearTimeout(autoHideTimeout);
        endGame();
    }
}

function endGame() {
    isPlaying = false;
    document.getElementById("finalScore").innerText = score;
    document.getElementById("resultName").innerText = `Kerja bagus, ${currentPlayer}!`;
    document.getElementById("savingStatus").innerText = "Merekam skor ke server...";
    document.getElementById("savingStatus").style.color = "var(--warning)";
    
    showScreen('screen-result');
    saveScoreToSupabase();
}

// ==========================================
// 5. DATABASE LEADERBOARD & RESET
// ==========================================
async function saveScoreToSupabase() {
    const timeVal = document.getElementById("timeValue").value;
    const timeUnitSel = document.getElementById("timeUnit");
    const timeText = timeUnitSel.options[timeUnitSel.selectedIndex].text;
    const wordType = document.getElementById("wordType").options[document.getElementById("wordType").selectedIndex].text;
    
    const detailInfo = `${timeVal} ${timeText} | ${wordType}`;
    const totalCount = correctCount + wrongCount;

    const { error } = await db.from('leaderboard').insert([{ 
        name: currentPlayer, 
        score: score, 
        detail: detailInfo,
        correct_words: correctCount,
        wrong_words: wrongCount,
        total_words: totalCount
    }]);

    if (error) {
        document.getElementById("savingStatus").innerText = "Gagal menyimpan skor!";
        document.getElementById("savingStatus").style.color = "var(--danger)";
    } else {
        document.getElementById("savingStatus").innerText = "Skor berhasil disimpan!";
        document.getElementById("savingStatus").style.color = "var(--success)";
        document.getElementById("playerName").value = ""; 
    }
}

async function loadLeaderboard() {
    showScreen('screen-leaderboard');
    const list = document.getElementById("leaderboardList");
    list.innerHTML = `<li style="text-align:center;">Mengambil data...</li>`;

    const { data, error } = await db.from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

    if (error) {
        list.innerHTML = `<li style="color:var(--danger); text-align:center;">Gagal mengambil data!</li>`;
        return;
    }

    if (data.length === 0) {
        list.innerHTML = `<li style="text-align:center; color:var(--text-muted);">Belum ada data skor.</li>`;
        return;
    }

    list.innerHTML = "";
    data.forEach((item, index) => {
        let rankClass = index === 0 ? "rank-1" : index === 1 ? "rank-2" : index === 2 ? "rank-3" : "";
        list.innerHTML += `
            <li class="leaderboard-item ${rankClass}">
                <div style="flex: 1;">
                    <strong>#${index + 1} ${item.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">
                        ${item.detail} <br>
                        <span style="color:var(--success)">✅ ${item.correct_words || 0}</span> | 
                        <span style="color:var(--danger)">❌ ${item.wrong_words || 0}</span> | 
                        📦 Total: ${item.total_words || 0}
                    </div>
                </div>
                <div class="score-badge">${item.score} PTS</div>
            </li>
        `;
    });
}

// FUNGSI RESET LEADERBOARD
async function resetLeaderboardData() {
    const isConfirm = confirm("⚠️ PERHATIAN! ⚠️\nApakah kamu yakin ingin MENGHAPUS SEMUA DATA Leaderboard? Tindakan ini tidak bisa dibatalkan.");
    
    if (isConfirm) {
        document.getElementById("btnResetLeaderboard").innerText = "MENGHAPUS...";
        document.getElementById("btnResetLeaderboard").disabled = true;

        // Menghapus semua baris yang ID-nya lebih dari 0
        const { error } = await db.from('leaderboard').delete().gt('id', 0);

        if (error) {
            alert("Gagal mereset data! Coba lagi.");
        } else {
            alert("✅ Semua data Leaderboard berhasil dihapus!");
            loadLeaderboard(); // Refresh tampilan
        }
        
        document.getElementById("btnResetLeaderboard").innerText = "RESET DATA";
        document.getElementById("btnResetLeaderboard").disabled = false;
    }
}

// ==========================================
// 6. EVENT LISTENERS
// ==========================================
document.getElementById("btnStartGame").addEventListener("click", startGame);
document.getElementById("btnShowLeaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btnResultLeaderboard").addEventListener("click", loadLeaderboard);
document.getElementById("btnPlayAgain").addEventListener("click", () => showScreen('screen-setup'));
document.getElementById("btnBackToMenu").addEventListener("click", () => showScreen('screen-setup'));
document.getElementById("btnResetLeaderboard").addEventListener("click", resetLeaderboardData);

document.getElementById("btnSpace").addEventListener("click", () => {
    document.getElementById("btnSpace").blur();
    handleAction('SPACE');
});
document.getElementById("btnPass").addEventListener("click", () => {
    document.getElementById("btnPass").blur();
    handleAction('X');
});

document.addEventListener('keydown', function(e) {
    if (isPlaying) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault(); 
            handleAction('SPACE'); 
        } else if (e.key.toLowerCase() === 'x') {
            handleAction('X'); 
        }
    }
});