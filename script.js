/*
 * Tic Tac Toe — The Unbeatable Edition
 * UI, state, persistence, sound, and interaction.
 */
(function () {
  'use strict';

  var Engine = window.XOEngine;
  if (!Engine) {
    console.error('The game engine failed to load.');
    return;
  }

  var THEMES = [
    { id: 'studio', name: 'Studio', kind: 'Light', desc: 'Bone paper, cobalt ink, and a flash of vermilion.' },
    { id: 'nocturne', name: 'Nocturne', kind: 'Dark', desc: 'After-hours green with an electric citrus edge.' },
    { id: 'ultramarine', name: 'Ultramarine', kind: 'Dark', desc: 'A saturated blue for bold, late-night play.' },
    { id: 'rosewood', name: 'Rosewood', kind: 'Dark', desc: 'Wine-dark, gilded, and quietly dramatic.' },
    { id: 'arcade', name: 'Arcade', kind: 'Dark', desc: 'Neon lights and pure after-midnight energy.' },
    { id: 'evergreen', name: 'Evergreen', kind: 'Dark', desc: 'Deep forest calm lit by warm apricot.' },
    { id: 'ink', name: 'Ink', kind: 'Light', desc: 'High-contrast paper cut like a broadsheet.' },
    { id: 'dune', name: 'Dune', kind: 'Light', desc: 'Sun-baked sand and a cool oasis teal.' },
    { id: 'tidal', name: 'Tidal', kind: 'Dark', desc: 'Ocean depths with a soft mint shimmer.' },
    { id: 'blossom', name: 'Blossom', kind: 'Light', desc: 'Soft blush, sharp plum, and spring light.' },
    { id: 'citrine', name: 'Citrine', kind: 'Light', desc: 'Sunlit yellow with inky precision.' },
    { id: 'lilac', name: 'Lilac', kind: 'Light', desc: 'Powdered violet and quiet, confident contrast.' }
  ];

  var COORDS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];
  var STORAGE = {
    theme: 'ttt.theme',
    prefs: 'ttt.prefs',
    stats: 'ttt.stats'
  };
  var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (id) { return document.getElementById(id); };

  var dom = {
    siteShell: document.querySelector('.site-shell'),
    topbar: document.querySelector('.topbar'),
    themeButton: $('themeButton'),
    soundButton: $('soundButton'),
    aboutButton: $('aboutButton'),
    modeAi: $('modeAi'),
    modeLocal: $('modeLocal'),
    markX: $('markX'),
    markO: $('markO'),
    markField: $('markField'),
    markNote: $('markNote'),
    setupNote: $('setupNote'),
    scoreLeftLabel: $('scoreLeftLabel'),
    scoreLeftMark: $('scoreLeftMark'),
    scoreLeft: $('scoreLeft'),
    scoreDraw: $('scoreDraw'),
    scoreRightLabel: $('scoreRightLabel'),
    scoreRightMark: $('scoreRightMark'),
    scoreRight: $('scoreRight'),
    streakNote: $('streakNote'),
    resetScores: $('resetScores'),
    roundLabel: $('roundLabel'),
    stageMode: $('stageMode'),
    status: $('status'),
    turnPill: $('turnPill'),
    board: $('board'),
    winOverlay: $('winOverlay'),
    winLine: $('winLine'),
    newRound: $('newRound'),
    newRoundLabel: $('newRoundLabel'),
    undoButton: $('undoButton'),
    hintButton: $('hintButton'),
    assistText: $('assistText'),
    moveLog: $('moveLog'),
    moveCount: $('moveCount'),
    opponentBadge: $('opponentBadge'),
    opponentGlyph: $('opponentGlyph'),
    opponentName: $('opponentName'),
    opponentMeta: $('opponentMeta'),
    opponentCopy: $('opponentCopy'),
    specOneLabel: $('specOneLabel'),
    specOneValue: $('specOneValue'),
    specTwoLabel: $('specTwoLabel'),
    specTwoValue: $('specTwoValue'),
    specThreeLabel: $('specThreeLabel'),
    specThreeValue: $('specThreeValue'),
    themeButtonSide: $('themeButtonSide'),
    themeName: $('themeName'),
    year: $('year'),
    themeSheet: $('themeSheet'),
    closeThemeSheet: $('closeThemeSheet'),
    themeGrid: $('themeGrid'),
    currentThemeName: $('currentThemeName'),
    randomTheme: $('randomTheme'),
    aboutSheet: $('aboutSheet'),
    closeAboutSheet: $('closeAboutSheet'),
    aboutDone: $('aboutDone'),
    resetData: $('resetData'),
    confirmSheet: $('confirmSheet'),
    confirmTitle: $('confirmTitle'),
    confirmCopy: document.querySelector('#confirmSheet > p'),
    confirmCancel: $('confirmCancel'),
    confirmReset: $('confirmReset'),
    toast: $('toast'),
    themeColor: $('themeColor')
  };

  var cells = Array.prototype.slice.call(document.querySelectorAll('.cell'));
  var scoreLeftColumn = dom.scoreLeft.closest('.score-column');
  var scoreDrawColumn = dom.scoreDraw.closest('.score-column');
  var scoreRightColumn = dom.scoreRight.closest('.score-column');

  /* ------------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------------ */

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) { /* the game still works without persistence */ }
  }

  function readText(key) {
    try {
      return window.localStorage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function removeStored(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) { /* noop */ }
  }

  function makeDefaultStats() {
    return {
      ai: { left: 0, right: 0, draws: 0, form: [] },
      local: { left: 0, right: 0, draws: 0, form: [] }
    };
  }

  function loadPrefs() {
    var saved = readJSON(STORAGE.prefs, {});
    return {
      mode: saved.mode === 'local' ? 'local' : 'ai',
      humanMark: saved.humanMark === 'O' ? 'O' : 'X',
      sound: typeof saved.sound === 'boolean' ? saved.sound : true
    };
  }

  function loadStats() {
    var defaults = makeDefaultStats();
    var saved = readJSON(STORAGE.stats, null);
    if (!saved || typeof saved !== 'object') return defaults;

    ['ai', 'local'].forEach(function (mode) {
      var bucket = saved[mode];
      if (!bucket || typeof bucket !== 'object') return;

      ['left', 'right', 'draws'].forEach(function (field) {
        var value = Number(bucket[field]);
        if (Number.isFinite(value) && value >= 0) {
          defaults[mode][field] = Math.floor(value);
        }
      });

      if (Array.isArray(bucket.form)) {
        defaults[mode].form = bucket.form
          .filter(function (item) { return item === 'left' || item === 'right' || item === 'draw'; })
          .slice(-5);
      }
    });

    return defaults;
  }

  var prefs = loadPrefs();
  var stats = loadStats();

  function savePrefs() {
    writeJSON(STORAGE.prefs, prefs);
  }

  function saveStats() {
    writeJSON(STORAGE.stats, stats);
  }

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */

  var state = {
    mode: prefs.mode,
    humanMark: prefs.humanMark,
    aiMark: prefs.humanMark === 'X' ? 'O' : 'X',
    board: Array(9).fill(''),
    current: 'X',
    gameOver: false,
    thinking: false,
    winner: null,
    winningLine: null,
    isDraw: false,
    history: [],
    round: 1,
    hintIndex: null,
    aiTimer: null
  };

  var themeId = readText(STORAGE.theme);
  if (!THEMES.some(function (theme) { return theme.id === themeId; })) {
    themeId = 'studio';
  }

  var soundContext = null;
  var toastTimer = null;
  var confirmAction = 'scores';

  /* ------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */

  function otherMark(mark) {
    return mark === 'X' ? 'O' : 'X';
  }

  function markIsX(mark) {
    return mark === 'X';
  }

  function currentTheme() {
    for (var i = 0; i < THEMES.length; i += 1) {
      if (THEMES[i].id === themeId) return THEMES[i];
    }
    return THEMES[0];
  }

  function currentStats() {
    return stats[state.mode];
  }

  function humanPlayerName() {
    if (state.mode === 'local') return 'Player ' + state.current;
    return state.current === state.humanMark ? 'You' : 'The machine';
  }

  function playerNameInMode(mark) {
    if (state.mode === 'local') return mark === 'X' ? 'X' : 'O';
    return mark === state.humanMark ? 'You' : 'The machine';
  }

  function activeMark() {
    return state.gameOver && state.winner ? state.winner : state.current;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 2400);
  }

  function setAssist(message, mode) {
    dom.assistText.innerHTML = message;
    dom.assistText.classList.toggle('is-hint', mode === 'hint');
    dom.assistText.classList.toggle('is-result', mode === 'result');
  }

  function updateYear() {
    dom.year.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------------
     Theme system
     ------------------------------------------------------------------------ */

  function buildThemeGrid() {
    dom.themeGrid.innerHTML = '';

    THEMES.forEach(function (theme) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'theme-option';
      option.dataset.theme = theme.id;
      option.setAttribute('aria-pressed', 'false');
      option.setAttribute('aria-label', 'Use the ' + theme.name + ' theme');
      option.title = theme.name + ' — ' + theme.desc;

      var miniMarks = ['O', '', 'X', '', 'X', '', '', '', 'O'];
      var mini = miniMarks.map(function (mark) {
        if (!mark) return '<span class="mini-cell"></span>';
        return '<span class="mini-cell is-' + mark.toLowerCase() + '">' +
          '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#mark-' + mark.toLowerCase() + '"></use></svg>' +
          '</span>';
      }).join('');

      option.innerHTML =
        '<span class="theme-mini-board" aria-hidden="true">' + mini + '</span>' +
        '<span class="theme-option-copy">' +
          '<span class="theme-option-title"><strong>' + theme.name + '</strong><span>' + theme.kind + '</span></span>' +
          '<span class="theme-option-desc">' + theme.desc + '</span>' +
        '</span>' +
        '<span class="theme-check" aria-hidden="true"><svg class="icon"><use href="#icon-check"></use></svg></span>';

      dom.themeGrid.appendChild(option);
    });
  }

  function applyTheme(nextTheme, persist) {
    var match = THEMES.filter(function (theme) { return theme.id === nextTheme; })[0];
    if (!match) return;

    themeId = match.id;
    document.documentElement.setAttribute('data-theme', match.id);
    dom.themeName.textContent = match.name;
    dom.currentThemeName.textContent = match.name;
    dom.themeButton.setAttribute('aria-label', 'Choose a theme. Current theme: ' + match.name);

    Array.prototype.forEach.call(dom.themeGrid.children, function (option) {
      option.setAttribute('aria-pressed', String(option.dataset.theme === match.id));
    });

    window.requestAnimationFrame(function () {
      var bg = window.getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      if (bg) dom.themeColor.setAttribute('content', bg);
    });

    if (persist !== false) {
      try {
        window.localStorage.setItem(STORAGE.theme, match.id);
      } catch (error) { /* noop */ }
    }
  }

  function chooseTheme(nextTheme) {
    if (!nextTheme || nextTheme === themeId) return;
    applyTheme(nextTheme, true);
  }

  function openThemeSheet() {
    if (!dom.themeSheet.open) dom.themeSheet.showModal();
  }

  function closeThemeSheet() {
    if (dom.themeSheet.open) dom.themeSheet.close();
  }

  /* ------------------------------------------------------------------------
     Sound
     ------------------------------------------------------------------------ */

  function getAudioContext() {
    if (!prefs.sound) return null;
    var AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;

    if (!soundContext) {
      try {
        soundContext = new AudioCtor();
      } catch (error) {
        return null;
      }
    }

    if (soundContext.state === 'suspended') {
      soundContext.resume().catch(function () { /* noop */ });
    }

    return soundContext;
  }

  function tone(frequency, delay, duration, type, volume) {
    var context = getAudioContext();
    if (!context) return;

    var start = context.currentTime + (delay || 0) + 0.015;
    var oscillator = context.createOscillator();
    var gain = context.createGain();

    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.02, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playMarkSound(mark) {
    if (!prefs.sound) return;
    if (mark === 'X') {
      tone(392, 0, 0.11, 'triangle', 0.025);
      tone(587.33, 0.045, 0.14, 'sine', 0.013);
    } else {
      tone(329.63, 0, 0.12, 'sine', 0.028);
      tone(493.88, 0.05, 0.13, 'sine', 0.012);
    }
  }

  function playWinSound() {
    if (!prefs.sound) return;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (frequency, index) {
      tone(frequency, index * 0.075, 0.22, 'triangle', 0.022);
    });
  }

  function playDrawSound() {
    if (!prefs.sound) return;
    [392, 349.23, 293.66].forEach(function (frequency, index) {
      tone(frequency, index * 0.1, 0.24, 'sine', 0.018);
    });
  }

  function toggleSound() {
    prefs.sound = !prefs.sound;
    savePrefs();
    updateSoundButton();
    if (prefs.sound) {
      tone(523.25, 0, 0.1, 'sine', 0.02);
      tone(783.99, 0.07, 0.13, 'sine', 0.014);
      showToast('Sound on');
    } else {
      showToast('Sound muted');
    }
  }

  function updateSoundButton() {
    dom.soundButton.classList.toggle('is-muted', !prefs.sound);
    dom.soundButton.setAttribute('aria-pressed', String(prefs.sound));
    dom.soundButton.setAttribute('aria-label', prefs.sound ? 'Mute sound' : 'Enable sound');
    dom.soundButton.title = prefs.sound ? 'Sound on' : 'Sound off';
  }

  function haptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  /* ------------------------------------------------------------------------
     Player + record UI
     ------------------------------------------------------------------------ */

  function updateStatsUI() {
    var isLocal = state.mode === 'local';
    var leftMark = isLocal ? 'X' : state.humanMark;
    var rightMark = isLocal ? 'O' : state.aiMark;
    var bucket = currentStats();

    dom.scoreLeftLabel.textContent = isLocal ? 'Player X' : 'You';
    dom.scoreRightLabel.textContent = isLocal ? 'Player O' : 'Machine';
    dom.scoreLeftMark.textContent = leftMark;
    dom.scoreRightMark.textContent = rightMark;
    dom.scoreRightMark.className = 'score-mark ' + (rightMark === 'X' ? 'mark-x' : 'mark-o');
    dom.scoreLeftMark.className = 'score-mark ' + (leftMark === 'X' ? 'mark-x' : 'mark-o');

    dom.scoreLeft.textContent = String(bucket.left);
    dom.scoreDraw.textContent = String(bucket.draws);
    dom.scoreRight.textContent = String(bucket.right);

    scoreLeftColumn.classList.remove('is-active');
    scoreDrawColumn.classList.remove('is-active');
    scoreRightColumn.classList.remove('is-active');

    if (state.gameOver) {
      if (state.isDraw) {
        scoreDrawColumn.classList.add('is-active');
      } else if (state.winner === leftMark) {
        scoreLeftColumn.classList.add('is-active');
      } else if (state.winner === rightMark) {
        scoreRightColumn.classList.add('is-active');
      }
    } else if (state.current === leftMark) {
      scoreLeftColumn.classList.add('is-active');
    } else if (state.current === rightMark) {
      scoreRightColumn.classList.add('is-active');
    }

    var labels = bucket.form.map(function (result) {
      if (result === 'draw') return 'D';
      if (result === 'left') return isLocal ? 'X' : 'W';
      return isLocal ? 'O' : 'L';
    });

    dom.streakNote.textContent = labels.length ? 'Recent: ' + labels.join(' · ') : 'No rounds yet.';
    dom.streakNote.title = labels.length ? 'Your last five results' : '';
  }

  function updateModeUI() {
    var isLocal = state.mode === 'local';

    dom.siteShell.classList.toggle('is-local', isLocal);
    dom.modeAi.classList.toggle('is-active', !isLocal);
    dom.modeLocal.classList.toggle('is-active', isLocal);
    dom.modeAi.setAttribute('aria-pressed', String(!isLocal));
    dom.modeLocal.setAttribute('aria-pressed', String(isLocal));
    dom.setupNote.textContent = isLocal ? 'Local duel' : 'Solo vs AI';
    dom.stageMode.textContent = isLocal ? 'Local' : 'Solo';

    dom.markX.classList.toggle('is-active', state.humanMark === 'X');
    dom.markO.classList.toggle('is-active', state.humanMark === 'O');
    dom.markX.setAttribute('aria-pressed', String(state.humanMark === 'X'));
    dom.markO.setAttribute('aria-pressed', String(state.humanMark === 'O'));
    dom.markNote.textContent = state.humanMark === 'X' ? 'The machine takes O' : 'The machine opens as X';

    if (isLocal) {
      dom.opponentBadge.classList.add('is-local');
      dom.opponentBadge.innerHTML = '<span>Local duel</span>';
      dom.opponentGlyph.textContent = '2P';
      dom.opponentGlyph.style.color = 'var(--text-soft)';
      dom.opponentGlyph.style.fontSize = '18px';
      dom.opponentName.textContent = 'Two players';
      dom.opponentMeta.textContent = 'Same device · pass and play';
      dom.opponentCopy.textContent = 'Player X opens every round. Pass the device after each move. No engine, no mercy — just the two of you.';
      dom.specOneLabel.textContent = 'Players';
      dom.specOneValue.textContent = 'Two';
      dom.specTwoLabel.textContent = 'Opening';
      dom.specTwoValue.textContent = 'X';
      dom.specThreeLabel.textContent = 'Format';
      dom.specThreeValue.textContent = 'Local';
    } else {
      dom.opponentBadge.classList.remove('is-local');
      dom.opponentBadge.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-shield"></use></svg><span>Unbeatable</span>';
      dom.opponentGlyph.textContent = state.aiMark;
      dom.opponentGlyph.style.color = state.aiMark === 'X' ? 'var(--x)' : 'var(--o)';
      dom.opponentGlyph.style.fontSize = '';
      dom.opponentName.textContent = 'The machine';
      dom.opponentMeta.textContent = 'Minimax engine · perfect play';
      dom.opponentCopy.textContent = 'It has solved every possible branch of this board. The best available result is a draw.';
      dom.specOneLabel.textContent = 'Search';
      dom.specOneValue.textContent = 'Complete';
      dom.specTwoLabel.textContent = 'Record';
      dom.specTwoValue.textContent = 'Unbeaten';
      dom.specThreeLabel.textContent = 'Depth';
      dom.specThreeValue.textContent = '9-ply';
    }

    updateStatsUI();
  }

  function activeStatusText() {
    if (state.gameOver) {
      if (state.isDraw) return 'Draw';
      if (state.mode === 'local') return state.winner + ' wins';
      return state.winner === state.humanMark ? 'You win' : 'Machine wins';
    }

    if (state.mode === 'local') {
      return state.current + ' to play';
    }

    if (state.thinking) {
      return state.history.length === 0 ? 'The machine opens' : 'The machine is thinking';
    }

    return state.current === state.humanMark ? 'Your move, ' + state.current : 'The machine is thinking';
  }

  function updateStatus() {
    dom.status.textContent = activeStatusText();
    dom.turnPill.dataset.turn = activeMark().toLowerCase();
    dom.turnPill.classList.toggle('is-thinking', state.thinking && !state.gameOver);
    dom.turnPill.classList.toggle('is-over', state.gameOver);
  }

  function hasHumanMove() {
    return state.history.some(function (move) {
      return move.player === state.humanMark;
    });
  }

  function canUndo() {
    if (state.gameOver) return false;
    if (state.mode === 'local') return state.history.length > 0;
    return hasHumanMove();
  }

  function updateControls() {
    var canHint = !state.gameOver &&
      !state.thinking &&
      (state.mode === 'local' || state.current === state.humanMark);

    dom.undoButton.disabled = !canUndo();
    dom.hintButton.disabled = !canHint;
    dom.newRoundLabel.textContent = state.gameOver ? 'Play again' : 'New round';
    dom.board.classList.toggle('is-locked', state.thinking || state.gameOver);
    dom.board.setAttribute('aria-busy', state.thinking ? 'true' : 'false');

    var waitingForMachine = state.mode === 'ai' &&
      !state.gameOver &&
      (state.thinking || state.current !== state.humanMark);

    cells.forEach(function (cell, index) {
      if (state.board[index]) return;
      cell.setAttribute(
        'aria-disabled',
        String(state.gameOver || waitingForMachine)
      );
    });
  }

  function updateRoundLabel() {
    dom.roundLabel.textContent = 'Round ' + String(state.round).padStart(2, '0');
  }

  function updateMoveCount() {
    dom.moveCount.textContent = state.history.length + ' / 9';
  }

  /* ------------------------------------------------------------------------
     Board rendering
     ------------------------------------------------------------------------ */

  function cellLabel(index) {
    var mark = state.board[index];
    var label = COORDS[index] + ', ' + (mark || 'empty');
    if (!mark && state.hintIndex === index) label += ', suggested move';
    return label;
  }

  function applyCellState(index) {
    var cell = cells[index];
    var mark = state.board[index];
    var disabled = Boolean(mark) || state.gameOver;

    cell.classList.toggle('is-x', mark === 'X');
    cell.classList.toggle('is-o', mark === 'O');
    cell.classList.toggle(
      'is-winning',
      Boolean(state.winningLine) && state.winningLine.indexOf(index) !== -1
    );
    cell.setAttribute('aria-disabled', String(disabled));
    cell.setAttribute('aria-label', cellLabel(index));
  }

  function renderBoard() {
    for (var i = 0; i < cells.length; i += 1) {
      cells[i].classList.remove('is-hinted', 'is-winning');
      applyCellState(i);
    }
  }

  function clearHint() {
    var previous = state.hintIndex;
    if (previous === null) return;
    state.hintIndex = null;
    cells[previous].classList.remove('is-hinted');
    applyCellState(previous);
  }

  function showHintCell(index) {
    clearHint();
    state.hintIndex = index;
    cells[index].classList.add('is-hinted');
    applyCellState(index);
  }

  function moveEntry(move, isLatest, index) {
    var item = document.createElement('li');
    item.className = 'move-entry' + (isLatest ? ' is-latest' : '');

    var number = document.createElement('span');
    number.className = 'move-index';
    number.textContent = String(index + 1).padStart(2, '0');

    var player = document.createElement('span');
    player.className = 'move-player';

    var dot = document.createElement('span');
    dot.className = 'move-dot is-' + move.player.toLowerCase();
    dot.setAttribute('aria-hidden', 'true');

    var name = document.createElement('span');
    name.textContent = playerNameInMode(move.player);

    player.appendChild(dot);
    player.appendChild(name);

    var position = document.createElement('span');
    position.className = 'move-position';
    position.textContent = COORDS[move.index];

    item.appendChild(number);
    item.appendChild(player);
    item.appendChild(position);
    return item;
  }

  function appendLogEntry(move) {
    if (dom.moveLog.querySelector('.empty-log')) {
      dom.moveLog.innerHTML = '';
    }
    Array.prototype.forEach.call(dom.moveLog.querySelectorAll('.is-latest'), function (entry) {
      entry.classList.remove('is-latest');
    });

    var entry = moveEntry(move, true, state.history.length - 1);
    dom.moveLog.appendChild(entry);
    dom.moveLog.scrollTop = dom.moveLog.scrollHeight;
    updateMoveCount();
  }

  function renderMoveLog() {
    dom.moveLog.innerHTML = '';
    if (state.history.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'empty-log';
      empty.textContent = 'The board awaits its first mark.';
      dom.moveLog.appendChild(empty);
      updateMoveCount();
      return;
    }

    state.history.forEach(function (move, index) {
      dom.moveLog.appendChild(moveEntry(move, index === state.history.length - 1, index));
    });
    updateMoveCount();
    dom.moveLog.scrollTop = dom.moveLog.scrollHeight;
  }

  function updateWinLine(line) {
    if (!line) {
      dom.winOverlay.classList.remove('is-visible');
      return;
    }

    var startIndex = line[0];
    var endIndex = line[2];
    var startX = (startIndex % 3) * (100 / 3) + (100 / 6);
    var startY = Math.floor(startIndex / 3) * (100 / 3) + (100 / 6);
    var endX = (endIndex % 3) * (100 / 3) + (100 / 6);
    var endY = Math.floor(endIndex / 3) * (100 / 3) + (100 / 6);

    dom.winLine.setAttribute('x1', startX.toFixed(2));
    dom.winLine.setAttribute('y1', startY.toFixed(2));
    dom.winLine.setAttribute('x2', endX.toFixed(2));
    dom.winLine.setAttribute('y2', endY.toFixed(2));

    dom.winOverlay.classList.remove('is-visible');
    // Force the dash animation to restart from the beginning.
    void dom.winOverlay.getBoundingClientRect();
    window.requestAnimationFrame(function () {
      if (state.winningLine) dom.winOverlay.classList.add('is-visible');
    });
  }

  /* ------------------------------------------------------------------------
     Game flow
     ------------------------------------------------------------------------ */

  function clearAiTimer() {
    if (state.aiTimer !== null) {
      window.clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
  }

  function initialAssist() {
    if (state.mode === 'local') {
      return 'Player <strong>X</strong> opens. Pass the device after each move.';
    }
    if (state.aiMark === 'X') {
      return 'The machine opens. You are <strong>O</strong>. Every draw counts.';
    }
    return 'Click a square to begin. You are <strong>X</strong>.';
  }

  function startNewRound(options) {
    var opts = options || {};
    clearAiTimer();

    var hasProgress = state.history.length > 0 || state.gameOver;
    if (opts.resetRoundNumber) {
      state.round = 1;
    } else if (opts.advance !== false && hasProgress) {
      state.round += 1;
    }

    state.board = Array(9).fill('');
    state.current = 'X';
    state.gameOver = false;
    state.thinking = false;
    state.winner = null;
    state.winningLine = null;
    state.isDraw = false;
    state.history = [];
    state.hintIndex = null;
    state.aiTimer = null;

    dom.winOverlay.classList.remove('is-visible');
    cells.forEach(function (cell) {
      cell.classList.remove('is-x', 'is-o', 'is-hinted', 'is-winning');
    });

    updateRoundLabel();
    renderBoard();
    renderMoveLog();
    setAssist(initialAssist(), null);
    updateStatus();
    updateControls();
    updateStatsUI();

    if (state.mode === 'ai' && state.current === state.aiMark) {
      scheduleAiTurn(660);
    }
  }

  function setResultCopy(outcome) {
    var copy;

    if (state.mode === 'local') {
      if (outcome.draw) {
        copy = '<strong>Honours even.</strong> Nine squares, no line. Start another round when you are ready.';
      } else {
        copy = '<strong>' + outcome.winner + ' takes the round.</strong> Every line closed. Start another round when you are ready.';
      }
    } else if (outcome.draw) {
      copy = '<strong>A perfect draw.</strong> You held every line — the only result available against perfect play.';
    } else if (outcome.winner === state.humanMark) {
      copy = '<strong>An upset.</strong> You found a line the engine should never allow. Well played.';
    } else {
      copy = '<strong>The machine wins.</strong> Every line was covered. Reset the board and aim to force a draw.';
    }

    setAssist(copy, 'result');
  }

  function recordResult(outcome) {
    var bucket = currentStats();
    var leftWon = state.mode === 'ai'
      ? outcome.winner === state.humanMark
      : outcome.winner === 'X';

    if (outcome.draw) {
      bucket.draws += 1;
      bucket.form.push('draw');
    } else if (leftWon) {
      bucket.left += 1;
      bucket.form.push('left');
    } else {
      bucket.right += 1;
      bucket.form.push('right');
    }

    bucket.form = bucket.form.slice(-5);
    saveStats();
  }

  function finishRound(outcome) {
    clearAiTimer();
    state.gameOver = true;
    state.thinking = false;
    state.isDraw = Boolean(outcome.draw);
    state.winner = outcome.winner;
    state.winningLine = outcome.line ? outcome.line.slice() : null;

    renderBoard();
    updateWinLine(state.winningLine);
    recordResult(outcome);
    updateStatus();
    updateControls();
    updateStatsUI();
    updateMoveCount();
    setResultCopy(outcome);

    if (outcome.draw) {
      playDrawSound();
      haptic([10, 35, 10]);
    } else {
      playWinSound();
      haptic([12, 35, 12, 35, 18]);
    }
  }

  function placeMark(index, player, actor) {
    if (state.gameOver || state.board[index] !== '') return false;

    clearHint();
    state.board[index] = player;
    state.history.push({ index: index, player: player });
    applyCellState(index);
    appendLogEntry(state.history[state.history.length - 1]);
    playMarkSound(player);
    if (actor === 'human') haptic(7);

    var outcome = Engine.getWinner(state.board);
    if (outcome.winner !== null || outcome.draw) {
      finishRound(outcome);
      return true;
    }

    state.current = otherMark(player);

    if (state.mode === 'ai' && state.current === state.aiMark) {
      scheduleAiTurn();
    } else {
      updateStatus();
      updateControls();
      updateStatsUI();

      if (state.mode === 'ai') {
        setAssist(
          'The machine marked <strong>' + COORDS[index] + '</strong>. Your move, ' + state.current + '.',
          null
        );
      } else {
        setAssist(
          '<strong>' + player + '</strong> marked ' + COORDS[index] + '. ' +
          otherMark(player) + ' to play.',
          null
        );
      }
    }

    return true;
  }

  function scheduleAiTurn(customDelay) {
    clearAiTimer();
    if (state.mode !== 'ai' || state.gameOver || state.current !== state.aiMark) return;

    state.thinking = true;
    updateStatus();
    updateControls();
    updateStatsUI();
    setAssist(
      state.history.length === 0
        ? 'The machine opens. It is reading the empty board.'
        : 'The machine is reading every line…',
      null
    );

    var delay = typeof customDelay === 'number'
      ? customDelay
      : 520 + Math.random() * 300;

    if (REDUCED_MOTION) delay = Math.min(delay, 140);

    state.aiTimer = window.setTimeout(function () {
      state.aiTimer = null;
      if (state.mode !== 'ai' || state.gameOver || state.current !== state.aiMark) return;

      state.thinking = false;
      var move = Engine.bestMove(state.board.slice(), state.aiMark, { randomize: true });
      if (move === -1) {
        updateStatus();
        updateControls();
        return;
      }
      placeMark(move, state.aiMark, 'ai');
    }, delay);
  }

  function handleBoardClick(event) {
    var cell = event.target.closest('.cell');
    if (!cell) return;

    var index = Number(cell.dataset.index);
    if (state.gameOver || state.thinking || state.board[index] !== '') return;

    if (state.mode === 'ai' && state.current !== state.humanMark) return;
    placeMark(index, state.current, 'human');
  }

  function undoMove() {
    if (!canUndo()) return;

    clearAiTimer();
    state.thinking = false;
    state.gameOver = false;
    state.winner = null;
    state.winningLine = null;
    state.isDraw = false;
    state.hintIndex = null;
    dom.winOverlay.classList.remove('is-visible');

    if (state.mode === 'ai') {
      var lastHuman = -1;
      for (var i = state.history.length - 1; i >= 0; i -= 1) {
        if (state.history[i].player === state.humanMark) {
          lastHuman = i;
          break;
        }
      }
      if (lastHuman === -1) return;
      state.history = state.history.slice(0, lastHuman);
      state.current = state.humanMark;
    } else {
      var removed = state.history.pop();
      if (!removed) return;
      state.current = removed.player;
    }

    state.board = Array(9).fill('');
    state.history.forEach(function (move) {
      state.board[move.index] = move.player;
    });

    cells.forEach(function (cell) {
      cell.classList.remove('is-x', 'is-o', 'is-hinted', 'is-winning');
    });
    renderBoard();
    renderMoveLog();
    updateStatus();
    updateControls();
    updateStatsUI();

    if (state.mode === 'ai') {
      setAssist('Move taken back. The board is yours again.', null);
    } else {
      setAssist('Move taken back. <strong>' + state.current + '</strong> to play.', null);
    }
  }

  function showHint() {
    if (state.gameOver || state.thinking) return;
    if (state.mode === 'ai' && state.current !== state.humanMark) return;

    var player = state.mode === 'ai' ? state.humanMark : state.current;
    var best = Engine.bestMove(state.board.slice(), player);
    if (best === -1) return;

    showHintCell(best);
    setAssist(
      (state.mode === 'ai' ? 'A quiet nudge: ' : player + ', try ') +
      '<strong>' + COORDS[best] + '</strong> — it keeps the strongest line.',
      'hint'
    );
    if (prefs.sound) tone(523.25, 0, 0.14, 'sine', 0.01);
  }

  function startNewRoundFromButton() {
    clearHint();
    startNewRound({ advance: true });
  }

  function setMode(nextMode) {
    if (nextMode !== 'ai' && nextMode !== 'local') return;
    if (nextMode === state.mode) return;

    prefs.mode = nextMode;
    savePrefs();
    state.mode = nextMode;
    state.round = 1;
    clearAiTimer();
    updateModeUI();
    startNewRound({ resetRoundNumber: true, advance: false });
  }

  function setHumanMark(mark) {
    if (state.mode !== 'ai' || (mark !== 'X' && mark !== 'O')) return;
    if (mark === state.humanMark) return;

    prefs.humanMark = mark;
    savePrefs();
    state.humanMark = mark;
    state.aiMark = otherMark(mark);
    state.round = 1;
    clearAiTimer();
    updateModeUI();
    startNewRound({ resetRoundNumber: true, advance: false });
  }

  /* ------------------------------------------------------------------------
     Dialogs
     ------------------------------------------------------------------------ */

  function openConfirm(action) {
    confirmAction = action === 'all' ? 'all' : 'scores';
    var isAll = confirmAction === 'all';

    dom.confirmTitle.textContent = isAll ? 'Reset everything?' : 'Clear this record?';
    dom.confirmCopy.textContent = isAll
      ? 'This removes your saved scores, theme, and sound preference, then returns to the default table.'
      : 'This resets your ' + (state.mode === 'ai' ? 'solo vs the machine' : 'local two-player') +
        ' wins and draws. Your current board stays in play.';
    dom.confirmReset.textContent = isAll ? 'Reset everything' : 'Clear record';

    if (dom.aboutSheet.open) dom.aboutSheet.close();
    if (dom.themeSheet.open) dom.themeSheet.close();
    if (!dom.confirmSheet.open) dom.confirmSheet.showModal();
  }

  function clearCurrentRecord() {
    stats[state.mode] = makeDefaultStats()[state.mode];
    saveStats();
    updateStatsUI();
    showToast(state.mode === 'ai' ? 'Solo record cleared' : 'Local record cleared');
  }

  function resetAllData() {
    removeStored(STORAGE.theme);
    removeStored(STORAGE.prefs);
    removeStored(STORAGE.stats);

    prefs = { mode: 'ai', humanMark: 'X', sound: true };
    stats = makeDefaultStats();
    state.mode = 'ai';
    state.humanMark = 'X';
    state.aiMark = 'O';
    state.round = 1;
    themeId = 'studio';

    applyTheme('studio', false);
    updateSoundButton();
    updateModeUI();
    startNewRound({ resetRoundNumber: true, advance: false });
    showToast('Everything reset. A fresh table.');
  }

  function handleConfirm() {
    var action = confirmAction;
    if (dom.confirmSheet.open) dom.confirmSheet.close();
    if (action === 'all') {
      resetAllData();
    } else {
      clearCurrentRecord();
    }
  }

  function attachBackdropClose(dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      var outside = event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) dialog.close();
    });
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  function handleBoardKeydown(event) {
    var cell = event.target.closest('.cell');
    if (!cell) return;

    var index = Number(cell.dataset.index);
    var row = Math.floor(index / 3);
    var column = index % 3;
    var next = index;

    if (event.key === 'ArrowLeft') {
      next = column > 0 ? index - 1 : index;
    } else if (event.key === 'ArrowRight') {
      next = column < 2 ? index + 1 : index;
    } else if (event.key === 'ArrowUp') {
      next = row > 0 ? index - 3 : index;
    } else if (event.key === 'ArrowDown') {
      next = row < 2 ? index + 3 : index;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = 8;
    } else {
      return;
    }

    event.preventDefault();
    if (next !== index) cells[next].focus();
  }

  function bindEvents() {
    dom.board.addEventListener('click', handleBoardClick);
    dom.board.addEventListener('keydown', handleBoardKeydown);

    dom.newRound.addEventListener('click', startNewRoundFromButton);
    dom.undoButton.addEventListener('click', undoMove);
    dom.hintButton.addEventListener('click', showHint);
    dom.modeAi.addEventListener('click', function () { setMode('ai'); });
    dom.modeLocal.addEventListener('click', function () { setMode('local'); });
    dom.markX.addEventListener('click', function () { setHumanMark('X'); });
    dom.markO.addEventListener('click', function () { setHumanMark('O'); });

    dom.themeButton.addEventListener('click', openThemeSheet);
    dom.themeButtonSide.addEventListener('click', openThemeSheet);
    dom.closeThemeSheet.addEventListener('click', closeThemeSheet);
    dom.themeGrid.addEventListener('click', function (event) {
      var option = event.target.closest('.theme-option');
      if (option) chooseTheme(option.dataset.theme);
    });
    dom.randomTheme.addEventListener('click', function () {
      var options = THEMES.filter(function (theme) { return theme.id !== themeId; });
      if (options.length) chooseTheme(options[Math.floor(Math.random() * options.length)].id);
    });

    dom.aboutButton.addEventListener('click', function () {
      if (!dom.aboutSheet.open) dom.aboutSheet.showModal();
    });
    dom.closeAboutSheet.addEventListener('click', function () { dom.aboutSheet.close(); });
    dom.aboutDone.addEventListener('click', function () { dom.aboutSheet.close(); });

    dom.soundButton.addEventListener('click', toggleSound);
    dom.resetScores.addEventListener('click', function () { openConfirm('scores'); });
    dom.resetData.addEventListener('click', function () { openConfirm('all'); });
    dom.confirmCancel.addEventListener('click', function () { dom.confirmSheet.close(); });
    dom.confirmReset.addEventListener('click', handleConfirm);

    attachBackdropClose(dom.themeSheet);
    attachBackdropClose(dom.aboutSheet);
    attachBackdropClose(dom.confirmSheet);

    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector('dialog[open]')) return;

      var target = event.target;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )) return;

      var key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        startNewRoundFromButton();
      } else if (key === 'u') {
        event.preventDefault();
        undoMove();
      } else if (key === 'h') {
        event.preventDefault();
        showHint();
      } else if (key === 't') {
        event.preventDefault();
        openThemeSheet();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */

  function init() {
    updateYear();
    buildThemeGrid();
    applyTheme(themeId, false);
    updateSoundButton();
    updateModeUI();
    bindEvents();
    startNewRound({ advance: false, resetRoundNumber: true });
  }

  init();
})();
