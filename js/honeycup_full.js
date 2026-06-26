// はちみつ砲（ハニカップ）練習データ — tetrismaps版 全8土台(setup variant)
// 出典: https://w.atwiki.jp/tetrismaps/pages/248.html
// grid: I/L/O/Z/T/J/S=新規に置くミノ(目標) / X=確定スタック(灰・土台prefill) / _=空。
//        各gridは床接地(末尾の空行除去済)。percent=成功率, pieces=使用ミノ。
(function () {
  window.TT_HC_FULL = {
    title: "はちみつ砲（ハニカップ）完全テト譜 — tetrismaps版（全152ページ）",
    source_page: "https://w.atwiki.jp/tetrismaps/pages/248.html",
    setups: [
      { idx: 0, page: 3, percent: 96.87, pieces: "L, J", grid: ["IIII______", "JJSS__OO__", "JSS___OOLX", "JXX_ZZLLLX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 1, page: 4, percent: 96.87, pieces: "S、O", grid: ["ILLL______", "ILSS__JJ__", "ISS___JOOX", "IXX_ZZJOOX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 2, page: 5, percent: 96.87, pieces: "L、O", grid: ["IJJJ______", "IOOJ__LS__", "IOO___LSSX", "IXX_ZZLLSX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 3, page: 6, percent: 95.91, pieces: "I、O", grid: ["LL________", "IL________", "ILSS__JJ__", "ISS___JOOX", "IXX_ZZJOOX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 4, page: 7, percent: 84.33, pieces: "L", grid: ["_________J", "I________J", "I_SS__OOJJ", "ISS___OOLX", "IXX_ZZLLLX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 5, page: 8, percent: 84.25, pieces: "L、O→J", grid: ["_______S__", "_______SS_", "IIII__JJS_", "LLL___JOOX", "LXX_ZZJOOX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 6, page: 9, percent: 70.63, pieces: "J", grid: ["________OO", "I_______OO", "I_SS__L_JJ", "ISS___L_JX", "IXX_ZZLLJX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
      { idx: 7, page: 10, percent: 70.04, pieces: "Z、O", grid: ["______I__L", "JJSS__ILLL", "JSS___IOOX", "JXX_ZZIOOX", "XXX__ZZXXX", "XXX_XXXXXX", "XXXX_XXXXX"] },
    ],
  };
})();
