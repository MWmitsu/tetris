// ============================================================
//  フィネス（最少入力）データ — テトリス練習ツール
// ------------------------------------------------------------
//  各ミノを「最少入力」で各列へ置くための最適入力表。
//  行動の数え方（重要）: ←/→ の「押下1回」＝1アクション。
//    ・タップ（短押し）= 1アクション（1マス移動）
//    ・DAS（長押しで壁まで滑る）= 1アクション（押下は1回）
//    ・回転1回 = 1アクション
//    ・ハードドロップは設置操作でありアクションに数えない
//  app.js は ←/→ の離散押下点（pressMove / パッド方向確定 / タッチ左右）と
//  回転（tryRotate/180）で G.finesseInputs を加算し、この actions と比較する。
//
//  現在は Ｏミノのみ実装（ユーザー提供 finesse_o.json を忠実に反映）。
//  他ミノのフィネス情報は未収録。pieces に新しいミノを追加すれば
//  finesseImplementedPieces() が自動で練習対象に含める。
// ============================================================
(function () {
  // 入力記号の凡例（データの inputs 配列で使用）
  var INPUT_LEGEND = {
    L: "← 1タップ",
    R: "→ 1タップ",
    DASL: "←長押し（DASで左壁まで）",
    DASR: "→長押し（DASで右壁まで）",
    CW: "右回転",
    CCW: "左回転",
    ROT180: "180°回転",
  };

  window.TT_FINESSE = {
    meta: {
      version: "v37",
      note: "←/→の押下1回=1アクション（DAS長押しも1回）。回転1回=1アクション。ハードドロップは数えない。",
      input_legend: INPUT_LEGEND,
      implemented: ["O"], // 現在はＯミノのみ。他ミノの情報は未収録。
    },
    pieces: {
      // ---- Ｏミノ（回転対称＝回転不要） ----
      O: {
        piece: "O",
        title: "Ｏミノの最適化 (O-piece finesse)",
        field_width: 10,
        spawn_left_col: 4, // 出現時の左セル列（列4-5を占有）
        rotation_symmetric: true,
        source_fumen: "https://fumen.zui.jp/?v115@8eXpBeQpFeQpBeQpFeQpBeQpFeQpBeQpFeQpBeQpFeQpBeQpFeQpBeXpkfAgWqAlfnBCSJEfETYhBClvs2ADIEfET4p9BlfbOBQoDfEZ4JVBlP5ABRhAAA",
        note: "Oミノは回転対称＝回転不要。横移動の入力だけで配置が決まり、全9配置に最大2アクション（DAS=長押しは1アクション）で到達できる。",
        // rule: 出現列(左セル=4)からの距離d → d=0:無入力 / |d|=1:1タップ / |d|=2:2タップ
        //        / |d|=3(列1,7):DASで壁+1タップ補正 / |d|=4(列0,8):DASのみ。常に2アクション以内。
        placements: [
          { left_col: 0, cols: [0, 1], inputs: ["DASL"],      inputs_jp: "←長押し",       actions: 1 },
          { left_col: 1, cols: [1, 2], inputs: ["DASL", "R"], inputs_jp: "←長押し、→",    actions: 2 },
          { left_col: 2, cols: [2, 3], inputs: ["L", "L"],    inputs_jp: "←、←",          actions: 2 },
          { left_col: 3, cols: [3, 4], inputs: ["L"],         inputs_jp: "←",             actions: 1 },
          { left_col: 4, cols: [4, 5], inputs: [],            inputs_jp: "なし（出現位置）", actions: 0 },
          { left_col: 5, cols: [5, 6], inputs: ["R"],         inputs_jp: "→",             actions: 1 },
          { left_col: 6, cols: [6, 7], inputs: ["R", "R"],    inputs_jp: "→、→",          actions: 2 },
          { left_col: 7, cols: [7, 8], inputs: ["DASR", "L"], inputs_jp: "→長押し、←",    actions: 2 },
          { left_col: 8, cols: [8, 9], inputs: ["DASR"],      inputs_jp: "→長押し",       actions: 1 },
        ],
      },
    },
  };
})();
