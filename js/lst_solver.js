/* ============================================================
 *  lst_solver.js — 高さ適応型 LST積みソルバー（Phase L1）  window.TT_LST
 * ------------------------------------------------------------
 *  左LST: col0=テトリス縦穴 / col1-3=Tスピンエリア / col4-9=右側積み。
 *  右LST: col9=縦穴 / col6-8=Tスピンエリア（左の鏡）。
 *  盤面から毎回分析（ステートレス）。役割が無い手は null を返し、app側で
 *  「縦穴列を除外した軽量Dellacherie」へフォールバック（縦穴を埋めず右側を平らに積む）。
 * ============================================================ */
window.TT_LST = (function () {
  "use strict";
  var ROWS = 20, COLS = 10;

  function toBinary(grid) { return grid.map(function (row) { return row.map(function (c) { return c ? 1 : 0; }); }); }
  function colHeight(b, col) { for (var r = 0; r < ROWS; r++) if (b[r][col] === 1) return ROWS - r; return 0; }

  function findTSlotLeft(b) {
    for (var r = 17; r >= 1; r--) {
      if (b[r][2] === 0 && b[r - 1][2] === 0) {
        if (b[r][1] === 1 && b[r][3] === 0) return { row: r, col: 1, rot: 1 };
        if (b[r][3] === 1 && b[r][1] === 0) return { row: r, col: 2, rot: 3 };
      }
    }
    return null;
  }
  function findTSlotRight(b) {
    for (var r = 17; r >= 1; r--) {
      if (b[r][7] === 0 && b[r - 1][7] === 0) {
        if (b[r][6] === 1 && b[r][8] === 0) return { row: r, col: 6, rot: 1 };
        if (b[r][8] === 1 && b[r][6] === 0) return { row: r, col: 7, rot: 3 };
      }
    }
    return null;
  }
  function detectLSTPattern(b, h) {
    var leftWell = h[0] < (h[1] + h[2] + h[3]) / 3 - 2;
    var rightWell = h[9] < (h[6] + h[7] + h[8]) / 3 - 2;
    if (leftWell && rightWell) return "both";
    if (leftWell) return "left";
    if (rightWell) return "right";
    return "none";
  }
  function detectLSTPhase(b, h, pattern) {
    if (pattern === "none") return "empty";
    var leftArea = [h[1], h[2], h[3]];
    var maxLeft = Math.max(leftArea[0], leftArea[1], leftArea[2]);
    var minLeft = Math.min(leftArea[0], leftArea[1], leftArea[2]);
    if (maxLeft - minLeft <= 1) return "empty";
    if (findTSlotLeft(b)) return "roof_placed";
    return "base_placed";
  }

  function analyzeLSTBoard(grid) {
    var b = toBinary(grid), h = [];
    for (var c = 0; c < COLS; c++) h[c] = colHeight(b, c);
    var pattern = detectLSTPattern(b, h);
    return {
      heights: h,
      tSlotLeft: findTSlotLeft(b),
      tSlotRight: findTSlotRight(b),
      pattern: pattern,
      phase: detectLSTPhase(b, h, pattern),
      leftAvg: (h[0] + h[1] + h[2] + h[3]) / 4,
      rightAvg: (h[4] + h[5] + h[6] + h[7] + h[8] + h[9]) / 6,
    };
  }

  // 縦穴列（左LST=0 / 右LST=9）。none/left/both は左を既定。
  function wellCol(pattern) { return (pattern === "right") ? 9 : 0; }

  function getLSTMovePiece(piece, state, pattern) {
    var useLeft = (pattern === "left" || pattern === "both" || pattern === "none");
    var useRight = (pattern === "right" || pattern === "both");

    if (piece === "T") {
      var slot = useLeft ? state.tSlotLeft : state.tSlotRight;
      if (!slot && useLeft && useRight) slot = state.tSlotRight;
      if (slot) return { col: slot.col, rot: slot.rot, source: "T_spin" };
      return null;
    }
    if (piece === "L" || piece === "J") {
      if (useLeft && piece === "L") return { col: 1, rot: 0, source: "LST_base_L" };
      if (useRight && piece === "J") return { col: 7, rot: 2, source: "LST_base_J" };
      return null;
    }
    if (piece === "S" || piece === "Z") {
      if (useLeft && state.phase === "base_placed") {
        if (piece === "S") return { col: 1, rot: 0, source: "LST_roof_S" }; // col0(縦穴)は埋めない→col1
        if (piece === "Z") return { col: 1, rot: 2, source: "LST_roof_Z" };
      }
      if (useRight && state.phase === "base_placed" && piece === "Z") return { col: 8, rot: 0, source: "LST_roof_Z_right" };
      return null;
    }
    if (piece === "I") {
      if (useLeft && state.heights[0] < state.leftAvg - 2) return { col: 0, rot: 1, source: "Tetris_well_L" };
      if (useRight && state.heights[9] < state.rightAvg - 2) return { col: 9, rot: 1, source: "Tetris_well_R" };
      return null;
    }
    if (piece === "O") {
      if (state.leftAvg < state.rightAvg - 4) return { col: 0, rot: 0, source: "balance_O" };
      return null;
    }
    return null;
  }

  function getLSTHint(grid, currentPiece, heldPiece) {
    var state = analyzeLSTBoard(grid);
    var hint = getLSTMovePiece(currentPiece, state, state.pattern);
    if (hint) { hint.useHold = false; return hint; }
    if (heldPiece) {
      var hintH = getLSTMovePiece(heldPiece, state, state.pattern);
      if (hintH) { hintH.useHold = true; return hintH; }
    }
    return null; // フォールバック（app側で縦穴列除外Dellacherie）
  }

  return {
    getLSTHint: getLSTHint,
    analyzeLSTBoard: analyzeLSTBoard,
    wellCol: wellCol,
    resetState: function () {}, // Phase L1 はステートレス
  };
})();
