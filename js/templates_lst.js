// LST積み 練習データ — 基本形を手作業で作成(Claude Code)。各色グループはテトロミノ分類で検証済み。
// forms[].grid: I/L/O/Z/T/J/S=置く目標ミノ / X=確定スタック(灰・土台prefill) / _=空。床接地。
// 右Tスロット=L+S+T、左Tスロット=その鏡(J+Z+T)。category="LST積み"。templates_practice.jsへpushで追加。
(function () {
  if (!window.TT_TEMPLATES || !window.TT_TEMPLATES.templates) return;
  var LST = [
    {
      id: "lst_stacking", title: "LST積み", source: "https://w.atwiki.jp/tetrismaps/pages/405.html", category: "LST積み", total: 4,
      forms: [
        { grid: ["________SS", "____L__SS_", "XXXXLTTTXX", "XXXXLLTXXX", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右Tスロット・土台（L+S+Tで最初のTSD）" },
        { grid: ["________SS", "XXXXL__SSX", "XXXXLTTTXX", "XXXXLLTXXX", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右Tスロット・維持形（TSD後に次のスロットを継続）" },
        { grid: ["ZZ________", "_ZZ__J____", "XXTTTJXXXX", "XXXTJJXXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左Tスロット・土台（右の左右反転）" },
        { grid: ["ZZ________", "XZZ__JXXXX", "XXTTTJXXXX", "XXXTJJXXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左Tスロット・維持形（右の左右反転）" },
      ],
    },
  ];
  window.TT_TEMPLATES.templates.push.apply(window.TT_TEMPLATES.templates, LST);
})();
