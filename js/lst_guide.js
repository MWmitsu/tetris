/* ============================================================
 *  lst_guide.js — LST積み ルールベース・ガイド（状態機械）  window.TT_LST
 * ------------------------------------------------------------
 *  参考: https://shiwehi.com/tetris/template/lststacking.php
 *  col0=テトリス縦穴 / col1-3=Tスピン&L/S置き場 / col4-9=右側積み。
 *  L/J(底)→S/Z(屋根)を交互に、Tはスロットへ回し入れ。返せない手は null（app側でDellacherie fast）。
 * ============================================================ */
window.TT_LST = (function () {
  "use strict";
  var COLS = 10, ROWS = 20;

  var LST_STATE = { phase: "base", lastBase: null, baseCol: null, roofHeight: 0 };

  function toBinary(grid) { return grid.map(function (row) { return row.map(function (c) { return c ? 1 : 0; }); }); }
  function getColHeight(b, col) { for (var r = 0; r < ROWS; r++) if (b[r][col] === 1) return ROWS - r; return 0; }
  function avgRightHeight(b) { var s = 0; for (var c = 4; c < COLS; c++) s += getColHeight(b, c); return s / 6; }
  function avgLeftHeight(b) { return (getColHeight(b, 0) + getColHeight(b, 1)) / 2; }
  // 盤外に出ない配置か検証（engine使用）。OKで絶対セル、NGでnull。
  function validCells(grid, piece, rot, col) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var py = E.dropY(grid, piece, rot, col, -2);
    var cells = E.absCells(piece, rot, col, py);
    for (var i = 0; i < 4; i++) { var r = cells[i][0], c = cells[i][1]; if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null; }
    return cells;
  }

  // Tスロット検出：col2が2行連続で空＋片側オーバーハング。{row,col,rot}|null
  function findTSlot(b) {
    for (var r = 18; r >= 1; r--) {
      if (b[r][2] === 0 && b[r - 1][2] === 0) {
        if (b[r][1] === 1 && b[r][3] === 0) return { row: r, col: 1, rot: 1 }; // 左オーバーハング→右から回し入れ
        if (b[r][3] === 1 && b[r][1] === 0) return { row: r, col: 2, rot: 3 }; // 右オーバーハング→左から回し入れ
      }
    }
    return null;
  }

  function getLSTHint(grid, currentPiece, heldPiece) {
    var b = toBinary(grid);
    var piece = currentPiece, hint = null;

    if (piece === "T") {
      var slot = findTSlot(b);
      if (slot) hint = { col: slot.col, rot: slot.rot };
    } else if (piece === "L") {
      hint = { col: 1, rot: 0 };                                  // 左の底（縦置き）
    } else if (piece === "J") {
      hint = { col: 1, rot: 2 };                                  // LのJ代替
    } else if (piece === "S") {
      hint = (LST_STATE.phase === "roof") ? { col: 0, rot: 0 } : { col: 1, rot: 0 }; // 屋根 or 底
    } else if (piece === "Z") {
      hint = (LST_STATE.phase === "roof") ? { col: 0, rot: 2 } : { col: 1, rot: 2 }; // SのZ代替
    } else if (piece === "I") {
      if (getColHeight(b, 0) <= avgRightHeight(b) + 4) hint = { col: 0, rot: 1 }; // col0縦＝テトリス穴維持
    } else if (piece === "O") {
      if (avgLeftHeight(b) < avgRightHeight(b) - 3) hint = { col: 0, rot: 0 };    // 左が低い時だけ底上げ
    }
    if (!hint) return null;
    var cells = validCells(grid, piece, hint.rot, hint.col);
    if (!cells) return null;
    hint.cells = cells;
    return hint;
  }

  // ロック後に状態を更新（底/屋根フェーズ）
  function updateState(piece) {
    if (piece === "L" || piece === "J") { LST_STATE.lastBase = piece; LST_STATE.phase = "roof"; }
    else if (piece === "S" || piece === "Z") {
      if (LST_STATE.phase === "roof") LST_STATE.phase = "base";
      else { LST_STATE.lastBase = piece; LST_STATE.phase = "roof"; }
    }
  }

  return {
    getLSTHint: getLSTHint,
    updateState: updateState,
    findTSlot: function (grid) { return findTSlot(toBinary(grid)); },
    phase: function () { return LST_STATE.phase; },
    resetState: function () { LST_STATE.phase = "base"; LST_STATE.lastBase = null; LST_STATE.baseCol = null; LST_STATE.roofHeight = 0; },
  };
})();
