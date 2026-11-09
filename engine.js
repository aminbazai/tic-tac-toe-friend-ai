/*
 * Tic Tac Toe — perfect-play engine
 * A dependency-free minimax implementation with alpha-beta pruning.
 *
 * Exposed as window.XOEngine for the game UI and as a CommonJS module for tests.
 */
(function (root) {
  'use strict';

  var LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  var MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  var MARKS = ['X', 'O'];

  function isBoard(board) {
    return Array.isArray(board) &&
      board.length === 9 &&
      board.every(function (cell) { return cell === '' || MARKS.indexOf(cell) !== -1; });
  }

  function availableMoves(board) {
    var moves = [];
    for (var i = 0; i < 9; i += 1) {
      if (board[i] === '') moves.push(i);
    }
    return moves;
  }

  function getWinner(board) {
    for (var i = 0; i < LINES.length; i += 1) {
      var line = LINES[i];
      var a = line[0];
      var b = line[1];
      var c = line[2];
      if (board[a] !== '' && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: line.slice(), draw: false };
      }
    }

    if (availableMoves(board).length === 0) {
      return { winner: null, line: null, draw: true };
    }

    return { winner: null, line: null, draw: false };
  }

  /**
   * Score a position from `player`'s perspective.
   * Faster wins score higher; slower losses score better than fast ones.
   */
  function minimax(board, turn, player, depth, alpha, beta) {
    var state = getWinner(board);

    if (state.winner === player) return 10 - depth;
    if (state.winner !== null) return depth - 10;
    if (state.draw) return 0;

    var maximizing = turn === player;
    var best = maximizing ? -Infinity : Infinity;

    for (var i = 0; i < MOVE_ORDER.length; i += 1) {
      var index = MOVE_ORDER[i];
      if (board[index] !== '') continue;

      board[index] = turn;
      var score = minimax(
        board,
        turn === 'X' ? 'O' : 'X',
        player,
        depth + 1,
        alpha,
        beta
      );
      board[index] = '';

      if (maximizing) {
        if (score > best) best = score;
        if (best > alpha) alpha = best;
      } else {
        if (score < best) best = score;
        if (best < beta) beta = best;
      }

      if (beta <= alpha) break;
    }

    return best;
  }

  /**
   * Return the best move for `player`.
   * @param {string[]} board - 9 cells containing 'X', 'O', or ''.
   * @param {'X'|'O'} player
   * @param {{ randomize?: boolean, random?: () => number }} [options]
   * @returns {number} cell index, or -1 if no legal move exists.
   */
  function bestMove(board, player, options) {
    if (!isBoard(board) || MARKS.indexOf(player) === -1) {
      throw new TypeError('bestMove expects a valid 9-cell board and an X/O player.');
    }

    var state = getWinner(board);
    if (state.winner !== null || state.draw) return -1;

    var opts = options || {};
    var random = typeof opts.random === 'function' ? opts.random : Math.random;
    var moves = [];
    var bestScore = -Infinity;

    for (var i = 0; i < MOVE_ORDER.length; i += 1) {
      var index = MOVE_ORDER[i];
      if (board[index] !== '') continue;

      board[index] = player;
      var score = minimax(
        board,
        player === 'X' ? 'O' : 'X',
        player,
        0,
        -Infinity,
        Infinity
      );
      board[index] = '';

      if (score > bestScore) {
        bestScore = score;
        moves = [index];
      } else if (score === bestScore) {
        moves.push(index);
      }
    }

    if (moves.length === 0) return -1;

    if (opts.randomize) {
      return moves[Math.floor(random() * moves.length)];
    }

    return moves[0];
  }

  var api = {
    LINES: LINES.map(function (line) { return line.slice(); }),
    availableMoves: availableMoves,
    getWinner: getWinner,
    bestMove: bestMove
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.XOEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
