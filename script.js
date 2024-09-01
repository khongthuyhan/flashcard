let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;
let autoPlayInterval;
let autoPlayType = 'sequential';
let playOrder = [];
let playIndex = 0;

document.getElementById('upload').addEventListener('change', handleFileUpload);
document.getElementById('flashcard').addEventListener('click', flipCard);
document.getElementById('play-sound').addEventListener('click', playSound);

window.onload = function() {
    loadProgress();
};

function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        flashcards = json.slice(1).filter(row => row[1]).map(row => ({
            hanzi: row[1], // Sử dụng cột 2 (dòng 2 đến cuối) làm từ tiếng Trung
            pinyin: row[2],
            meaning: row[3],
            note: row[4],
            audioUrl: getGoogleTranslateAudioUrl(row[1]),
            status: 'not-seen' // Trạng thái ban đầu của thẻ
        }));

        currentCardIndex = 0;
        isFlipped = false;
        playOrder = Array.from(Array(flashcards.length).keys());
        updateFlashcard();
    };

    reader.readAsArrayBuffer(file);
}

function getGoogleTranslateAudioUrl(text) {
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`;
}

function updateFlashcard() {
    const flashcardElement = document.getElementById('flashcard');
    const frontElement = flashcardElement.querySelector('.front');
    const backElement = flashcardElement.querySelector('.back');
    const card = flashcards[currentCardIndex];

    frontElement.innerHTML = `<strong>${card.hanzi}</strong>`;
    document.getElementById('meaning').textContent = card.meaning;
    document.getElementById('note').textContent = card.note;
    document.getElementById('example').textContent = card.pinyin;

    flashcardElement.classList.toggle('flipped', isFlipped);
    updateProgressBar();
    saveProgress();
}

function flipCard() {
    isFlipped = !isFlipped;
    updateFlashcard();
}

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        isFlipped = false;
        updateFlashcard();
    }
}

function nextCard() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        isFlipped = false;
        updateFlashcard();
    }
}

function markRemembered() {
    flashcards[currentCardIndex].status = 'remembered';
    nextCard();
}

function markNotSure() {
    flashcards[currentCardIndex].status = 'not-sure';
    nextCard();
}

function markForgotten() {
    flashcards[currentCardIndex].status = 'forgotten';
    nextCard();
}

function startReview() {
    const reviewCards = flashcards.filter(card => card.status === 'not-sure' || card.status === 'forgotten');
    if (reviewCards.length > 0) {
        flashcards = reviewCards;
        currentCardIndex = 0;
        isFlipped = false;
        playOrder = Array.from(Array(flashcards.length).keys());
        updateFlashcard();
    } else {
        alert('Bạn đã nhớ hết các từ! Không có gì để ôn tập.');
    }
}

function exitReviewMode() {
    window.location.reload(); // Đơn giản là tải lại trang để thoát chế độ ôn tập
}

function playSound(event) {
    event.stopPropagation(); // Ngăn chặn việc lật thẻ khi nhấn vào loa

    const audioPlayer = document.getElementById('audio-player');
    const currentCard = flashcards[currentCardIndex];

    if (currentCard.audioUrl) {
        if (audioPlayer.paused) {
            audioPlayer.src = currentCard.audioUrl;
            audioPlayer.play().catch(error => console.log('Playback failed:', error));
        } else {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
    } else {
        alert('Không có âm thanh cho từ này.');
    }
}

function updateProgressBar() {
    const progressElement = document.getElementById('progress');
    const progress = ((currentCardIndex + 1) / flashcards.length) * 100;
    progressElement.style.width = progress + '%';
}

function startAutoPlay(type) {
    stopAutoPlay(); // Dừng bất kỳ auto play nào đang chạy

    if (type === 'random') {
        shuffleArray(playOrder); // Đảo ngẫu nhiên thứ tự chỉ một lần khi bắt đầu
    }

    autoPlayInterval = setInterval(() => {
        if (playIndex >= playOrder.length) {
            stopAutoPlay(); // Dừng khi phát hết
        } else {
            currentCardIndex = playOrder[playIndex];
            isFlipped = false;
            updateFlashcard();
            playSound(new Event('click'));

            if (document.getElementById('auto-flip').checked) {
                setTimeout(() => {
                    flipCard();
                }, document.getElementById('display-time').value * 500); // Lật thẻ sau 50% thời gian
            }

            playIndex++;
        }
    }, document.getElementById('display-time').value * 1000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function stopAutoPlay() {
    clearInterval(autoPlayInterval);
}

function saveProgress() {
    const progressData = {
        flashcards: flashcards,
        currentCardIndex: currentCardIndex,
        playOrder: playOrder,
        playIndex: playIndex
    };
    localStorage.setItem('flashcardProgress', JSON.stringify(progressData));
}

function loadProgress() {
    const savedProgress = JSON.parse(localStorage.getItem('flashcardProgress'));
    if (savedProgress) {
        flashcards = savedProgress.flashcards;
        currentCardIndex = savedProgress.currentCardIndex;
        playOrder = savedProgress.playOrder;
        playIndex = savedProgress.playIndex;
        updateFlashcard();
    }
}
