/* ============================================================
 *  ai.js — Dellacherie 評価 + LST特化 + ビームサーチ(Hold/Next5対応)
 * ------------------------------------------------------------
 *  独立モジュール window.TT_AI。engine.js(window.TT) の PIECES/absCells/dropY と互換。
 *  盤面は app.js の G.grid(null=空/色=埋まり)を受け取り、内部で 0/1 の2値に変換して計算する。
 *  非同期なし・同期実行。ビームサーチはループ上限 10000 で深さ自動削減。
 * ============================================================ */
window.TT_AI = (function () {
  "use strict";

  // ---- 重み定数（先頭に集約。後から調整しやすく）----
  var AI_WEIGHTS = {
    landingHeight : -4.500,
    erodedCells   : +3.417,
    rowTrans      : -3.217,
    colTrans      : -9.348,
    holes         : -7.899,
    wells         : -3.386,
    tsdSlot       : +40.0,   // detectLSTScore: TSDオーバーハング検出
    tetrisWell    : +20.0,   // detectLSTScore: col2 縦穴(≥8)。≥4 は半分(+10)
    heightBalance : +10.0,   // detectLSTScore: 左右高さバランス
    tDestroySlot  : -60.0,   // findBestMove: Tでスロット破壊
    tPlaceBonus   : +50.0,   // findBestMove: TをTSDゾーンへ
    iPlaceBonus   : +80.0,   // findBestMove: Iをcol2縦穴へ(Tetris)
    iDestroySlot  : -50.0,   // findBestMove: Iがcol1/3を縦埋め(TSDエリア破壊)
    lsBaseBonus   : +20.0    // findBestMove: L/Sを左側(col0-1)基礎へ
  };

  // 手の評価しきい値（最善手スコアとの差の割合）。good以内=次善手 / ok以内=改善余地 / 超=ミス
  var AI_THRESHOLD = { good: 0.15, ok: 0.40 };

  function dims() { var E = window.TT; return { COLS: (E && E.COLS) || 10, ROWS: (E && E.ROWS) || 20 }; }

  // ---- 0/1 2値配列に変換（null/色=埋まり / 既に0/1でも可）----
  function toBinary(grid) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, b = [];
    for (var r = 0; r < ROWS; r++) { var row = [], g = grid[r] || []; for (var c = 0; c < COLS; c++) row.push(g[c] ? 1 : 0); b.push(row); }
    return b;
  }
  function asBin(grid) { // 既に2値ならそのまま、色盤面なら変換
    return (Array.isArray(grid) && grid.length && (grid[0][0] === 0 || grid[0][0] === 1)) ? grid : toBinary(grid);
  }

  function columnHeights(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, h = [];
    for (var c = 0; c < COLS; c++) { var hh = 0; for (var r = 0; r < ROWS; r++) { if (b[r][c]) { hh = ROWS - r; break; } } h.push(hh); }
    return h;
  }
  function rowTransitions(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, t = 0;
    for (var r = 0; r < ROWS; r++) { var prev = 1; for (var c = 0; c < COLS; c++) { var cur = b[r][c] ? 1 : 0; if (cur !== prev) t++; prev = cur; } if (prev !== 1) t++; }
    return t;
  }
  function columnTransitions(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, t = 0;
    for (var c = 0; c < COLS; c++) { var prev = 0; for (var r = 0; r < ROWS; r++) { var cur = b[r][c] ? 1 : 0; if (cur !== prev) t++; prev = cur; } if (prev !== 1) t++; }
    return t;
  }
  function holes(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, n = 0;
    for (var c = 0; c < COLS; c++) { var seen = false; for (var r = 0; r < ROWS; r++) { if (b[r][c]) seen = true; else if (seen) n++; } }
    return n;
  }
  function cumulativeWells(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, total = 0;
    for (var c = 0; c < COLS; c++) {
      var streak = 0;
      for (var r = 0; r < ROWS; r++) {
        var lf = (c === 0) || !!b[r][c - 1], rf = (c === COLS - 1) || !!b[r][c + 1];
        if (!b[r][c] && lf && rf) { streak++; total += streak; } else streak = 0;
      }
    }
    return total;
  }

  /* ---- LST積み検出（旧 tSlotScore を完全刷新）----
     参照: shiwehi.com LST積み（左から3列目=col2 でTスピン/テトリス）
     評価1: col2 のTSDオーバーハング（col2空＋真上も空＋col1/col3が埋まり）→ +40
     評価2: col2 の縦穴連続（≥8で+20 / ≥4で+10）＝テトリス待ち
     評価3: 左(col0-3)と右(col4-9)の平均高さ差 ≤3 → +10 */
  function detectLSTScore(grid) {
    var b = asBin(grid), d = dims(), ROWS = d.ROWS, score = 0, r;
    // 評価1
    var tsdFound = false;
    for (r = 1; r < 19; r++) {
      var col2Empty = b[r][2] === 0, col2AboveEmpty = b[r - 1][2] === 0, overhang = (b[r][1] === 1 || b[r][3] === 1);
      if (col2Empty && col2AboveEmpty && overhang) { tsdFound = true; break; }
    }
    if (tsdFound) score += AI_WEIGHTS.tsdSlot;
    // 評価2
    var col2Open = 0; for (r = 0; r < ROWS; r++) if (b[r][2] === 0) col2Open++;
    if (col2Open >= 8) score += AI_WEIGHTS.tetrisWell;
    else if (col2Open >= 4) score += AI_WEIGHTS.tetrisWell / 2;
    // 評価3
    function colH(c) { for (var rr = 0; rr < ROWS; rr++) if (b[rr][c] === 1) return ROWS - rr; return 0; }
    var leftAvg = (colH(0) + colH(1) + colH(2) + colH(3)) / 4;
    var rightAvg = (colH(4) + colH(5) + colH(6) + colH(7) + colH(8) + colH(9)) / 6;
    if (Math.abs(leftAvg - rightAvg) <= 3) score += AI_WEIGHTS.heightBalance;
    return score;
  }

  /* ---- 評価関数: Dellacherie 6指標 ＋ detectLSTScore ----
     placement 省略可。{landingHeight, erodedCells} を渡すと着地高さ・消去貢献度も加味（findBestMoveが渡す）。 */
  function evaluateBoard(grid, placement) {
    var b = asBin(grid);
    var lh = (placement && placement.landingHeight) || 0;
    var er = (placement && placement.erodedCells) || 0;
    var s = 0;
    s += AI_WEIGHTS.landingHeight * lh;
    s += AI_WEIGHTS.erodedCells * er;
    s += AI_WEIGHTS.rowTrans * rowTransitions(b);
    s += AI_WEIGHTS.colTrans * columnTransitions(b);
    s += AI_WEIGHTS.holes * holes(b);
    s += AI_WEIGHTS.wells * cumulativeWells(b);
    s += detectLSTScore(b);
    return s;
  }

  function clearBinary(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, kept = [];
    for (var r = 0; r < ROWS; r++) { var full = true; for (var c = 0; c < COLS; c++) if (!b[r][c]) { full = false; break; } if (!full) kept.push(b[r].slice()); }
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(0));
    return kept;
  }

  // 単一配置の評価。base(2値)に piece を (rot,px) で落とす。
  // 戻り値 { col, rot, score, cells, board(消去後2値) } / 無効なら null。
  function placementResult(base, piece, rot, px) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS;
    var py = E.dropY(base, piece, rot, px, -2);
    var cells = E.absCells(piece, rot, px, py);
    var ok = true, maxR = -999, i, r, c;
    for (i = 0; i < 4; i++) { r = cells[i][0]; c = cells[i][1]; if (c < 0 || c >= COLS || r >= ROWS || r < 0) { ok = false; break; } if (r > maxR) maxR = r; }
    if (!ok) return null;
    var b = base.map(function (row) { return row.slice(); });
    for (i = 0; i < 4; i++) b[cells[i][0]][cells[i][1]] = 1;
    var cleared = 0, pieceInCleared = 0;
    for (r = 0; r < ROWS; r++) { var full = true; for (c = 0; c < COLS; c++) if (!b[r][c]) { full = false; break; } if (full) { cleared++; for (i = 0; i < 4; i++) if (cells[i][0] === r) pieceInCleared++; } }
    var eroded = cleared * pieceInCleared;
    var landingHeight = ROWS - maxR;
    var after = cleared ? clearBinary(b) : b;
    var score = evaluateBoard(after, { landingHeight: landingHeight, erodedCells: eroded });
    return { col: px, rot: rot, score: score, cells: cells, board: after };
  }

  // ---- ミノ別ボーナス/ペナルティ（LST特化）----
  function minoBonus(piece, rot, cells, beforeBin, afterBin) {
    var w = AI_WEIGHTS, bonus = 0, i, r, c;
    if (piece === "T") {
      if (detectLSTScore(afterBin) < detectLSTScore(beforeBin) - 10) bonus += w.tDestroySlot;      // スロット破壊
      for (i = 0; i < cells.length; i++) { r = cells[i][0]; c = cells[i][1]; if (c >= 1 && c <= 3 && r >= 16 && r <= 19) { bonus += w.tPlaceBonus; break; } } // TSDゾーン
    } else if (piece === "I") {
      var col = cells[0][1]; // 縦Iは全セル同列
      if (rot === 1 && col === 2) bonus += w.iPlaceBonus;                       // col2縦穴(Tetris)
      else if (rot === 1 && (col === 1 || col === 3)) bonus += w.iDestroySlot;  // col1/3縦埋め(破壊)
    } else if (piece === "L" || piece === "S") {
      for (i = 0; i < cells.length; i++) { c = cells[i][1]; if (c === 0 || c === 1) { bonus += w.lsBaseBonus; break; } } // 左側基礎
    }
    return bonus;
  }

  // 1配置候補をスコア化（Dellacherie+消去+detectLST＋ミノ別ボーナス）。{...res, bonus, total}
  function scoredCandidate(base, piece, rot, px) {
    var res = placementResult(base, piece, rot, px);
    if (!res) return null;
    res.bonus = minoBonus(piece, rot, res.cells, base, res.board);
    res.total = res.score + res.bonus;
    return res;
  }

  /* ---- ビームサーチ（Hold＋Next5対応）----
     grid, piece(現在), heldPiece(ホールド中=null可), nextPieces(配列)
     ビーム幅3・深さ 1+min(next,5)・ループ上限10000で深さ自動削減。
     戻り値 { col, rot, score, cells, useHold }（col=px）。 */
  function findBestMove(grid, piece, heldPiece, nextPieces) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var d = dims(), COLS = d.COLS;
    nextPieces = nextPieces || [];
    var BEAM = 3, LOOP_CAP = 10000, evalCount = 0;
    var depth = 1 + Math.min(nextPieces.length, 5);

    var beams = [{ board: toBinary(grid), active: piece, hold: (heldPiece || null), rest: nextPieces.slice(0, 5), score: 0, bonus: 0, first: null }];

    for (var step = 0; step < depth; step++) {
      if (evalCount > LOOP_CAP) break; // 上限超過 → これ以上深く読まない
      var cand = [];
      for (var bi = 0; bi < beams.length; bi++) {
        var node = beams[bi];
        // 出せる手: (A)active そのまま / (B)hold交換（空なら次を引く）
        var plays = [{ pc: node.active, useHold: false, nActive: (node.rest[0] || null), nRest: node.rest.slice(1), nHold: node.hold }];
        if (node.hold) plays.push({ pc: node.hold, useHold: true, nActive: (node.rest[0] || null), nRest: node.rest.slice(1), nHold: node.active });
        else if (node.rest.length > 0) plays.push({ pc: node.rest[0], useHold: true, nActive: (node.rest[1] || null), nRest: node.rest.slice(2), nHold: node.active });

        for (var pi = 0; pi < plays.length; pi++) {
          var pl = plays[pi]; if (!pl.pc) continue;
          for (var rr = 0; rr < 4; rr++) {
            for (var px = -2; px < COLS; px++) {
              var res = scoredCandidate(node.board, pl.pc, rr, px);
              if (!res) continue;
              evalCount++;
              var cum = node.bonus + res.bonus;
              cand.push({
                board: res.board, active: pl.nActive, hold: pl.nHold, rest: pl.nRest,
                score: res.score + cum,   // 最新盤面評価＋累積ボーナス でランキング
                bonus: cum,
                first: node.first || { col: px, rot: rr, cells: res.cells, useHold: pl.useHold }
              });
            }
          }
        }
      }
      if (!cand.length) break;
      cand.sort(function (a, b) { return b.score - a.score; });
      beams = cand.slice(0, BEAM);
    }

    if (beams.length && beams[0].first) {
      var top = beams[0];
      return { col: top.first.col, rot: top.first.rot, score: top.score, cells: top.first.cells, useHold: top.first.useHold };
    }
    // フォールバック: 1手greedy（hold無し）
    var best = null, base = toBinary(grid);
    for (var r2 = 0; r2 < 4; r2++) for (var p2 = -2; p2 < COLS; p2++) {
      var c2 = scoredCandidate(base, piece, r2, p2); if (!c2) continue;
      if (!best || c2.total > best.score) best = { col: p2, rot: r2, score: c2.total, cells: c2.cells, useHold: false };
    }
    return best;
  }

  // プレイヤー配置の純Dellacherie評価（採点用・ボーナス無し・1手）。
  function evaluatePlacement(grid, piece, rot, px) {
    return placementResult(toBinary(grid), piece, rot, px);
  }

  return {
    findBestMove: findBestMove,
    evaluatePlacement: evaluatePlacement,
    evaluateBoard: evaluateBoard,
    detectLSTScore: detectLSTScore,
    tSlotScore: detectLSTScore,   // 後方互換（旧名）
    thresholds: AI_THRESHOLD,
    weights: AI_WEIGHTS,
    _metrics: { toBinary: toBinary, columnHeights: columnHeights, rowTransitions: rowTransitions,
                columnTransitions: columnTransitions, holes: holes, cumulativeWells: cumulativeWells, minoBonus: minoBonus },
  };
})();

/* ============================================================
 *  コンソール簡易テスト（DevToolsに貼って実行可）
 * ------------------------------------------------------------
(function () {
  const E = window.TT, AI = window.TT_AI;
  console.log("TT_AI:", !!AI, "keys:", Object.keys(AI));
  // 理想LST形(col2のTSDオーバーハング)で detectLSTScore >= 40 か
  let g = E.emptyGrid();
  for (let c=0;c<10;c++){ g[18][c]="#777"; g[19][c]="#777"; }
  g[18][2]=null; g[19][2]=null; g[17][1]="#777"; // col2縦穴+オーバーハング
  console.log("detectLSTScore(LST):", AI.detectLSTScore(g));
  // ビームサーチ（Next5）
  const t0 = performance.now();
  const m = AI.findBestMove(E.emptyGrid(), "T", null, ["I","O","L","J","S"]);
  console.log("beam best:", m, "ms:", (performance.now()-t0).toFixed(1));
})();
 * ============================================================ */
