/* ============================================================
 *  ai.js — Dellacherie アルゴリズムによる最善手計算エンジン
 * ------------------------------------------------------------
 *  既存コード(engine.js / app.js)に一切手を加えず、window.TT_AI として追加する独立モジュール。
 *  engine.js(window.TT)の PIECES / absCells / dropY / clearLines / emptyGrid と同じデータ構造で動作。
 *  盤面は app.js の G.grid（null=空 / 色文字列=埋まり）をそのまま受け取り、内部で 0/1 の2値に変換して計算する。
 *  非同期なし・同期実行（1手の探索は 4回転 × 約12列 = 約48候補で、フレームループ内で呼べる速度）。
 *
 *  Dellacherie(= El-Tetris) 標準6指標と公開重み:
 *    着地高さ        landingHeight     -4.500
 *    消去貢献度      erodedPieceCells  +3.417   (消去ライン数 × 消去された“そのミノ”のセル数)
 *    行の凸凹        rowTransitions    -3.217
 *    列の凸凹        columnTransitions -9.348
 *    穴の数          holes             -7.899
 *    井戸の深さ合計  cumulativeWells   -3.386
 *  ＋ LST特化ボーナス tSlotScore（Tスロット維持を優先）
 * ============================================================ */
window.TT_AI = (function () {
  "use strict";

  // engine.js があればそこから寸法を取得（無ければ既定 10x20）
  function dims() {
    var E = window.TT;
    return { COLS: (E && E.COLS) || 10, ROWS: (E && E.ROWS) || 20 };
  }

  // Dellacherie(El-Tetris) 公開重み（仕様指定の標準値）
  var W = {
    landingHeight: -4.500,
    erodedPieceCells: 3.417,
    rowTransitions: -3.217,
    columnTransitions: -9.348,
    holes: -7.899,
    cumulativeWells: -3.386,
  };

  // ---- 盤面を 0/1 の2値配列に変換（null/色文字列=埋まり / 既に0/1でも可）----
  function toBinary(grid) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS;
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [], g = grid[r] || [];
      for (var c = 0; c < COLS; c++) row.push(g[c] ? 1 : 0);
      b.push(row);
    }
    return b;
  }

  // ---- 各列の高さ（下からの段数。空列=0）----
  function columnHeights(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, h = [];
    for (var c = 0; c < COLS; c++) {
      var hh = 0;
      for (var r = 0; r < ROWS; r++) { if (b[r][c]) { hh = ROWS - r; break; } }
      h.push(hh);
    }
    return h;
  }

  // ---- 行の凸凹（左右の壁は埋まり扱い）----
  function rowTransitions(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, t = 0;
    for (var r = 0; r < ROWS; r++) {
      var prev = 1; // 左の壁=埋まり
      for (var c = 0; c < COLS; c++) { var cur = b[r][c] ? 1 : 0; if (cur !== prev) t++; prev = cur; }
      if (prev !== 1) t++; // 右の壁=埋まり
    }
    return t;
  }

  // ---- 列の凸凹（上空=空 / 床=埋まり扱い）----
  function columnTransitions(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, t = 0;
    for (var c = 0; c < COLS; c++) {
      var prev = 0; // 盤面上空=空
      for (var r = 0; r < ROWS; r++) { var cur = b[r][c] ? 1 : 0; if (cur !== prev) t++; prev = cur; }
      if (prev !== 1) t++; // 床=埋まり
    }
    return t;
  }

  // ---- 穴の数（埋まりセルの下にある空セル）----
  function holes(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, n = 0;
    for (var c = 0; c < COLS; c++) {
      var seen = false;
      for (var r = 0; r < ROWS; r++) {
        if (b[r][c]) seen = true;
        else if (seen) n++;
      }
    }
    return n;
  }

  // ---- 井戸の深さ合計（両隣が埋まり=壁含む の空セルを上から連続でカウントし 1+2+3… で累積）----
  function cumulativeWells(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, total = 0;
    for (var c = 0; c < COLS; c++) {
      var streak = 0;
      for (var r = 0; r < ROWS; r++) {
        var leftFilled = (c === 0) || !!b[r][c - 1];
        var rightFilled = (c === COLS - 1) || !!b[r][c + 1];
        if (!b[r][c] && leftFilled && rightFilled) { streak++; total += streak; }
        else streak = 0;
      }
    }
    return total;
  }

  /* ---- LST特化ボーナス: Tスロット(Tミノが入るL字の縦溝)を評価して加算 ----
     ・縦溝（両隣が埋まりの空セル）の上に片側だけオーバーハングがある＝T-spin可能なL字空間 → +20.0
     ・その溝の深さが2以上なら → +10.0
     ・溝が右寄り(col6-8)または左寄り(col1-3) → +5.0
     列ごとに最初に見つけた1スロットのみ評価（過剰加点を防ぐ）。 */
  function tSlotScore(grid) {
    var b = Array.isArray(grid) && grid.length && (grid[0][0] === 0 || grid[0][0] === 1)
      ? grid : toBinary(grid); // 2値でも色盤面でも受ける
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS, score = 0;
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        var leftFilled = (c === 0) || !!b[r][c - 1];
        var rightFilled = (c === COLS - 1) || !!b[r][c + 1];
        if (b[r][c] || !leftFilled || !rightFilled) continue; // 縦溝のセルでない
        var openAbove = (r - 1 < 0) || !b[r - 1][c];          // 溝の真上が開いている(回し入れられる)
        var overL = (r - 1 >= 0 && c - 1 >= 0 && !!b[r - 1][c - 1]);
        var overR = (r - 1 >= 0 && c + 1 < COLS && !!b[r - 1][c + 1]);
        if (!(openAbove && (overL || overR))) continue;       // L字オーバーハングが無い
        // Tスロット成立
        score += 20.0;
        var depth = 1, rr = r + 1;
        while (rr < ROWS && !b[rr][c]
               && ((c === 0) || !!b[rr][c - 1]) && ((c === COLS - 1) || !!b[rr][c + 1])) { depth++; rr++; }
        if (depth >= 2) score += 10.0;
        if ((c >= 6 && c <= 8) || (c >= 1 && c <= 3)) score += 5.0;
        break; // この列は1スロットのみ
      }
    }
    return score;
  }

  /* ---- 評価関数: Dellacherie 6指標の合計 ＋ tSlotScore ----
     grid       : G.grid 形式(null/色) でも 2値配列でも可（消去後の盤面を渡す想定）
     placement  : 省略可。{ landingHeight, erodedCells } を渡すと着地高さ・消去貢献度も加味する。
                  （これら2指標は“どこに何を置いたか”に依存するため findBestMove から渡す。
                    evaluateBoard(grid) 単体呼び出し時は 0 として盤面のみ評価する。） */
  function evaluateBoard(grid, placement) {
    var b = toBinary(grid);
    var lh = (placement && placement.landingHeight) || 0;
    var er = (placement && placement.erodedCells) || 0;
    var s = 0;
    s += W.landingHeight * lh;
    s += W.erodedPieceCells * er;
    s += W.rowTransitions * rowTransitions(b);
    s += W.columnTransitions * columnTransitions(b);
    s += W.holes * holes(b);
    s += W.cumulativeWells * cumulativeWells(b);
    s += tSlotScore(b);
    return s;
  }

  // 2値盤面の満杯行を消去して詰める（評価用・非破壊で新配列を返す）
  function clearBinary(b) {
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS;
    var kept = [];
    for (var r = 0; r < ROWS; r++) {
      var full = true;
      for (var c = 0; c < COLS; c++) if (!b[r][c]) { full = false; break; }
      if (!full) kept.push(b[r].slice());
    }
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(0));
    return kept;
  }

  /* ---- 最善手探索 ----
     grid        : 現在の盤面(G.grid 形式)
     piece       : 現在のミノ letter ("T" など)
     rot         : 現在の回転(参考。探索は全回転を試すため未使用)
     heldPiece   : ホールド中ミノ(将来の先読み用に受けるが本実装では未使用)
     nextPieces  : ネクスト配列(同上・将来の多手読み用)
     戻り値      : { col, rot, score, cells } / 置けなければ null
                   col=ボックス左上列(px。app.js の G.active.px と同義) */
  function findBestMove(grid, piece, rot, heldPiece, nextPieces) {
    var E = window.TT; if (!E || !E.PIECES[piece]) return null;
    var d = dims(), ROWS = d.ROWS, COLS = d.COLS;
    var base = toBinary(grid);
    var best = null;

    for (var rr = 0; rr < 4; rr++) {
      for (var px = -2; px < COLS; px++) {
        var py = E.dropY(grid, piece, rr, px, -2);
        var cells = E.absCells(piece, rr, px, py);
        // 妥当性: 全セルが盤内(0<=c<COLS, 0<=r<ROWS)。上にはみ出す(r<0)=トップアウトは除外。
        var ok = true, minR = 999, maxR = -999, i, r, c;
        for (i = 0; i < 4; i++) {
          r = cells[i][0]; c = cells[i][1];
          if (c < 0 || c >= COLS || r >= ROWS || r < 0) { ok = false; break; }
          if (r < minR) minR = r; if (r > maxR) maxR = r;
        }
        if (!ok) continue;

        // 置いた盤面(2値)を作る
        var b = base.map(function (row) { return row.slice(); });
        for (i = 0; i < 4; i++) b[cells[i][0]][cells[i][1]] = 1;

        // 消去ライン数 と そのミノのうち消えたセル数(消去貢献度)
        var cleared = 0, pieceInCleared = 0;
        for (r = 0; r < ROWS; r++) {
          var full = true;
          for (c = 0; c < COLS; c++) if (!b[r][c]) { full = false; break; }
          if (full) {
            cleared++;
            for (i = 0; i < 4; i++) if (cells[i][0] === r) pieceInCleared++;
          }
        }
        var eroded = cleared * pieceInCleared;
        // 着地高さ = ミノ最下段の床からの段数（仕様「着地した行の高さ(下から)」）
        var landingHeight = ROWS - maxR;

        // 評価は「消去後の盤面」で行う（Dellacherie/El-Tetris 準拠）
        var after = cleared ? clearBinary(b) : b;
        var score = evaluateBoard(after, { landingHeight: landingHeight, erodedCells: eroded });

        if (!best || score > best.score) best = { col: px, rot: rr, score: score, cells: cells };
      }
    }
    return best;
  }

  return {
    findBestMove: findBestMove,
    evaluateBoard: evaluateBoard,
    tSlotScore: tSlotScore,
    // 補助(テスト/拡張用に公開・無害)
    _weights: W,
    _metrics: { toBinary: toBinary, columnHeights: columnHeights, rowTransitions: rowTransitions,
                columnTransitions: columnTransitions, holes: holes, cumulativeWells: cumulativeWells },
  };
})();

/* ============================================================
 *  コンソール簡易テスト（ブラウザのDevToolsにそのまま貼って実行可）
 * ------------------------------------------------------------
(function () {
  const E = window.TT, AI = window.TT_AI;
  console.log("TT_AI exists:", !!AI);

  // 1) 空盤面で各ミノの最善手
  let g = E.emptyGrid();
  ["T", "I", "O", "L", "J", "S", "Z"].forEach(p => {
    const m = AI.findBestMove(g, p, 0, null, []);
    console.log("best", p, "-> col", m.col, "rot", m.rot, "score", m.score.toFixed(2));
  });

  // 2) evaluateBoard が数値を返す（空盤面）
  console.log("eval(empty):", AI.evaluateBoard(E.emptyGrid()).toFixed(2));

  // 3) tSlotScore: 右寄り(col8)に深さ2のTスロットを作った盤面
  let g2 = E.emptyGrid();
  for (let r = 18; r <= 19; r++) for (let c = 0; c < 10; c++) g2[r][c] = "#777";
  g2[18][8] = null; g2[19][8] = null;   // col8 を2段の縦溝に
  g2[17][7] = "#777";                    // 片側オーバーハング(L字)
  console.log("tSlotScore(right slot):", AI.tSlotScore(g2));  // 期待: 20+10+5 = 35

  // 4) 7-bag を最善手で連続設置するシミュレーション
  let board = E.emptyGrid();
  ["L", "J", "S", "Z", "T", "I", "O"].forEach(p => {
    const m = AI.findBestMove(board, p, 0, null, []);
    if (!m) { console.log(p, "no move"); return; }
    for (const [r, c] of m.cells) if (r >= 0) board[r][c] = E.PIECES[p].color;
    board = E.clearLines(board).grid;
    console.log(p, "placed col", m.col, "rot", m.rot, "score", m.score.toFixed(1));
  });
  console.table(board.map(row => row.map(v => (v ? "■" : "・")).join("")));
})();
 * ============================================================ */
