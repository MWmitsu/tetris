/* ============================================================
 *  lst_guide.js — LST積みのルールベース・ガイド  window.TT_LST
 * ------------------------------------------------------------
 *  盤面と現在ミノから「今どこに置くべきか」をルールで返す（heuristic）。
 *  参考: https://shiwehi.com/tetris/template/lststacking.php
 *  返せない時は null（app側で Dellacherie/ビームへフォールバック）。
 * ============================================================ */
window.TT_LST = (function () {
  "use strict";
  var COLS = 10, ROWS = 20;

  var LST_STATE = { lastBase: null, needRoof: false };

  function toBinary(grid) {
    return grid.map(function (row) { return row.map(function (cell) { return cell ? 1 : 0; }); });
  }
  function getColHeight(b, col) { for (var r = 0; r < ROWS; r++) if (b[r][col] === 1) return ROWS - r; return 0; }
  function avgRightHeight(b) { var s = 0; for (var c = 3; c < COLS; c++) s += getColHeight(b, c); return s / 7; }
  function findTSlotRow(b) {
    for (var r = 18; r >= 1; r--) {
      if (b[r][2] === 0 && b[r - 1][2] === 0 && (b[r][1] === 1 || b[r][3] === 1)) return r;
    }
    return null;
  }
  // 配置が盤内に収まるか検証（engine使用）。OKなら絶対セル、NGなら null。
  function validCells(grid, piece, rot, col) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var py = E.dropY(grid, piece, rot, col, -2);
    var cells = E.absCells(piece, rot, col, py);
    for (var i = 0; i < 4; i++) { var r = cells[i][0], c = cells[i][1]; if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null; }
    return cells;
  }

  function analyzeLSTState(b) {
    return {
      tSlotRow: findTSlotRow(b),
      leftHeight: getColHeight(b, 0),
      rightHeight: avgRightHeight(b),
      needRoof: LST_STATE.needRoof,
      lastBase: LST_STATE.lastBase,
    };
  }

  // ルール5: T はスロットへ回転入れ（col1付近・rot=1）。スロット無ければ null（任せる）。
  function getTHint(b, state) {
    if (state.tSlotRow === null) return null;
    return { col: 1, rot: 1, source: "lst_rule" };
  }
  // ルール1/2/3: L/J を左側の底に。置いたら次は屋根。
  function getLJHint(b, state, piece) {
    LST_STATE.lastBase = piece; LST_STATE.needRoof = true;
    return { col: 0, rot: piece === "L" ? 0 : 1, source: "lst_rule" };
  }
  // ルール2/3: S/Z を屋根に（ZはSの代替）。
  function getSZHint(b, state, piece) {
    LST_STATE.needRoof = false;
    return { col: 1, rot: piece === "S" ? 0 : 2, source: "lst_rule" };
  }
  // ルール6: I は col2 に縦置き（テトリス穴維持）。I縦(rot1)は px=0 で col2 を占有。
  function getIHint(b, state) { return { col: 0, rot: 1, source: "lst_rule" }; }
  // ルール7: O は左側の底上げに。
  function getOHint(b, state) { return { col: 0, rot: 0, source: "lst_rule" }; }

  function getLSTHint(grid, currentPiece, heldPiece) {
    var b = toBinary(grid);
    var state = analyzeLSTState(b);
    var piece = currentPiece, hint = null;
    if (piece === "T") hint = getTHint(b, state);
    else if (piece === "L" || piece === "J") hint = getLJHint(b, state, piece);
    else if (piece === "S" || piece === "Z") hint = getSZHint(b, state, piece);
    else if (piece === "I") hint = getIHint(b, state);
    else if (piece === "O") hint = getOHint(b, state);
    if (!hint) return null;
    // 盤内に収まらない配置は無効化（appがビームへフォールバック）
    var cells = validCells(grid, piece, hint.rot, hint.col);
    if (!cells) return null;
    hint.cells = cells;
    return hint;
  }

  return {
    getLSTHint: getLSTHint,
    resetState: function () { LST_STATE.lastBase = null; LST_STATE.needRoof = false; },
    _state: LST_STATE,
  };
})();
