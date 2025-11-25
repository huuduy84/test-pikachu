$(document).ready(function() {
    // ==========================================
    // 1. CẤU HÌNH TRÒ CHƠI
    // ==========================================
    const IMAGE_EXTENSION = 'jpg'; 
    const SAVE_KEY = 'pikachuGameSave'; 
    const SETTINGS_KEY = 'pikachuSettings';
    
    const MODES = {
        EASY: { 
            TIME: 600, // 10 Phút
            ROWS: 8, COLS: 10, 
            SHIFT: false, // Không dồn
            CLASS: 'tile-easy'
        },
        MEDIUM: { 
            TIME: 480, // 8 Phút
            ROWS: 8, COLS: 10, 
            SHIFT: true, // Dồn ô
            CLASS: 'tile-medium'
        },
        HARD: { 
            TIME: 420, // 7 Phút
            ROWS: 12, COLS: 15, 
            SHIFT: true, // Dồn ô
            CLASS: 'tile-hard'
        }
    };
    
    const MATCH_SCORE = 10; 

    // Biến trạng thái
    let currentMode = MODES.EASY;
    let gameMatrix = [];
    let selectedTile = null; 
    let score = 0;
    let time = 0;
    let timerInterval;
    let isProcessing = false;
    let foundPathCoords = []; 

    // ==========================================
    // 2. QUẢN LÝ ÂM THANH
    // ==========================================
    const SoundManager = {
        isBgmOn: true,
        isSfxOn: true,
        bgm: new Audio('audio/bg_music.mp3'),
        sfx: {
            match: new Audio('audio/match.mp3'),
            win: new Audio('audio/game_win.mp3'),
            lose: new Audio('audio/game_over.mp3')
        },

        init: function() {
            this.bgm.loop = true;
            this.loadSettings();
            
            var promise = this.bgm.play();
            if (promise !== undefined) {
                promise.catch(error => {
                    console.log("Autoplay bị chặn, nhạc sẽ bật khi người dùng tương tác.");
                });
            }
        },

        loadSettings: function() {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const s = JSON.parse(saved);
                this.isBgmOn = s.isBgmOn;
                this.isSfxOn = s.isSfxOn;
            }
            $('#toggle-bgm').prop('checked', this.isBgmOn);
            $('#toggle-sfx').prop('checked', this.isSfxOn);
            this.updateBgm();
        },

        saveSettings: function() {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                isBgmOn: this.isBgmOn,
                isSfxOn: this.isSfxOn
            }));
        },

        updateBgm: function() {
            if (this.isBgmOn) {
                var promise = this.bgm.play();
                if (promise !== undefined) promise.catch(e => {});
            } else {
                this.bgm.pause();
            }
        },

        playSfx: function(name) {
            if (this.isSfxOn && this.sfx[name]) {
                this.sfx[name].cloneNode().play().catch(e => {});
            }
        }
    };
    SoundManager.init();

    // ==========================================
    // 3. LOGIC LƯU / TẢI GAME
    // ==========================================
    function saveGame(isSilent = false) {
        if (time <= 0 || !gameMatrix.length || isProcessing) return;
        
        const state = {
            matrix: gameMatrix,
            score: score,
            time: time,
            modeKey: getModeKey(currentMode)
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        
        if (!isSilent) alert("Đã lưu game thành công!");
        checkSavedGame();
    }

    function loadGame() {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return;
        
        const state = JSON.parse(saved);
        const modeKey = state.modeKey || 'EASY';
        
        currentMode = { ...MODES[modeKey] };
        currentMode.ROWS = state.matrix.length - 2;
        currentMode.COLS = state.matrix[0].length - 2;

        gameMatrix = state.matrix;
        score = state.score;
        time = state.time;

        showScreen('game-screen');
        startLoadedGame();
    }

    function checkSavedGame() {
        if (localStorage.getItem(SAVE_KEY)) {
            $('#btn-resume').removeClass('hidden');
        } else {
            $('#btn-resume').addClass('hidden');
        }
    }

    function getModeKey(modeObj) {
        for (let k in MODES) {
            if (MODES[k].CLASS === modeObj.CLASS && MODES[k].SHIFT === modeObj.SHIFT) return k;
        }
        return 'EASY';
    }

    // ==========================================
    // 4. ĐIỀU HƯỚNG & SỰ KIỆN
    // ==========================================
    function showScreen(id) {
        $('.screen').addClass('hidden');
        $(`#${id}`).removeClass('hidden');
    }

    $('#btn-play').click(() => { showScreen('game-screen'); newGame(MODES.EASY); });
    $('#btn-resume').click(() => loadGame());
    
    $('#btn-settings-menu, #btn-settings-game').click(() => {
        if ($('#game-screen').hasClass('hidden')) {
            $('#btn-save-exit').hide();
        } else {
            $('#btn-save-exit').show();
        }
        $('#settings-modal').removeClass('hidden');
    });
    
    $('#close-modal-btn').click(() => $('#settings-modal').addClass('hidden'));

    $('#btn-save-exit').click(() => {
        saveGame(true);
        $('#settings-modal').addClass('hidden');
        showScreen('main-menu');
    });

    // Sự kiện click nút đổi chế độ (Dùng Modal xác nhận)
    $('.mode-btn').click(function() {
        const modeKey = $(this).data('mode');
        showModeChangeModal(MODES[modeKey], modeKey);
    });

    $('#btn-save-quick').click(() => saveGame());
    $('#btn-hint').click(useHint);
    $('#btn-shuffle').click(useShuffle);

    $('#toggle-bgm').change(function() { 
        SoundManager.isBgmOn = $(this).is(':checked'); 
        SoundManager.updateBgm(); 
        SoundManager.saveSettings(); 
    });
    $('#toggle-sfx').change(function() { 
        SoundManager.isSfxOn = $(this).is(':checked'); 
        SoundManager.saveSettings(); 
    });
    
    // --- MODAL XÁC NHẬN ĐỔI CHẾ ĐỘ MỚI ---
    function showModeChangeModal(mode, modeKey) {
        const modalText = $('#mode-confirm-text');
        const modalButtons = $('#mode-confirm-buttons');
        modalButtons.empty();

        modalText.text(`Bạn có muốn CHƠI MỚI chế độ ${modeKey} không?`);

        // Nút OK
        const btnOK = $('<button class="btn btn-success fw-bold">OK</button>');
        btnOK.click(() => {
            $('#mode-modal').addClass('hidden');
            newGame(mode);
        });
        
        // Nút Không
        const btnCancel = $('<button class="btn btn-secondary fw-bold">Không</button>');
        btnCancel.click(() => {
            $('#mode-modal').addClass('hidden');
        });

        modalButtons.append(btnOK, btnCancel);
        $('#mode-modal').removeClass('hidden');
    }

    // --- MODAL THÔNG BÁO KẾT THÚC ---
    function showEndGameModal(type) {
        clearInterval(timerInterval);
        localStorage.removeItem(SAVE_KEY);
        
        const modalTitle = $('#end-modal-title');
        const modalScore = $('#end-modal-score');
        const modalButtons = $('#end-modal-buttons');
        modalButtons.empty(); 
        
        let titleText = "", titleColor = "";
        
        if (type === 'WIN') {
            SoundManager.playSfx('win');
            titleText = "🎉 CHÚC MỪNG! BẠN ĐÃ THẮNG!";
            titleColor = "text-success";
            
            // Nút Chơi Mới
            const btnNew = $('<button class="btn btn-warning fw-bold text-dark">CHƠI MỚI</button>');
            btnNew.click(() => { 
                $('#game-end-modal').addClass('hidden'); 
                showScreen('game-screen'); 
                newGame(MODES.EASY); 
            });
            modalButtons.append(btnNew);

        } else if (type === 'LOSE') {
            SoundManager.playSfx('lose');
            titleText = "😢 HẾT GIỜ! BẠN ĐÃ THUA.";
            titleColor = "text-danger";

            // Nút Chơi Lại
            const btnRestart = $('<button class="btn btn-primary fw-bold">CHƠI LẠI</button>');
            btnRestart.click(() => { 
                $('#game-end-modal').addClass('hidden'); 
                showScreen('game-screen'); 
                newGame(currentMode); 
            });
            modalButtons.append(btnRestart);
        }
        
        // Nút Thoát (chung cho cả Thắng và Thua)
        const btnExit = $('<button class="btn btn-secondary fw-bold">THOÁT RA MENU</button>');
        btnExit.click(() => { 
            $('#game-end-modal').addClass('hidden'); 
            showScreen('main-menu'); 
        });
        modalButtons.append(btnExit);

        modalTitle.text(titleText).removeClass('text-success text-danger').addClass(titleColor);
        modalScore.text(`Điểm của bạn: ${score}`);
        $('#game-end-modal').removeClass('hidden');
    }

    // ==========================================
    // 5. LOGIC GAME CORE
    // ==========================================
    function newGame(mode) {
        localStorage.removeItem(SAVE_KEY);
        currentMode = mode;
        score = 0;
        time = mode.TIME;
        
        resetState();
        $('.mode-btn').removeClass('selected-mode');
        $(`.mode-btn[data-mode="${getModeKey(mode)}"]`).addClass('selected-mode');
        
        generateMatrix();
        // Cần renderBoard sau khi tạo matrix
        renderBoard(); 
        startTimer();
    }

    function startLoadedGame() {
        resetState();
        renderBoard();
        startTimer();
    }
    
    function resetState() {
        clearInterval(timerInterval);
        isProcessing = false;
        selectedTile = null;
        $('.connector').remove();
        updateUI();
    }

    function updateUI() {
        $('#score').text(score);
        const m = Math.floor(time/60);
        const s = time%60;
        $('#time').text(`${m}:${s<10?'0':''}${s}`);
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            time--;
            updateUI();
            if (time <= 0) {
                clearInterval(timerInterval);
                showEndGameModal('LOSE');
            }
        }, 1000);
    }
    
    function generateMatrix() {
        const total = currentMode.ROWS * currentMode.COLS;
        let tiles = [];
        const types = 20; 
        while (tiles.length < total) {
            for (let i = 1; i <= types; i++) {
                if (tiles.length >= total) break;
                tiles.push(i, i);
            }
        }
        tiles.sort(() => Math.random() - 0.5);

        gameMatrix = [];
        for (let r = 0; r < currentMode.ROWS + 2; r++) {
            gameMatrix[r] = [];
            for (let c = 0; c < currentMode.COLS + 2; c++) {
                if (r === 0 || r === currentMode.ROWS + 1 || c === 0 || c === currentMode.COLS + 1) {
                    gameMatrix[r][c] = 0;
                } else {
                    gameMatrix[r][c] = tiles.pop();
                }
            }
        }
        if (!checkAnyMoveExists()) generateMatrix();
    }

    // HÀM RENDER ĐÃ ĐƯỢC CHỈNH SỬA ĐỂ HỖ TRỢ RESPONSIVE
    function renderBoard() {
        const board = $('#game-board');
        board.empty();
        
        // Bước 1: Lấy kích thước ô thực tế từ CSS đã responsive
        // Tạo một ô ảo để jQuery đọc kích thước đã được CSS tính toán (kể cả trong Media Query)
        let dummyTile = $('<div></div>').addClass(currentMode.CLASS).css('visibility', 'hidden').appendTo('body');
        const s = dummyTile.outerWidth(); // Lấy kích thước thực tế của ô
        dummyTile.remove(); // Xóa ô ảo đi

        // Bước 2: Thiết lập kích thước bàn cờ dựa trên kích thước ô đã tính toán
        const w = currentMode.COLS * s;
        board.css('width', w + 'px');

        // Bước 3: Render các ô thực tế
        for (let r = 1; r <= currentMode.ROWS; r++) {
            for (let c = 1; c <= currentMode.COLS; c++) {
                const type = gameMatrix[r][c];
                const tile = $('<div></div>')
                    .addClass('tile')
                    .addClass(currentMode.CLASS)
                    .attr('data-r', r)
                    .attr('data-c', c)
                    // Gán kích thước đã tính toán để đảm bảo hiển thị chính xác
                    .css({width: s + 'px', height: s + 'px'}); 
                
                if (type !== 0) {
                    tile.css('background-image', `url('images/${type}.${IMAGE_EXTENSION}')`);
                    tile.attr('data-type', type);
                    tile.on('click', onTileClick);
                } else {
                    tile.css('opacity', 0).css('cursor', 'default');
                }
                board.append(tile);
            }
        }
    }

    function onTileClick() {
        if (isProcessing || time <= 0) return;
        const clicked = $(this);
        if (clicked.css('opacity') == 0 || clicked.hasClass('selected')) return;
        
        $('.tile').removeClass('hint-anim'); 

        if (!selectedTile) {
            selectedTile = clicked;
            selectedTile.addClass('selected');
            return;
        }

        const r1 = parseInt(selectedTile.attr('data-r'));
        const c1 = parseInt(selectedTile.attr('data-c'));
        const type1 = parseInt(selectedTile.attr('data-type'));
        const r2 = parseInt(clicked.attr('data-r'));
        const c2 = parseInt(clicked.attr('data-c'));
        const type2 = parseInt(clicked.attr('data-type'));

        if (type1 === type2 && checkPath(r1, c1, r2, c2)) {
            isProcessing = true;
            clicked.addClass('selected');
            SoundManager.playSfx('match'); 
            
            // Cần tính lại size cho drawPathLine
            let s = selectedTile.outerWidth();
            drawPathLine(r1, c1, r2, c2, s);

            gameMatrix[r1][c1] = 0;
            gameMatrix[r2][c2] = 0;
            score += MATCH_SCORE;
            updateUI();

            setTimeout(() => {
                selectedTile.css('opacity', 0).removeClass('selected').off('click');
                clicked.css('opacity', 0).removeClass('selected').off('click');
                $('.connector').remove();
                selectedTile = null;
                isProcessing = false;

                if (currentMode.SHIFT) shiftTiles();
                else checkEndGameOrShuffle();
            }, 300);
        } else {
            selectedTile.removeClass('selected');
            selectedTile = clicked;
            selectedTile.addClass('selected');
        }
    }

    function checkPath(r1, c1, r2, c2) {
        if (r1 === r2 && c1 === c2) return false;
        foundPathCoords = [];
        if (checkLine(r1, c1, r2, c2)) { foundPathCoords = [[r1, c1], [r2, c2]]; return true; }
        if (gameMatrix[r1][c2] === 0 && checkLine(r1, c1, r1, c2) && checkLine(r1, c2, r2, c2)) { foundPathCoords = [[r1, c1], [r1, c2], [r2, c2]]; return true; }
        if (gameMatrix[r2][c1] === 0 && checkLine(r1, c1, r2, c1) && checkLine(r2, c1, r2, c2)) { foundPathCoords = [[r1, c1], [r2, c1], [r2, c2]]; return true; }
        for (let c = 0; c < currentMode.COLS + 2; c++) {
            if (gameMatrix[r1][c] === 0 && checkLine(r1, c1, r1, c)) {
                if (checkLine(r1, c, r2, c) && checkLine(r2, c, r2, c2)) {
                    if (gameMatrix[r2][c] === 0) { foundPathCoords = [[r1, c1], [r1, c], [r2, c], [r2, c2]]; return true; }
                }
            }
        }
        for (let r = 0; r < currentMode.ROWS + 2; r++) {
            if (gameMatrix[r][c1] === 0 && checkLine(r1, c1, r, c1)) {
                if (checkLine(r, c1, r, c2) && checkLine(r, c2, r2, c2)) {
                    if (gameMatrix[r][c2] === 0) { foundPathCoords = [[r1, c1], [r, c1], [r, c2], [r2, c2]]; return true; }
                }
            }
        }
        return false;
    }

    function checkLine(r1, c1, r2, c2) {
        if (r1 === r2) {
            const min = Math.min(c1, c2), max = Math.max(c1, c2);
            for (let c = min + 1; c < max; c++) if (gameMatrix[r1][c] !== 0) return false;
            return true;
        }
        if (c1 === c2) {
            const min = Math.min(r1, r2), max = Math.max(r1, r2);
            for (let r = min + 1; r < max; r++) if (gameMatrix[r][c1] !== 0) return false;
            return true;
        }
        return false;
    }

    // Cần truyền size (s) vào để vẽ đúng trên mọi kích thước màn hình
    function drawPathLine(r1, c1, r2, c2, s) {
        if (foundPathCoords.length < 2) return;
        const board = $('#game-board');
        
        for (let i = 0; i < foundPathCoords.length - 1; i++) {
            const [ra, ca] = foundPathCoords[i];
            const [rb, cb] = foundPathCoords[i+1];
            
            // Tọa độ tính toán dựa trên kích thước ô 's'
            const x1 = (ca - 1) * s + s/2, y1 = (ra - 1) * s + s/2;
            const x2 = (cb - 1) * s + s/2, y2 = (rb - 1) * s + s/2;
            
            const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
            const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
            const line = $('<div class="connector"></div>').css({
                width: len + 'px', height: '4px', left: x1 + 'px', top: (y1 - 2) + 'px',
                transform: `rotate(${angle}deg)`, transformOrigin: '0 50%'
            });
            board.append(line);
        }
    }
    
    function useHint() {
        if (score < 50) { alert("Cần 50 điểm!"); return; }
        const tiles = [];
        for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) tiles.push({r,c,t:gameMatrix[r][c]});
        let move = null;
        for (let i=0; i<tiles.length; i++) for (let j=i+1; j<tiles.length; j++) if (tiles[i].t === tiles[j].t && checkPath(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c)) { move = [tiles[i], tiles[j]]; break; }
        if (move) {
            score -= 50; updateUI();
            $(`.tile[data-r="${move[0].r}"][data-c="${move[0].c}"], .tile[data-r="${move[1].r}"][data-c="${move[1].c}"]`).addClass('hint-anim');
            setTimeout(() => $('.tile').removeClass('hint-anim'), 2000);
        } else {
            alert("Lỗi! Không có nước, đang xáo trộn..."); performShuffle(true);
        }
    }

    function useShuffle() {
        if (score < 100) { alert("Cần 100 điểm!"); return; }
        score -= 100; updateUI();
        performShuffle(true);
    }

    function shiftTiles() {
        for (let c = 1; c <= currentMode.COLS; c++) {
            let colVals = [];
            for (let r = 1; r <= currentMode.ROWS; r++) if (gameMatrix[r][c] !== 0) colVals.push(gameMatrix[r][c]);
            const newCol = Array(currentMode.ROWS - colVals.length).fill(0).concat(colVals);
            for (let r = 1; r <= currentMode.ROWS; r++) gameMatrix[r][c] = newCol[r-1];
        }
        renderBoard(); checkEndGameOrShuffle();
    }

    function checkEndGameOrShuffle() {
        let hasTile = false;
        for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) hasTile = true;
        if (!hasTile) {
            showEndGameModal('WIN');
            return;
        }
        if (!checkAnyMoveExists()) {
            alert("Hết nước đi! Đang tự động xáo trộn...");
            do { performShuffle(false); } while (!checkAnyMoveExists());
            renderBoard();
        }
    }

    function performShuffle(render = true) {
        let vals = [];
        for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) vals.push(gameMatrix[r][c]);
        vals.sort(() => Math.random() - 0.5);
        let idx = 0;
        for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) gameMatrix[r][c] = vals[idx++];
        if (render) renderBoard();
    }

    function checkAnyMoveExists() {
        const tiles = [];
        for (let r=1; r<=currentMode.ROWS; r++) for (let c=1; c<=currentMode.COLS; c++) if (gameMatrix[r][c] !== 0) tiles.push({r,c,t:gameMatrix[r][c]});
        for (let i=0; i<tiles.length; i++) for (let j=i+1; j<tiles.length; j++) if (tiles[i].t === tiles[j].t && checkPath(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c)) return true;
        return false;
    }
    // Init
    checkSavedGame();
});