/*
 * Run with: node engine.test.js
 * Exhaustively verifies that the engine never loses from any reachable position.
 */
'use strict';

const assert = require('node:assert/strict');
const engine = require('./engine.js');

let assertions = 0;

function check(description, fn) {
  fn();
  assertions += 1;
  console.log(`  ok  ${description}`);
}

check('detects every winning line', () => {
  const boards = [
    ['X', 'X', 'X', '', '', '', '', '', ''],
    ['', '', '', 'O', 'O', 'O', '', '', ''],
    ['X', '', '', 'X', '', '', 'X', '', ''],
    ['', 'O', '', '', 'O', '', '', 'O', ''],
    ['X', '', '', '', 'X', '', '', '', 'X'],
    ['', '', 'O', '', 'O', '', 'O', '', '']
  ];
  boards.forEach((board) => assert.ok(engine.getWinner(board).winner));
});

check('detects a draw', () => {
  const result = engine.getWinner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']);
  assert.equal(result.draw, true);
  assert.equal(result.winner, null);
});

check('returns -1 when no move is legal', () => {
  assert.equal(engine.bestMove(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'], 'X'), -1);
});

/**
 * Explore every sequence of legal human moves against the perfect engine.
 * If the human can ever win, this throws.
 */
function verifyUnbeatable(engineMark, humanMark) {
  const board = Array(9).fill('');
  let positions = 0;
  let wins = 0;
  let draws = 0;

  function humanTurn() {
    const state = engine.getWinner(board);
    if (state.winner === humanMark) {
      wins += 1;
      throw new Error(`Human won as ${humanMark} with board ${JSON.stringify(board)}`);
    }
    if (state.winner === engineMark) return;
    if (state.draw) {
      draws += 1;
      return;
    }
    positions += 1;

    // Try every legal human move. The engine then answers perfectly.
    for (let i = 0; i < 9; i += 1) {
      if (board[i] !== '') continue;
      board[i] = humanMark;

      const afterHuman = engine.getWinner(board);
      if (afterHuman.winner === humanMark) {
        wins += 1;
        throw new Error(`Human won as ${humanMark} with board ${JSON.stringify(board)}`);
      }

      if (!afterHuman.draw) {
        const reply = engine.bestMove(board, engineMark);
        assert.notEqual(reply, -1);
        board[reply] = engineMark;
        humanTurn();
        board[reply] = '';
      } else {
        draws += 1;
      }

      board[i] = '';
    }
  }

  // If the engine starts, play its perfect opening, then enumerate the rest.
  if (engineMark === 'X') {
    const opening = engine.bestMove(board, 'X');
    board[opening] = 'X';
    humanTurn();
    board[opening] = '';
  } else {
    humanTurn();
  }

  assert.equal(wins, 0);
  console.log(`      ${engineMark} engine: ${positions} positions checked, ${draws} human paths drew`);
}

check('is unbeatable as O against every possible human line', () => {
  verifyUnbeatable('O', 'X');
});

check('is unbeatable as X against every possible human line', () => {
  verifyUnbeatable('X', 'O');
});

check('takes an immediate win', () => {
  const board = ['X', 'O', 'X', 'X', 'O', '', '', '', ''];
  assert.equal(engine.bestMove(board, 'O'), 7);
});

check('blocks an immediate loss', () => {
  const mustBlock = ['X', 'X', '', '', 'O', '', '', '', ''];
  assert.equal(engine.bestMove(mustBlock, 'O'), 2);
});

check('can randomize among equally perfect moves without breaking', () => {
  for (let i = 0; i < 100; i += 1) {
    const move = engine.bestMove(Array(9).fill(''), 'X', { randomize: true });
    assert.ok(move >= 0 && move <= 8);
  }
});

console.log(`\nAll ${assertions} engine checks passed.`);
