/* ============================================================
 *  pc_solver.js — パーフェクトクリア(PC)ソルバー  window.TT_PC
 * ------------------------------------------------------------
 *  engine.js(window.TT) の dropY/absCells/PIECES を使用。盤面は G.grid(null/色) を 0/1 に変換。
 *  方式: ハードドロップ配置のみ・「穴を作らない」「最下の空セルを必ず被覆」枝刈りのDFS。
 *        標準的(スピン不要)なPCを高速に検出する。ノード上限で打ち切り。
 * ============================================================ */
window.TT_PC = (function () {
  "use strict";
  var COLS = 10, ROWS = 20;

  function empty() { var g = []; for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(0); g.push(row); } return g; }
  function toBinary(grid) { var b = []; for (var r = 0; r < ROWS; r++) { var row = [], g = grid[r] || []; for (var c = 0; c < COLS; c++) row.push(g[c] ? 1 : 0); b.push(row); } return b; }
  function countFilled(b) { var n = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (b[r][c]) n++; return n; }
  function isEmpty(b) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (b[r][c]) return false; return true; }
  function hasHoles(b) { for (var c = 0; c < COLS; c++) { var seen = false; for (var r = 0; r < ROWS; r++) { if (b[r][c]) seen = true; else if (seen) return true; } } return false; }
  function clearBin(b) {
    var kept = [];
    for (var r = 0; r < ROWS; r++) { var full = true; for (var c = 0; c < COLS; c++) if (!b[r][c]) { full = false; break; } if (!full) kept.push(b[r].slice()); }
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(0));
    return kept;
  }
  // ハードドロップ配置: base(2値)に piece(rot,px) を落とす。{cells, board} / 無効なら null
  function dropPlace(base, piece, rot, px) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var py = E.dropY(base, piece, rot, px, -2);
    var cells = E.absCells(piece, rot, px, py);
    for (var i = 0; i < 4; i++) { var r = cells[i][0], c = cells[i][1]; if (c < 0 || c >= COLS || r >= ROWS || r < 0) return null; }
    var nb = base.map(function (row) { return row.slice(); });
    for (var j = 0; j < 4; j++) nb[cells[j][0]][cells[j][1]] = 1;
    return { cells: cells, board: nb };
  }
  function coversCell(cells, cell) { for (var i = 0; i < 4; i++) if (cells[i][0] === cell[0] && cells[i][1] === cell[1]) return true; return false; }
  function aboveRegion(cells, top) { for (var i = 0; i < 4; i++) if (cells[i][0] < top) return true; return false; }
  // 着地セルのみ計算（盤面コピーなし・高速）。無効なら null。
  function dropCells(base, piece, rot, px) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var py = E.dropY(base, piece, rot, px, -2);
    var cells = E.absCells(piece, rot, px, py);
    for (var i = 0; i < 4; i++) { var r = cells[i][0], c = cells[i][1]; if (c < 0 || c >= COLS || r >= ROWS || r < 0) return null; }
    return cells;
  }
  // 指定セルを被覆できるハードドロップ配置だけを列挙（被覆可能な px のみ試す＝枝刈り）。
  function placementsCovering(bd, piece, cell, top) {
    var E = window.TT, st = E.PIECES[piece].states, out = [];
    for (var rot = 0; rot < 4; rot++) {
      var s = st[rot], minC = 9, maxC = -9;
      for (var i = 0; i < 4; i++) { if (s[i][1] < minC) minC = s[i][1]; if (s[i][1] > maxC) maxC = s[i][1]; }
      for (var px = cell[1] - maxC; px <= cell[1] - minC; px++) {
        var cells = dropCells(bd, piece, rot, px);
        if (cells && coversCell(cells, cell) && !aboveRegion(cells, top)) out.push({ rot: rot, px: px, cells: cells });
      }
    }
    return out;
  }
  function applyCells(bd, cells) { var nb = bd.map(function (row) { return row.slice(); }); for (var i = 0; i < 4; i++) nb[cells[i][0]][cells[i][1]] = 1; return nb; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lowestEmpty(bd, top) { for (var r = ROWS - 1; r >= top; r--) for (var c = 0; c < COLS; c++) if (!bd[r][c]) return [r, c]; return null; }

  var CAP = 10000;

  /* PC可能性チェック。pieces=固定順のミノ配列。{possible, solution:[{piece,col,rot}...]|null} */
  function canAchievePC(grid, pieces) {
    var b = toBinary(grid), N = pieces.length;
    if (N === 0) return { possible: isEmpty(b), solution: [] };
    var nodes = { n: 0 }, sol = [];
    function dfs(bd, depth) {
      if (nodes.n++ > CAP) return false;
      var R = N - depth;
      if (R === 0) return isEmpty(bd);
      var F = countFilled(bd);
      if ((F + 4 * R) % 10 !== 0) return false;          // 全消去には総セルが10の倍数
      var H = (F + 4 * R) / 10; if (H > ROWS) return false;
      var top = ROWS - H;
      for (var r = 0; r < top; r++) for (var c = 0; c < COLS; c++) if (bd[r][c]) return false; // 既存が高すぎる
      var cell = lowestEmpty(bd, top); if (!cell) return false;
      var piece = pieces[depth];
      var cands = placementsCovering(bd, piece, cell, top);
      for (var k = 0; k < cands.length; k++) {
        var nb = clearBin(applyCells(bd, cands[k].cells));
        if (hasHoles(nb)) continue;
        sol[depth] = { piece: piece, col: cands[k].px, rot: cands[k].rot };
        if (dfs(nb, depth + 1)) return true;
      }
      return false;
    }
    var ok = dfs(b, 0);
    return { possible: ok, solution: ok ? sol.slice(0, N) : null };
  }

  /* PCルート案内: 現在+ネクスト5(+ホールド)でPC可能なら最初の1手を返す。
     {col,rot,piece,cells,solutionLength,useHold} | null */
  function findPCHint(grid, currentPiece, heldPiece, nextPieces) {
    nextPieces = nextPieces || [];
    var seqs = [{ seq: [currentPiece].concat(nextPieces.slice(0, 5)), hold: false }];
    if (heldPiece) seqs.push({ seq: [heldPiece, currentPiece].concat(nextPieces.slice(0, 4)), hold: true });
    for (var s = 0; s < seqs.length; s++) {
      var res = canAchievePC(grid, seqs[s].seq);
      if (res.possible && res.solution && res.solution.length) {
        var f = res.solution[0];
        var pl = dropPlace(toBinary(grid), f.piece, f.rot, f.col);
        return { col: f.col, rot: f.rot, piece: f.piece, cells: pl ? pl.cells : [], solutionLength: res.solution.length, useHold: seqs[s].hold };
      }
    }
    return null;
  }

  /* 課題生成: 空盤面から rows 段(=rows*10/4 ミノ)のPCを1つ作る。{rows, pieces:[...], solution:[{piece,col,rot}...]} | null */
  function generatePC(rows) {
    var N = rows * COLS / 4; if (N !== Math.floor(N)) return null;
    var nodes = { n: 0 }, sol = [];
    function dfs(bd, depth) {
      if (nodes.n++ > 30000) return false;
      var R = N - depth;
      if (R === 0) return isEmpty(bd);
      var F = countFilled(bd);
      if ((F + 4 * R) % 10 !== 0) return false;
      var H = (F + 4 * R) / 10; if (H > ROWS) return false;
      var top = ROWS - H;
      var cell = lowestEmpty(bd, top); if (!cell) return false;
      var ps = shuffle(["I", "O", "T", "S", "Z", "J", "L"]);
      for (var pi = 0; pi < ps.length; pi++) {
        var piece = ps[pi];
        var cands = shuffle(placementsCovering(bd, piece, cell, top));
        for (var k = 0; k < cands.length; k++) {
          var nb = clearBin(applyCells(bd, cands[k].cells));
          if (hasHoles(nb)) continue;
          sol[depth] = { piece: piece, col: cands[k].px, rot: cands[k].rot };
          if (dfs(nb, depth + 1)) return true;
        }
      }
      return false;
    }
    if (dfs(empty(), 0)) return { rows: rows, pieces: sol.slice(0, N).map(function (s) { return s.piece; }), solution: sol.slice(0, N) };
    return null;
  }

  // 底から到達可能な空セル数（参考用・仕様準拠）
  function countReachableEmpty(grid) {
    var b = toBinary(grid), count = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      var allEmpty = b[r].every(function (c) { return c === 0; });
      if (allEmpty) { count += COLS; break; }
      count += b[r].filter(function (c) { return c === 0; }).length;
      if (b[r].some(function (c) { return c === 1; })) break;
    }
    return count;
  }

  /* ホールドによる並べ替えを許す PC探索DFS（各手で先頭 or 2番目=ホールドを置ける）。
     grid01=2値盤面 / pieces=残りミノ / 戻り値 usedOrder([{piece,col,rot,useHold}]) | null。 */
  function searchPC(grid01, pieces, usedOrder, depth, budget) {
    if (budget.n++ > budget.limit) return null;
    if (pieces.length === 0) return isEmpty(grid01) ? usedOrder : null;
    var F = countFilled(grid01), R = pieces.length;
    if ((F + 4 * R) % 10 !== 0) return null;
    var H = (F + 4 * R) / 10; if (H > ROWS) return null;
    var top = ROWS - H;
    for (var r = 0; r < top; r++) for (var c = 0; c < COLS; c++) if (grid01[r][c]) return null;
    var cell = lowestEmpty(grid01, top); if (!cell) return null;
    // 試す手: 先頭(useHold=false) と 2番目(=ホールド, useHold=true)
    var idxs = [0];
    if (pieces.length >= 2 && pieces[1] !== pieces[0]) idxs.push(1);
    for (var ii = 0; ii < idxs.length; ii++) {
      var idx = idxs[ii], piece = pieces[idx];
      var cands = placementsCovering(grid01, piece, cell, top);
      for (var k = 0; k < cands.length; k++) {
        var nb = clearBin(applyCells(grid01, cands[k].cells));
        if (hasHoles(nb)) continue;
        var rest = (idx === 0) ? pieces.slice(1) : [pieces[0]].concat(pieces.slice(2));
        var res = searchPC(nb, rest, usedOrder.concat([{ piece: piece, col: cands[k].px, rot: cands[k].rot, useHold: (idx === 1) }]), depth + 1, budget);
        if (res) return res;
      }
    }
    return null;
  }

  /* 全ルート計画（開幕PC向け）: 現在＋ホールド＋ネクスト9 からホールド並べ替えを使ってPC手順を探す。
     PC可能なミノ数を小さい順に試す。戻り値 [{piece,col,rot,useHold}...] | null。 */
  function planPCRoute(grid, currentPiece, heldPiece, nextPieces) {
    nextPieces = nextPieces || [];
    var allPieces = [currentPiece];
    if (heldPiece) allPieces.push(heldPiece);
    allPieces = allPieces.concat(nextPieces.slice(0, 9));
    var b0 = toBinary(grid), F = countFilled(b0);
    for (var n = 2; n <= Math.min(10, allPieces.length); n++) {
      if ((F + n * 4) % 10 !== 0) continue;       // PC可能なミノ数（総セルが10の倍数）
      var res = searchPC(b0.map(function (row) { return row.slice(); }), allPieces.slice(0, n), [], 0, { n: 0, limit: 12000 });
      if (res) return res;
    }
    return null;
  }

  return { canAchievePC: canAchievePC, findPCHint: findPCHint, generatePC: generatePC, planPCRoute: planPCRoute, countReachableEmpty: countReachableEmpty,
           _util: { toBinary: toBinary, countFilled: countFilled, isEmpty: isEmpty, dropPlace: dropPlace, clearBin: clearBin } };
})();

/* ============================================================
 *  コンソール簡易テスト
 * ------------------------------------------------------------
(function () {
  const E = window.TT, PC = window.TT_PC;
  // 2段PC生成→検出
  const g = PC.generatePC(2);
  console.log("gen 2-line:", g && g.pieces, "len", g && g.solution.length);
  console.log("canAchievePC(empty, gen.pieces):", PC.canAchievePC(E.emptyGrid(), g.pieces).possible); // true 期待
})();
 * ============================================================ */
