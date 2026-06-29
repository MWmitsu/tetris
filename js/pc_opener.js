/* ============================================================
 *  pc_opener.js — 連続パーフェクトクリア(連パフェ) 出題  window.TT_PCO
 * ------------------------------------------------------------
 *  参考: https://shiwehi.com/tetris/template/pcopener.php
 *  実バッグ固定順での開幕PCはハードドロップ・ソルバーの限界で不安定なため、
 *  「必ず解ける開幕PC」を generatePC で生成し、配置順そのまま供給する方式にする。
 *  （配置順＝出現順なのでホールド不要で1手ずつ追える）。
 * ============================================================ */
window.TT_PCO = (function () {
  "use strict";

  // 次の開幕PCを返す。{ pieces:[...出現順], route:[{piece,col,rot}], rows }
  function nextOpening() {
    var PC = window.TT_PC; if (!PC) return null;
    var rows = (Math.random() < 0.5) ? 2 : 4;        // 2段(易) or 4段(難)
    var gen = null, tries = 0;
    while (!gen && tries < 6) { gen = PC.generatePC(rows); tries++; }
    if (!gen) gen = PC.generatePC(2);
    if (!gen) return null;
    return {
      pieces: gen.pieces.slice(),
      route: gen.solution.map(function (s) { return { piece: s.piece, col: s.col, rot: s.rot }; }),
      rows: gen.rows,
    };
  }

  return { nextOpening: nextOpening };
})();
