// LST積み 練習データ — LSTユニット(L+S+T / 鏡=J+Z+T)を複数位置で生成・テトロミノ分類で検証済み。
// forms[].grid: I/L/O/Z/T/J/S=目標ミノ / X=灰土台 / _=空。床接地。category="LST積み"。
(function () {
  if (!window.TT_TEMPLATES || !window.TT_TEMPLATES.templates) return;
  var LST = [{ id: "lst_stacking", title: "LST積み", source: "https://shiwehi.com/tetris/template/lststacking.php", category: "LST積み", total: 8,
    forms: [
      { grid: ["________SS", "____L__SS_", "XXXXLTTTXX", "XXXXLLTXXX", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右A土台" },
      { grid: ["________SS", "XXXXL__SSX", "XXXXLTTTXX", "XXXXLLTXXX", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右A維持" },
      { grid: ["_______SS_", "___L__SS__", "XXXLTTTXX_", "XXXLLTXXX_", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右B土台" },
      { grid: ["_______SS_", "XXXL__SSX_", "XXXLTTTXX_", "XXXLLTXXX_", "_XXXXXXXXX"], percent: null, pieces: "L、T、S", comment: "右B維持" },
      { grid: ["ZZ________", "_ZZ__J____", "XXTTTJXXXX", "XXXTJJXXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左A土台" },
      { grid: ["ZZ________", "XZZ__JXXXX", "XXTTTJXXXX", "XXXTJJXXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左A維持" },
      { grid: ["_ZZ_______", "__ZZ__J___", "_XXTTTJXXX", "_XXXTJJXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左B土台" },
      { grid: ["_ZZ_______", "_XZZ__JXXX", "_XXTTTJXXX", "_XXXTJJXXX", "XXXXXXXXX_"], percent: null, pieces: "J、T、Z", comment: "左B維持" },
    ] }];
  window.TT_TEMPLATES.templates.push.apply(window.TT_TEMPLATES.templates, LST);
})();
