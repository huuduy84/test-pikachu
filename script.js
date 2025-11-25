$(document).ready(function() {
    // ==========================================
    // 1. CẤU HÌNH & NGÔN NGỮ
    // ==========================================
    const IMAGE_EXTENSION = 'jpg'; 
    const SAVE_KEY = 'pikachuGameSave'; 
    const SETTINGS_KEY = 'pikachuSettings';
    
    const HINT_COST = 50; 
    const SHUFFLE_COST = 100;

    const BACKGROUNDS = [
        'images/bg1.jpg',
        'images/bg2.jpg',
        'images/bg3.jpg', 
        'images/pokemon_bg.jpg'
    ];
    const MAIN_MENU_BG = 'images/main_bg.jpg';
    
    const LANG = {
        vi: {
            resume: "TIẾP TỤC", new_game: "CHƠI MỚI", score: "Điểm", hint: "Gợi ý", shuffle: "Xáo trộn",
            easy: "Dễ", medium: "Thường", hard: "Khó", 
            settings: "Cài Đặt", language_setting: "Ngôn ngữ", bgm: "🎵 Nhạc Nền", sfx: "🔊 Hiệu ứng Âm thanh",
            save_exit: "💾 LƯU VÀ THOÁT", confirm_new_game: "Xác Nhận Chơi Mới",
            confirm_msg: "Bạn có chắc chắn muốn bắt đầu trò chơi mới? Dữ liệu hiện tại sẽ bị mất.",
            start: "BẮT ĐẦU", cancel: "HỦY", win_title: "🎉 CHIẾN THẮNG! 🎉", total_score: "Tổng điểm:",
            lose_title: "😢 HẾT NĂNG LƯỢNG!", lose_msg: "Bạn đã hết thời gian.", play_new: "CHƠI MỚI",
            play_again: "CHƠI LẠI", exit: "THOÁT", notif_hint_cost: `Bạn cần ${HINT_COST} điểm để Gợi ý.`,
            notif_hint_used: `💡 Đã trừ ${HINT_COST} điểm.`, notif_shuffle_cost: `Bạn cần ${SHUFFLE_COST} điểm để Xáo trộn.`,
            notif_shuffle_used: `🔀 Đã trừ ${SHUFFLE_COST} điểm.`, notif_no_move: "Hết nước đi! Tự động Xáo trộn.",
            notif_saved: "💾 Đã lưu game thành công!"
        },
        en: {
            resume: "RESUME", new_game: "NEW GAME", score: "Score", hint: "Hint", shuffle: "Shuffle",
            easy: "Easy", medium: "Medium", hard: "Hard", 
            settings: "Settings", language_setting: "Language", bgm: "🎵 BGM", sfx: "🔊 SFX",
            save_exit: "💾 SAVE & EXIT", confirm_new_game: "Confirm New Game",
            confirm_msg: "Are you sure you want to start a new game? Current progress will be lost.",
            start: "START", cancel: "CANCEL", win_title: "🎉 VICTORY! 🎉", total_score: "Total Score:",
            lose_title: "😢 OUT OF ENERGY!", lose_msg: "Time's up.", play_new: "NEW GAME",
            play_again: "TRY AGAIN", exit: "EXIT", notif_hint_cost: `Need ${HINT_COST} points for Hint.`,
            notif_hint_used: `💡 -${HINT_COST} points.`, notif_shuffle_cost: `Need ${SHUFFLE_COST} points for Shuffle.`,
            notif_shuffle_used: `🔀 -${SHUFFLE_COST} points.`, notif_no_move: "No moves left! Auto Shuffling.",
            notif_saved: "💾 Game Saved!"
        }
    };

    let currentLang = 'vi';
    let isPaused = false; 

    const MODES = {
        EASY: { TIME: 600, ROWS: 8, COLS: 10, SHIFT: false, CLASS: 'tile-easy'},
        MEDIUM: { TIME: 480, ROWS: 8, COLS: 10, SHIFT: true, CLASS: 'tile-medium'},
        HARD: { TIME: 420, ROWS: 12, COLS: 15, SHIFT: true, CLASS: 'tile-hard'}
    };
    
    const MATCH_SCORE = 10; 

    let currentMode = MODES.EASY;
    let gameMatrix = [];
    let selectedTile = null; 
    let score = 0;
    let time = 0; 
    let maxTime = 0; 
    let timerInterval;
    let isProcessing = false;

    // ==========================================
    // 2. SOUND MANAGER
    // ==========================================
    const SoundManager = {
        isBgmOn: true, isSfxOn: true,
        bgm: new Audio('audio/bg_music.mp3'),
        sfx: {
            match: new Audio('audio/match.mp3'),
            win: new Audio('audio/game_win.mp3'),
            lose: new Audio('audio/game_over.mp3'),
            error: new Audio('audio/error.mp3')
        },
        init: function() {
            this.bgm.loop = true;
            this.loadSettings();
            var promise = this.bgm.play();
            if (promise !== undefined) promise.catch(error => {});
            $('#main-menu').css('background-image', `url('${MAIN_MENU_BG}')`);
        },
        loadSettings: function() {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const s = JSON.parse(saved);
                this.isBgmOn = s.isBgmOn;
                this.isSfxOn = s.isSfxOn;
                if(s.lang) { currentLang = s.lang; updateLanguage(); }
            }
            $('#toggle-bgm').prop('checked', this.isBgmOn);
            $('#toggle-sfx').prop('checked', this.isSfxOn);
            this.updateBgm();
        },
        saveSettings: function() {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                isBgmOn: this.isBgmOn, isSfxOn: this.isSfxOn, lang: currentLang
            }));
        },
        updateBgm: function() {
            if (this.isBgmOn) { var promise = this.bgm.play(); if (promise !== undefined) promise.catch(e => {}); } 
            else { this.bgm.pause(); }
        },
        playSfx: function(name) {
            if (this.isSfxOn && this.sfx[name]) { this.sfx[name].cloneNode().play().catch(e => {}); }
        }
    };
    SoundManager.init();
    
    // ==========================================
    // 3. UI/GAME FLOW FUNCTIONS
    // ==========================================

    function changeRandomBackground() {
        const randomIndex = Math.floor(Math.random() * BACKGROUNDS.length);
        const bgUrl = BACKGROUNDS[randomIndex];
        $('#game-screen').css('background-image', `url('${bgUrl}')`);
    }

    function updateLanguage() {
        const t = LANG[currentLang];
        $('[data-i18n]').each(function() {
            const key = $(this).data('i18n');
            if (t[key]) $(this).text(t[key]);
        });
        $('#btn-hint').html(`💡 ${t.hint} <span id="hint-cost">(-${HINT_COST})</span>`);
        $('#btn-shuffle').html(`🔄 ${t.shuffle} <span id="shuffle-cost">(-${SHUFFLE_COST})</span>`);
    }

    function showNotification(message) {
        let notif = $('<div></div>').text(message).css({
            position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#fff',
            padding: '10px 20px', borderRadius: '30px', zIndex: 3000, fontSize: '1rem', fontWeight: 'bold',
            opacity: 0, transition: 'all 0.5s', transform: 'translateY(20px)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }).appendTo('body');
        setTimeout(() => { notif.css({ opacity: 1, transform: 'translateY(0)' }); }, 10);
        setTimeout(() => { notif.css({ opacity: 0, transform: 'translateY(20px)' }); setTimeout(() => { notif.remove(); }, 500); }, 2000);
    }
    
    function pauseGame() {
        if (!isPaused) { 
            clearInterval(timerInterval);
            isPaused = true;
        }
    }

    function resumeGame() {
        if (isPaused && time > 0) { 
            startTimer(); 
            isPaused = false;
        }
    }
    
    // ==========================================
    // 4. EVENT HANDLERS
    // ==========================================

    $('#language-select').change(function() {
        currentLang = $(this).val();
        updateLanguage();
        SoundManager.saveSettings();
    });

    // XỬ LÝ SỰ KIỆN NÚT CÀI ĐẶT (MENU VÀ GAME)
    $('#btn-settings-menu, #btn-settings-game').click(() => {
        if ($('#game-screen').hasClass('hidden')) { 
            $('#btn-save-exit').hide(); 
        } else { 
            pauseGame(); 
            $('#btn-save-exit').show(); 
        }
        $('#language-select').val(currentLang); 
        $('#settings-modal').removeClass('hidden');
    });

    // SỰ KIỆN ĐÓNG MODAL (Nút X)
    $('#close-modal-btn').click(() => {
        if (!$('#game-screen').hasClass('hidden')) {
             resumeGame();
        }
        $('#settings-modal').addClass('hidden');
    });

    // SỰ KIỆN ĐÓNG MODAL (LƯU VÀ THOÁT)
    $('#btn-save-exit').click(() => {
        saveGame(true); 
        $('#settings-modal').addClass('hidden'); 
        showScreen('main-menu');
    });


    $('#btn-hint').click(useHint);
    $('#btn-shuffle').click(useShuffle);

    $('#toggle-bgm').change(function() { SoundManager.isBgmOn = $(this).is(':checked'); SoundManager.updateBgm(); SoundManager.saveSettings(); });
    $('#toggle-sfx').change(function() { SoundManager.isSfxOn = $(this).is(':checked'); SoundManager.saveSettings(); });
    
    // =========================================================
    // KHẮC PHỤC LỖI CHUYỂN CHẾ ĐỘ CHƠI START
    // =========================================================

    // Xử lý sự kiện cho các nút chọn chế độ (Dễ, Thường, Khó)
    $('.btn-mode').click(function() {
        const selectedModeKey = $(this).data('mode'); // Lấy key mode (EASY, MEDIUM, HARD)
        const newMode = MODES[selectedModeKey];
        const isCurrentMode = (selectedModeKey === getModeKey(currentMode));

        // Nếu game đang chạy (gameMatrix.length > 0) và mode mới khác mode hiện tại
        if (gameMatrix.length > 0 && !isCurrentMode) {
            // Lưu mode key vào nút xác nhận
            $('#btn-confirm-new-game').data('mode-key', selectedModeKey);
            // Hiện modal xác nhận
            $('#mode-modal').removeClass('hidden');
        } else if (gameMatrix.length === 0) {
            // Chưa có game (hoặc game vừa kết thúc), bắt đầu ngay
            newGame(newMode);
        }
        // Nếu game đang chạy và bấm lại mode cũ, không làm gì cả
    });

    // Xử lý nút BẮT ĐẦU trong modal xác nhận
    $('#btn-confirm-new-game').click(function() {
        const modeKey = $(this).data('mode-key'); // Lấy key mode đã lưu
        const newMode = MODES[modeKey];
        $('#mode-modal').addClass('hidden');
        newGame(newMode);
    });
    
    // Xử lý nút HỦY trong modal xác nhận
    $('#btn-cancel-new-game').click(() => { 
        $('#mode-modal').addClass('hidden'); 
        // Đảm bảo nút mode được chọn vẫn là mode hiện tại của game sau khi hủy
        if(gameMatrix.length > 0) {
            $('.btn-mode').removeClass('selected-mode');
            $(`.btn-mode[data-mode="${getModeKey(currentMode)}"]`).addClass('selected-mode');
        }
    });

    // =========================================================
    // KHẮC PHỤC LỖI CHUYỂN CHẾ ĐỘ CHƠI END
    // =========================================================

    function showEndGameModal(type) {
        clearInterval(timerInterval); localStorage.removeItem(SAVE_KEY); isPaused = true;
        const t = LANG[currentLang]; let finalScore = score + Math.floor(time * 0.5); 
        const modalTitle = $('#end-modal-title'); const modalScore = $('#end-modal-score'); const modalButtons = $('#end-modal-buttons');
        modalButtons.empty(); 

        if (type === 'WIN') {
            SoundManager.playSfx('win');
            modalTitle.text(t.win_title).removeClass('text-danger').addClass('text-success');
            modalScore.html(`${t.total_score} <span class="text-success fw-bolder">${finalScore}</span>`);
            const btnNew = $(`<button class="btn btn-warning fw-bold text-dark">${t.play_new}</button>`);
            btnNew.click(() => { $('#game-end-modal').addClass('hidden'); showScreen('game-screen'); newGame(MODES.EASY); });
            modalButtons.append(btnNew);
        } else if (type === 'LOSE') {
            SoundManager.playSfx('lose');
            modalTitle.text(t.lose_title).removeClass('text-success').addClass('text-danger');
            modalScore.html(`${t.score}: <span class="text-danger fw-bolder">${score}</span>`);
            const btnRestart = $(`<button class="btn btn-primary fw-bold">${t.play_again}</button>`);
            btnRestart.click(() => { $('#game-end-modal').addClass('hidden'); showScreen('game-screen'); newGame(currentMode); });
            modalButtons.append(btnRestart);
        }
        const btnExit = $(`<button class="btn btn-secondary fw-bold">${t.exit}</button>`);
        btnExit.click(() => { $('#game-end-modal').addClass('hidden'); showScreen('main-menu'); });
        modalButtons.append(btnExit);
        $('#game-end-modal').removeClass('hidden');
    }

    // ==========================================
    // 5. GAME DATA & CORE LOGIC
    // ==========================================

    function saveGame(isSilent = false) {
        if (time <= 0 || !gameMatrix.length || isProcessing) return;
        const state = { matrix: gameMatrix, score: score, time: time, maxTime: maxTime, modeKey: getModeKey(currentMode) };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        if (!isSilent) showNotification(LANG[currentLang].notif_saved);
        checkSavedGame();
    }

    function loadGame() {
        const saved = localStorage.getItem(SAVE_KEY); if (!saved) return;
        const state = JSON.parse(saved); const modeKey = state.modeKey || 'EASY';
        currentMode = { ...MODES[modeKey] }; currentMode.ROWS = state.matrix.length - 2; currentMode.COLS = state.matrix[0].length - 2;
        gameMatrix = state.matrix; score = state.score; time = state.time; maxTime = state.maxTime || MODES[modeKey].TIME; 
        showScreen('game-screen'); changeRandomBackground(); startLoadedGame();
    }

    function checkSavedGame() { if (localStorage.getItem(SAVE_KEY)) { $('#btn-resume').removeClass('hidden'); } else { $('#btn-resume').addClass('hidden'); } }
    function getModeKey(modeObj) { for (let k in MODES) { if (MODES[k].CLASS === modeObj.CLASS && MODES[k].SHIFT === modeObj.SHIFT) return k; } return 'EASY'; }
    function showScreen(id) { $('.screen').addClass('hidden'); $(`#${id}`).removeClass('hidden'); }
    $('#btn-play').click(() => { showScreen('game-screen'); newGame(MODES.EASY); });
    $('#btn-resume').click(() => loadGame());

    function newGame(mode) {
        localStorage.removeItem(SAVE_KEY); currentMode = mode; score = 0; maxTime = mode.TIME; time = mode.TIME; isPaused = false; 
        changeRandomBackground(); resetState();
        $('.btn-mode').removeClass('selected-mode'); $(`.btn-mode[data-mode="${getModeKey(mode)}"]`).addClass('selected-mode');
        generateMatrix(); renderBoard(); startTimer();
    }

    function startLoadedGame() {
        resetState(); 
        if (time > 0) { startTimer(); } else { isPaused = true; } 
        updateLanguage();
        $('.btn-mode').removeClass('selected-mode'); $(`.btn-mode[data-mode="${getModeKey(currentMode)}"]`).addClass('selected-mode');
        renderBoard();
    }
    
    function resetState() { clearInterval(timerInterval); isProcessing = false; selectedTile = null; $('.connector').remove(); updateUI(); updateLanguage(); }
    function updateUI() {
        $('#score').text(score);
        const percent = (time / maxTime) * 100;
        $('#time-bar').css('width', percent + '%');
        if (percent < 20) { $('#time-bar').css('background', '#c0392b'); } 
        else if (percent < 50) { $('#time-bar').css('background', '#f39c12'); } 
        else { $('#time-bar').css('background', 'linear-gradient(90deg, #e74c3c, #f1c40f, #2ecc71)'); }
    }
    function startTimer() { if (isPaused) return; clearInterval(timerInterval); timerInterval = setInterval(() => { time--; updateUI(); if (time <= 0) { clearInterval(timerInterval); showEndGameModal('LOSE'); } }, 1000); }
    function generateMatrix() { let attempts = 0; do { const total = currentMode.ROWS * currentMode.COLS; let tiles = []; const types = 20; while (tiles.length < total) { for (let i = 1; i <= types; i++) { if (tiles.length >= total) break; tiles.push(i, i); } } tiles.sort(() => Math.random() - 0.5); gameMatrix = []; for (let r = 0; r < currentMode.ROWS + 2; r++) { gameMatrix[r] = []; for (let c = 0; c < currentMode.COLS + 2; c++) { if (r === 0 || r === currentMode.ROWS + 1 || c === 0 || c === currentMode.COLS + 1) { gameMatrix[r][c] = 0; } else { gameMatrix[r][c] = tiles.pop(); } } } attempts++; if (attempts > 50) break; } while (!checkAnyMoveExists()); }
    function renderBoard() { const board = $('#game-board'); board.empty(); let dummyTile = $('<div></div>').addClass(currentMode.CLASS).css('visibility', 'hidden').appendTo('body'); const s = dummyTile.outerWidth(true); dummyTile.remove(); const w = currentMode.COLS * s; board.css('width', w + 'px'); for (let r = 1; r <= currentMode.ROWS; r++) { for (let c = 1; c <= currentMode.COLS; c++) { const type = gameMatrix[r][c]; const tile = $('<div></div>').addClass('tile ' + currentMode.CLASS).attr('data-r', r).attr('data-c', c); if (type !== 0) { tile.css('background-image', `url('images/${type}.${IMAGE_EXTENSION}')`); tile.attr('data-type', type); tile.on('click', onTileClick); } else { tile.css('opacity', 0).css('cursor', 'default'); } board.append(tile); } } }
    function onTileClick() { if (isProcessing || time <= 0 || isPaused) return; const clicked = $(this); if (clicked.css('opacity') == 0 || clicked.hasClass('selected')) return; $('.tile').removeClass('hint-anim'); if (!selectedTile) { selectedTile = clicked; selectedTile.addClass('selected'); return; } const r1 = parseInt(selectedTile.attr('data-r')); const c1 = parseInt(selectedTile.attr('data-c')); const type1 = parseInt(selectedTile.attr('data-type')); const r2 = parseInt(clicked.attr('data-r')); const c2 = parseInt(clicked.attr('data-c')); const type2 = parseInt(clicked.attr('data-type')); if (type1 === type2 && checkPath(r1, c1, r2, c2)) { isProcessing = true; clicked.addClass('selected'); SoundManager.playSfx('match'); drawPathLine(r1, c1, r2, c2); gameMatrix[r1][c1] = 0; gameMatrix[r2][c2] = 0; score += MATCH_SCORE; updateUI(); setTimeout(() => { selectedTile.css('opacity', 0).removeClass('selected').off('click'); clicked.css('opacity', 0).removeClass('selected').off('click'); $('.connector').remove(); selectedTile = null; isProcessing = false; if (currentMode.SHIFT) shiftTiles(); else checkEndGameOrShuffle(); }, 300); } else { selectedTile.removeClass('selected'); selectedTile = clicked; selectedTile.addClass('selected'); } }
    
    // CORE LOGIC (Giữ nguyên)
    let foundPathCoords = []; 
    function checkPath(r1, c1, r2, c2) { if (r1 === r2 && c1 === c2) return false; foundPathCoords = []; if (checkLine(r1, c1, r2, c2)) { foundPathCoords = [{r:r1, c:c1}, {r:r2, c:c2}]; return true; } let pathOne = checkLineWithOneCorner(r1, c1, r2, c2); if(pathOne.path.length > 0) { foundPathCoords = pathOne.path; return true; } let pathTwo = checkLineWithTwoCorners(r1, c1, r2, c2); if(pathTwo.path.length > 0) { foundPathCoords = pathTwo.path; return true; } return false; }
    function checkLine(r1, c1, r2, c2) { if (r1 === r2) { const min = Math.min(c1, c2), max = Math.max(c1, c2); for (let c = min + 1; c < max; c++) if (gameMatrix[r1][c] !== 0) return false; return true; } if (c1 === c2) { const min = Math.min(r1, r2), max = Math.max(r1, r2); for (let r = min + 1; r < max; r++) if (gameMatrix[r][c1] !== 0) return false; return true; } return false; }
    function checkLineWithOneCorner(r1, c1, r2, c2) { if (gameMatrix[r1][c2] === 0 || (r1===r2 && c1===c2)) { if (checkLine(r1, c1, r1, c2) && checkLine(r1, c2, r2, c2)) return { path: [{r:r1, c:c1}, {r:r1, c:c2}, {r:r2, c:c2}] }; } if (gameMatrix[r2][c1] === 0 || (r1===r2 && c1===c2)) { if (checkLine(r1, c1, r2, c1) && checkLine(r2, c1, r2, c2)) return { path: [{r:r1, c:c1}, {r:r2, c:c1}, {r:r2, c:c2}] }; } return { path: [] }; }
    function checkLineWithTwoCorners(r1, c1, r2, c2) { for (let c = 0; c <= currentMode.COLS + 1; c++) { if (gameMatrix[r1][c] === 0 && gameMatrix[r2][c] === 0) { if (checkLine(r1, c1, r1, c) && checkLine(r2, c2, r2, c) && checkLine(r1, c, r2, c)) return { path: [{r:r1, c:c1}, {r:r1, c:c}, {r:r2, c:c}, {r:r2, c:c2}] }; } } for (let r = 0; r <= currentMode.ROWS + 1; r++) { if (gameMatrix[r][c1] === 0 && gameMatrix[r][c2] === 0) { if (checkLine(r1, c1, r, c1) && checkLine(r2, c2, r, c2) && checkLine(r, c1, r, c2)) return { path: [{r:r1, c:c1}, {r:r, c:c1}, {r:r, c:c2}, {r:r2, c:c2}] }; } } return { path: [] }; }
    function drawPathLine(r1, c1, r2, c2) { const board = $('#game-board'); const sampleTile = $('.tile').first(); const s = sampleTile.outerWidth(true); for (let i = 0; i < foundPathCoords.length - 1; i++) { const pa = foundPathCoords[i]; const pb = foundPathCoords[i+1]; const x1 = (pa.c - 1) * s + s/2, y1 = (pa.r - 1) * s + s/2; const x2 = (pb.c - 1) * s + s/2, y2 = (pb.r - 1) * s + s/2; const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2); const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI; const line = $('<div class="connector"></div>').css({ width: len + 'px', height: '4px', left: x1 + 'px', top: (y1 - 2) + 'px', transform: `rotate(${angle}deg)`, transformOrigin: '0 50%' }); board.append(line); } }
    function useHint() { if (isProcessing || isPaused) return; if (score < HINT_COST) { SoundManager.playSfx('error'); showNotification(LANG[currentLang].notif_hint_cost); return; } const tiles = []; for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) tiles.push({r,c,t:gameMatrix[r][c]}); let move = null; for (let i=0; i<tiles.length; i++) for (let j=i+1; j<tiles.length; j++) if (tiles[i].t === tiles[j].t && checkPath(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c)) { move = [tiles[i], tiles[j]]; break; } if (move) { score -= HINT_COST; updateUI(); $(`.tile[data-r="${move[0].r}"][data-c="${move[0].c}"], .tile[data-r="${move[1].r}"][data-c="${move[1].c}"]`).addClass('hint-anim'); setTimeout(() => $('.tile').removeClass('hint-anim'), 2000); showNotification(LANG[currentLang].notif_hint_used); } else { showNotification(LANG[currentLang].notif_no_move); performShuffle(true); } }
    function useShuffle() { if (isProcessing || isPaused) return; if (score < SHUFFLE_COST) { SoundManager.playSfx('error'); showNotification(LANG[currentLang].notif_shuffle_cost); return; } score -= SHUFFLE_COST; updateUI(); isProcessing = true; do { performShuffle(false); } while (!checkAnyMoveExists()); renderBoard(); showNotification(LANG[currentLang].notif_shuffle_used); isProcessing = false; checkEndGameOrShuffle(); }
    function shiftTiles() { for (let c = 1; c <= currentMode.COLS; c++) { let colVals = []; for (let r = 1; r <= currentMode.ROWS; r++) if (gameMatrix[r][c] !== 0) colVals.push(gameMatrix[r][c]); const newCol = Array(currentMode.ROWS - colVals.length).fill(0).concat(colVals); for (let r = 1; r <= currentMode.ROWS; r++) gameMatrix[r][c] = newCol[r-1]; } renderBoard(); checkEndGameOrShuffle(); }
    function checkEndGameOrShuffle() { let hasTile = false; for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) hasTile = true; if (!hasTile) { showEndGameModal('WIN'); return; } if (!checkAnyMoveExists()) { isProcessing = true; showNotification(LANG[currentLang].notif_no_move); do { performShuffle(false); } while (!checkAnyMoveExists()); renderBoard(); isProcessing = false; } }
    function performShuffle(render = true) { let vals = []; for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) vals.push(gameMatrix[r][c]); vals.sort(() => Math.random() - 0.5); let idx = 0; for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) gameMatrix[r][c] = vals[idx++]; if (render) renderBoard(); }
    function checkAnyMoveExists() { const tiles = []; for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) tiles.push({r,c,t:gameMatrix[r][c]}); for (let i=0; i<tiles.length; i++) { for (let j=i+1; j<tiles.length; j++) { if (tiles[i].t === tiles[j].t && checkPathForMove(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c)) return true; } } return false; }
    function checkPathForMove(r1, c1, r2, c2) { if (r1 === r2 && c1 === c2) return false; if (checkLine(r1, c1, r2, c2)) return true; if (checkLineWithOneCorner(r1, c1, r2, c2).path.length > 0) return true; if (checkLineWithTwoCorners(r1, c1, r2, c2).path.length > 0) return true; return false; }

    updateLanguage(); 
    checkSavedGame();
});