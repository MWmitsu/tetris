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
  };

  // ===== テンプレ・レジストリ & 保存（localStorage） =====
  const LS_KEY = "tt_user_templates_v1";
  let userStore = loadUserStore();

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
  // id から実体テンプレを取得（手順型built-in / カタログ+保存 / カスタム）
  function findTemplate(id) {
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
      G.lastClearLabel = clearLabel(spin, 0);
      const lead = G.lastClearLabel ? G.lastClearLabel + "！" : "";
      G.active = null;
      if (fieldMatches()) { onFieldComplete(spin); return; }
      if (lead) flashHint(lead, false);
      else if (fieldOverflow()) flashHint("目標の形からはみ出しました。↩Undoでやり直すか、リセットを。", true);
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
    if (!boardEmpty()) G.grid = E.emptyGrid(); // PCでない完了は次の反復のため盤面をクリア
    G.stepIndex = 0; G.mistake = false; G.lastRotation = false; G.canHold = true; G.hold = null;
    flashHint((lead ? lead + " " : "") + "▶ " + G.cycles + "巡目！", false);
    if (tplType() === "fsteps") { setFStep(0); return; }
    spawnFromQueue();
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
    G.mode = "free"; resetCommon();
    ensureQueue(6); spawnFromQueue();
    modeLabel.textContent = "フリー";
    flashHint("自由に積めます。←→移動 / ↑(X)右回転 Z左回転 / Space=ハードドロップ / Shift(C)=ホールド / ↩Undo", false);
    render();
  }
  function startTemplate(id) {
    const t = findTemplate(id);
    if (!t) return;
    if (t.info) { // 知識ノート（盤面なし）
      G.mode = "free"; G.buildSlot = null;
      flashHint("【" + t.name + "】" + t.desc + "（知識ノート：盤面データなし）", false);
      return;
    }
    G.buildSlot = null;
    if ((t.type === "field") && !t.field) { enterBuildMode(t); return; } // 未設定 → 盤面エディタ
    G.mode = "template"; G.template = t; resetCommon();
    if (t.type === "fsteps") {
      modeLabel.textContent = "手順: " + t.name;
      flashHint(t.desc + "　黄色の目標位置に1手ずつ置こう（スピン/ tuck もOK・盤面はテト譜準拠）。", false);
      setFStep(0);
      return;
    }
    spawnFromQueue();
    modeLabel.textContent = "テンプレ: " + t.name;
    const srcNote = t.src ? "（出典: " + t.src + "）" : "";
    flashHint(t.desc + ((t.type === "field") ? "　うすい色の目標形を組み上げよう（スピン・ホールドOK）。" + srcNote : ""), false);
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
    if (tplType() === "fsteps") { setFStep(0); return; }
    if ((tplType() === "field") && !G.template.field) return;
    spawnFromQueue();
    render();
  }
  function startDig(rowsN) {
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
    if (settings.showHint && G.mode === "template" && tplType() === "field" && G.template && G.template.field) {
      const f = G.template.field;
      bctx.save();
      bctx.globalAlpha = 0.28;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (f[r] && f[r][c] && !G.grid[r][c]) {
            bctx.fillStyle = (typeof f[r][c] === "string") ? f[r][c] : "#8aa0b6";
            bctx.fillRect(c * CELL + 4, r * CELL + 4, CELL - 8, CELL - 8);
          }
        }
      }
      bctx.restore();
    }

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
})();
