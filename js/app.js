/* テトリス練習ツール 本体
   - モード: フリー / テンプレ練習 / 掘り(Dig)
   - 機能: SRS操作・ホールド・ゴースト・ハード/ソフトドロップ・ライン消去
           ヒント(目標位置表示)・一手戻す(Undo)・反復(リセット/オートリピート)
   依存: engine.js (TT), templates.js (TT_TEMPLATES) */
(function () {
  "use strict";

  const E = window.TT;
  const TPL = window.TT_TEMPLATES;
  const CAT = window.TT_CATALOG;
  const COLS = E.COLS, ROWS = E.ROWS;
  const CELL = 30;       // メイン盤のセルピクセル
  const MINI = 18;       // ホールド/ネクストのセルピクセル

  // ---- DOM ----
  const boardCv = document.getElementById("board");
  const holdCv = document.getElementById("hold");
  const nextCv = document.getElementById("next");
  const bctx = boardCv.getContext("2d");
  const hctx = holdCv.getContext("2d");
  const nctx = nextCv.getContext("2d");
  boardCv.width = COLS * CELL; boardCv.height = ROWS * CELL;

  const $ = function (id) { return document.getElementById(id); };
  const statLines = $("stat-lines"), statPieces = $("stat-pieces"), statPc = $("stat-pc");
  const statTspin = $("stat-tspin"), statCycle = $("stat-cycle");
  const hintBox = $("hint-text"), modeLabel = $("mode-label");

  // ---- 設定 ----
  const settings = {
    ghost: true,
    showHint: true,
    gravity: false,    // 練習向けに既定OFF（自由に置く）
    gravityMs: 800,
    autoRepeat: true,  // テンプレ完了時に自動で最初から
    das: 130,          // ms
    arr: 25,           // ms
    sound: true,       // 効果音(SE)
  };

  // ===== 効果音(SE)：Web Audioで合成（音源ファイル不要） =====
  const SND = { ctx: null, master: null };
  function sndInit() {
    if (SND.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      SND.ctx = new AC();
      SND.master = SND.ctx.createGain();
      SND.master.gain.value = 0.16;
      SND.master.connect(SND.ctx.destination);
    } catch (e) {}
  }
  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!SND.ctx) return;
    const t0 = SND.ctx.currentTime + (delay || 0);
    const o = SND.ctx.createOscillator(), g = SND.ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.4, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(SND.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function sfx(kind) {
    if (!settings.sound || !SND.ctx) return;
    if (SND.ctx.state === "suspended") { try { SND.ctx.resume(); } catch (e) {} }
    switch (kind) {
      case "move": tone(420, 0.03, "square", 0.22); break;
      case "rotate": tone(680, 0.045, "square", 0.28); break;
      case "drop": tone(300, 0.09, "sawtooth", 0.5, 90); break;
      case "hold": tone(540, 0.05, "triangle", 0.32); break;
      case "clear": tone(520, 0.12, "square", 0.42, 880); break;
      case "tetris": tone(440, 0.18, "square", 0.5, 990); tone(660, 0.18, "square", 0.32, 0, 0.02); break;
      case "tspin": tone(720, 0.16, "triangle", 0.5, 1200); break;
      case "pc": [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.14, "triangle", 0.42, 0, i * 0.09); }); break;
      case "perfect": tone(880, 0.1, "triangle", 0.45); tone(1320, 0.12, "triangle", 0.38, 0, 0.08); break;
      case "wrong": tone(170, 0.16, "sawtooth", 0.38, 110); break;
      case "over": [400, 320, 250, 180].forEach(function (f, i) { tone(f, 0.14, "sawtooth", 0.38, 0, i * 0.08); }); break;
    }
  }
  function clearSfx(spin, cleared, empty) {
    if (empty && cleared > 0) { sfx("pc"); return; }
    if (spin && spin !== "none") { sfx("tspin"); return; }
    if (cleared >= 4) sfx("tetris"); else if (cleared > 0) sfx("clear");
  }

  // ---- ゲーム状態 ----
  const G = {
    mode: "free",          // free | template | dig
    grid: E.emptyGrid(),
    active: null,          // {piece,rot,px,py}
    hold: null,
    canHold: true,
    bag: [],
    queue: [],             // 表示用ネクスト（letterの配列）
    history: [],           // Undo用スナップショット
    // 集計
    lines: 0, pieces: 0, pcs: 0, tspins: 0, cycles: 0,
    over: false,
    // 直前操作の追跡（T-spin判定用）
    lastRotation: false, lastKick: 0,
    lastClearLabel: "",
    // テンプレ
    template: null,
    buildSlot: null,       // 盤面エディタで保存先となるテンプレid
    stepIndex: 0,
    targetCells: null,     // 現在ステップの目標セル [[r,c]...]
    targetPlacement: null, // {rot, px, py}
    mistake: false,
    // gravity
    lastGravity: 0,
    // 暗記モード（収録セットアップ用）
    hintLevel: 1,          // 0=お手本 1=カラー目標 2=シルエット 3=チラ見3秒 4=暗記テスト(無表示)
    hintShownAt: 0,        // チラ見(L3)用：表示開始時刻(performance.now)
    attemptMistake: false, // 今回の試行で目標外へはみ出したか（習熟昇格の可否判定）
    drill: false,          // 弱点ドリル周回中か
    chain: null,           // はちみつ砲 通し練習(1→2→3) の状態 {on,stage,route}
  };

  // ===== テンプレ・レジストリ & 保存（localStorage） =====
  const LS_KEY = "tt_user_templates_v1";
  let userStore = loadUserStore();

  // ===== 暗記モードの習熟度（収録セットアップ形ごと） =====
  const MASTERY_KEY = "tt_setup_mastery_v1";
  const HINT_MAX = 4; // 0..4
  const HINT_NAMES = ["お手本", "カラー目標", "シルエット", "チラ見3秒", "暗記テスト"];
  let masteryStore = loadMastery();
  function loadMastery() { try { return JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function saveMastery() { try { localStorage.setItem(MASTERY_KEY, JSON.stringify(masteryStore)); } catch (e) {} }
  function masteryOf(id) {
    const m = masteryStore[id];
    return (m && typeof m === "object") ? m : { lvl: 0, streak: 0, clears: 0, mastered: false };
  }

  // 初期データ（主要セットアップ）をカタログにマージ：field(検証済み完成形)と推奨テト譜
  (function mergeCatalogData() {
    const D = window.TT_CATALOG_DATA;
    if (!D || !CAT) return;
    Object.keys(D).forEach(function (id) {
      const c = CAT.byId(id); if (!c) return;
      const d = D[id];
      if (d.field) c.field = d.field;       // 検証採用した完成形(スケルトン)
      if (d.fumen) c.recFumen = d.fumen;     // 推奨テト譜コード
      if (d.src) c.src = d.src;              // 出典名
    });
  })();
  function recFumenOf(id) {
    const D = window.TT_CATALOG_DATA;
    return (D && D[id] && D[id].fumen) ? D[id].fumen : null;
  }
  function loadUserStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveUserStore() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(userStore)); }
    catch (e) { flashHint("保存に失敗しました（localStorage不可の環境かも）。", true); }
  }
  // インポート検証: 行配列か / テンプレ1件の形が妥当か
  function isGrid(a) {
    return Array.isArray(a) && a.length > 0 && a.every(function (row) { return Array.isArray(row); });
  }
  function validUserEntry(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    if (v.fsteps !== undefined) {
      if (!Array.isArray(v.fsteps) || v.fsteps.length === 0) return false;
      const okSteps = v.fsteps.every(function (s) {
        return s && typeof s.piece === "string" && Array.isArray(s.cells) && isGrid(s.ctx);
      });
      if (!okSteps) return false;
      return isGrid(v.finalField);
    }
    if (v.field !== undefined) return isGrid(v.field);
    return false; // field も fsteps も無いエントリは受け付けない
  }
  // ===== 収録セットアップ（はちみつ砲ほか：fumen各ページ→完成形field群に展開） =====
  // 灰(#7a8290 / #9aa7b5 の2トーン)=前巡からの確定スタック。初期盤面としてプリフィルし、
  // 色付き(新規)ミノだけを置いてその形に到達する練習にする。色連結でミノ分解できる形には
  // 設置順ガイド(t.guide)を付与し「操作で覚える」誘導に使う。
  const SETUP_GRAYS = { "#7a8290": 1, "#9aa7b5": 1 }; // 2種の灰トーンとも確定スタック扱い
  const SETUP_GRAY = "#7a8290";                       // プリフィルで塗る代表色
  const FUMEN_TYPE_LETTER = { 1: "I", 2: "L", 3: "O", 4: "Z", 5: "T", 6: "J", 7: "S" };
  const COLOR_TO_PIECE = {}; ["I", "O", "T", "S", "Z", "J", "L"].forEach(function (L) { COLOR_TO_PIECE[E.PIECES[L].color] = L; });
  function setupPageBoard(page) {
    const b = window.TT_FUMEN.ffToBoard(page.field);
    // ロック操作付きページなら、その置きミノも完成形に含める（図解系は field のみで完結）
    if (page.lock && page.op && FUMEN_TYPE_LETTER[page.op.type]) {
      const col = (E.PIECES[FUMEN_TYPE_LETTER[page.op.type]] || {}).color || SETUP_GRAY;
      window.TT_FUMEN.opCells(page.op).forEach(function (rc) { if (b[rc[0]]) b[rc[0]][rc[1]] = col; });
    }
    return b;
  }
  // --- ミノ分解（同色4連結→テトロミノ）：設置順ガイド生成用 ---
  function tetroCandidates(L, set, must) {
    const res = [], states = E.PIECES[L].states;
    for (let s = 0; s < states.length; s++) {
      const st = states[s];
      for (let a = 0; a < st.length; a++) {
        const dr = must[0] - st[a][0], dc = must[1] - st[a][1];
        const abs = st.map(function (c) { return [c[0] + dr, c[1] + dc]; });
        if (abs.every(function (c) { return set.has(c[0] + "," + c[1]); })) res.push(abs);
      }
    }
    return res;
  }
  function splitTetros(comp, L) {
    if (comp.length % 4 !== 0) return null;
    const set = new Set(comp.map(function (c) { return c[0] + "," + c[1]; }));
    function rec() {
      if (set.size === 0) return [];
      const arr = []; set.forEach(function (s) { arr.push(s.split(",").map(Number)); });
      arr.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      const cands = tetroCandidates(L, set, arr[0]);
      for (let i = 0; i < cands.length; i++) {
        const g = cands[i]; g.forEach(function (c) { set.delete(c[0] + "," + c[1]); });
        const sub = rec(); if (sub) return [g].concat(sub);
        g.forEach(function (c) { set.add(c[0] + "," + c[1]); });
      }
      return null;
    }
    return rec();
  }
  function segmentPieces(board) {
    const vis = []; for (let i = 0; i < ROWS; i++) vis.push(new Array(COLS).fill(false));
    const pieces = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const col = board[r][c];
      if (col && !SETUP_GRAYS[col] && !vis[r][c]) {
        const L = COLOR_TO_PIECE[col]; if (!L) return null;
        const stk = [[r, c]], comp = [];
        while (stk.length) {
          const t = stk.pop(), y = t[0], x = t[1];
          if (y < 0 || y >= ROWS || x < 0 || x >= COLS || vis[y][x] || board[y][x] !== col) continue;
          vis[y][x] = true; comp.push([y, x]); stk.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);
        }
        const gs = splitTetros(comp, L); if (!gs) return null;
        gs.forEach(function (g) { pieces.push({ piece: L, cells: g }); });
      }
    }
    return pieces;
  }
  // 接地ドロップで置けるか（真上が空＝上から落とせ、下に支えがある＝そこで止まる）
  function dropPlaceable(occ, cells) {
    for (let i = 0; i < cells.length; i++) if (occ[cells[i][0]][cells[i][1]]) return false;
    const top = {};
    cells.forEach(function (k) { if (top[k[1]] === undefined || k[0] < top[k[1]]) top[k[1]] = k[0]; });
    for (const c in top) for (let r = 0; r < top[c]; r++) if (occ[r][+c]) return false;
    return restsPlaceable(occ, cells);
  }
  function restsPlaceable(occ, cells) {
    for (let i = 0; i < cells.length; i++) if (occ[cells[i][0]][cells[i][1]]) return false;
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i][0], cc = cells[i][1], nr = r + 1;
      if (nr >= ROWS) return true;
      if (occ[nr][cc] && !cells.some(function (k) { return k[0] === nr && k[1] === cc; })) return true;
    }
    return false;
  }
  // 接地ドロップ優先・スピン(ねじ込み)手はlastの設置順を算出。完成形を占有再現できなければnull。
  function buildGuide(pieces, prefill, targetBoard) {
    const base = []; for (let r = 0; r < ROWS; r++) base.push(new Array(COLS).fill(false));
    if (prefill) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (prefill[r][c]) base[r][c] = true;
    const N = pieces.length;
    // スピン手(ねじ込み)を最小化する順序を探索（土台はドロップ・スピンは必要最小限＝実技術に近い自然な手順）。
    // ドロップ可があればドロップのみ試し、無ければスピンを使う。spins最小の完成順を採用。
    let best = null, nodes = 0;
    function dfs(occ, used, ord, spins) {
      if (best && spins >= best.spins) return;       // これ以上は best を超えられない（枝刈り）
      if (nodes++ > 200000) return;
      if (ord.length === N) { best = { ord: ord.slice(), spins: spins }; return; }
      const drops = [], spinsArr = [];
      for (let i = 0; i < N; i++) {
        if (used[i]) continue;
        if (dropPlaceable(occ, pieces[i].cells)) drops.push(i);
        else if (restsPlaceable(occ, pieces[i].cells)) spinsArr.push(i);
      }
      const list = drops.length ? drops.map(function (i) { return [i, "drop"]; })
                                : spinsArr.map(function (i) { return [i, "spin"]; });
      for (let k = 0; k < list.length; k++) {
        const i = list[k][0], kind = list[k][1], p = pieces[i];
        p.cells.forEach(function (c) { occ[c[0]][c[1]] = true; }); used[i] = true;
        ord.push({ piece: p.piece, cells: p.cells, kind: kind });
        dfs(occ, used, ord, spins + (kind === "spin" ? 1 : 0));
        ord.pop(); used[i] = false; p.cells.forEach(function (c) { occ[c[0]][c[1]] = false; });
      }
    }
    dfs(base.map(function (r) { return r.slice(); }), new Array(N).fill(false), [], 0);
    if (!best) return null;
    // 再構成一致（占有）を確認
    const occ = base.map(function (r) { return r.slice(); });
    best.ord.forEach(function (s) { s.cells.forEach(function (c) { occ[c[0]][c[1]] = true; }); });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if ((targetBoard[r][c] ? 1 : 0) !== (occ[r][c] ? 1 : 0)) return null;
    }
    return best.ord;
  }
  // 色分解できない形向け：色付き占有を任意ミノで到達可能タイリングし設置順を得る。
  // distinctOnly=true で各ミノ種を1個までに制限（実バッグ相当の手順を優先）。
  function tilingGuide(board, prefill, distinctOnly) {
    const occ = []; for (let r = 0; r < ROWS; r++) occ.push(new Array(COLS).fill(false));
    if (prefill) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (prefill[r][c]) occ[r][c] = true;
    const tset = new Set();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] && !SETUP_GRAYS[board[r][c]]) tset.add(r + "," + c);
    const LK = ["I", "O", "T", "S", "Z", "J", "L"];
    function dropReach(cells) {
      const top = {}; cells.forEach(function (k) { if (top[k[1]] === undefined || k[0] < top[k[1]]) top[k[1]] = k[0]; });
      for (const c in top) for (let r = 0; r < top[c]; r++) if (occ[r][+c]) return false;
      return restsPlaceable(occ, cells);
    }
    const order = []; let steps = 0; const used = {};
    function solve(rem) {
      if (rem.size === 0) return true;
      if (steps++ > 60000) return false;
      const arr = []; rem.forEach(function (s) { arr.push(s.split(",").map(Number)); });
      arr.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
      const must = arr[0];
      for (let li = 0; li < 7; li++) {
        const L = LK[li];
        if (distinctOnly && used[L]) continue;
        const sts = E.PIECES[L].states;
        for (let s = 0; s < sts.length; s++) {
          const st = sts[s];
          for (let a = 0; a < st.length; a++) {
            const dr = must[0] - st[a][0], dc = must[1] - st[a][1];
            const abs = st.map(function (c) { return [c[0] + dr, c[1] + dc]; });
            if (!abs.every(function (c) { return rem.has(c[0] + "," + c[1]); })) continue;
            const dk = dropReach(abs); if (!dk && !restsPlaceable(occ, abs)) continue;
            abs.forEach(function (c) { rem.delete(c[0] + "," + c[1]); occ[c[0]][c[1]] = true; });
            used[L] = (used[L] || 0) + 1;
            order.push({ piece: L, cells: abs.map(function (c) { return [c[0], c[1]]; }), kind: dk ? "drop" : "spin" });
            if (solve(rem)) return true;
            order.pop(); used[L]--;
            abs.forEach(function (c) { rem.add(c[0] + "," + c[1]); occ[c[0]][c[1]] = false; });
          }
        }
      }
      return false;
    }
    return solve(new Set(tset)) ? order.slice() : null;
  }
  function expandSetups() {
    const out = [];
    if (!window.TT_FUMEN || !window.TT_SETUPS) return out;
    window.TT_SETUPS.forEach(function (su) {
      let n = 0;
      (su.sections || []).forEach(function (sec) {
        let pages;
        try { pages = window.TT_FUMEN.decodePages(sec.fumen); } catch (e) { return; }
        for (let i = 0; i < pages.length; i++) {
          const board = setupPageBoard(pages[i]);
          let colored = 0, gray = 0, lowest = -1, floatCols = 0;
          const prefill = E.emptyGrid();
          for (let c = 0; c < COLS; c++) {
            let lo = -1;
            for (let r = ROWS - 1; r >= 0; r--) { if (board[r][c]) { lo = r; break; } }
            if (lo >= 0 && lo < ROWS - 1) floatCols++; // この列の最下セルが床に接していない＝浮き列
          }
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const v = board[r][c];
            if (!v) continue;
            if (r > lowest) lowest = r;
            if (SETUP_GRAYS[v]) { gray++; prefill[r][c] = SETUP_GRAY; }
            else colored++;
          }
          if (colored === 0) continue;                          // 全て灰＝置くミノが無い参照図
          if (colored % 4 !== 0) continue;                      // 消去後の断片＝占有一致では完成不能
          if (!(lowest === ROWS - 1 && floatCols <= 1)) continue; // 床から浮いた差分フレーム図
          const label = (sec.labels && sec.labels[i]) || (su.name + " " + (n + 1));
          const pf = gray ? prefill : null;
          // 設置順ガイドを必ず用意：色分解(1個ずつ・清書色)優先→不可なら1個ずつタイリング→任意タイリング。
          // これを開始時に供給することで「来たミノで組めない」を解消し、必ず組める＋手順を学べる。
          let guide = null;
          const seg = segmentPieces(board);
          if (seg) guide = buildGuide(seg, pf, board);
          if (!guide) guide = tilingGuide(board, pf, true) || tilingGuide(board, pf, false);
          if (!guide) continue; // 到達可能な設置順が全く無い形は練習対象外（理論上ここには来ない想定）
          out.push({
            id: "su_" + su.key + "_" + n,
            name: label, group: su.name, type: "field",
            field: board, prefill: pf, setup: true, guide: guide,
            segPieces: seg || null, // 通し練習で毎回ランダムな有効順を生成するため分解ミノを保持
            desc: su.desc || "", src: su.src || "",
          });
          n++;
        }
      });
    });
    return out;
  }
  const SETUP_TEMPLATES = expandSetups();
  const SETUP_GROUPS = (window.TT_SETUPS || []).map(function (su) { return su.name; });
  function setupById(id) {
    for (let i = 0; i < SETUP_TEMPLATES.length; i++) if (SETUP_TEMPLATES[i].id === id) return SETUP_TEMPLATES[i];
    return null;
  }
  // 現在のテンプレに前巡スタック(prefill)があれば初期盤面へ配置（resetCommonの後に呼ぶ）
  function applyTemplatePrefill() {
    const t = G.template;
    if (!t || !t.prefill) return;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (t.prefill[r] && t.prefill[r][c]) G.grid[r][c] = t.prefill[r][c];
    }
  }
  // 収録セットアップ：その形を必ず組める「設置順ガイドのミノ列」をネクストに供給する。
  // （ランダムバッグだと組めるミノが来ず詰むため。spawnFromQueueの前に呼ぶ）
  function feedGuideBag() {
    const t = G.template;
    if (t && t.setup && t.guide && t.guide.length) { G.bag = t.guide.map(function (g) { return g.piece; }); G.queue = []; }
  }

  // ===== 暗記モード（ヒント漸減＋設置順ガイド＋習熟＋弱点ドリル） =====
  function clampHint(n) { return Math.max(0, Math.min(HINT_MAX, n | 0)); }
  function isSetup() { return G.mode === "template" && G.template && G.template.setup; }
  // 現在アクティブな「組み手順(P)」と判定情報（通し練習 or P判定付き単体練習で共通）
  function curTiling() {
    if (G.chain && G.chain.on && G.chain.tiling && G.chain.tiling.length) return G.chain.tiling;
    if (G.setupTiling && G.setupTiling.length) return G.setupTiling;
    return null;
  }
  function curPInfo() {
    if (G.chain && G.chain.on && G.chain.pInfo) return G.chain.pInfo;
    return G.setupPInfo || null;
  }
  // 設置順ガイドの「次に置くミノ」（まだ埋まっていない最初のガイド手）
  function guideNext() {
    const t = G.template; if (!t || !t.guide) return null;
    const tiling = curTiling();
    // 適応型(通し練習 or P判定付き単体)：今のアクティブミノがこの手順で入るスロットを案内
    if (tiling) {
      const a = G.active; if (!a) return null;
      for (let i = 0; i < tiling.length; i++) {
        const g = tiling[i];
        if (g.piece !== a.piece) continue;
        const filled = g.cells.every(function (c) { return G.grid[c[0]] && G.grid[c[0]][c[1]]; });
        if (!filled) return { idx: i, step: i + 1, total: tiling.length, piece: g.piece, cells: g.cells, kind: g.kind, adaptive: true };
      }
      return null; // 今のミノはこの手順では使わない → ホールド推奨
    }
    for (let i = 0; i < t.guide.length; i++) {
      const g = t.guide[i];
      const done = g.cells.every(function (c) { return G.grid[c[0]] && G.grid[c[0]][c[1]]; });
      if (!done) return { idx: i, step: i + 1, total: t.guide.length, piece: g.piece, cells: g.cells, kind: g.kind };
    }
    return null;
  }
  function setupHintText(t) {
    const m = masteryOf(t.id);
    const lv = "暗記Lv" + G.hintLevel + "「" + HINT_NAMES[G.hintLevel] + "」";
    const star = m.mastered ? " ★マスター済" : "";
    const base = t.prefill ? "灰=前巡の土台。色付きミノを置いてこの形に。" : "目標形を組み上げよう。";
    let guideStr;
    const _til = curTiling(), _pi = curPInfo();
    if (_til) {
      // 通し練習 or P判定付き単体練習：選んだ手順(P)と全体の組み順を“持続表示”＋今のミノの置き場
      const gn = guideNext();
      let pstr = "";
      if (_pi) {
        const order = _til.map(function (g) { return g.piece + (g.kind === "spin" ? "*" : ""); }).join("→");
        const cyc = (G.chain && G.chain.on) ? ("巡" + G.chain.stage + "/3・") : "";
        pstr = "［" + cyc + (_pi.total > 1 ? "手順P" + _pi.pNo + "(組める" + _pi.buildableCount + "/" + _pi.total + "通り)" : "手順1通り") + "］順:" + order + "(*=ねじ込み) ";
      }
      guideStr = " " + pstr + (gn ? "今のミノ:" + gn.piece + "→黄の位置へ" + (gn.kind === "spin" ? "(ねじ込み)" : "(置く)") : "（今のミノはこの手順で不要→ホールド推奨）");
    } else {
      const gn = t.guide ? guideNext() : null;
      guideStr = gn ? " 次:" + gn.piece + "ミノ(" + gn.step + "/" + gn.total + (gn.kind === "spin" ? "・ねじ込み" : "") + ")" : (t.guide ? "" : " ※形ビルド(手順ガイド無)");
    }
    return "【" + t.name + "】" + base + "  " + lv + star + guideStr;
  }
  function setHintLevel(lv) {
    if (!isSetup()) { flashHint("暗記レベルは収録セットアップ（★はちみつ砲）でのみ有効です。", true); return; }
    G.hintLevel = clampHint(lv);
    G.hintShownAt = (typeof performance !== "undefined" ? performance.now() : 0);
    updateMasteryUI();
    flashHint(setupHintText(G.template), false);
    render();
  }
  function nudgeHint(delta) { if (isSetup()) setHintLevel(G.hintLevel + delta); }
  // 形を1回組めたら習熟を更新（ミスが無ければ昇格＝ヒントを1段弱める。Lv4無ミスでマスター）
  function recordSetupClear(t) {
    const m = masteryOf(t.id); let justMastered = false;
    m.clears = (m.clears || 0) + 1;
    if (!G.attemptMistake) {
      m.streak = (m.streak || 0) + 1;
      if (G.hintLevel >= HINT_MAX) { if (!m.mastered) justMastered = true; m.mastered = true; m.lvl = HINT_MAX; }
      else { m.lvl = clampHint(G.hintLevel + 1); }
    } else { m.streak = 0; }
    masteryStore[t.id] = m; saveMastery();
    G.hintLevel = clampHint(m.lvl);
    G.hintShownAt = (typeof performance !== "undefined" ? performance.now() : 0);
    G.attemptMistake = false;
    updateMasteryUI();
    return justMastered;
  }
  // 弱点（未マスターでLvが低い・クリア少）の形を1つ選ぶ
  function weakestSetup() {
    let best = null;
    SETUP_TEMPLATES.forEach(function (t) {
      const m = masteryOf(t.id);
      if (m.mastered) return;
      const score = (m.lvl || 0) * 1000 + (m.clears || 0);
      if (!best || score < best.score) best = { t: t, score: score };
    });
    return best ? best.t : null;
  }
  function startDrill() {
    const t = weakestSetup();
    if (!t) { flashHint("全ての収録セットアップをマスター済みです！🎉 おめでとうございます。", false); return; }
    startTemplate(t.id);
    G.drill = true; // startTemplate内でfalse化されるので後設定
    flashHint("【弱点ドリル】" + setupHintText(t) + "（マスターで次の弱点へ自動移行）", false);
  }
  function masterySummary() {
    let mastered = 0; const total = SETUP_TEMPLATES.length;
    SETUP_TEMPLATES.forEach(function (t) { if (masteryOf(t.id).mastered) mastered++; });
    return { mastered: mastered, total: total };
  }
  function updateMasteryUI() {
    const el = $("mem-summary");
    if (el) { const s = masterySummary(); el.textContent = "マスター " + s.mastered + " / " + s.total + " 形"; }
    const lvEl = $("mem-level");
    if (lvEl) lvEl.textContent = isSetup() ? ("Lv" + G.hintLevel + " " + HINT_NAMES[G.hintLevel]) : "—";
  }

  // ===== はちみつ砲 通し練習（1巡目→2巡目→3巡目・2巡目はソルバーで理想/妥協を自動判定） =====
  let pendingChainBag = null; // 次に開始する形へ供給するバッグ（巡ごとに固定し判定とミノを一致させる）
  function setupByName(sub) {
    for (let i = 0; i < SETUP_TEMPLATES.length; i++) if (SETUP_TEMPLATES[i].name.indexOf(sub) >= 0) return SETUP_TEMPLATES[i];
    return null;
  }
  // 2巡目「理想形(基本形② TST設置)」のソルバー用データを事前計算
  const IDEAL2 = (function () {
    const t = setupByName("基本形② 2巡目TST");
    if (!t || !t.field) return null;
    const TCOL = E.PIECES.T.color;
    const base = []; for (let i = 0; i < ROWS; i++) base.push(new Array(COLS).fill(false));
    const setup = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = t.field[r][c]; if (!v) continue;
      if (v === TCOL) continue;                       // Tは最後のTST用に予約（土台には含めない）
      if (SETUP_GRAYS[v] || v === SETUP_GRAY) base[r][c] = true; // 前巡の確定スタック
      else setup.push([r, c]);                        // 6ミノで埋める土台セル
    }
    const idxOf = {}; setup.forEach(function (rc, i) { idxOf[rc[0] + "," + rc[1]] = i; });
    const tset = new Set(setup.map(function (rc) { return rc[0] + "," + rc[1]; }));
    const NONT = ["I", "O", "S", "Z", "J", "L"], placements = {};
    NONT.forEach(function (L) {
      const list = [], seen = new Set();
      E.PIECES[L].states.forEach(function (st) {
        for (let dr = -2; dr < ROWS + 2; dr++) for (let dc = -2; dc < COLS + 2; dc++) {
          const abs = st.map(function (cc) { return [cc[0] + dr, cc[1] + dc]; });
          if (abs.every(function (cc) { return tset.has(cc[0] + "," + cc[1]); })) {
            const key = abs.map(function (cc) { return cc[0] + "," + cc[1]; }).sort().join("|");
            if (!seen.has(key)) { seen.add(key); list.push(abs); }
          }
        }
      });
      placements[L] = list;
    });
    return { base: base, setup: setup, idxOf: idxOf, FULL: setup.length, placements: placements };
  })();
  function chainRests(occ, cells) {
    for (let i = 0; i < cells.length; i++) if (occ[cells[i][0]][cells[i][1]]) return false;
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i][0], cc = cells[i][1], nr = r + 1;
      if (nr >= ROWS) return true;
      if (occ[nr][cc] && !cells.some(function (k) { return k[0] === nr && k[1] === cc; })) return true;
    }
    return false;
  }
  // 実バッグ＋ホールド1＋T予約 で 2巡目理想形TST土台を組めるか（理想優先の自動判定の核）
  function canBuildIdeal(bag) {
    if (!IDEAL2) return true; // データ不備時は理想優先
    const P = IDEAL2.placements, idxOf = IDEAL2.idxOf, FULL = IDEAL2.FULL;
    const occ0 = IDEAL2.base.map(function (r) { return r.slice(); });
    let nodes = 0; const memo = new Set();
    function dfs(q, hold, occ, mask, count) {
      if (count === FULL) return true;
      if (nodes++ > 200000) return false;
      const key = q.join("") + "|" + (hold || "-") + "|" + mask;
      if (memo.has(key)) return false; memo.add(key);
      function place(piece, nextQ, nextHold) {
        const pls = P[piece] || [];
        for (let i = 0; i < pls.length; i++) {
          const cells = pls[i]; let ok = true;
          for (let k = 0; k < 4; k++) if (occ[cells[k][0]][cells[k][1]]) { ok = false; break; }
          if (!ok || !chainRests(occ, cells)) continue;
          for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = true;
          let m2 = mask; for (let k = 0; k < 4; k++) m2 |= (1 << idxOf[cells[k][0] + "," + cells[k][1]]);
          if (dfs(nextQ, nextHold, occ, m2, count + 4)) return true;
          for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = false;
        }
        return false;
      }
      if (!q.length) { if (hold && hold !== "T") return place(hold, [], null); return false; }
      const cur = q[0];
      if (cur === "T") { // Tは予約（ホールドへ）。ホールド済みなら旧holdを現在へ。
        if (hold === null) { if (dfs(q.slice(1), "T", occ, mask, count)) return true; }
        else if (hold !== "T") { if (dfs([hold].concat(q.slice(1)), "T", occ, mask, count)) return true; }
        return false;
      }
      if (place(cur, q.slice(1), hold)) return true;        // 現在ミノを置く
      if (hold === null) { if (dfs(q.slice(1), cur, occ, mask, count)) return true; }   // バッファ
      else if (hold !== "T" && hold !== cur) { if (dfs([hold].concat(q.slice(1)), cur, occ, mask, count)) return true; }
      return false;
    }
    return dfs(bag.slice(), null, occ0, 0, 0);
  }
  // --- 2巡目パターン(理想P1-P5/妥協)の各判定＋動的テンプレ生成 ---
  let dynTemplate = null; // 通し練習で選ばれたパターンの一時テンプレ
  // バッグでこのパターン(固定スロット)を組めるか：到達可能な任意順・ホールド1・T予約(最後)
  function canBuildPattern(bag, pat) {
    const pc = {}; pat.steps.forEach(function (s) { pc[s.p] = s.c; });
    const occ = []; for (let r = 0; r < ROWS; r++) occ.push(new Array(COLS).fill(false));
    pat.base.forEach(function (c) { occ[c[0]][c[1]] = true; });
    const memo = new Set(); let nodes = 0;
    function canRest(cells) {
      for (let i = 0; i < 4; i++) if (occ[cells[i][0]][cells[i][1]]) return false;
      for (let i = 0; i < 4; i++) { const r = cells[i][0], c = cells[i][1], nr = r + 1; if (nr >= ROWS) return true; if (occ[nr][c] && !cells.some(function (k) { return k[0] === nr && k[1] === c; })) return true; }
      return false;
    }
    function dfs(q, hold, placed) {
      if (placed.size === 6) return true;       // 非T6個を置けたら成功（Tは最後のTSTで予約）
      if (nodes++ > 80000) return false;
      const key = q.join("") + "|" + (hold || "-") + "|" + Array.from(placed).sort().join("");
      if (memo.has(key)) return false; memo.add(key);
      if (hold && hold !== "T" && !placed.has(hold) && pc[hold] && canRest(pc[hold])) {
        const cells = pc[hold]; for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = true; placed.add(hold);
        if (dfs(q, null, placed)) return true;
        placed.delete(hold); for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = false;
      }
      if (q.length) {
        const cur = q[0], rest = q.slice(1);
        if (cur === "T") {
          if (hold === null) { if (dfs(rest, "T", placed)) return true; }
          else if (hold !== "T") { if (dfs([hold].concat(rest), "T", placed)) return true; }
        } else {
          if (!placed.has(cur) && pc[cur] && canRest(pc[cur])) {
            const cells = pc[cur]; for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = true; placed.add(cur);
            if (dfs(rest, hold, placed)) return true;
            placed.delete(cur); for (let k = 0; k < 4; k++) occ[cells[k][0]][cells[k][1]] = false;
          }
          if (hold === null) { if (dfs(rest, cur, placed)) return true; }
          else if (hold !== "T" && hold !== cur) { if (dfs([hold].concat(rest), cur, placed)) return true; }
        }
      }
      return false;
    }
    try { return dfs(bag.slice(), null, new Set()); } catch (e) { return false; }
  }
  // パターン → 動的テンプレ(field占有・prefill土台・設置順guide)
  function patternToTemplate(pat, route) {
    const field = E.emptyGrid(), prefill = E.emptyGrid();
    pat.base.forEach(function (c) { field[c[0]][c[1]] = SETUP_GRAY; prefill[c[0]][c[1]] = SETUP_GRAY; });
    const guide = pat.steps.map(function (s) {
      s.c.forEach(function (c) { field[c[0]][c[1]] = (E.PIECES[s.p] || {}).color || SETUP_GRAY; });
      return { piece: s.p, cells: s.c.map(function (c) { return [c[0], c[1]]; }), kind: s.spin ? "spin" : "drop" };
    });
    const jp = (route === "ideal") ? "理想形" : "妥協形";
    return { id: "hc_" + route + "_" + pat.key, name: "2巡目 " + jp + pat.key, group: "はちみつ砲", type: "field", field: field, prefill: prefill, setup: true, guide: guide, desc: "" };
  }
  // バッグで組める理想P（無ければ妥協）を選ぶ。複数組めればランダム。
  function pickChainPattern(bag) {
    const P = window.TT_HC_PATTERNS; if (!P) return null;
    const okI = (P.ideal || []).filter(function (pat) { return canBuildPattern(bag, pat); });
    if (okI.length) return { route: "ideal", pat: okI[Math.floor(Math.random() * okI.length)], n: okI.length };
    const okC = (P.compromise || []).filter(function (pat) { return canBuildPattern(bag, pat); });
    if (okC.length) return { route: "compromise", pat: okC[Math.floor(Math.random() * okC.length)], n: okC.length };
    if (P.compromise && P.compromise.length) return { route: "compromise", pat: P.compromise[0], n: 0, hard: true };
    return null;
  }
  // 通し練習＝「連続した1本の線」を盤面持ち越しでプレイ。各巡の完成でライン消去を反映：
  // ①1巡目=土台(消去なし) ②2巡目=TSTで3ライン消去 ③3巡目=TSD+全消去=パーフェクトクリア。
  // 基本形①結果==基本形②土台、基本形②消去後==パフェ基準形土台 を検証済み（連続して繋がる）。
  const CHAIN_STEPS = [
    { name: "基本形① 1巡目", head: "①1巡目：土台を組む（ライン消去なし）" },
    { name: "基本形② 2巡目TST", head: "②2巡目：TSTで3ライン消去！" },
    { name: "3巡目 パフェ基準形", head: "③3巡目：TSD＋全消去でパーフェクトクリア！" },
  ];
  // 通し練習：毎回ランダムな「必ず組める設置順」を生成（同じミノ順ばかりにならないように）。
  function randomValidOrder(pieces, prefill) {
    const base = []; for (let r = 0; r < ROWS; r++) base.push(new Array(COLS).fill(false));
    if (prefill) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (prefill[r][c]) base[r][c] = true;
    const N = pieces.length; let result = null, nodes = 0;
    function shuf(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function dfs(occ, used, ord) {
      if (result || nodes++ > 50000) return;
      if (ord.length === N) { result = ord.slice(); return; }
      const drops = [], spins = [];
      for (let i = 0; i < N; i++) { if (used[i]) continue; if (dropPlaceable(occ, pieces[i].cells)) drops.push(i); else if (restsPlaceable(occ, pieces[i].cells)) spins.push(i); }
      const useSpin = drops.length === 0;
      const list = shuf(useSpin ? spins : drops);
      for (let k = 0; k < list.length; k++) {
        const i = list[k], p = pieces[i];
        p.cells.forEach(function (c) { occ[c[0]][c[1]] = true; }); used[i] = true;
        ord.push({ piece: p.piece, cells: p.cells, kind: useSpin ? "spin" : "drop" });
        dfs(occ, used, ord);
        if (result) return;
        ord.pop(); used[i] = false; p.cells.forEach(function (c) { occ[c[0]][c[1]] = false; });
      }
    }
    dfs(base.map(function (r) { return r.slice(); }), new Array(N).fill(false), []);
    return result;
  }
  function randomChainOrder(t) {
    if (t && t.segPieces) { const o = randomValidOrder(t.segPieces, t.prefill); if (o) return o; }
    const g = (t.guide || []).slice(); // フォールバック：ガイドをシャッフル
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = g[i]; g[i] = g[j]; g[j] = tmp; }
    return g;
  }
  // ===== 通し練習の「組み手順(P)」判定 =====
  // 形(color占有)を「7種1個ずつ」で組む有効な手順を全列挙＝本物のP1..Pn（最下セルを覆うcover-lowest法）。
  function hcEnumTilings(board, prefill) {
    const reg = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] && !SETUP_GRAYS[board[r][c]]) reg.push([r, c]);
    const N = reg.length / 4; if (N < 1 || N % 1 !== 0) return [];
    const regSet = new Set(reg.map(function (p) { return p[0] + "," + p[1]; }));
    const occ = []; for (let r = 0; r < ROWS; r++) occ.push(new Array(COLS).fill(false));
    if (prefill) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (prefill[r][c]) occ[r][c] = true;
    const LK = ["I", "O", "T", "S", "Z", "J", "L"];
    const PL = {};
    LK.forEach(function (L) {
      const out = [], seen = {}, sts = E.PIECES[L].states;
      for (let r = 0; r < ROWS; r++) for (let c = -2; c < COLS; c++) for (let s = 0; s < sts.length; s++) {
        const st = sts[s], cs = []; let ok = true;
        for (let a = 0; a < st.length; a++) { const rr = st[a][0] + r, cc = st[a][1] + c; if (!regSet.has(rr + "," + cc)) { ok = false; break; } cs.push([rr, cc]); }
        if (ok && cs.length === 4) { const k = cs.map(function (x) { return x[0] + "," + x[1]; }).sort().join("|"); if (!seen[k]) { seen[k] = 1; out.push(cs); } }
      }
      PL[L] = out;
    });
    const tilings = [], sigSeen = {}; let nodes = 0; const used = {};
    function lowest() { let bR = -1, bC = 99; for (let i = 0; i < reg.length; i++) { const p = reg[i]; if (!occ[p[0]][p[1]]) { if (p[0] > bR || (p[0] === bR && p[1] < bC)) { bR = p[0]; bC = p[1]; } } } return bR < 0 ? null : [bR, bC]; }
    function dfs(pl, acc) {
      if (nodes++ > 200000 || tilings.length >= 16) return;
      if (pl === N) { const sig = acc.map(function (g) { return g.piece + g.cells.map(function (c) { return c[0] + "," + c[1]; }).sort().join("|"); }).sort().join(";"); if (!sigSeen[sig]) { sigSeen[sig] = 1; tilings.push(acc.slice()); } return; }
      const L = lowest(); if (!L) return;
      for (const t in PL) {
        if (used[t]) continue;
        const pls = PL[t];
        for (let k = 0; k < pls.length; k++) {
          const cs = pls[k]; let cov = false; for (let x = 0; x < 4; x++) if (cs[x][0] === L[0] && cs[x][1] === L[1]) { cov = true; break; }
          if (!cov) continue;
          const dk = dropPlaceable(occ, cs); if (!dk && !restsPlaceable(occ, cs)) continue;
          used[t] = true; for (let x = 0; x < 4; x++) occ[cs[x][0]][cs[x][1]] = true;
          acc.push({ piece: t, cells: cs.map(function (c) { return [c[0], c[1]]; }), kind: dk ? "drop" : "spin" });
          dfs(pl + 1, acc);
          acc.pop(); used[t] = false; for (let x = 0; x < 4; x++) occ[cs[x][0]][cs[x][1]] = false;
        }
      }
    }
    dfs(0, []);
    return tilings;
  }
  // ある手順(tiling)を「来るバッグ(到着順)＋ホールド1」で組めるか（各ミノを所定位置にドロップ/ねじ込みで置けるか）。
  function hcTilingBuildable(tiling, prefill, bag) {
    const occ = []; for (let r = 0; r < ROWS; r++) occ.push(new Array(COLS).fill(false));
    if (prefill) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (prefill[r][c]) occ[r][c] = true;
    const pos = {}; tiling.forEach(function (s) { pos[s.piece] = s.cells; });
    const N = tiling.length; let nodes = 0;
    function dfs(ptr, held, placed) {
      if (nodes++ > 30000) return false;
      if (placed.size === N) return true;
      const av = []; if (ptr < bag.length) av.push([bag[ptr], "a"]); if (held) av.push([held, "h"]);
      for (let ai = 0; ai < av.length; ai++) {
        const p = av[ai][0], src = av[ai][1]; if (placed.has(p)) continue;
        const cs = pos[p]; if (!cs) continue;
        if (!dropPlaceable(occ, cs) && !restsPlaceable(occ, cs)) continue;
        for (let x = 0; x < 4; x++) occ[cs[x][0]][cs[x][1]] = true; placed.add(p);
        const ok = dfs(src === "a" ? ptr + 1 : ptr, src === "a" ? held : null, placed);
        placed.delete(p); for (let x = 0; x < 4; x++) occ[cs[x][0]][cs[x][1]] = false;
        if (ok) return true;
      }
      if (!held && ptr < bag.length) { if (dfs(ptr + 1, bag[ptr], placed)) return true; }
      return false;
    }
    return dfs(0, null, new Set());
  }
  // この巡の形を、今のバッグで成立する手順(P)の中からランダムに1つ選ぶ（＝自動判定）。判定情報はG.hcAnalysisに保存（デバッグUI用）。
  function pickCycleTiling(t, bag) {
    G.hcAnalysis = null;
    if (!t || !t.field) { G.hcAnalysis = { total: 0, reachable: [], reasons: {}, fail: "NO_OPERATION_DATA", bag: (bag || []).slice() }; return null; }
    if (t.status && t.status !== "valid") { G.hcAnalysis = { total: 0, reachable: [], reasons: {}, fail: "INVALID_PATTERN(" + (t.invalidReason || "") + ")", bag: (bag || []).slice() }; return null; } // 無効/未検証は候補にしない

    const tilings = hcEnumTilings(t.field, t.prefill);
    if (!tilings.length) { G.hcAnalysis = { total: 0, reachable: [], reasons: {}, fail: "NO_OPERATION_DATA", bag: (bag || []).slice() }; return null; }
    const buildable = [], reasons = {};
    for (let i = 0; i < tilings.length; i++) {
      if (hcTilingBuildable(tilings[i], t.prefill, bag)) buildable.push(i);
      else reasons[i] = "PIECE_ORDER_IMPOSSIBLE";
    }
    G.hcAnalysis = { total: tilings.length, reachable: buildable.slice(), reasons: reasons, tilings: tilings, bag: (bag || []).slice() };
    if (!buildable.length) { G.hcAnalysis.fail = "PIECE_ORDER_IMPOSSIBLE"; return null; }
    const pickIdx = buildable[Math.floor(Math.random() * buildable.length)];
    G.hcAnalysis.picked = pickIdx;
    return { tiling: tilings[pickIdx], pNo: pickIdx + 1, total: tilings.length, buildableCount: buildable.length, pickIdx: pickIdx };
  }
  // 判定デバッグUI更新（仕様のデバッグ表示：phase/現在ミノ/ホールド/NEXT/組める手順P/除外理由）
  function updateHcDebug() {
    const el = $("hc-debug-body"); if (!el) return;
    const t = G.template;
    if (!(t && t.setup)) { el.textContent = "（はちみつ砲の通し練習／単体練習を始めると、組める手順Pの自動判定が表示されます）"; return; }
    const an = G.hcAnalysis;
    const phase = (G.chain && G.chain.on) ? ("通し " + G.chain.stage + "/3") : "単体";
    const next5 = (G.queue || []).slice(0, 5).join(" ");
    const L = [];
    L.push("phase: " + phase + " ／ 形: " + t.name + "  [status:" + (t.status || "?") + (t.source ? "/" + t.source : "") + "]");
    L.push("現在ミノ: " + (G.active ? G.active.piece : "-") + "  ホールド: " + (G.hold || "-") + "  NEXT5: " + next5);
    if (t.status && t.status !== "valid") {
      L.push("⚠ " + (t.status === "invalid" ? "無効" : "未検証") + "パターン：練習候補外（背景ガイド・判定なし）");
      if (t.invalidReason) L.push("理由: " + t.invalidReason);
    } else if (an) {
      L.push("組み手順(P)総数: " + an.total + "  組める: " + an.reachable.length + "  [" + an.reachable.map(function (i) { return "P" + (i + 1); }).join(",") + "]");
      const pinfo = curPInfo();
      L.push("選択中: " + (pinfo ? ("P" + pinfo.pNo) : (curTiling() ? "ガイド順(フォールバック)" : (an.fail || "なし"))));
      const ex = Object.keys(an.reasons || {});
      if (ex.length) L.push("除外: " + ex.map(function (i) { return "P" + (+i + 1) + "=" + an.reasons[i]; }).join("  "));
    } else {
      L.push("（判定待ち：ミノが配られると判定します）");
    }
    el.textContent = L.join("\n");
  }
  // ===== Pattern DB 検証・管理（status / 有効性 / 無効理由 / 手動登録 / 検証レポート） =====
  // ミノ形状テーブル（4セル→ミノ種）
  const TT_PIECE_SHAPES = (function () {
    const m = {};
    ["I", "O", "T", "S", "Z", "J", "L"].forEach(function (L) {
      E.PIECES[L].states.forEach(function (st) {
        const mr = Math.min.apply(null, st.map(function (c) { return c[0]; })), mc = Math.min.apply(null, st.map(function (c) { return c[1]; }));
        const k = st.map(function (c) { return [c[0] - mr, c[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (c) { return c[0] + "," + c[1]; }).join("|");
        m[k] = L;
      });
    });
    return m;
  })();
  function tetroTypeOf(cells) {
    if (cells.length !== 4) return null;
    const mr = Math.min.apply(null, cells.map(function (c) { return c[0]; })), mc = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    const k = cells.map(function (c) { return [c[0] - mr, c[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (c) { return c[0] + "," + c[1]; }).join("|");
    return TT_PIECE_SHAPES[k] || null;
  }
  function patternCategory(name) {
    if (/理想/.test(name)) return "ideal";
    if (/妥協/.test(name)) return "compromise";
    if (/パフェ|PC|パーフェクト/.test(name)) return "pc";
    if (/REN|連続/.test(name)) return "ren";
    if (/ドネイト|donate/i.test(name)) return "donate";
    return "base";
  }
  function patternMirror(name) { return /反転|右/.test(name); }
  function patternPhase(name) {
    if (/1巡目|基本形①/.test(name)) return 1;
    if (/2巡目|基本形②|理想|妥協形\s*2/.test(name)) return 2;
    if (/3巡目|パフェ|ドネイト|REN|火力|基本形③/.test(name)) return 3;
    return 0;
  }
  function coloredCellsOf(field) {
    const a = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const v = field[r][c]; if (v && !SETUP_GRAYS[v]) a.push([r, c]); }
    return a;
  }
  // 同色4連結群ごとに「その色のミノ型として妥当か」を検証（無効の原因＝Tが実はJ形、等を特定）
  function analyzeFieldPieces(field) {
    const vis = []; for (let i = 0; i < ROWS; i++) vis.push(new Array(COLS).fill(false));
    const groups = [], bad = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const col = field[r][c];
      if (!col || SETUP_GRAYS[col] || vis[r][c]) continue;
      const expected = COLOR_TO_PIECE[col] || "?";
      const stk = [[r, c]], comp = [];
      while (stk.length) {
        const t = stk.pop(), y = t[0], x = t[1];
        if (y < 0 || y >= ROWS || x < 0 || x >= COLS || vis[y][x] || field[y][x] !== col) continue;
        vis[y][x] = true; comp.push([y, x]); stk.push([y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]);
      }
      const actual = tetroTypeOf(comp);
      const g = { expected: expected, actual: actual, size: comp.length, cells: comp.map(function (p) { return [p[0], p[1]]; }) };
      groups.push(g);
      if (!(comp.length === 4 && actual === expected)) bad.push(g);
    }
    return { groups: groups, bad: bad };
  }
  // タイリングが占有を過不足なく7種1個ずつで再現するか
  function tilingReconstructs(til, occSet) {
    const cells = new Set(); const types = {};
    til.forEach(function (g) { g.cells.forEach(function (c) { cells.add(c[0] + "," + c[1]); }); types[g.piece] = (types[g.piece] || 0) + 1; });
    if (Object.keys(types).some(function (k) { return types[k] > 1; })) return false;
    if (cells.size !== occSet.size) return false;
    let all = true; occSet.forEach(function (k) { if (!cells.has(k)) all = false; }); return all;
  }
  // 1パターンの検証 → status/invalidReason/各種メタを返す
  function validateSetup(t) {
    const info = { id: t.id, name: t.name, phase: patternPhase(t.name), category: patternCategory(t.name), mirror: patternMirror(t.name), source: t.source || "fumen", sourceFumen: t.src || "" };
    if (t.statusOverride) { info.status = t.statusOverride; info.invalidReason = t.invalidReason || ""; info.verifiedAt = t.verifiedAt || ""; return info; }
    if (!t.field) { info.status = "unverified"; info.invalidReason = "盤面データなし"; return info; }
    const occ = coloredCellsOf(t.field); info.cells = occ.length; info.pieces = occ.length / 4;
    const occSet = new Set(occ.map(function (c) { return c[0] + "," + c[1]; }));
    if (occ.length === 0) { info.status = "unverified"; info.invalidReason = "色ミノなし（参照図）"; return info; }
    if (occ.length % 4 !== 0) { info.status = "invalid"; info.invalidReason = "色セル数が4の倍数でない(" + occ.length + "セル＝消去後の断片の可能性)"; return info; }
    const ap = analyzeFieldPieces(t.field);
    info.badPieces = ap.bad.map(function (b) { return { expected: b.expected, actual: b.actual, size: b.size, cells: b.cells.map(function (c) { return c[0] + "," + c[1]; }) }; });
    const tilings = hcEnumTilings(t.field, t.prefill); info.totalTilings = tilings.length;
    let vt = 0; tilings.forEach(function (til) { if (tilingReconstructs(til, occSet)) vt++; }); info.validTilings = vt;
    // 有効性の最優先判定: 占有が7種1個ずつで組めるか（実機ガイドはタイリングを使うため、fumen色の不整合は問題にならない）
    if (vt >= 1) { info.status = "valid"; return info; }
    // 無効: 理由を特定（fumen色の不正ミノがあればそれを、無ければ占有不整合）
    info.status = "invalid";
    if (ap.bad.length) {
      const b = ap.bad[0];
      info.invalidReason = "ミノ" + b.expected + "が" + b.expected + "形でない（実形=" + (b.actual || ("不明/" + b.size + "セル")) + "、セル " + b.cells.map(function (c) { return "(" + c[0] + "," + c[1] + ")"; }).join("") + "）";
    } else {
      info.invalidReason = "7種1個ずつで組める手順が存在しない（占有が不整合）";
    }
    return info;
  }
  // 手動座標パターン（source:"manual"）→ テンプレ化（fumen URL不要）。
  function manualToTemplate(m) {
    const field = E.emptyGrid();
    const prefill = (m.prefill && m.prefill.length) ? E.emptyGrid() : null;
    if (m.prefill) m.prefill.forEach(function (c) { field[c[0]][c[1]] = SETUP_GRAY; if (prefill) prefill[c[0]][c[1]] = SETUP_GRAY; });
    const guide = [];
    (m.pieces || []).forEach(function (p) {
      const col = (E.PIECES[p.type] || {}).color || SETUP_GRAY;
      p.cells.forEach(function (c) { field[c[0]][c[1]] = col; });
      guide.push({ piece: p.type, cells: p.cells.map(function (c) { return [c[0], c[1]]; }), kind: p.spin ? "spin" : "drop" });
    });
    return {
      id: m.id, name: m.name, group: "はちみつ砲(手動)", type: "field", field: field, prefill: prefill,
      setup: true, guide: guide, segPieces: (m.pieces || []).map(function (p) { return { piece: p.type, cells: p.cells }; }),
      source: "manual", statusOverride: m.status, invalidReason: m.invalidReason, verifiedAt: m.verifiedAt, desc: m.desc || "手動登録パターン", src: ""
    };
  }
  function registerManualPatterns() {
    const list = window.TT_MANUAL_PATTERNS;
    if (!Array.isArray(list)) return 0;
    let n = 0;
    list.forEach(function (m) {
      if (!m || !m.id || setupById(m.id)) return; // 重複idはスキップ
      const t = manualToTemplate(m);
      const v = validateSetup(t);
      t.status = v.status; t.invalidReason = t.invalidReason || v.invalidReason || ""; t.category = v.category; t.mirror = v.mirror; t.phase = v.phase; t.validation = v;
      SETUP_TEMPLATES.push(t); n++;
    });
    return n;
  }
  // 全パターン検証 → メタ付与（status/invalidReason/category/mirror/phase）。練習候補のvalidフィルタに使用。
  function validateAllSetups() {
    registerManualPatterns();
    SETUP_TEMPLATES.forEach(function (t) {
      const v = validateSetup(t);
      t.status = v.status; t.invalidReason = v.invalidReason || ""; t.category = v.category; t.mirror = v.mirror; t.phase = v.phase; t.source = v.source; t.validation = v;
    });
  }
  validateAllSetups();
  // 検証レポート（開発者確認用）：全パターンの有効性一覧
  function buildValidationReport() {
    return SETUP_TEMPLATES.map(function (t) {
      const v = t.validation || validateSetup(t);
      return {
        patternId: t.id, name: t.name, phase: v.phase, category: v.category, mirror: v.mirror, source: v.source,
        status: v.status, total手順: v.totalTilings != null ? v.totalTilings : "-", 有効手順: v.validTilings != null ? v.validTilings : "-",
        色セル数: v.cells != null ? v.cells : "-", ミノ数: v.pieces != null ? v.pieces : "-",
        不正ミノ: (v.badPieces && v.badPieces.length) ? v.badPieces.map(function (b) { return b.expected + "→" + (b.actual || "?") + "(" + b.cells.join(" ") + ")"; }).join(" / ") : "-",
        invalidReason: v.invalidReason || ""
      };
    });
  }
  function showValidationReport() {
    const rep = buildValidationReport();
    try { console.log("=== はちみつ砲 Pattern検証レポート ===", JSON.parse(JSON.stringify(rep))); } catch (e) {}
    const el = $("hc-debug-body");
    if (el) {
      const cnt = { valid: 0, invalid: 0, unverified: 0 };
      rep.forEach(function (r) { cnt[r.status] = (cnt[r.status] || 0) + 1; });
      const lines = ["Pattern検証レポート: valid " + cnt.valid + " / invalid " + cnt.invalid + " / unverified " + cnt.unverified + "（詳細はDevToolsコンソール）", ""];
      rep.forEach(function (r) {
        const mark = r.status === "valid" ? "✓" : (r.status === "invalid" ? "✗" : "?");
        lines.push(mark + " [" + r.status + "] " + r.name + " (P" + r.phase + "/" + r.category + (r.mirror ? "/mirror" : "") + ")");
        lines.push("   手順 " + r.有効手順 + "/" + r.total手順 + "  色" + r.色セル数 + "  " + (r.invalidReason ? ("理由:" + r.invalidReason) : ""));
      });
      const det = $("hc-debug"); if (det) det.open = true;
      el.textContent = lines.join("\n");
    }
    return rep;
  }
  // ===== 簡易版はちみつ砲ガイド（決定木・honeycup_simple.json・既存機能と完全独立） =====
  const hcSimple = { on: false, tree: null, map: null, currentId: null, selectedNextId: null, history: [], lastDecision: null };
  const HC_SIMPLE_LEAVES = ["A1", "A2", "B1", "B2", "D1", "E1", "E2"]; // 葉（終端）ノード
  function hcSimpleIsLeaf(id) { return HC_SIMPLE_LEAVES.indexOf(id) >= 0; }
  function loadHoneycupSimpleTree(json) {
    try { if (!json || typeof json !== "object" || !Array.isArray(json.nodes) || !json.start) return null; return json; } catch (e) { return null; }
  }
  function createHoneycupSimpleNodeMap(tree) {
    const m = new Map();
    if (tree && Array.isArray(tree.nodes)) tree.nodes.forEach(function (n) { if (n && n.id) m.set(n.id, n); });
    return m;
  }
  function getHoneycupSimpleNodeById(tree, id) {
    if (hcSimple.map && hcSimple.map.has(id)) return hcSimple.map.get(id);
    if (!tree || !Array.isArray(tree.nodes)) return null;
    for (let i = 0; i < tree.nodes.length; i++) if (tree.nodes[i].id === id) return tree.nodes[i];
    return null;
  }
  function honeycupSimpleGridToGhostCells(grid) {
    const out = [];
    if (!Array.isArray(grid)) return out;
    const H = grid.length;
    for (let i = 0; i < H; i++) {
      const row = grid[i] || "";
      for (let j = 0; j < row.length && j < COLS; j++) {
        const ch = row.charAt(j);
        if (ch === ".") continue;
        out.push({ x: j, y: ROWS - H + i, piece: ch });
      }
    }
    return out;
  }
  function hcSimpleState() {
    return { currentPiece: G.active ? G.active.piece : null, holdPiece: G.hold || null, nextQueue: (G.queue || []).slice() };
  }
  // 可視ミノ内の早さ index（hold＋current＋next）。見えなければ null。
  function hcSimpleIdx(piece, state) {
    const vis = [state.holdPiece, state.currentPiece].concat(state.nextQueue || []).filter(Boolean);
    const i = vis.indexOf(piece); return i < 0 ? null : i;
  }
  // 基本条件を true / false / "unknown"（片方しか見えなければ unknown）
  function hcSimpleEvalBasic(condition, state) {
    const O = hcSimpleIdx("O", state), J = hcSimpleIdx("J", state), S = hcSimpleIdx("S", state), L = hcSimpleIdx("L", state), T = hcSimpleIdx("T", state);
    switch (condition) {
      case "O>J": return (O === null || J === null) ? "unknown" : (O < J);
      case "J>O": return (O === null || J === null) ? "unknown" : (J < O);
      case "S>L": return (S === null || L === null) ? "unknown" : (S < L);
      case "L>S": return (S === null || L === null) ? "unknown" : (L < S);
      case "T早め": return (T === null) ? "unknown" : (T <= 2);
      case "T遅め": return (T === null) ? "unknown" : (T >= 3);
      default: return "unknown";
    }
  }
  // 解決済み分岐ルール（JSONのedgesをそのまま評価せず node.id ごとに明示）。候補集合＋理由を返す。
  function hcSimpleCandidates(node, state) {
    if (!node) return { cands: [], reason: "node無し" };
    const id = node.id;
    if (hcSimpleIsLeaf(id)) return { cands: [], reason: "葉（終端）" };
    function T(c) { return hcSimpleEvalBasic(c, state) === true; }
    let cands = [], reason = "";
    if (id === "root") {
      if (T("J>O")) { cands = ["C"]; reason = "J>O"; }
      else if (T("O>J") && T("S>L")) { cands = ["A"]; reason = "O>J かつ S>L"; }
      else if (T("O>J") && T("L>S")) { cands = ["B"]; reason = "O>J かつ L>S"; }
      else if (T("O>J")) { cands = ["A", "B"]; reason = "O>J（S/L不明→A/Bランダム）"; }
      else { reason = "O/Jの順序が不明（分岐保留）"; }
    } else if (id === "A") {
      if (T("T早め")) { cands = ["A1", "A2"]; reason = "T早め→A1/A2ランダム"; } else { reason = "T早めが未確定（分岐保留）"; }
    } else if (id === "B") {
      if (T("T遅め")) { cands = ["B1", "B2"]; reason = "T遅め→B1/B2ランダム"; } else { reason = "T遅めが未確定（分岐保留）"; }
    } else if (id === "C") {
      if (T("S>L")) { cands = ["D"]; reason = "S>L→D"; } else { cands = ["E"]; reason = "S>L以外→E（確定/フォールバック）"; }
    } else if (id === "D") { cands = ["D1"]; reason = "確定→D1"; }
    else if (id === "E") { cands = ["E1", "E2"]; reason = "E1/E2ランダム"; }
    return { cands: cands, reason: reason };
  }
  // 次ノードを解決（既選択を維持／reroll時は再抽選）。葉や条件未確定なら null。
  function hcSimpleResolveNextNode(node, state, reroll) {
    if (!node || hcSimpleIsLeaf(node.id)) return null;
    if (!reroll && hcSimple.selectedNextId) return hcSimple.selectedNextId;
    const r = hcSimpleCandidates(node, state);
    hcSimple.lastDecision = r.reason;
    if (!r.cands.length) return null;
    return r.cands[Math.floor(Math.random() * r.cands.length)];
  }
  // このnodeに関係する条件の判定を文字列化（UI表示用）
  function hcSimpleJudgeStr(node, state) {
    if (!node) return "";
    const id = node.id; let conds = [];
    if (id === "root") conds = ["O>J", "J>O", "S>L", "L>S"];
    else if (id === "A") conds = ["T早め"];
    else if (id === "B") conds = ["T遅め"];
    else if (id === "C") conds = ["S>L"];
    if (!conds.length) return "";
    return conds.map(function (c) { const r = hcSimpleEvalBasic(c, state); return c + "=" + (r === true ? "true" : (r === false ? "false" : "unknown")); }).join(", ");
  }
  function drawHcSimpleGhost(ctx) {
    if (!hcSimple.on || !hcSimple.tree || !hcSimple.currentId) return;
    const node = getHoneycupSimpleNodeById(hcSimple.tree, hcSimple.currentId);
    if (!node) return;
    const cells = honeycupSimpleGridToGhostCells(node.grid);
    ctx.save();
    cells.forEach(function (gc) {
      if (gc.y < 0 || gc.y >= ROWS || gc.x < 0 || gc.x >= COLS) return;
      if (G.grid[gc.y] && G.grid[gc.y][gc.x]) return; // 既存ブロックがある所には描かない
      let color, alpha;
      if (gc.piece === "G") { color = "#9aa7b5"; alpha = 0.20; }       // 土台＝薄いグレー
      else { color = (E.PIECES[gc.piece] || {}).color || "#8aa0b6"; alpha = 0.26; } // ミノ＝各色の半透明
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.fillRect(gc.x * CELL + 4, gc.y * CELL + 4, CELL - 8, CELL - 8);
      ctx.globalAlpha = Math.min(0.5, alpha + 0.20); ctx.strokeStyle = color; ctx.lineWidth = 1.5; // 薄い枠線で現在ブロック/アクティブと見分け
      ctx.strokeRect(gc.x * CELL + 4, gc.y * CELL + 4, CELL - 8, CELL - 8);
    });
    ctx.restore();
  }
  function hcSimpleStart() {
    if (!hcSimple.tree) { flashHint("簡易版ガイドのデータが読み込めませんでした（簡易版モードのみ無効）。", true); return; }
    if (G.chain) G.chain.on = false;
    if (G.mode !== "free") startFree(); // 既存オーバーレイと競合しないようフリーで重ねる
    hcSimple.on = true; hcSimple.currentId = hcSimple.tree.start; hcSimple.selectedNextId = null; hcSimple.history = [];
    const ms = hcSimple.tree.mapping_status || "";
    const msNote = (ms.indexOf("CONFIRMED") >= 0) ? "（CONFIRMED：node↔canvas・条件はユーザー確認済み）" : ((ms.indexOf("DRAFT") >= 0) ? "（DRAFT＝位置は目安）" : "");
    flashHint("簡易版はちみつ砲ガイド ON：背景の薄い形に沿って組み、『次の分岐へ進む』で進めます。" + msNote, false);
    updateHcSimpleDebug(); render();
  }
  function hcSimpleOff() { hcSimple.on = false; updateHcSimpleDebug(); render(); flashHint("簡易版ガイド OFF（既存挙動に戻ります）。", false); }
  function hcSimpleReset() { if (!hcSimple.tree) return; hcSimple.currentId = hcSimple.tree.start; hcSimple.selectedNextId = null; hcSimple.history = []; updateHcSimpleDebug(); render(); }
  function hcSimpleNext() {
    if (!hcSimple.on || !hcSimple.tree) return;
    const node = getHoneycupSimpleNodeById(hcSimple.tree, hcSimple.currentId);
    if (!node) return;
    if (hcSimpleIsLeaf(node.id)) { flashHint("最終ガイドです。この形を組んで練習終了です。", false); updateHcSimpleStatus(); return; }
    const to = hcSimpleResolveNextNode(node, hcSimpleState(), false);
    if (!to) { flashHint("今の手駒（現在ミノ／ホールド／NEXT）では分岐が確定しません。条件を満たすミノ順を待つか『再抽選』を。", false); updateHcSimpleStatus(); updateHcSimpleDebug(); return; }
    hcSimple.history.push(hcSimple.currentId); // 「戻る」用に履歴を積む
    hcSimple.currentId = to; hcSimple.selectedNextId = null;
    updateHcSimpleStatus(); updateHcSimpleDebug(); render();
  }
  function hcSimpleBack() {
    if (!hcSimple.on || !hcSimple.tree) return;
    if (!hcSimple.history.length) { flashHint("これ以上戻れません（開始地点です）。", false); return; }
    const prev = hcSimple.history.pop();
    if (prev) hcSimple.currentId = prev;
    hcSimple.selectedNextId = null;
    updateHcSimpleDebug(); render();
  }
  function hcSimpleReroll() {
    if (!hcSimple.on || !hcSimple.tree) return;
    const node = getHoneycupSimpleNodeById(hcSimple.tree, hcSimple.currentId);
    if (!node) return;
    hcSimple.selectedNextId = hcSimpleResolveNextNode(node, hcSimpleState(), true); // 同じ候補群から選び直す（currentNodeは進めない）
    updateHcSimpleStatus(); updateHcSimpleDebug();
  }
  function updateHcSimpleDebug() {
    const el = $("hcs-debug"); if (!el) return;
    const t = hcSimple.tree;
    if (!t) { el.textContent = "簡易版ガイドデータ未読込（このモードのみ無効）。"; return; }
    const node = getHoneycupSimpleNodeById(t, hcSimple.currentId);
    const st = hcSimpleState();
    const vis = [st.holdPiece, st.currentPiece].concat(st.nextQueue || []).filter(Boolean);
    const L = [];
    L.push("tree: " + t.title);
    L.push("mapping_status: " + (t.mapping_status || ""));
    L.push("mode: " + (hcSimple.on ? "ON" : "OFF") + " ／ currentNodeId: " + (hcSimple.currentId || "-"));
    if (node) L.push("label: " + node.label + " / canvas: " + node.canvas);
    L.push("visiblePieces: " + (vis.length ? vis.join(" ") : "-"));
    ["O>J", "J>O", "S>L", "L>S", "T早め", "T遅め"].forEach(function (c) { const r = hcSimpleEvalBasic(c, st); L.push("  " + c + " = " + (r === true ? "true" : (r === false ? "false" : "unknown"))); });
    if (node) { const r = hcSimpleCandidates(node, st); L.push("解決ルール: " + r.reason + " → 候補[" + r.cands.join(",") + "]"); }
    L.push("selectedNextNodeId: " + (hcSimple.selectedNextId || "(未)"));
    L.push("history: [" + hcSimple.history.join(" → ") + "]");
    if (node) { L.push("fumen: " + (node.fumen || "")); L.push("grid:\n" + (node.grid || []).join("\n")); }
    el.textContent = L.join("\n");
  }
  // 通常画面の常時ステータス（現在node・現在ミノ/ホールド/NEXT・次候補・判定・操作・終端）
  function updateHcSimpleStatus() {
    const el = $("hcs-status"); if (!el) return;
    const t = hcSimple.tree;
    let txt;
    if (!t) txt = "簡易版ガイド：データ未読込（このモードのみ無効）";
    else if (!hcSimple.on) txt = "簡易版ガイド：OFF（「簡易版ガイド ON」で開始）";
    else {
      const node = getHoneycupSimpleNodeById(t, hcSimple.currentId);
      const st = hcSimpleState();
      const L = [];
      L.push("簡易版はちみつ砲ガイド：ON");
      L.push("現在：" + (hcSimple.currentId || "-") + " / " + (node ? node.label : "-"));
      L.push("現在ミノ：" + (st.currentPiece || "-") + " ／ ホールド：" + (st.holdPiece || "-") + " ／ NEXT：" + st.nextQueue.slice(0, 5).join(" "));
      if (node && hcSimpleIsLeaf(node.id)) {
        L.push("最終ガイドです。この形を組んで練習終了です。");
      } else if (node) {
        const r = hcSimpleCandidates(node, st);
        L.push("次候補：" + (r.cands.length ? r.cands.join(" / ") : "（手駒待ち）") + (hcSimple.selectedNextId ? "　｜選択中：" + hcSimple.selectedNextId : ""));
        const j = hcSimpleJudgeStr(node, st); if (j) L.push("判定：" + j);
        L.push("操作：この形を組んだら「次へ」を押してください。");
      }
      const ms = t.mapping_status || "";
      if (ms.indexOf("CONFIRMED") >= 0) L.push("簡易版ガイド：確認済みデータ(CONFIRMED)");
      txt = L.join("\n");
    }
    if (el.__last === txt) return; // 変化時のみDOM更新
    el.__last = txt; el.textContent = txt;
  }
  function honeycupChainStart() {
    const t1 = setupByName(CHAIN_STEPS[0].name);
    if (!t1) { flashHint("通し練習の形が見つかりません。", true); return; }
    G.chain = { on: true, stage: 1, placed: 0 };
    G.mode = "template"; G.template = t1; resetCommon(); // 開始時のみ盤面リセット（1巡目は空から）
    G.drill = false;
    startContinuousCycle();
  }
  // 盤面・バッグ・ホールドは前巡から持ち越し（リセットしない）。ミノはフリー同様の7-bagから供給。
  function startContinuousCycle() {
    const ch = G.chain; if (!ch) return;
    const step = CHAIN_STEPS[ch.stage - 1];
    if (!step) { // 全巡完了
      ch.on = false;
      flashHint("通し練習 完了！" + (G.pcs > 0 ? " ★パーフェクトクリア達成🎉" : "（PCならず）") + "　もう一度『通し練習』で。", false);
      render(); return;
    }
    const t = setupByName(step.name);
    if (!t) { ch.on = false; flashHint("形が見つかりません: " + step.name, true); return; }
    G.template = t;
    // 巡ごとの状態だけ初期化（盤面 G.grid・バッグ・ホールドは持ち越し）
    G.stepIndex = 0; G.active = null; G.canHold = true; G.mistake = false;
    G.lastRotation = false; G.attemptMistake = false;
    G.hintLevel = clampHint(masteryOf(t.id).lvl);
    G.hintShownAt = (typeof performance !== "undefined" ? performance.now() : 0);
    // この巡を、来るバッグで成立する組み手順(P)から自動選択。成立しなければ確実に組めるガイド順を供給。
    G.chain.tiling = null; G.chain.pInfo = null;
    ensureQueue(7); // フリーと同じ7-bag（7個ピークして判定）
    const peekBag = G.queue.slice(0, 7);
    const pick = pickCycleTiling(t, peekBag);
    if (pick) { G.chain.tiling = pick.tiling; G.chain.pInfo = pick; } // 成立→ランダムバッグのまま
    else { feedGuideBag(); }                                          // ランダムでは組めない巡(例:硬い1巡目)→ガイド順で確実に組める
    spawnFromQueue();
    modeLabel.textContent = "通し: " + t.name;
    updateMasteryUI();
    let pmsg = "";
    if (G.chain.pInfo && G.chain.pInfo.total > 1) { const pi = G.chain.pInfo; pmsg = " ｜手順P" + pi.pNo + "を自動選択(組める" + pi.buildableCount + "/" + pi.total + "通りから)"; }
    else if (!G.chain.tiling) { pmsg = " ｜この巡はガイド順で供給（確実に組める）"; }
    flashHint("【通し練習 " + ch.stage + "/3】" + step.head + pmsg + "　" + setupHintText(t), false);
    render();
  }
  function chainActive() { return G.chain && G.chain.on; }

  // id から実体テンプレを取得（収録セットアップ / 手順型built-in / カタログ+保存 / カスタム）
  function findTemplate(id) {
    if (id === "__hc_dyn__" && dynTemplate) return dynTemplate; // 通し練習の動的パターン
    const su = setupById(id);
    if (su) return su; // 収録セットアップ（はちみつ砲ほか・完成形field型）
    const s = TPL.byId(id);
    if (s) return s; // col手順型 built-in（type未指定→steps扱い）
    const c = CAT.byId(id);
    if (c) {
      const u = userStore[id] || {};
      if (u.fsteps) return Object.assign({}, c, { type: "fsteps", fsteps: u.fsteps, finalField: u.finalField });
      return Object.assign({}, c, { type: "field", field: u.field || c.field || null, queue: u.queue || c.queue || null });
    }
    const u = userStore[id];
    if (u && u.custom) {
      if (u.fsteps) return { id: id, name: u.name || id, group: "カスタム", desc: u.desc || "", type: "fsteps", fsteps: u.fsteps, finalField: u.finalField };
      return { id: id, name: u.name || id, group: "カスタム", desc: u.desc || "", type: "field", field: u.field || null, queue: u.queue || null };
    }
    return null;
  }
  function fieldSet(id) {
    const u = userStore[id];
    if (u && (u.field || u.fsteps)) return true;
    const c = CAT.byId(id);
    return !!(c && c.field);
  }
  function customIds() {
    return Object.keys(userStore).filter(function (k) { return userStore[k] && userStore[k].custom; });
  }
  // 現在の盤面 → field配列（色を保持。20x10）
  function gridToField(g) { return g.map(function (row) { return row.map(function (c) { return c || null; }); }); }
  function saveCurrentTo(id) {
    if (!id) { saveAsNew(); return; }
    const field = gridToField(G.grid);
    if (!field.some(function (row) { return row.some(function (c) { return c; }); })) {
      flashHint("盤面が空です。形を組んでから保存してください。", true); return;
    }
    userStore[id] = Object.assign({}, userStore[id], { field: field });
    saveUserStore();
    const t = findTemplate(id);
    flashHint("保存しました：「" + (t ? t.name : id) + "」が練習可能になりました。", false);
    buildMenu();
  }
  function saveAsNew() {
    const field = gridToField(G.grid);
    if (!field.some(function (row) { return row.some(function (c) { return c; }); })) {
      flashHint("盤面が空です。形を組んでから保存してください。", true); return;
    }
    const name = window.prompt("新規テンプレ名を入力", "マイテンプレ");
    if (!name) return;
    const id = "cust" + Date.now();
    userStore[id] = { custom: true, name: name, desc: "自作テンプレ", field: field };
    saveUserStore();
    flashHint("新規テンプレ「" + name + "」を保存しました。", false);
    buildMenu();
  }
  function deleteUserTemplate(id) {
    if (!userStore[id]) return;
    if (!window.confirm("このテンプレの保存データを削除しますか？")) return;
    delete userStore[id]; saveUserStore(); buildMenu();
    flashHint("削除しました。", false);
  }
  // テト譜(fumen) から完成形(field) を取り込んで登録
  function importFumen() { importFumenInner("field"); }
  // テト譜(fumen) から手順(1手ずつ)を取り込んで登録
  function importFumenSteps() { importFumenInner("fsteps"); }
  function importFumenInner(kind) {
    const str = ($("fumen-text").value || "").trim();
    if (!str) { flashHint("テト譜コード（v115@…）を貼り付けてください。", true); return; }
    if (!window.TT_FUMEN) { flashHint("fumenデコーダが読み込まれていません。", true); return; }
    let payload, pages;
    if (kind === "fsteps") {
      const res = window.TT_FUMEN.toSteps(str);
      if (res.error) { flashHint("手順の取込に失敗: " + res.error, true); return; }
      payload = { fsteps: res.steps, finalField: res.finalField }; pages = res.pages;
      if (res.steps.length < 2) flashHint("注意: 手数が少ないテト譜です（完成形のみかも）。", false);
    } else {
      const res = window.TT_FUMEN.toTargetField(str);
      if (res.error) { flashHint("テト譜の取込に失敗: " + res.error, true); return; }
      payload = { field: res.field }; pages = res.pages;
    }
    const label = (kind === "fsteps") ? "手順" : "完成形";
    if (G.buildSlot) {
      const slot = G.buildSlot;
      // 同じ枠の旧データ種別が混ざらないよう field/fsteps を入れ替え
      const base = Object.assign({}, userStore[slot]); delete base.field; delete base.fsteps; delete base.finalField;
      userStore[slot] = Object.assign(base, payload);
      saveUserStore(); buildMenu();
      const t = findTemplate(slot);
      flashHint("テト譜(" + label + ")を「" + (t ? t.name : slot) + "」に登録（" + pages + "ページ）。", false);
      startTemplate(slot);
    } else {
      const name = window.prompt("テンプレ名を入力", "テト譜" + label);
      if (!name) return;
      const id = "cust" + Date.now();
      userStore[id] = Object.assign({ custom: true, name: name, desc: "テト譜取込(" + label + ")" }, payload);
      saveUserStore(); buildMenu();
      flashHint("テト譜から「" + name + "」を登録（" + label + "・" + pages + "ページ）。", false);
      startTemplate(id);
    }
  }

  // ===== ミノ列(ネクスト)補充 =====
  function refillBag() {
    while (G.bag.length < 7) G.bag = G.bag.concat(E.newBag());
  }
  function nextFromBag() {
    refillBag();
    return G.bag.shift();
  }
  function ensureQueue(n) {
    if (G.mode === "template" && tplType() === "steps") return; // 手順型は固定列
    if (G.mode === "template" && G.template && G.template.queue) return; // field型でミノ順指定あり
    refillBag();
    while (G.queue.length < n) G.queue.push(nextFromBag());
  }

  // ===== スナップショット(Undo) =====
  function snapshot() {
    return {
      grid: E.cloneGrid(G.grid),
      active: G.active ? Object.assign({}, G.active) : null,
      hold: G.hold, canHold: G.canHold,
      bag: G.bag.slice(), queue: G.queue.slice(),
      lines: G.lines, pieces: G.pieces, pcs: G.pcs, tspins: G.tspins, cycles: G.cycles,
      lastRotation: G.lastRotation, lastKick: G.lastKick, lastClearLabel: G.lastClearLabel,
      stepIndex: G.stepIndex, mistake: G.mistake, over: G.over,
    };
  }
  function pushHistory() {
    G.history.push(snapshot());
    if (G.history.length > 200) G.history.shift();
  }
  function undo() {
    if (G.history.length === 0) return;
    const s = G.history.pop();
    G.grid = s.grid; G.active = s.active; G.hold = s.hold; G.canHold = s.canHold;
    G.bag = s.bag; G.queue = s.queue;
    G.lines = s.lines; G.pieces = s.pieces; G.pcs = s.pcs; G.tspins = s.tspins; G.cycles = s.cycles;
    G.lastRotation = s.lastRotation; G.lastKick = s.lastKick; G.lastClearLabel = s.lastClearLabel;
    G.stepIndex = s.stepIndex; G.mistake = s.mistake; G.over = s.over;
    if (G.mode === "template") {
      // fsteps は盤面・ミノ・目標をその手の出現状態から作り直す（stale な active/lastRotation を残さない）
      if (tplType() === "fsteps") { setFStep(s.stepIndex); return; }
      computeTarget();
    }
    render();
  }

  // テンプレ種別: 'steps'(col手順) / 'field'(完成形) / 'fsteps'(テト譜由来の1手ずつ手順)
  function tplType() {
    if (!G.template) return null;
    if (G.template.type === "field") return "field";
    if (G.template.type === "fsteps") return "fsteps";
    return "steps";
  }

  // ===== テンプレ: col(最左列)→px 変換 & 目標算出 =====
  function minLocalCol(piece, rot) {
    const cells = E.PIECES[piece].states[rot];
    let m = 99;
    for (let i = 0; i < cells.length; i++) m = Math.min(m, cells[i][1]);
    return m;
  }
  function stepPlacement(grid, step) {
    const px = step.col - minLocalCol(step.piece, step.rot);
    const py = E.dropY(grid, step.piece, step.rot, px, -2);
    return { rot: step.rot, px: px, py: py };
  }
  function computeTarget() {
    G.targetCells = null; G.targetPlacement = null;
    if (G.mode !== "template" || !G.template) return;
    if (tplType() === "field") return; // field型は computeTarget 不要（盤面全体が目標）
    if (tplType() === "fsteps") {
      const fs = G.template.fsteps;
      if (G.stepIndex < fs.length) G.targetCells = fs[G.stepIndex].cells;
      return;
    }
    if (G.stepIndex >= G.template.steps.length) return;
    const step = G.template.steps[G.stepIndex];
    const pl = stepPlacement(G.grid, step);
    G.targetPlacement = pl;
    G.targetCells = E.absCells(step.piece, step.rot, pl.px, pl.py);
  }

  // fsteps: ステップ i に入る（盤面はテト譜準拠でセットし、その手のミノを出現）
  function setFStep(i) {
    const fs = G.template.fsteps;
    if (!fs || !fs[i] || !Array.isArray(fs[i].ctx)) {
      flashHint("テンプレデータが壊れています（手順を読み込めません）。別のテンプレを選んでください。", true);
      G.mode = "free"; G.template = null; G.over = false; G.active = null;
      G.grid = E.emptyGrid(); render(); return;
    }
    G.stepIndex = i;
    G.grid = fs[i].ctx.map(function (row) { return row.slice(); });
    G.targetCells = fs[i].cells;
    G.mistake = false;
    const st = E.spawnState(fs[i].piece);
    if (E.collide(G.grid, st.piece, st.rot, st.px, st.py)) { G.over = true; G.active = null; render(); return; }
    G.active = st; G.canHold = true; G.lastRotation = false;
    render();
  }

  // field型: 現在の盤面が目標の完成形と一致したか（消去前で比較）
  function fieldMatches() {
    const f = G.template.field;
    if (!f) return false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const want = !!(f[r] && f[r][c]);
        const got = !!G.grid[r][c];
        if (want !== got) return false;
      }
    }
    return true;
  }
  // field型: 目標外のセルを埋めてしまった＝発散（やり直し推奨）
  function fieldOverflow() {
    const f = G.template.field;
    if (!f) return false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (G.grid[r][c] && !(f[r] && f[r][c])) return true;
      }
    }
    return false;
  }

  // ===== スポーン =====
  function spawnFromQueue() {
    let piece;
    if (G.mode === "template" && tplType() === "steps") {
      if (G.stepIndex >= G.template.steps.length) { onTemplateComplete(); return; }
      piece = G.template.steps[G.stepIndex].piece;
    } else if (G.mode === "template" && G.template && G.template.queue) {
      // field型・ミノ順指定あり：順に供給し、尽きたらbagへ
      const q = G.template.queue;
      if (G.stepIndex < q.length) piece = q[G.stepIndex];
      else { piece = nextFromBag(); } // 固定列を使い切ったらbagから供給（ensureQueueはqueue型で早期returnするため直接）
    } else {
      ensureQueue(6);
      piece = G.queue.shift();
      ensureQueue(6);
    }
    const st = E.spawnState(piece);
    if (E.collide(G.grid, st.piece, st.rot, st.px, st.py)) {
      // 出現位置で衝突 → トップアウト
      G.over = true; G.active = null; sfx("over"); render(); return;
    }
    G.active = st;
    G.canHold = true;
    G.lastRotation = false; // 出現直後はまだ回転していない
    if (G.mode === "template") computeTarget();
    render();
  }

  // ===== 操作 =====
  function tryMove(dx, dy) {
    if (!G.active || G.over) return false;
    const a = G.active;
    if (!E.collide(G.grid, a.piece, a.rot, a.px + dx, a.py + dy)) {
      a.px += dx; a.py += dy;
      G.lastRotation = false; // 平行移動したので「直前=回転」を解除（T-spin判定用）
      if (G.mode === "finesse" && dx !== 0) G.finesseInputs++; // 横移動1マス=1操作（DAS連続も実移動で計数）
      render(); return true;
    }
    return false;
  }
  function tryRotate(dir) {
    if (!G.active || G.over) return;
    const res = E.rotate(G.grid, G.active, dir);
    if (res) {
      G.active.rot = res.rot; G.active.px = res.px; G.active.py = res.py;
      G.lastRotation = true; G.lastKick = res.kick;
      if (G.mode === "finesse") G.finesseInputs++; // 回転1回=1操作
      sfx("rotate");
      render();
    }
  }
  function tryRotate180() {
    if (!G.active || G.over) return;
    const res = E.rotate180(G.grid, G.active); // PPT2準拠の単発180°回転
    if (res) {
      G.active.rot = res.rot; G.active.px = res.px; G.active.py = res.py;
      G.lastRotation = true; G.lastKick = res.kick;
      if (G.mode === "finesse") G.finesseInputs++; // 回転1回=1操作
      sfx("rotate");
      render();
    }
  }
  function softDrop() { if (!tryMove(0, 1) && settings.gravity) {/*lock handled by gravity*/} }
  function hardDrop() {
    if (!G.active || G.over) return;
    const a = G.active;
    // ハードドロップは「設置」操作。直前の回転(lastRotation)はT-Spin判定のため保持する。
    // 落下距離で消すと、浮いた状態から決めるTST/T-Spinトリプル系が検出されなくなる
    // （T-Spinは3-cornerルールで最終位置にて判定する）。
    a.py = E.dropY(G.grid, a.piece, a.rot, a.px, a.py);
    sfx("drop");
    lockPiece();
  }
  function holdPiece() {
    // 手順型(steps/fsteps)・ミノ順固定field型ではホールド無効（決め打ちのため）
    const lockedOrder = (G.mode === "template") &&
      (tplType() === "steps" || tplType() === "fsteps" || (G.template && G.template.queue));
    if (!G.active || G.over || !G.canHold || lockedOrder) return;
    pushHistory();
    const cur = G.active.piece;
    if (G.hold == null) {
      G.hold = cur;
      spawnFromQueue();      // ネクストから次を出す（canHold=true に戻る）
    } else {
      const swap = G.hold; G.hold = cur;
      const st = E.spawnState(swap);
      if (E.collide(G.grid, st.piece, st.rot, st.px, st.py)) { G.over = true; G.active = null; }
      else G.active = st;
    }
    G.canHold = false;       // 次に固定するまでホールド不可
    sfx("hold");
    render();
  }

  // T-spin種別＋消去ライン数 → 表示ラベル
  function clearLabel(spin, lines) {
    const nm = ["", "シングル", "ダブル", "トリプル", "テトリス"][lines] || "";
    if (spin === "full") {
      return "T-Spin" + (lines ? " " + nm : "");
    }
    if (spin === "mini") {
      return "T-Spin Mini" + (lines ? " " + nm : "");
    }
    if (lines === 4) return "テトリス";
    if (lines > 0) return nm; // 通常消去
    return "";
  }

  function lockPiece() {
    if (G.mode === "finesse") { handleFinesseLock(); return; }
    const a = G.active;
    pushHistory();
    // T-spin 判定（固定前の盤面で。Tの隅セルはT自身が占めないため pre-lock で正しい）
    let spin = "none";
    if (a.piece === "T" && G.lastRotation) {
      spin = E.tSpinType(G.grid, a, G.lastKick);
    }
    G._pendingSpin = spin;

    // fsteps型: 1手ずつ目標位置に置く（盤面はテト譜準拠で進む）
    if (G.mode === "template" && tplType() === "fsteps") {
      const got = E.cellKey(E.absCells(a.piece, a.rot, a.px, a.py));
      const want = E.cellKey(G.targetCells);
      if (got !== want) {
        G.history.pop(); // この試行のスナップショットは破棄
        G.mistake = true;
        flashHint("手順と違う位置です。回転/移動/スピンで黄色の目標に合わせて置こう。", true);
        setFStep(G.stepIndex); // 盤面と現ミノをリセットして再挑戦
        return;
      }
      G.mistake = false;
      G.pieces++;
      if (spin !== "none") G.tspins++;
      // この手で消えるライン数を実盤面で算出（テト譜手順でもライン/PCを正しく集計）
      const tmp = E.cloneGrid(G.grid);
      E.lock(tmp, a.piece, a.rot, a.px, a.py);
      const cl = E.clearLines(tmp);
      G.lastClearLabel = clearLabel(spin, cl.cleared);
      let msg = G.lastClearLabel ? G.lastClearLabel + "！" : "";
      if (cl.cleared > 0) G.lines += cl.cleared;
      const fs = G.template.fsteps;
      if (G.stepIndex + 1 >= fs.length) {
        if (Array.isArray(G.template.finalField)) {
          G.grid = G.template.finalField.map(function (row) { return row.slice(); });
        }
        const empty = G.grid.every(function (row) { return row.every(function (c) { return !c; }); });
        clearSfx(spin, cl.cleared, empty);
        if (empty && cl.cleared > 0) { G.pcs++; msg = (msg ? msg + " " : "") + "パーフェクトクリア！🎉"; }
        G.active = null; G.targetCells = null;
        onTemplateComplete(msg);
        return;
      }
      clearSfx(spin, cl.cleared, false);
      if (msg) flashHint(msg, false);
      setFStep(G.stepIndex + 1);
      return;
    }

    // field型: 自由に組ませ、完成形と一致したら成功
    if (G.mode === "template" && tplType() === "field") {
      E.lock(G.grid, a.piece, a.rot, a.px, a.py);
      G.stepIndex++; G.pieces++;
      if (spin !== "none") { G.tspins++; }
      // 通し練習：フリーと同じ（7-bag生成＋標準ライン消去）。巡の形が完成したら次の巡へ。
      if (chainActive()) {
        const wasComplete = fieldMatches();           // 消去前に「この巡の形が完成したか」を判定
        const cl = E.clearLines(G.grid); G.grid = cl.grid; // フリーと同じライン消去
        let msg = clearLabel(spin, cl.cleared);
        if (cl.cleared > 0) { G.lines += cl.cleared; if (boardEmpty()) { G.pcs++; msg = (msg ? msg + " " : "") + "パーフェクトクリア！🎉"; } }
        clearSfx(spin, cl.cleared, boardEmpty());
        G.active = null;
        if (wasComplete) { // 完成 → 次の巡へ（盤面・バッグ・ホールド持ち越し）
          flashHint((msg ? msg + " " : "") + "▶ 次の巡へ", false);
          G.chain.stage = (G.chain.stage || 1) + 1; startContinuousCycle(); return;
        }
        flashHint((msg ? msg + " " : "") + setupHintText(G.template), false); // P情報を常に持続表示（消去時は併記）
        spawnFromQueue(); render(); return;
      }
      G.lastClearLabel = clearLabel(spin, 0);
      const lead = G.lastClearLabel ? G.lastClearLabel + "！" : "";
      G.active = null;
      if (fieldMatches()) { onFieldComplete(spin); return; }
      if (fieldOverflow()) {
        if (G.template && G.template.setup) G.attemptMistake = true; // 暗記モード：ミスありは昇格させない
        flashHint("目標の形からはみ出しました。↩Undoでやり直すか、リセットを。", true);
      } else if (lead) flashHint(lead, false);
      else if (isSetup()) flashHint(setupHintText(G.template), false);
      spawnFromQueue();
      render();
      return;
    }

    // テンプレ正誤判定（手順型 steps）。誤配置は盤面に固定せずやり直し（盤面破損・ヒントズレを防ぐ）。
    if (G.mode === "template" && G.targetCells) {
      const got = E.cellKey(E.absCells(a.piece, a.rot, a.px, a.py));
      const want = E.cellKey(G.targetCells);
      if (got !== want) {
        G.history.pop(); // この試行のスナップショットは破棄（盤面を汚さない）
        G.mistake = true;
        flashHint("置き方が目標と違います。回転/移動で黄色の目標に合わせて置き直そう。", true);
        spawnFromQueue(); // 同じ手のミノを出し直す（誤配置は盤面に固定しない）
        return;
      }
      G.mistake = false;
    }
    E.lock(G.grid, a.piece, a.rot, a.px, a.py);
    if (G.mode === "template") G.stepIndex++;
    afterLockCommon();
  }

  function afterLockCommon() {
    G.pieces++;
    const spin = G._pendingSpin || "none";
    // 盤面エディタ中（保存先指定あり）はライン消去しない＝組んだ形をそのまま保存できる
    const cl = G.buildSlot ? { grid: G.grid, cleared: 0 } : E.clearLines(G.grid);
    G.grid = cl.grid;
    // クリア種別ラベル（T-spin / 通常）。PC・テンプレ完了の文言で上書きされないよう1メッセージに統合。
    G.lastClearLabel = clearLabel(spin, cl.cleared);
    if (spin !== "none") { G.tspins++; }
    let msg = G.lastClearLabel ? G.lastClearLabel + "！" : "";
    if (cl.cleared > 0) {
      G.lines += cl.cleared;
      const empty = G.grid.every(function (row) { return row.every(function (c) { return !c; }); });
      if (empty) { G.pcs++; msg = (msg ? msg + " " : "") + "パーフェクトクリア！🎉"; }
    }
    clearSfx(spin, cl.cleared, boardEmpty());
    G.active = null;
    // 次へ
    if (G.mode === "template") {
      if (G.stepIndex >= G.template.steps.length) { onTemplateComplete(msg); return; }
      if (msg) flashHint(msg, false);
      spawnFromQueue();
    } else {
      if (msg) flashHint(msg, false);
      spawnFromQueue();
    }
  }

  function boardEmpty() {
    return G.grid.every(function (row) { return row.every(function (c) { return !c; }); });
  }
  // 1巡完了 → 反復ONなら次の巡へ継続。PCで盤面が空ならそのまま続行、残りがあれば盤面をクリアして仕切り直し。
  function advanceCycle(lead) {
    G.active = null; G.targetCells = null;
    if (!settings.autoRepeat) {
      flashHint((lead ? lead + " " : "") + "完了！ リセット(R)でもう一度。（反復ONで自動継続）", false);
      render();
      return;
    }
    G.cycles = (G.cycles || 0) + 1;
    // 収録セットアップ(前巡スタックあり)は毎巡その土台から再開。それ以外はPC以外なら盤面クリア。
    if (G.template && G.template.prefill) { G.grid = E.emptyGrid(); applyTemplatePrefill(); }
    else if (!boardEmpty()) G.grid = E.emptyGrid(); // PCでない完了は次の反復のため盤面をクリア
    G.stepIndex = 0; G.mistake = false; G.lastRotation = false; G.canHold = true; G.hold = null;
    G.setupTiling = null; G.setupPInfo = null;
    G.invalidForm = !!(G.template && G.template.setup && tplType() === "field" && G.template.status && G.template.status !== "valid");
    const judgeP = !chainActive() && G.template && G.template.setup && tplType() === "field" && !!G.template.field && G.template.status === "valid";
    if (judgeP || G.invalidForm) { G.bag = []; G.queue = []; ensureQueue(6); }
    else if (G.template && G.template.setup) feedGuideBag(); // 反復時もガイド順を再供給（必ず組める）
    flashHint((lead ? lead + " " : "") + "▶ " + G.cycles + "巡目！", false);
    if (tplType() === "fsteps") { setFStep(0); return; }
    spawnFromQueue();
    if (judgeP) {
      const peekBag = (G.active ? [G.active.piece] : []).concat(G.queue.slice(0, 6));
      const pick = pickCycleTiling(G.template, peekBag);
      if (pick) { G.setupTiling = pick.tiling; G.setupPInfo = pick; }
      else feedGuideBag();
    }
    render();
  }
  function onTemplateComplete(lead) {
    // steps / fsteps: ライン消去は afterLockCommon / fsteps側で実施済。ここで次の巡へ。
    advanceCycle(lead || "テンプレ完了！🎉");
  }
  function onFieldComplete(spin) {
    // 完成形を組めた → ここで実際にライン消去（基本機能を練習でも反映。PCなら盤面が空に）。
    const cl = E.clearLines(G.grid);
    G.grid = cl.grid;
    clearSfx(spin, cl.cleared, boardEmpty());
    let lead;
    if (cl.cleared > 0) {
      G.lines += cl.cleared;
      lead = clearLabel(spin, cl.cleared);
      if (boardEmpty()) { G.pcs++; lead = (lead ? lead + " " : "") + "パーフェクトクリア！🎉"; }
    } else {
      lead = clearLabel(spin, 0);
    }
    lead = (lead ? lead + " " : "") + "完成！🎉";
    if (G.template && G.template.setup) {
      try {
        const wasDrill = G.drill;
        const justMastered = recordSetupClear(G.template);
        // 通し練習中：次の巡（別の形）へ自動で進む
        if (chainActive()) { flashHint(lead, false); G.chain.stage = (G.chain.stage || 1) + 1; startContinuousCycle(); return; }
        if (wasDrill && justMastered) { flashHint(lead + " ★この形をマスター！次の弱点へ →", false); startDrill(); return; }
        if (justMastered) lead += " ★マスター達成！";
      } catch (e) { /* 習熟記録の失敗でゲーム進行は止めない */ }
    }
    advanceCycle(lead);
  }

  // ===== モード初期化 =====
  function resetCommon() {
    G.grid = E.emptyGrid(); G.active = null; G.hold = null; G.canHold = true;
    G.bag = []; G.queue = []; G.history = [];
    G.lines = 0; G.pieces = 0; G.pcs = 0; G.tspins = 0; G.cycles = 0; G.over = false;
    G.lastRotation = false; G.lastKick = 0; G.lastClearLabel = ""; G._pendingSpin = "none";
    G.stepIndex = 0; G.mistake = false; G.targetCells = null;
    G.buildSlot = null;
    G.finesseInputs = 0; G.finessePieces = 0; G.finessePerfect = 0; G.finesseAttempts = 0; G._finPiece = null;
    clearHeld();
    // リマップ取得モードが残っていると入力が吸われ続けるので解除
    captureKeyAction = null; capturePadAction = null;
  }
  function startFree() {
    if (G.chain) G.chain.on = false;
    G.mode = "free"; resetCommon();
    ensureQueue(6); spawnFromQueue();
    modeLabel.textContent = "フリー";
    flashHint("自由に積めます。←→移動 / ↑(X)右回転 Z左回転 / Space=ハードドロップ / Shift(C)=ホールド / ↩Undo", false);
    render();
  }
  function startTemplate(id) {
    const t = findTemplate(id);
    if (!t) return;
    // 通し練習からの呼び出し(pendingChainBagあり)ならチェーン継続。手動選択ならチェーン解除。
    const fromChain = !!pendingChainBag;
    if (!fromChain && G.chain) G.chain.on = false;
    if (t.info) { // 知識ノート（盤面なし）
      G.mode = "free"; G.buildSlot = null;
      flashHint("【" + t.name + "】" + t.desc + "（知識ノート：盤面データなし）", false);
      return;
    }
    G.buildSlot = null;
    if ((t.type === "field") && !t.field) { enterBuildMode(t); return; } // 未設定 → 盤面エディタ
    G.mode = "template"; G.template = t; resetCommon();
    G.drill = false;
    if (pendingChainBag) { pendingChainBag = null; } // 旧:固定供給。現在はガイド順供給(feedGuideBag)に統一
    applyTemplatePrefill();
    G.setupTiling = null; G.setupPInfo = null; G.hcAnalysis = null;
    // 無効/未検証パターンは練習候補外（判定・背景ガイドなし）。validのみP判定を有効化。
    G.invalidForm = !!(t.setup && t.type === "field" && t.status && t.status !== "valid");
    const judgeP = !chainActive() && t.setup && t.type === "field" && !!t.field && t.status === "valid";
    if (judgeP || G.invalidForm) { G.bag = []; G.queue = []; ensureQueue(6); } // validは判定用ランダム、invalidは通常ランダム
    else feedGuideBag(); // それ以外（未検証でないvalid設定で判定不可など）はガイド順を供給
    if (t.setup) {
      G.hintLevel = clampHint(masteryOf(t.id).lvl);
      G.hintShownAt = (typeof performance !== "undefined" ? performance.now() : 0);
      G.attemptMistake = false;
    }
    if (t.type === "fsteps") {
      modeLabel.textContent = "手順: " + t.name;
      flashHint(t.desc + "　黄色の目標位置に1手ずつ置こう（スピン/ tuck もOK・盤面はテト譜準拠）。", false);
      setFStep(0);
      return;
    }
    spawnFromQueue();
    if (judgeP) { // 今のバッグで成立する手順をランダム選択（複数成立ならランダム）。不可ならガイド順へ。
      const peekBag = (G.active ? [G.active.piece] : []).concat(G.queue.slice(0, 6));
      const pick = pickCycleTiling(t, peekBag);
      if (pick) { G.setupTiling = pick.tiling; G.setupPInfo = pick; }
      else feedGuideBag();
    }
    modeLabel.textContent = (t.setup ? (chainActive() ? "通し: " : "暗記: ") : "テンプレ: ") + t.name;
    if (t.setup) {
      if (G.invalidForm) flashHint("⚠ 無効パターン【" + t.name + "】：" + (t.invalidReason || "検証で無効") + " ／ 練習対象外（背景ガイド・判定なし）。", true);
      else flashHint(setupHintText(t), false);
      updateMasteryUI();
    } else {
      const srcNote = t.src ? "（出典: " + t.src + "）" : "";
      const fieldNote = (t.type === "field")
        ? "　うすい色の目標形を組み上げよう（スピン・ホールドOK）。" + srcNote
        : "";
      flashHint(t.desc + fieldNote, false);
    }
    render();
  }
  // 未登録テンプレ枠を埋めるための盤面エディタ（フリー操作で組んで保存）
  function enterBuildMode(t) {
    G.mode = "free"; G.template = null; resetCommon();
    G.buildSlot = t.id; // resetCommon の後に設定（resetCommonでクリアされるため）
    ensureQueue(6); spawnFromQueue();
    modeLabel.textContent = "盤面エディタ: " + t.name + "（未設定）";
    const rec = t.recFumen || recFumenOf(t.id);
    if (rec && $("fumen-text")) {
      $("fumen-text").value = rec;
      flashHint("「" + t.name + "」の推奨テト譜を入力しました（出典: " + (t.src || "Opener DB") + "）。" +
        "右の『手順で登録』または『完成形で登録』で取り込めます。", false);
    } else {
      flashHint("「" + t.name + "」は未登録です。フリーで形を組むか、テト譜を貼って『保存』してください。", false);
    }
    render();
  }
  function resetTemplate() {
    if (G.mode !== "template" || !G.template) return;
    resetCommon();
    applyTemplatePrefill();
    G.setupTiling = null; G.setupPInfo = null;
    G.invalidForm = !!(G.template.setup && tplType() === "field" && G.template.status && G.template.status !== "valid");
    const judgeP = !chainActive() && G.template.setup && tplType() === "field" && !!G.template.field && G.template.status === "valid";
    if (chainActive()) {
      // 通し練習中のリセット：この巡を最初からやり直し（土台＋フリー同様の7-bag）
      G.bag = []; G.queue = []; ensureQueue(6);
    } else if (judgeP) {
      G.bag = []; G.queue = []; ensureQueue(6); // リセットで新しいバッグ＝別のPを引ける
    } else {
      feedGuideBag(); // 個別の収録セットアップは同じガイド順のミノを再供給（必ず組み直せる）
    }
    if (G.template.setup) {
      G.hintShownAt = (typeof performance !== "undefined" ? performance.now() : 0);
      G.attemptMistake = false;
    }
    if (tplType() === "fsteps") { setFStep(0); return; }
    if ((tplType() === "field") && !G.template.field) return;
    spawnFromQueue();
    if (judgeP) {
      const peekBag = (G.active ? [G.active.piece] : []).concat(G.queue.slice(0, 6));
      const pick = pickCycleTiling(G.template, peekBag);
      if (pick) { G.setupTiling = pick.tiling; G.setupPInfo = pick; }
      else feedGuideBag();
    }
    render();
  }
  function startDig(rowsN) {
    if (G.chain) G.chain.on = false;
    G.mode = "dig"; resetCommon();
    rowsN = rowsN || 8;
    for (let r = ROWS - rowsN; r < ROWS; r++) {
      const hole = Math.floor(Math.random() * COLS);
      for (let c = 0; c < COLS; c++) {
        if (c !== hole) G.grid[r][c] = "#7a8290";
      }
    }
    ensureQueue(6); spawnFromQueue();
    modeLabel.textContent = "掘り(Dig) " + rowsN + "段";
    flashHint("お邪魔(灰)を消して盤面を空にしよう。穴の位置を読んで効率よく掘る練習。", false);
    render();
  }

  // ===== フィネス練習（最少操作で目標位置へ置く） =====
  const FIN_EMPTY = E.emptyGrid(); // 算出用の空盤面（読み取り専用・破壊しない）
  const FIN_ROTSET = { O: [0], I: [0, 1], S: [0, 1], Z: [0, 1], T: [0, 1, 2, 3], L: [0, 1, 2, 3], J: [0, 1, 2, 3] };
  function pxRange(piece, rot) {
    const cells = E.PIECES[piece].states[rot];
    let minC = 9, maxC = -9;
    for (let i = 0; i < cells.length; i++) { minC = Math.min(minC, cells[i][1]); maxC = Math.max(maxC, cells[i][1]); }
    return { lo: -minC, hi: COLS - 1 - maxC };
  }
  function landKey(piece, rot, px) {
    const py = E.dropY(FIN_EMPTY, piece, rot, px, -2);
    return E.cellKey(E.absCells(piece, rot, px, py));
  }
  // 空盤面で spawn(出現) から目標の着地形へ到達する最少入力列をBFSで算出。
  // 1入力 = 左/右タップ・左右DAS(壁まで)・右/左/180回転。ハードドロップは数えない。
  // 返り値: { count, path:[操作名...] }
  function optimalFinesseResult(piece, targetKey) {
    const startPx = E.PIECES[piece].spawnCol, startK = startPx + ",0";
    const q = [{ px: startPx, rot: 0 }];
    const par = {}; par[startK] = null; // k -> {pk, label}
    let goalK = null;
    while (q.length) {
      const s = q.shift(), sk = s.px + "," + s.rot;
      if (landKey(piece, s.rot, s.px) === targetKey) { goalK = sk; break; }
      const rng = pxRange(piece, s.rot);
      const edges = [];
      // 1操作 = 1マス移動 or 1回転（実プレイの計数と一致させる）
      if (s.px - 1 >= rng.lo) edges.push([s.px - 1, s.rot, "左"]);
      if (s.px + 1 <= rng.hi) edges.push([s.px + 1, s.rot, "右"]);
      [[1, "右回転"], [-1, "左回転"], [2, "180°回転"]].forEach(function (d) {
        const st = { piece: piece, rot: s.rot, px: s.px, py: 0 };
        const res = (d[0] === 2) ? E.rotate180(FIN_EMPTY, st) : E.rotate(FIN_EMPTY, st, d[0]);
        if (res) edges.push([res.px, res.rot, d[1]]);
      });
      for (let i = 0; i < edges.length; i++) {
        const k = edges[i][0] + "," + edges[i][1];
        if (par[k] === undefined) { par[k] = { pk: sk, label: edges[i][2] }; q.push({ px: edges[i][0], rot: edges[i][1] }); }
      }
    }
    if (goalK === null) return { count: 99, path: ["(到達不可)"] };
    const path = []; let k = goalK;
    while (par[k]) { path.unshift(par[k].label); k = par[k].pk; }
    return { count: path.length, path: path };
  }
  const FIN_LABEL_ACT = { "左": "left", "右": "right", "右回転": "cw", "左回転": "ccw", "180°回転": "rot180" };
  function keyForAction(act) {
    const ks = KEYMAP[act] || [];
    if (!ks.length) return "";
    const k = ks[0];
    return (KEY_DISP && KEY_DISP[k]) || (k.length === 1 ? k.toUpperCase() : k);
  }
  function describeFinessePath(path) {
    const hk = keyForAction("hard");
    const tail = "ハードドロップ" + (hk ? "(" + hk + ")" : "");
    if (!path || !path.length) return "そのまま" + tail;
    const out = []; let i = 0;
    while (i < path.length) {
      let j = i; while (j < path.length && path[j] === path[i]) j++;
      const n = j - i;
      const key = FIN_LABEL_ACT[path[i]] ? keyForAction(FIN_LABEL_ACT[path[i]]) : "";
      out.push((n > 1 ? path[i] + "×" + n : path[i]) + (key ? "(" + key + ")" : ""));
      i = j;
    }
    return out.join(" → ") + " → " + tail;
  }
  function spawnFinessePiece() {
    clearHeld(); // 押しっぱなしのキーが次の問題に漏れて勝手に動くのを防ぐ
    G.active = E.spawnState(G._finPiece);
    G.canHold = false; G.lastRotation = false;
    G.finesseInputs = 0;
    render();
  }
  function newFinesseTarget() {
    G.grid = E.emptyGrid();
    const piece = nextFromBag();
    G._finPiece = piece;
    const rots = FIN_ROTSET[piece] || [0];
    const rot = rots[Math.floor(Math.random() * rots.length)];
    const rng = pxRange(piece, rot);
    const px = rng.lo + Math.floor(Math.random() * (rng.hi - rng.lo + 1));
    const py = E.dropY(G.grid, piece, rot, px, -2);
    G.targetCells = E.absCells(piece, rot, px, py);
    spawnFinessePiece();
  }
  function respawnFinesse() { // 同じ問題（同じミノ・同じ目標）で再挑戦
    G.grid = E.emptyGrid();
    spawnFinessePiece();
  }
  function updateFinesseLabel() {
    const rate = G.finesseAttempts ? Math.round(100 * G.finessePerfect / G.finesseAttempts) : 0;
    modeLabel.textContent = "フィネス 完璧 " + G.finessePerfect + "/" + G.finesseAttempts + " (" + rate + "%)";
  }
  function startFinesse() {
    if (G.chain) G.chain.on = false;
    G.mode = "finesse"; G.template = null; resetCommon();
    refillBag();
    newFinesseTarget();
    modeLabel.textContent = "フィネス練習";
    flashHint("黄色の目標位置・向きへ、最少操作で置こう（横移動1マス＝1操作・回転1回＝1操作）。誤れば正解手順を表示し同じ問題を再出題。", false);
  }
  function handleFinesseLock() {
    const a = G.active;
    const landed = E.cellKey(E.absCells(a.piece, a.rot, a.px, a.py));
    const target = E.cellKey(G.targetCells);
    const used = G.finesseInputs;
    const res = optimalFinesseResult(a.piece, target);
    const opt = res.count;
    const placedRight = (landed === target);
    G.finesseAttempts++;
    if (placedRight && used <= opt) {
      // 完璧 → 次の問題へ
      G.finessePerfect++; G.finessePieces++; G.pieces++;
      sfx("perfect");
      updateFinesseLabel();
      flashHint("✓ 完璧！ " + used + " 操作（最適 " + opt + "）。次の問題へ ▶", false);
      newFinesseTarget();
      return;
    }
    // 不正解（位置違い or 操作過多）→ 正解の手順を提示し、同じ問題で再挑戦
    sfx("wrong");
    updateFinesseLabel();
    const why = placedRight ? ("操作が多い：あなた " + used + " / 最適 " + opt) : "目標と違う位置";
    flashHint("✗ " + why + "。正解: " + describeFinessePath(res.path) + "（最適 " + opt + " 操作）。同じ問題でもう一度！", true);
    respawnFinesse();
  }

  // ===== ヒント文 =====
  let hintTimer = null;
  function flashHint(msg, isErr) {
    hintBox.textContent = msg;
    hintBox.className = "hint" + (isErr ? " err" : "");
    if (hintTimer) clearTimeout(hintTimer);
  }

  // ===== 描画 =====
  function roundedCell(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    // ハイライト
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x + 1, y + 1, size - 2, 3);
  }
  function drawGridLines() {
    bctx.strokeStyle = "rgba(255,255,255,0.05)";
    bctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      bctx.beginPath(); bctx.moveTo(c * CELL, 0); bctx.lineTo(c * CELL, ROWS * CELL); bctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      bctx.beginPath(); bctx.moveTo(0, r * CELL); bctx.lineTo(COLS * CELL, r * CELL); bctx.stroke();
    }
  }
  function render() {
    // 集計
    statLines.textContent = G.lines;
    statPieces.textContent = G.pieces;
    statPc.textContent = G.pcs;
    if (statTspin) statTspin.textContent = G.tspins;
    if (statCycle) statCycle.textContent = G.cycles;
    updateHcDebug();
    updateHcSimpleStatus();

    // 盤面背景
    bctx.fillStyle = "#0d1117";
    bctx.fillRect(0, 0, boardCv.width, boardCv.height);
    drawGridLines();

    // 確定ブロック
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (G.grid[r][c]) roundedCell(bctx, c * CELL, r * CELL, CELL, G.grid[r][c]);
      }
    }

    // 手順型テンプレの目標(ヒント): 次の1手の置き場所
    if (settings.showHint && (G.mode === "template" || G.mode === "finesse") && G.targetCells) {
      bctx.save();
      bctx.strokeStyle = "rgba(255,255,80,0.95)";
      bctx.lineWidth = 2;
      bctx.fillStyle = "rgba(255,255,80,0.12)";
      for (let i = 0; i < G.targetCells.length; i++) {
        const r = G.targetCells[i][0], c = G.targetCells[i][1];
        if (r < 0) continue;
        bctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
        bctx.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
      }
      bctx.restore();
    }
    // 完成形テンプレ(field型)の目標: 全体のうすい色オーバーレイ
    // 収録セットアップ(暗記モード)はヒントレベルで強度を変える: 0お手本/1カラー/2シルエット/3チラ見/4暗記テスト
    if (settings.showHint && G.mode === "template" && tplType() === "field" && G.template && G.template.field && !G.invalidForm) {
      const f = G.template.field;
      const setup = !!G.template.setup;
      let drawAlpha = 0.28, silhouette = false, show = true;
      if (setup) {
        const lv = G.hintLevel;
        if (lv >= 4) show = false;                                                   // 暗記テスト：目標非表示
        else if (lv === 3) { show = ((typeof performance !== "undefined" ? performance.now() : 0) - G.hintShownAt) < 3000; } // チラ見3秒
        else if (lv === 2) { silhouette = true; drawAlpha = 0.22; }                  // シルエット（色なし）
        else if (lv === 1) { drawAlpha = 0.30; }                                     // カラー目標
        else { drawAlpha = 0.55; }                                                   // お手本（濃いめ）
      }
      if (show) {
        bctx.save();
        bctx.globalAlpha = drawAlpha;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (f[r] && f[r][c] && !G.grid[r][c]) {
              bctx.fillStyle = silhouette ? "#8aa0b6" : ((typeof f[r][c] === "string") ? f[r][c] : "#8aa0b6");
              bctx.fillRect(c * CELL + 4, r * CELL + 4, CELL - 8, CELL - 8);
            }
          }
        }
        bctx.restore();
      }
      // 設置順ガイド：お手本/カラー(Lv0,1)で「次に置くミノ」を黄色で強調（操作で覚える誘導）
      if (setup && G.template.guide && G.hintLevel <= 1) {
        const gn = guideNext();
        if (gn) {
          bctx.save();
          bctx.strokeStyle = "rgba(255,235,80,0.98)"; bctx.lineWidth = 2.5;
          bctx.fillStyle = "rgba(255,235,80,0.26)";
          for (let i = 0; i < gn.cells.length; i++) {
            const r = gn.cells[i][0], c = gn.cells[i][1];
            if (G.grid[r][c]) continue;
            bctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
            bctx.strokeRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
          }
          bctx.restore();
        }
      }
    }

    // 簡易版はちみつ砲ガイド（決定木）の背景ゴースト（ON かつ フリー中のみ・既存オーバーレイと競合しない）
    if (hcSimple.on && G.mode === "free") drawHcSimpleGhost(bctx);

    // ゴースト & アクティブ
    if (G.active) {
      const a = G.active;
      if (settings.ghost) {
        const gy = E.dropY(G.grid, a.piece, a.rot, a.px, a.py);
        const gc = E.absCells(a.piece, a.rot, a.px, gy);
        bctx.save();
        bctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < gc.length; i++) {
          const r = gc[i][0], c = gc[i][1];
          if (r >= 0) bctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
        }
        bctx.restore();
      }
      const cells = E.absCells(a.piece, a.rot, a.px, a.py);
      const color = E.PIECES[a.piece].color;
      for (let i = 0; i < cells.length; i++) {
        const r = cells[i][0], c = cells[i][1];
        if (r >= 0) roundedCell(bctx, c * CELL, r * CELL, CELL, color);
      }
    }

    // ゲームオーバー
    if (G.over) {
      bctx.fillStyle = "rgba(0,0,0,0.6)";
      bctx.fillRect(0, 0, boardCv.width, boardCv.height);
      bctx.fillStyle = "#fff"; bctx.font = "bold 28px system-ui"; bctx.textAlign = "center";
      bctx.fillText("ゲームオーバー", boardCv.width / 2, boardCv.height / 2 - 10);
      bctx.font = "16px system-ui";
      bctx.fillText("リセットで再開", boardCv.width / 2, boardCv.height / 2 + 20);
      bctx.textAlign = "left";
    }

    drawPreview(hctx, holdCv, G.hold ? [G.hold] : []);
    drawPreview(nctx, nextCv, previewQueue());
  }

  function previewQueue() {
    // 手順型ドリル(steps)はネクストを表示しない（要望により削除）。
    if (G.mode === "template" && tplType() === "steps") return [];
    // 現在のミノは active として表示済み。ネクストは「次の手」以降を出す（stepIndex+1始まり）。
    if (G.mode === "template" && tplType() === "fsteps") {
      const fs = G.template.fsteps, out = [];
      for (let i = G.stepIndex + 1; i < Math.min(G.stepIndex + 6, fs.length); i++) out.push(fs[i].piece);
      return out;
    }
    if (G.mode === "template" && G.template && G.template.queue) {
      const q = G.template.queue, out = [];
      for (let i = G.stepIndex + 1; i < Math.min(G.stepIndex + 6, q.length); i++) out.push(q[i]);
      return out;
    }
    return G.queue.slice(0, 5);
  }

  function drawPreview(ctx, cv, pieces) {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, cv.width, cv.height);
    let oy = 8;
    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p];
      const cells = E.PIECES[piece].states[0];
      // バウンディングを正規化して中央寄せ
      let minR = 9, minC = 9, maxR = -9, maxC = -9;
      for (let i = 0; i < cells.length; i++) {
        minR = Math.min(minR, cells[i][0]); maxR = Math.max(maxR, cells[i][0]);
        minC = Math.min(minC, cells[i][1]); maxC = Math.max(maxC, cells[i][1]);
      }
      const w = (maxC - minC + 1) * MINI;
      const ox = (cv.width - w) / 2;
      const color = E.PIECES[piece].color;
      for (let i = 0; i < cells.length; i++) {
        const r = cells[i][0] - minR, c = cells[i][1] - minC;
        roundedCell(ctx, ox + c * MINI, oy + r * MINI, MINI, color);
      }
      oy += (maxR - minR + 1) * MINI + 12;
    }
  }

  // ===== 入力(DAS/ARR付き) =====
  const held = {}; // {move:{dir,start,last,fired}, soft, left:bool, right:bool}
  function pressMove(dir) {
    if (tryMove(dir, 0)) sfx("move");
    held.move = { dir: dir, start: performance.now(), last: performance.now(), fired: false };
  }
  // 反対の横キーへ切替え時、即時移動せずDASからやり直して連続移動を継続させる
  function resumeMove(dir) {
    held.move = { dir: dir, start: performance.now(), last: performance.now(), fired: false };
  }
  // 押下中の入力状態をクリア（リセット/モード切替/フィネス次問で、押しっぱなしの暴走を防ぐ）
  function clearHeld() {
    held.move = null; held.left = false; held.right = false; held.soft = null;
    if (pad) pad.moveDir = 0;
  }
  function inputLoop(now) {
    try {
      // 横移動のDAS/ARR（ぷよテト2同様、長押しでそのまま壁方向へ連続移動。フィネスでも有効）
      if (held.move) {
        const h = held.move;
        const el = now - h.start;
        if (!h.fired && el >= settings.das) { h.fired = true; tryMove(h.dir, 0); h.last = now; }
        else if (h.fired && now - h.last >= settings.arr) { tryMove(h.dir, 0); h.last = now; }
      }
      // ソフトドロップ連続
      if (held.soft && now - (held.soft.last || 0) >= Math.max(15, settings.arr)) {
        tryMove(0, 1); held.soft.last = now;
      }
      // ゲームパッド(Joy-Con等)
      pollGamepad(now);
      // gravity（自由/掘りのみ。テンプレ・フィネスは自動落下しない）
      if (settings.gravity && G.active && !G.over && (G.mode === "free" || G.mode === "dig")) {
        if (now - G.lastGravity >= settings.gravityMs) {
          if (!tryMove(0, 1)) { hardDropNoExtend(); }
          G.lastGravity = now;
        }
      }
    } catch (e) { /* 1フレームの例外でループを止めない（ゲームパッド/長押しの永久停止を防ぐ） */ }
    requestAnimationFrame(inputLoop);
  }
  function hardDropNoExtend() {
    // gravityで底に着いたら固定（ロックディレイ簡略: 即固定）
    if (!G.active) return;
    lockPiece();
  }

  // ===== ゲームパッド (Switch Joy-Con 左右セット = 標準マッピング) =====
  // ChromeはJoy-Con L+Rを1台の "standard" ゲームパッドに統合する。
  // 標準マッピング: 0=B 1=A 2=Y 3=X / 4=L 5=R 6=ZL 7=ZR / 8=- 9=+ /
  //   12=↑ 13=↓ 14=← 15=→ / axes[0,1]=左スティック, axes[2,3]=右スティック。
  const PAD_MAP_DEFAULT = {
    left:   { btn: [14], axisNeg: [0] },         // ← / 左スティック左
    right:  { btn: [15], axisPos: [0] },         // → / 左スティック右
    soft:   { btn: [13], axisPos: [1] },         // ↓ / 左スティック下
    hard:   { btn: [12], axisNeg: [1] },         // ↑ / 左スティック上（ハードドロップ）
    cw:     { btn: [1] },                          // A = 右回転
    ccw:    { btn: [0] },                          // B = 左回転
    rot180: { btn: [3] },                          // X = 180°
    hold:   { btn: [2, 4, 5] },                    // Y / L / R = ホールド
    undo:   { btn: [8, 6] },                        // - / ZL = 一手戻す
    reset:  { btn: [9, 7] },                        // + / ZR = リセット
  };
  // キーボード既定（複数キー可）。localStorageでユーザー上書き可。
  const KEYMAP_DEFAULT = {
    left: ["ArrowLeft"], right: ["ArrowRight"], soft: ["ArrowDown"], hard: [" "],
    cw: ["ArrowUp", "x", "X"], ccw: ["z", "Z", "Control"], rot180: ["a", "A"],
    hold: ["Shift", "c", "C"], undo: ["Backspace", "u", "U"], reset: ["r", "R"],
  };
  const ACTIONS = [
    { k: "left", label: "左移動" }, { k: "right", label: "右移動" }, { k: "soft", label: "ソフトドロップ" },
    { k: "hard", label: "ハードドロップ" }, { k: "cw", label: "右回転" }, { k: "ccw", label: "左回転" },
    { k: "rot180", label: "180°回転" }, { k: "hold", label: "ホールド" }, { k: "undo", label: "一手戻す" }, { k: "reset", label: "リセット" },
  ];
  function loadMap(lsKey, def) {
    try {
      const s = JSON.parse(localStorage.getItem(lsKey) || "null");
      const out = JSON.parse(JSON.stringify(def));
      if (s && typeof s === "object") Object.keys(def).forEach(function (a) { if (s[a]) out[a] = s[a]; });
      return out;
    } catch (e) { return JSON.parse(JSON.stringify(def)); }
  }
  function saveMap(lsKey, map) { try { localStorage.setItem(lsKey, JSON.stringify(map)); } catch (e) {} }
  function labelOf(a) { for (let i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].k === a) return ACTIONS[i].label; return a; }
  let PAD_MAP = loadMap("tt_padmap_v1", PAD_MAP_DEFAULT);
  let KEYMAP = loadMap("tt_keymap_v1", KEYMAP_DEFAULT);
  let captureKeyAction = null, capturePadAction = null;
  function actionForKey(k) {
    for (let i = 0; i < ACTIONS.length; i++) { const a = ACTIONS[i].k; if (KEYMAP[a] && KEYMAP[a].indexOf(k) >= 0) return a; }
    return null;
  }
  const PAD_AXIS_TH = 0.55;
  const pad = {
    enabled: true, connected: false, id: "",
    moveDir: 0, moveStart: 0, moveLast: 0, moveFired: false, softLast: 0,
    prev: {}, // エッジ検出用（前フレームの押下状態）
  };
  function padOn(gp, spec) {
    if (!spec) return false;
    if (spec.btn) for (let i = 0; i < spec.btn.length; i++) {
      const b = gp.buttons[spec.btn[i]]; if (b && (b.pressed || b.value > 0.5)) return true;
    }
    if (spec.axisPos) for (let i = 0; i < spec.axisPos.length; i++) {
      if ((gp.axes[spec.axisPos[i]] || 0) > PAD_AXIS_TH) return true;
    }
    if (spec.axisNeg) for (let i = 0; i < spec.axisNeg.length; i++) {
      if ((gp.axes[spec.axisNeg[i]] || 0) < -PAD_AXIS_TH) return true;
    }
    return false;
  }
  function padEdge(gp, key, spec, fn) {
    const active = padOn(gp, spec);
    if (active && !pad.prev[key]) fn();
    pad.prev[key] = active;
  }
  function pollGamepad(now) {
    if (!pad.enabled || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let gp = null;
    for (let i = 0; i < pads.length; i++) { if (pads[i]) { gp = pads[i]; break; } }
    const was = pad.connected;
    pad.connected = !!gp;
    if (gp) pad.id = gp.id;
    if (was !== pad.connected) updateGamepadStatus();
    if (!gp) { pad.moveDir = 0; return; }

    // パッドのボタン割り当て取得中：新たに押されたボタンを採用
    if (capturePadAction) {
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed && !(pad._capPrev && pad._capPrev[i])) {
          PAD_MAP[capturePadAction] = { btn: [i] };
          saveMap("tt_padmap_v1", PAD_MAP);
          const done = capturePadAction; capturePadAction = null; pad._capPrev = null;
          buildControlsPanel();
          flashHint("「" + labelOf(done) + "」のパッドボタンを設定しました。", false);
          return;
        }
      }
      pad._capPrev = {};
      for (let i = 0; i < gp.buttons.length; i++) if (gp.buttons[i].pressed) pad._capPrev[i] = true;
      return; // 取得中は通常操作を行わない
    }

    // 横移動（キーボードと同じ DAS/ARR）
    const lf = padOn(gp, PAD_MAP.left), rt = padOn(gp, PAD_MAP.right);
    let dir = 0;
    if (lf && !rt) dir = -1; else if (rt && !lf) dir = 1;
    if (dir !== pad.moveDir) {
      pad.moveDir = dir;
      if (dir !== 0) { if (tryMove(dir, 0)) sfx("move"); pad.moveStart = now; pad.moveLast = now; pad.moveFired = false; }
    } else if (dir !== 0) {
      const el = now - pad.moveStart;
      if (!pad.moveFired && el >= settings.das) { pad.moveFired = true; tryMove(dir, 0); pad.moveLast = now; }
      else if (pad.moveFired && now - pad.moveLast >= settings.arr) { tryMove(dir, 0); pad.moveLast = now; }
    }
    // ソフトドロップ（押しっぱなしで連続）
    if (padOn(gp, PAD_MAP.soft)) {
      if (now - (pad.softLast || 0) >= Math.max(15, settings.arr)) { tryMove(0, 1); pad.softLast = now; }
    }
    // 単発アクション（押した瞬間に1回）
    padEdge(gp, "hard", PAD_MAP.hard, hardDrop);
    padEdge(gp, "cw", PAD_MAP.cw, function () { tryRotate(1); });
    padEdge(gp, "ccw", PAD_MAP.ccw, function () { tryRotate(-1); });
    padEdge(gp, "rot180", PAD_MAP.rot180, function () { tryRotate180(); });
    padEdge(gp, "hold", PAD_MAP.hold, holdPiece);
    padEdge(gp, "undo", PAD_MAP.undo, undo);
    padEdge(gp, "reset", PAD_MAP.reset, doReset);
  }
  function updateGamepadStatus() {
    const el = $("pad-status"); if (!el) return;
    if (!pad.enabled) { el.textContent = "ゲームパッド: OFF"; el.className = "note pad-off"; return; }
    if (pad.connected) {
      const name = /joy-?con/i.test(pad.id) ? "Joy-Con（左右セット）" : (pad.id || "ゲームパッド").slice(0, 28);
      el.textContent = "✓ 接続中: " + name;
      el.className = "note pad-ok";
    } else {
      el.textContent = "未接続（ページを選択し、Joy-Conのボタンを1回押すと有効化）";
      el.className = "note";
    }
  }

  // ===== 操作設定（キー/パッドのリマップUI） =====
  const KEY_DISP = { " ": "Space", "ArrowLeft": "←", "ArrowRight": "→", "ArrowUp": "↑", "ArrowDown": "↓", "Control": "Ctrl", "Backspace": "⌫", "Shift": "Shift", "Escape": "Esc" };
  const PAD_BTN_NAME = { 0: "B", 1: "A", 2: "Y", 3: "X", 4: "L", 5: "R", 6: "ZL", 7: "ZR", 8: "−", 9: "＋", 10: "L押", 11: "Rヤ", 12: "↑", 13: "↓", 14: "←", 15: "→", 16: "Home" };
  function keyDisp(keys) {
    if (!keys || !keys.length) return "（なし）";
    return keys.map(function (k) { return KEY_DISP[k] || (k.length === 1 ? k.toUpperCase() : k); }).join(" / ");
  }
  function padDisp(spec) {
    if (!spec) return "（なし）";
    const parts = [];
    (spec.btn || []).forEach(function (i) { parts.push(PAD_BTN_NAME[i] || ("b" + i)); });
    if ((spec.axisNeg && spec.axisNeg.length) || (spec.axisPos && spec.axisPos.length)) parts.push("Lスティック");
    return parts.length ? parts.join(" / ") : "（なし）";
  }
  function buildControlsPanel() {
    const root = $("controls-list"); if (!root) return;
    root.innerHTML = "";
    ACTIONS.forEach(function (a) {
      const row = document.createElement("div"); row.className = "ctrl-map-row";
      const lab = document.createElement("span"); lab.className = "cm-label"; lab.textContent = a.label;
      const kk = document.createElement("button"); kk.className = "cm-btn cm-key"; kk.textContent = keyDisp(KEYMAP[a.k]);
      kk.title = "クリックして新しいキーを押す";
      kk.addEventListener("click", function () { capturePadAction = null; captureKeyAction = a.k; flashHint("「" + a.label + "」に割り当てるキーを押してください（Escで取消）。", false); });
      const pp = document.createElement("button"); pp.className = "cm-btn cm-pad"; pp.textContent = padDisp(PAD_MAP[a.k]);
      pp.title = "クリックして新しいパッドボタンを押す";
      pp.addEventListener("click", function () { captureKeyAction = null; capturePadAction = a.k; pad._capPrev = null; flashHint("「" + a.label + "」に割り当てるパッドのボタンを押してください。", false); });
      row.appendChild(lab); row.appendChild(kk); row.appendChild(pp);
      root.appendChild(row);
    });
  }
  function resetControls() {
    KEYMAP = JSON.parse(JSON.stringify(KEYMAP_DEFAULT));
    PAD_MAP = JSON.parse(JSON.stringify(PAD_MAP_DEFAULT));
    saveMap("tt_keymap_v1", KEYMAP); saveMap("tt_padmap_v1", PAD_MAP);
    captureKeyAction = null; capturePadAction = null;
    buildControlsPanel();
    flashHint("操作設定をデフォルトに戻しました。", false);
  }

  window.addEventListener("gamepadconnected", function () { updateGamepadStatus(); });
  window.addEventListener("gamepaddisconnected", function () { pad.connected = false; updateGamepadStatus(); });

  function doKeyAction(act) {
    if (act === "left") { held.left = true; pressMove(-1); }
    else if (act === "right") { held.right = true; pressMove(1); }
    else if (act === "soft") { held.soft = { last: performance.now() }; tryMove(0, 1); }
    else if (act === "hard") hardDrop();
    else if (act === "cw") tryRotate(1);
    else if (act === "ccw") tryRotate(-1);
    else if (act === "rot180") tryRotate180();
    else if (act === "hold") holdPiece();
    else if (act === "undo") undo();
    else if (act === "reset") doReset();
  }
  window.addEventListener("keydown", function (e) {
    // パッド割り当て取得中に Esc → 取得モード解除（ゲームパッドが止まったままになるのを防ぐ）
    if (capturePadAction && e.key === "Escape") {
      e.preventDefault(); capturePadAction = null; pad._capPrev = null;
      buildControlsPanel(); flashHint("パッドの割り当て設定を取り消しました。", false);
      return;
    }
    // キー割り当て取得中：次の打鍵を採用（Escで取消）
    if (captureKeyAction) {
      e.preventDefault();
      if (e.key !== "Escape") {
        // 英字1文字は大文字小文字の両方を登録（CapsLock/Shiftでも反応するように）
        KEYMAP[captureKeyAction] = (e.key.length === 1 && /[a-z]/i.test(e.key)) ? [e.key.toLowerCase(), e.key.toUpperCase()] : [e.key];
        saveMap("tt_keymap_v1", KEYMAP);
      }
      const done = captureKeyAction; captureKeyAction = null;
      buildControlsPanel();
      flashHint(e.key === "Escape" ? "キー設定を取り消しました。" : ("「" + labelOf(done) + "」のキーを設定しました。"), false);
      return;
    }
    const act = actionForKey(e.key);
    // 横/ソフトはDAS/ARRで処理。その他は1押下=1回にするためブラウザのキーリピートは無視。
    if (e.repeat) { if (act === "left" || act === "right" || act === "soft") e.preventDefault(); return; }
    if (!act) return;
    e.preventDefault();
    doKeyAction(act);
  });
  window.addEventListener("keyup", function (e) {
    const act = actionForKey(e.key);
    // 離した方向だけ解除。反対が押されたままなら、そちらの連続移動を再開（切替えで止まらない）。
    if (act === "left") { held.left = false; if (held.right) resumeMove(1); else held.move = null; }
    else if (act === "right") { held.right = false; if (held.left) resumeMove(-1); else held.move = null; }
    else if (act === "soft") { held.soft = null; }
  });

  function doReset() {
    if (G.mode === "free") startFree();
    else if (G.mode === "template") resetTemplate();
    else if (G.mode === "finesse") startFinesse();
    else startDig(8);
  }

  // ===== 画面UI構築 =====
  function buildUI() {
    // モードボタン
    $("btn-free").addEventListener("click", startFree);
    $("btn-dig").addEventListener("click", function () { startDig(8); });
    $("btn-finesse").addEventListener("click", startFinesse);
    $("btn-reset").addEventListener("click", doReset);
    $("btn-undo").addEventListener("click", undo);

    // 暗記モード操作
    if ($("btn-hint-up")) $("btn-hint-up").addEventListener("click", function () { nudgeHint(1); });
    if ($("btn-hint-down")) $("btn-hint-down").addEventListener("click", function () { nudgeHint(-1); });
    if ($("btn-hint-demo")) $("btn-hint-demo").addEventListener("click", function () { setHintLevel(0); });
    if ($("btn-hint-test")) $("btn-hint-test").addEventListener("click", function () { setHintLevel(HINT_MAX); });
    if ($("btn-drill")) $("btn-drill").addEventListener("click", startDrill);
    if ($("btn-chain")) $("btn-chain").addEventListener("click", honeycupChainStart);
    if ($("btn-hc-report")) $("btn-hc-report").addEventListener("click", showValidationReport);
    // 簡易版はちみつ砲ガイド（決定木）：データ読込＋ボタン配線（読込失敗でもアプリは落とさない）
    hcSimple.tree = loadHoneycupSimpleTree(window.TT_HC_SIMPLE);
    hcSimple.map = createHoneycupSimpleNodeMap(hcSimple.tree);
    if (hcSimple.tree) hcSimple.currentId = hcSimple.tree.start;
    if ($("btn-hcs-start")) $("btn-hcs-start").addEventListener("click", hcSimpleStart);
    if ($("btn-hcs-off")) $("btn-hcs-off").addEventListener("click", hcSimpleOff);
    if ($("btn-hcs-reset")) $("btn-hcs-reset").addEventListener("click", hcSimpleReset);
    if ($("btn-hcs-next")) $("btn-hcs-next").addEventListener("click", hcSimpleNext);
    if ($("btn-hcs-back")) $("btn-hcs-back").addEventListener("click", hcSimpleBack);
    if ($("btn-hcs-reroll")) $("btn-hcs-reroll").addEventListener("click", hcSimpleReroll);
    updateHcSimpleDebug();
    updateHcSimpleStatus();
    updateMasteryUI();

    // テンプレ一覧（手順型 built-in + カタログ + カスタム）
    buildMenu();

    // 設定トグル
    bindToggle("set-ghost", "ghost");
    bindToggle("set-hint", "showHint");
    bindToggle("set-gravity", "gravity");
    bindToggle("set-repeat", "autoRepeat");
    bindToggle("set-sound", "sound");
    // 効果音: 最初のユーザー操作で AudioContext を起動（自動再生ポリシー対策）
    sndInit();
    const resumeAudio = function () { sndInit(); if (SND.ctx && SND.ctx.state === "suspended") { try { SND.ctx.resume(); } catch (e) {} } };
    window.addEventListener("pointerdown", resumeAudio, { once: true });
    window.addEventListener("keydown", resumeAudio, { once: true });

    // ゲームパッド(Joy-Con)
    const padToggle = $("set-gamepad");
    if (padToggle) {
      padToggle.checked = pad.enabled;
      padToggle.addEventListener("change", function () { pad.enabled = padToggle.checked; updateGamepadStatus(); });
    }
    updateGamepadStatus();

    // 操作設定（キー/パッドのリマップ）
    buildControlsPanel();
    const cr = $("btn-controls-reset");
    if (cr) cr.addEventListener("click", resetControls);

    // 盤面保存 / インポート・エクスポート
    $("btn-save").addEventListener("click", function () { saveCurrentTo(G.buildSlot); });
    $("btn-savenew").addEventListener("click", saveAsNew);
    $("btn-fumen").addEventListener("click", importFumen);
    $("btn-fumen-steps").addEventListener("click", importFumenSteps);
    $("btn-export").addEventListener("click", function () {
      $("io-text").value = JSON.stringify(userStore);
      flashHint("エクスポート: 下のテキストをコピーして保存してください。", false);
    });
    $("btn-import").addEventListener("click", function () {
      const txt = $("io-text").value.trim();
      if (!txt) { flashHint("インポートするJSONを貼り付けてください。", true); return; }
      let obj;
      try { obj = JSON.parse(txt); }
      catch (e) { flashHint("JSONの解析に失敗しました。", true); return; }
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) { flashHint("テンプレJSONの形式が不正です。", true); return; }
      let n = 0, skipped = 0, overwritten = 0;
      Object.keys(obj).forEach(function (k) {
        if (!validUserEntry(obj[k])) { skipped++; return; }
        if (Object.prototype.hasOwnProperty.call(userStore, k)) overwritten++;
        userStore[k] = obj[k]; n++;
      });
      saveUserStore(); buildMenu();
      let m = n + "件のテンプレを取り込みました。";
      if (overwritten) m += "（うち" + overwritten + "件は既存を上書き）";
      if (skipped) m += " 不正な" + skipped + "件はスキップしました。";
      flashHint(m, skipped > 0);
    });

    // タッチ操作
    bindTouch();
  }

  // テンプレ・メニュー（折りたたみ見出し付き）
  function buildMenu() {
    const root = $("tpl-list");
    root.innerHTML = "";

    function section(title, entries, render1) {
      if (!entries.length) return;
      const det = document.createElement("details");
      det.className = "tpl-sec";
      const sum = document.createElement("summary");
      sum.textContent = title + " (" + entries.length + ")";
      det.appendChild(sum);
      entries.forEach(function (t) { det.appendChild(render1(t)); });
      root.appendChild(det);
    }
    function btn(label, sub, cls, onClick, onDel) {
      const wrap = document.createElement("div");
      wrap.className = "tpl-row";
      const b = document.createElement("button");
      b.className = "tpl-btn " + (cls || "");
      b.innerHTML = "<span class='tpl-name'>" + label + "</span>" + (sub ? "<span class='tpl-sub'>" + sub + "</span>" : "");
      b.addEventListener("click", onClick);
      wrap.appendChild(b);
      if (onDel) {
        const d = document.createElement("button");
        d.className = "tpl-del"; d.textContent = "✕"; d.title = "削除";
        d.addEventListener("click", onDel);
        wrap.appendChild(d);
      }
      return wrap;
    }

    // 0) 収録セットアップ（はちみつ砲ほか・テト譜/手動由来の完成形群）を最上部に。習熟度＋検証statusバッジ付き。
    const allSetupGroups = [];
    SETUP_TEMPLATES.forEach(function (t) { if (allSetupGroups.indexOf(t.group) < 0) allSetupGroups.push(t.group); });
    allSetupGroups.forEach(function (gname) {
      const entries = SETUP_TEMPLATES.filter(function (t) { return t.group === gname; });
      section("★ " + gname, entries, function (t) {
        const m = masteryOf(t.id);
        const st = t.status || "valid";
        const stTag = st === "invalid" ? " ⚠無効" : (st === "unverified" ? " ?未検証" : "");
        const badge = (m.mastered ? "★マスター" : ("暗記Lv" + (m.lvl || 0) + (t.guide ? "・手順◎" : ""))) + stTag;
        const cls = st === "invalid" ? "unset" : (m.mastered ? "ok" : (m.clears ? "rec" : "unset"));
        return btn(t.name, badge, cls, function () { startTemplate(t.id); });
      });
    });

    // 1) 手順型（検証済みドリル）
    section("手順型ドリル（ヒント付き）", TPL.list, function (t) {
      return btn(t.name, t.category, "ok", function () { startTemplate(t.id); });
    });

    // 2) カタログ（ユーザー指定の名前付きセットアップ）をグループ別に
    CAT.groups().forEach(function (gname) {
      const entries = CAT.list.filter(function (t) { return t.group === gname; });
      section(gname, entries, function (t) {
        const set = fieldSet(t.id);
        let sub, cls;
        if (t.info) { sub = "知識ノート"; cls = "info"; }
        else if (set) { sub = "✓ 練習可"; cls = "ok"; }
        else if (recFumenOf(t.id)) { sub = "推奨テト譜あり"; cls = "rec"; }
        else { sub = "未設定→組んで保存"; cls = "unset"; }
        return btn(t.name, sub, cls, function () { startTemplate(t.id); });
      });
    });

    // 3) カスタム（自作保存）
    const cust = customIds().map(function (id) { return findTemplate(id); }).filter(Boolean);
    section("カスタム（自作）", cust, function (t) {
      return btn(t.name, "✓ 練習可", "ok",
        function () { startTemplate(t.id); },
        function (e) { e.stopPropagation(); deleteUserTemplate(t.id); });
    });
  }
  function bindToggle(id, key) {
    const el = $(id);
    el.checked = settings[key];
    el.addEventListener("change", function () { settings[key] = el.checked; render(); });
  }

  function bindTouch() {
    const map = {
      "t-left": function () { tryMove(-1, 0); },
      "t-right": function () { tryMove(1, 0); },
      "t-down": function () { tryMove(0, 1); },
      "t-ccw": function () { tryRotate(-1); },
      "t-cw": function () { tryRotate(1); },
      "t-180": tryRotate180,
      "t-drop": hardDrop,
      "t-hold": holdPiece,
      "t-undo": undo,
    };
    Object.keys(map).forEach(function (id) {
      const el = $(id); if (!el) return;
      el.addEventListener("click", function (e) { e.preventDefault(); map[id](); });
    });
  }

  // ===== テンプレ検証 =====
  function verifyAll() {
    let html = "<table class='vtab'><tr><th>テンプレ</th><th>手数</th><th>結果</th></tr>";
    TPL.list.forEach(function (t) {
      const res = verifyTemplate(t);
      const ok = res.ok;
      html += "<tr><td>" + t.name + "</td><td>" + t.steps.length + "</td><td class='" +
        (ok ? "vok" : "vng") + "'>" + res.msg + "</td></tr>";
    });
    html += "</table>";
    return html;
  }
  function verifyTemplate(t) {
    let grid = E.emptyGrid();
    for (let i = 0; i < t.steps.length; i++) {
      const step = t.steps[i];
      const px = step.col - minLocalCol(step.piece, step.rot);
      // 盤外チェック(回転状態のセル列が範囲内か)
      const cells0 = E.absCells(step.piece, step.rot, px, 0);
      for (let j = 0; j < cells0.length; j++) {
        if (cells0[j][1] < 0 || cells0[j][1] >= COLS) {
          return { ok: false, msg: "✗ 手" + (i + 1) + ": 盤外(col=" + step.col + ")" };
        }
      }
      const py = E.dropY(grid, step.piece, step.rot, px, -2);
      if (E.collide(grid, step.piece, step.rot, px, py) || py < 0) {
        return { ok: false, msg: "✗ 手" + (i + 1) + ": 配置不可" };
      }
      E.lock(grid, step.piece, step.rot, px, py);
      // 途中でラインが揃ってしまわないか(最終手以外)
      const cl = E.clearLines(E.cloneGrid(grid));
      if (cl.cleared > 0 && i < t.steps.length - 1) {
        return { ok: false, msg: "△ 手" + (i + 1) + "で消去(途中消し)" };
      }
    }
    // 穴(下に空きがあるのに上が埋まっている)チェック
    let holes = 0;
    for (let c = 0; c < COLS; c++) {
      let seen = false;
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c]) seen = true;
        else if (seen) holes++;
      }
    }
    const cl = E.clearLines(E.cloneGrid(grid));
    const after = cl.grid;
    const empty = after.every(function (row) { return row.every(function (x) { return !x; }); });
    if (t.pc) {
      if (empty) return { ok: true, msg: "✓ PC成立 (" + cl.cleared + "ライン消去)" };
      return { ok: false, msg: "✗ PC不成立(残りあり, 消去" + cl.cleared + ")" };
    }
    if (holes > 0) return { ok: false, msg: "△ 穴 " + holes + " 個" };
    return { ok: true, msg: "✓ 穴なし(消去" + cl.cleared + ")" };
  }

  // ===== 起動 =====
  buildUI();
  startFree();
  requestAnimationFrame(inputLoop);

  // デバッグ用に公開
  window.TTGAME = G;
  window.__HC = { hcEnumTilings: hcEnumTilings, hcTilingBuildable: hcTilingBuildable, pickCycleTiling: pickCycleTiling, setupByName: setupByName };
})();
