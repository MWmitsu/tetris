// 中盤テンプレ練習データ — tetrismaps版 master fumen を実デコーダ(TT_FUMEN相当)で復元
// forms[].grid: I/L/O/Z/T/J/S=置く目標ミノ / X=確定スタック(灰・土台prefill) / _=空。床接地。
// 色セルは%4==0(ちょうどNミノ)・8セル以上・重複除去・上限80。開幕データは templates_practice.js（本ファイルはpushで追加）。
(function () {
  if (!window.TT_TEMPLATES || !window.TT_TEMPLATES.templates) return;
  var MID = [
    {
      id: "stmb_cave", title: "STMBケイブ", source: "https://w.atwiki.jp/tetrismaps/pages/36.html", category: "中盤", total: 1,
      forms: [
        { grid: ["XXZ_______", "XZZ_______", "XZ___SSXXX", "XXX_SSXXXX", "XXX___XXXX", "XXX___XXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "hamburg", title: "ハンバーグ積み", source: "https://w.atwiki.jp/tetrismaps/pages/46.html", category: "中盤", total: 2,
      forms: [
        { grid: ["___S______", "___SS_____", "____S_____", "ZZ_XXXXXXX", "_ZZXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___LL_____", "_TTTL_____", "_ZZSSXXXXX", "_TTTSXXXXX", "_ZZXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "hamburger", title: "ハンバーガー積み", source: "https://w.atwiki.jp/tetrismaps/pages/47.html", category: "中盤", total: 2,
      forms: [
        { grid: ["______Z___", "_____ZZ___", "_____Z____", "XXXXXXX_SS", "XXXXXXXSS_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "" },
        { grid: ["_____JJ___", "XXXXXJTTT_", "XXXXXZZSS_", "XXXXXZTTT_", "XXXXXXXSS_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "yoshihiro", title: "よしひろ積み", source: "https://w.atwiki.jp/tetrismaps/pages/44.html", category: "中盤", total: 1,
      forms: [
        { grid: ["__ZZ______", "___ZZXXXXX", "JJ_OOXXXXX", "J__OOXXXXX", "J__XXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "kaidan_donate", title: "階段ドネイト", source: "https://w.atwiki.jp/tetrismaps/pages/43.html", category: "中盤", total: 36,
      forms: [
        { grid: ["___IIII___", "S___XXXXXX", "SS_XXXXXXX", "_SXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_____S____", "__LL_SS___", "___LZZS__I", "JJ_LTZZOOI", "J__TTTIOOI", "J___SSIZZI", "OO_SSLIJZZ", "OO_LLLIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["____JJ____", "____JX____", "__XXJXX_SS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_______Z__", "____JJZZ__", "____JXZ___", "__XXJXX_SS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_______Z__", "____JJZZ__", "____JXZLLL", "__XXJXXLSS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_______Z__", "__OOJJZZ__", "__OOJXZLLL", "__XXJXXLSS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___IIIIZ__", "__OOJJZZ__", "__OOJXZLLL", "__XXJXXLSS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___IIIIZ__", "__OOJJZZ__", "__OOJXZLLL", "__XXJXXLSS", "___XXXXSSX", "XX_XXXXXXX", "X__XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___IIIIZ__", "__OOJJZZ__", "__OOJXZLLL", "__XXJXXLSS", "___XXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["___IIIIZ__", "__OOJJZZ__", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["___IIIIZOO", "__OOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["______J___", "______JJJ_", "___IIIIZOO", "__OOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "_________I", "______J__I", "______JJJI", "___IIIIZOO", "__OOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "_________I", "______J__I", "S_____JJJI", "SS_IIIIZOO", "_SOOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "_________I", "___ZZ_J__I", "S___ZZJJJI", "SS_IIIIZOO", "_SOOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "_________I", "___ZZ_J__I", "_SOOJJZZOO", "_LOOJXZLLL", "_LXXJXXLSS", "_LLXXXXSSX"], percent: null, pieces: "", comment: "" },
        { grid: ["_______OO_", "_______OOL", "_______LLL"], percent: null, pieces: "", comment: "" },
        { grid: ["_______JJJ", "_______OOJ", "_______OOL", "_______LLL"], percent: null, pieces: "", comment: "" },
        { grid: ["______IJJJ", "______IOOJ", "______IOOL", "______ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["______IJJJ", "______IOOJ", "__SS__IOOL", "_SS___ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["______IJJJ", "T_____IOOJ", "TTSS__IOOL", "TSS___ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["ZZ____IJJJ", "TZZ___IOOJ", "TTSS__IOOL", "TSS___ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["ZZ____IJJJ", "TZZ_J_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["__S_______", "ZZSS__IJJJ", "TZZSJ_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["_____Z____", "__S_ZZ____", "ZZSSZ_IJJJ", "TZZSJ_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["OO___Z____", "OOS_ZZ____", "ZZSSZ_IJJJ", "TZZSJ_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["OO___Z____", "OOS_ZZIIII", "ZZSSZ_IJJJ", "TZZSJ_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["__L_______", "LLL_______", "OO___ZXXXX", "OOS_ZZIIII", "ZZSSZ_IJJJ", "TZZSJ_IOOJ", "TTSSJ_IOOL", "TSSJJ_ILLL"], percent: null, pieces: "", comment: "" },
        { grid: ["________S_", "________SS", "XXXXZZ___S", "XXXXXZZ_XX", "XXXXX__XXX", "XXXXX_XXXX", "XXXXX_XXXX"], percent: null, pieces: "", comment: "#Q=[](T)" },
        { grid: ["XXXX______", "XXXXX___OO", "XXXXXX_SOO", "XXXXXXXSS_", "XXXXXXXXS_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "Zこねえわ" },
        { grid: ["____L_____", "____L_____", "XXXXLL____", "XXXXX___OO", "XXXXXX_SOO", "XXXXXXXSS_", "XXXXXXXXS_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "Zこねえわ" },
        { grid: ["_Z________", "ZZ________", "ZJJ_______", "_J________", "_JXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_Z__XXXXXX", "ZZ___XXXXX", "ZJJ_XXXXXX", "_J__XXXXXX", "_JXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_Z__XXXXXX", "ZZTTTXXXXX", "ZJJTXXXXXX", "_J__XXXXXX", "_JXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_Z__XXXXXX", "ZZ___XXXXX", "ZJJ_XXXXXX", "_J_XXXXXXX", "_JXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "階段積みの代わりとしてもアリ" },
        { grid: ["_Z__XXXXXX", "ZZTTTXXXXX", "ZJJTXXXXXX", "_J_XXXXXXX", "_JXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "shachiku_train", title: "社畜トレイン", source: "https://w.atwiki.jp/tetrismaps/pages/48.html", category: "中盤", total: 3,
      forms: [
        { grid: ["JJ________", "JZZ_XXXXXX", "J_ZZXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____S_____", "____SS____", "JJ___S____", "JZZ_XXXXXX", "J_ZZXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____S_____", "____SS____", "JJ___SIIII", "JZZ_XXXXXX", "J_ZZXXXXXX", "_XXXXXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "yoshida", title: "吉田積み", source: "https://w.atwiki.jp/tetrismaps/pages/183.html", category: "中盤", total: 2,
      forms: [
        { grid: ["________L_", "________L_", "XXXXXSS_LL", "XXXXSS__OO", "XXXXXXJ_OO", "XXXXXXJJJ_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "こうなったらこうして・・・" },
        { grid: ["________Z_", "_______ZZ_", "_______ZL_", "________L_", "XXXXXSS_LL", "XXXXSS__OO", "XXXXXXJ_OO", "XXXXXXJJJ_", "XXXXXXXXX_", "XXXXXXXXX_", "XXXXXXXXX_"], percent: null, pieces: "", comment: "どりゃー！" },
      ],
    },
    {
      id: "parapet", title: "欄干", source: "https://w.atwiki.jp/tetrismaps/pages/63.html", category: "中盤", total: 3,
      forms: [
        { grid: ["XXXL__ZZXX", "XXXL___ZZX", "XXXLL_XXXX", "XXXX_XXXXX", "XXXX_XXXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["________LL", "_________L", "_________L", "_________J", "XXXXXX___J", "XXXXXXX_JJ", "XXXXXXXX_X", "XXXXXXXX_X"], percent: null, pieces: "", comment: "" },
        { grid: ["________LL", "_________L", "XXXXXXSS_L", "XXXXXSS__J", "XXXXXX___J", "XXXXXXX_JJ", "XXXXXXXX_X", "XXXXXXXX_X"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "single_double", title: "シングルダブル", source: "https://w.atwiki.jp/tetrismaps/pages/466.html", category: "中盤", total: 2,
      forms: [
        { grid: ["S_________", "SS________", "IS________", "I_________", "I_XXXXXXXX", "I__XXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "STSD" },
        { grid: ["JJ________", "J_________", "J_LLXXXXXX", "I__LXXXXXX", "I_XLXXXXXX", "I_XXXXXXXX", "I__XXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "キングクリムゾン" },
      ],
    },
    {
      id: "stsd", title: "STSD", source: "https://w.atwiki.jp/tetrismaps/pages/20.html", category: "中盤", total: 15,
      forms: [
        { grid: ["JJ__Z_____", "J__ZZ_____", "J__Z______"], percent: null, pieces: "", comment: "" },
        { grid: ["JJ__ZS____", "J__ZZSS___", "J__Z__S___"], percent: null, pieces: "", comment: "" },
        { grid: ["JJ__ZS____", "J__ZZSSOO_", "J__Z__SOO_"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "JJ__ZS___I", "J__ZZSSOOI", "J__Z__SOOI"], percent: null, pieces: "", comment: "" },
        { grid: ["__LL______", "___L_____I", "JJ_LZS___I", "J__ZZSSOOI", "J__Z__SOOI"], percent: null, pieces: "", comment: "" },
        { grid: ["__LL______", "___L_____I", "JJ_LZSXXXI", "J__ZZSSOOI", "J__Z__SOOI"], percent: null, pieces: "", comment: "" },
        { grid: ["I_________", "I_________", "I__XX_____", "I___XXXXXX", "LLL_XXXXXX", "LX__XXXXXX", "XX__XXXXXX"], percent: null, pieces: "", comment: "このような形から" },
        { grid: ["LLL_______", "L_________", "OO________", "OO________", "X___XXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["LLL_______", "L_________", "OO________", "OO__IIII__", "X___XXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["LLL_______", "L_________", "OO_JJ_____", "OO_JIIII__", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___S______", "LLLSS_____", "L___S_____", "OO_JJ_____", "OO_JIIII__", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___S______", "LLLSS_____", "L___S_____", "OO_JJ__ZZ_", "OO_JIIIIZZ", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___S______", "LLLSS_____", "L___SOO___", "OO_JJOOZZ_", "OO_JIIIIZZ", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___S______", "LLLSS_____", "L___SOOJJJ", "OO_JJOOZZJ", "OO_JIIIIZZ", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___S______", "LLLSSIIII_", "L___SOOJJJ", "OO_JJOOZZJ", "OO_JIIIIZZ", "X__JXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "double_dagger", title: "ダブルダガー", source: "https://w.atwiki.jp/tetrismaps/pages/104.html", category: "中盤", total: 3,
      forms: [
        { grid: ["__XX______", "XXX___XXXX", "XXXX_TTTXX", "XXX___TLXX", "XXXX_LLLXX", "XXXX_XXXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_____XXXXX", "XXX___XLXX", "XXZZ_LLLXX", "XXX___ZZXX", "XXXX_XXXXX", "XXXX_XXXXX", "XXXX_XXXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_____S____", "_____SS___", "XZZ___SXXX", "XXZZ_XXXXX", "XXX__XXXXX", "XXX__XXXXX", "XXX___XXXX", "XXXX_XXXXX", "XXXX_XXXXX", "XXXX_XXXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "こちらもダブルダガーの一種" },
      ],
    },
    {
      id: "chidori", title: "千鳥格子", source: "https://w.atwiki.jp/tetrismaps/pages/105.html", category: "中盤", total: 1,
      forms: [
        { grid: ["_____Z____", "____ZZXXXX", "_LLLZXXXXX", "XL___XXXXX", "XXX_XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XXXXXXXX_X", "XXXXXXXX_X", "XXXXXXXX_X"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "imperial_cross", title: "インペリアルクロス", source: "https://w.atwiki.jp/tetrismaps/pages/19.html", category: "中盤", total: 31,
      forms: [
        { grid: ["___ZZ_____", "____ZZ____", "___IIII___"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZ_____", "L___ZZ____", "LL_IIII___"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZ_____", "L___ZZ_J__", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZ___OO", "L___ZZ_JOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["S_________", "SS________", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["ZZ________", "SZZ_______", "SS________", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["ZZ________", "SZZ_______", "SS________", "LTT_ZZTJOO"], percent: null, pieces: "", comment: "" },
        { grid: ["ZZ________", "SZZ_______", "SS___XXXXX", "LTT_ZZTJOO"], percent: null, pieces: "", comment: "" },
        { grid: ["S_________", "SS____IIII", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_______J__", "S______JJJ", "SS____IIII", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["________OO", "_______JOO", "S______JJJ", "SS____IIII", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["________OO", "ZZ_____JOO", "SZZ____JJJ", "SS____IIII", "LS_ZZTTTOO", "L___ZZTJOO", "LL_IIIIJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["________OO", "ZZ_____JOO", "SZZ____JJJ", "SS____IIII", "LTT_ZZTJOO"], percent: null, pieces: "", comment: "" },
        { grid: ["XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XOO", "ZZX____JOO", "SZZ____JJJ", "SS____IIII", "LTT_ZZTJOO"], percent: null, pieces: "", comment: "" },
        { grid: ["XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XOO", "ZZX___ZJOO", "SZZ__ZZJJJ", "SS___ZIIII", "LTT_ZZTJOO"], percent: null, pieces: "", comment: "" },
        { grid: ["XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XXX", "XXX____XOO", "ZZX___ZJOO", "SZZ__ZZJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZ_____", "L___ZZ__OO", "LL_IIII_OO"], percent: null, pieces: "", comment: "" },
        { grid: ["L__ZZ_S___", "L___ZZSSOO", "LL_IIIISOO"], percent: null, pieces: "", comment: "" },
        { grid: ["___JJJ____", "L__ZZJS___"], percent: null, pieces: "", comment: "" },
        { grid: ["S_________", "SS_JJJ____", "LS_ZZJS___"], percent: null, pieces: "", comment: "" },
        { grid: ["SLL_______", "SSLJJJ____", "LSLZZJS___"], percent: null, pieces: "", comment: "" },
        { grid: ["SLL______J", "SSLJJJ___J", "LSLZZJS_JJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_________Z", "________ZZ", "SLL_____ZJ", "SSLJJJ___J", "LSLZZJS_JJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_______OO_", "_______OOZ", "________ZZ", "SLL_____ZJ", "SSLJJJ___J", "LSLZZJS_JJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_______OO_", "_______OOZ", "________ZZ", "SLLIIII_ZJ", "SSLJJJ___J", "LSLZZJS_JJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_______OO_", "_______OOZ", "________ZZ", "SSLJJJ_TTJ"], percent: null, pieces: "", comment: "" },
        { grid: ["XXX__LL___", "XXX___LXXX", "XXXXX_LXXX", "XXXX__JXXX", "XXXXX_JXXX", "XXXX_JJXXX", "XXXX_XXXXX", "XXX___XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "先にTKIを打つと..." },
        { grid: ["___JJJ____", "_____J____", "_____IIIIL", "XXX__XXLLL", "XXXX_XXXXX", "XXX___XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___JJJ____", "__TTTJ____", "___T_IIIIL", "XXX__XXLLL", "XXXX_XXXXX", "XXX___XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___JJJ____", "_____J____", "____TIIIIL", "XXXTTXXLLL", "XXXXTXXXXX", "XXX___XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "FIN" },
      ],
    },
    {
      id: "dt_cannon", title: "DT砲", source: "https://w.atwiki.jp/tetrismaps/pages/456.html", category: "中盤", total: 7,
      forms: [
        { grid: ["__JJ______", "_ZJ_______", "ZZJ_LLXXXX", "ZSS__LXXXX", "SS___LXXXX", "XXX_XXXXXX", "XXX_XXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LL______", "___L______", "JJ_L______", "J__TTTXXXX", "J___TXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LL____SS", "___LZZ_SSI", "JJ_LTZZOOI", "J__TTTIOOI", "J___SSIZZI", "OO_SSLIJZZ", "OO_LLLIJJJ"], percent: null, pieces: "", comment: "開幕DT砲" },
        { grid: ["I_________", "I__XXXXXXX", "I__XXXXXXX", "ITTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "Iを入れるのはかっこ悪い" },
        { grid: ["___XXXXXXX", "LLLXXXXXXX", "LTTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "鋤の刃はBtBが切れる" },
        { grid: ["__ZZ______", "___ZZ_____", "JJ_XXXXXXX", "J__XXXXXXX", "J___XXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "屋根は薄い方がいい（後述）" },
        { grid: ["___IIIII__", "___I___I__", "______II__", "_____II___", "_____I____", "__________", "_____I____", "__________", "__________", "__________", "__Z_______", "__Z_______", "__ZX______", "___X______", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "屋根がもっと厚いと上手くいかない" },
      ],
    },
    {
      id: "dt_cannon2", title: "DT砲2号", source: "https://w.atwiki.jp/tetrismaps/pages/163.html", category: "中盤", total: 8,
      forms: [
        { grid: ["_SS_______", "SS________", "TTT_OOLLL_", "JT__OOLZZ_", "JJJ_IIIIZZ"], percent: null, pieces: "", comment: "" },
        { grid: ["I_________", "I__JJJ____", "I___SJ_ZZ_", "IXX_SSOOZZ", "XX___SOOLL", "XXX_XXXXXL", "XX__XXXXXL", "XXX_XXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXX______", "XXXX______", "XXXX______", "XXXXXX_JJJ", "XXXXXX__TJ", "XXXXXX_TTT"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXX______", "XXXX_SS___", "XXXXSS____", "XXXXXX_JJJ", "XXXXXX__TJ", "XXXXXX_TTT"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXX__Z___", "XXXX_ZZ___", "XXXX_Z____", "XXXXXX_JJJ", "XXXXXX__TJ", "XXXXXX_TTT"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXX_Z____", "XXXXZZ____", "XXXXZ_____", "XXXXXX_JJJ", "XXXXXX__TJ", "XXXXXX_TTT"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "____LLL__I", "XXXXLZ___I", "XXXXZZ_ZZI", "XXXXZ___ZZ", "XXXXXX_JJJ", "XXXXXX__TJ", "XXXXXX_TTT"], percent: null, pieces: "", comment: "" },
        { grid: ["_________I", "____LLL__I", "XXXXLZ___I"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "escalator", title: "エスカレーター積み", source: "https://w.atwiki.jp/tetrismaps/pages/458.html", category: "中盤", total: 5,
      forms: [
        { grid: ["_____SS___", "XXXXSS___X", "XXXXJJJ_XX", "XXXX__JXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_________Z", "I_____SSZZ", "I____SSTZJ", "I___LOOTTJ", "I_LLLOOTJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_________Z", "I_____OOZZ", "I____TOOZJ", "I___LTTSSJ", "I_LLLTSSJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["_________T", "I_____SSTT", "I____SSZZT", "I___LOOJZZ", "I_LLLOOJJJ"], percent: null, pieces: "", comment: "" },
        { grid: ["__SS_____X", "XSS___XXXX", "XJJJ_XXXXX", "X__JXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "magical_key", title: "マジカルキー", source: "https://w.atwiki.jp/tetrismaps/pages/115.html", category: "中盤", total: 1,
      forms: [
        { grid: ["L__ZZ_____", "L___ZZXXXX", "LL_XXXXXXX", "X__XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "td_attack", title: "TDアタック", source: "https://w.atwiki.jp/tetrismaps/pages/41.html", category: "中盤", total: 8,
      forms: [
        { grid: ["_____SS_OO", "____SS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____Z_____", "___ZZSS_OO", "___ZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____Z_____", "J__ZZSS_OO", "JJJZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["_______ZZ_", "____Z___ZZ", "J__ZZSS_OO", "JJJZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["S______ZZ_", "SS__Z___ZZ", "JS_ZZSS_OO", "JJJZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["SLL____ZZ_", "SSL_Z___ZZ", "JSLZZSS_OO", "JJJZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___T______", "SLLTT__ZZ_", "SSLTZ___ZZ", "JSLZZSS_OO", "JJJZSS__OO", "XXXXXXX_XX", "XXXXXX_XXX", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["___T______", "SLLTT__ZZ_", "X_XXXXXXXX", "XXXXX_XXXX", "XX_XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "tst_tower", title: "TSTタワー", source: "https://w.atwiki.jp/tetrismaps/pages/61.html", category: "中盤", total: 5,
      forms: [
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "__S_XXXXXX", "__SSXXXXXX", "L__SXXXXXX", "L_XXXXXXXX", "LL_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "__LLXXXXXX", "___LXXXXXX", "__SLXXXXXX", "__SSXXXXXX", "L__SXXXXXX", "L_XXXXXXXX", "LL_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "I_LLXXXXXX", "I__LXXXXXX", "I_SLXXXXXX", "I_SSXXXXXX", "L__SXXXXXX", "L_XXXXXXXX", "LL_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "_Z__XXXXXX", "ZZ__XXXXXX", "Z___XXXXXX", "I_LLXXXXXX", "I__LXXXXXX", "I_SLXXXXXX", "I_SSXXXXXX", "L__SXXXXXX", "L_XXXXXXXX", "LL_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "____XXXXXX", "_Z__XXXXXX", "ZZ__XXXXXX", "Z___XXXXXX", "I_SSXXXXXX", "L__SXXXXXX", "L_XXXXXXXX", "LL_XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "trinity", title: "トリニティ", source: "https://w.atwiki.jp/tetrismaps/pages/45.html", category: "中盤", total: 4,
      forms: [
        { grid: ["XXXXX__XXX", "XXXX___XXX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX__XXXX", "XXXXTTTXXX", "XXXXXTXXXX", "__________", "__________", "XXXXX__XXX", "XXXX___XXX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX__XXXX", "XXXTTTXXXX", "XXXXTXXXXX"], percent: null, pieces: "", comment: "上→TSSルートあり 下→TSSルートなし" },
        { grid: ["XXXXX__XXX", "XXXX___XXX", "XXXXTXXXXX", "XXXXTTXXXX", "XXXXT_XXXX", "__________", "__________", "__________", "__________", "XXXXX__XXX", "XXXX___XXX", "XXXXTXXXXX", "XXXXTTXXXX", "XXXXT_XXXX"], percent: null, pieces: "", comment: "上→TSSルートあり 下→TSSルートなし" },
        { grid: ["____XXXXXX", "____XXXXXX", "____XXXXXX", "LLL_XXXXXX", "LZ__XXXXXX", "ZZ__XXXXXX", "Z___XXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["I_________", "I___XXXXXX", "I__XXXXXXX", "I___XXXXXX", "LLL_XXXXXX", "LZ__XXXXXX", "ZZ__XXXXXX", "Z___XXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "impel_down", title: "インペルダウン", source: "https://w.atwiki.jp/tetrismaps/pages/304.html", category: "中盤", total: 2,
      forms: [
        { grid: ["_________I", "_____SS_ZI", "__L_SSJZZI", "OOL___JZTI", "OOLL_JJTTT"], percent: null, pieces: "", comment: "" },
        { grid: ["__S_______", "__SS______", "_OOS__TTT_", "IOO___LTZ_", "IJJ_LLLZZX", "IJ___XXZXX", "IJX_XXXXXX", "XXX___XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "triple_tsd", title: "3連TSD", source: "https://w.atwiki.jp/tetrismaps/pages/120.html", category: "中盤", total: 10,
      forms: [
        { grid: ["__XXXXXXXX", "___XXXXXXX", "JJ_XXXXXXX", "J__XXXXXXX", "J___XXXXXX", "JJ_XXXXXXX", "J__XXXXXXX", "J_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXXX", "JJ_XXXXXXX", "J__XXXXXXX", "J_XXXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXXX", "JJ_XXXXXXX", "J__SSTXXXX", "J_SSTTTXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXXX", "JJ_XXXXXXX", "J__SSTZZXX", "J_SSTTTZZX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXXX", "JJ_IIIIXXX", "J__SSTZZXX", "J_SSTTTZZX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXXX", "JJ_IIIIXXT", "J__SSTZZTT", "J_SSTTTZZT"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLXXXXXX", "___LXXXXXX", "JJ_LXXXXXX", "J__ZZXXXXX", "J___ZZXXSS", "JJ_IIIISST", "J__SSTZZTT", "J_SSTTTZZT"], percent: null, pieces: "", comment: "" },
        { grid: ["I_________", "I___LLOO__", "I____LOO_T", "ISS_JLZZTT", "SS__JJJZZT"], percent: null, pieces: "", comment: "" },
        { grid: ["I_________", "I_________", "I__LL_____", "I___LOO_SS", "XJJ_LOOSSZ", "XJ__XXXXZZ", "XJ___XXXZX", "XXX_XXXXXX", "XX__XXXXXX"], percent: null, pieces: "", comment: "２巡目 Ｚはやいとき" },
        { grid: ["___OO_____", "___OOZ___I", "____ZZSS_I", "XJJ_ZSSLLI", "XJ__XXXXLI", "XJ___XXXLX", "XXX_XXXXXX", "XX__XXXXXX"], percent: null, pieces: "", comment: "２巡目 Ｚおそいとき" },
      ],
    },
    {
      id: "king_crimson", title: "キングクリムゾン", source: "https://w.atwiki.jp/tetrismaps/pages/60.html", category: "中盤", total: 2,
      forms: [
        { grid: ["__XXXXXXXX", "___XXXXXXX", "JJ_XXXXXXX", "J__XXXXXXX", "JZ_XXXXXXX", "ZZ_XXXXXXX", "Z__XXXXXXX", "X__XXXXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["JJ________", "J_________", "J_LLXXXXXX", "I__LXXXXXX", "I_XLXXXXXX", "I_XXXXXXXX", "I__XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "infinite_stairs", title: "無限階段", source: "https://w.atwiki.jp/tetrismaps/pages/160.html", category: "中盤", total: 3,
      forms: [
        { grid: ["____I_____", "____I_Z___", "____IZZ___", "___LIZ____", "JLLLSST_OO", "JJJSSTTTOO"], percent: null, pieces: "", comment: "" },
        { grid: ["________S_", "________SS", "_________S", "XXXXXLLL_I", "XXXXXLZ__I", "XXXXXZZ__I", "XXXXXZ___I", "XXXXXI_JJJ", "XXXXXI__SJ", "XXXXXI_TSS", "JLLLSST_OO"], percent: null, pieces: "", comment: "" },
        { grid: ["________S_", "________SS", "_________S", "XXXXXLLL_I", "XXXXXLZ__I", "XXXXXZZT_I", "JLLLSST_OO"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "yogsothoth", title: "ヨグソトース", source: "https://w.atwiki.jp/tetrismaps/pages/71.html", category: "中盤", total: 2,
      forms: [
        { grid: ["____J_____", "____JJJ___", "____Z_____", "___ZZ_____", "XXXZ___SSX", "XXXXX_SSXX", "XXXXX__XXX", "XXXXX_XXXX"], percent: null, pieces: "", comment: "ヨグソトース" },
        { grid: ["___ZZ_____", "___LZZ____", "___L______", "___LL_____", "XXXX___SSX", "XXXXX_SSXX", "XXXXX__XXX", "XXXXX_XXXX"], percent: null, pieces: "", comment: "ヨグソトース" },
      ],
    },
    {
      id: "maltose", title: "マルトース", source: "https://w.atwiki.jp/tetrismaps/pages/452.html", category: "中盤", total: 3,
      forms: [
        { grid: ["__LLL_____", "__L_______", "XXXXTXXXXX", "XXXXTTXXXX", "XXXXTXXXXX", "XXXX__XXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLL_____", "__LTTT____", "XXXXT_XXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
        { grid: ["__LLL_____", "__L_______", "XXXXT_XXXX", "XXXXTTXXXX", "XXXXTXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "super_vent", title: "超通気砲", source: "https://w.atwiki.jp/tetrismaps/pages/139.html", category: "中盤", total: 4,
      forms: [
        { grid: ["XXXXX_____", "XXXXX_IIII", "XXXXX___OO", "XXXXX___OO", "XXXXXX___X", "XXXXXX__XX"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXXX_____", "XXXXX_IIII", "XXXXX___OO", "XXXXX_JJOO", "XXXXXXJ__X", "XXXXXXJ_XX"], percent: null, pieces: "", comment: "" },
        { grid: ["____OO____", "____OO____", "XXXXX_____", "XXXXX_IIII", "XXXXX___OO", "XXXXX_JJOO", "XXXXXXJ__X", "XXXXXXJ_XX"], percent: null, pieces: "", comment: "" },
        { grid: ["____OO____", "____OOSS__", "XXXXXSS___"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "dulose", title: "ダルロース", source: "https://w.atwiki.jp/tetrismaps/pages/59.html", category: "中盤", total: 2,
      forms: [
        { grid: ["______IIII", "_____Z__SS", "L___ZZ_SSJ", "L__TZOO__J", "LLTTTOO_JJ"], percent: null, pieces: "", comment: "" },
        { grid: ["____IIII__", "XXXXX_____", "XXXXX____L", "XXXXX__LLL", "XXXXX_XXXX", "XXXXXX__XX", "XXXXXX_XXX", "XXXXXXX__X", "XXXXXXX_XX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "eclipse", title: "イクリプス", source: "https://w.atwiki.jp/tetrismaps/pages/451.html", category: "中盤", total: 1,
      forms: [
        { grid: ["XXXXXX__OO", "XXXXX___OO", "XXXXXX_JJJ", "XXXXXXX__J", "XXXXXXX_LL", "XXXXXXXX_L", "XXXXXXXX_L"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "d4_cannon", title: "D4砲", source: "https://w.atwiki.jp/tetrismaps/pages/144.html", category: "中盤", total: 1,
      forms: [
        { grid: ["__XXXXXXXX", "___XXXXXXX", "JJ_XXXXXXX", "J__XXXXXXX", "JTTTXXXXXX", "XXTXXXXXXX", "X__XXXXXXX", "X___XXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "anchor_set", title: "アンカーセットの技法", source: "https://w.atwiki.jp/tetrismaps/pages/83.html", category: "中盤", total: 1,
      forms: [
        { grid: ["_I________", "_I________", "_IXXXXXXXX", "_IXXXXXXXX", "_JXXXXXXXX", "_JXXXXXXXX", "JJ_XXXXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "kan", title: "貫の技法", source: "https://w.atwiki.jp/tetrismaps/pages/84.html", category: "中盤", total: 12,
      forms: [
        { grid: ["X_________", "XX________", "XX_____I__", "XXXLL__I__", "XXXXL__I__", "XXXXL__I__", "XXXX___SJX", "XXXXOOSSJX", "XXXXOOSJJX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "平らに削れるミノをおいてみる" },
        { grid: ["X_________", "XX________", "XX_LL_____", "XXXXL_____", "XXXXL_____", "XXXX____L_", "XXXXZZLLLX", "XXXXJZZOOX", "XXXXJJJOOX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "ここを隙間なく埋めていくイメージ" },
        { grid: ["X_________", "XX________", "XX_LL_____", "XXXXL_____", "XXXXL__JJJ", "XXXX___S_J", "XXXX_ZZSSX", "XXXX__ZZSX", "XXXX_IIIIX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "(^^)!?" },
        { grid: ["X_________", "XX_LL_____", "XXXXL_____", "XXXXL__SSS", "XXXX___SSS", "XXXXTTTTTT", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "だから１段だとIミノということになる" },
        { grid: ["X_________", "XX_LL_____", "XXXXL_____", "XXXXL__SSS", "XXXX___SSS", "XXXXIIIITT", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "だから１段だとIミノということになる" },
        { grid: ["X_________", "XX_LL_____", "XXXXL_____", "XXXXL__SSS", "XXXX___ZZS", "XXXXIIIIZZ", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "だから１段だとIミノということになる" },
        { grid: ["X_________", "XX_LL_____", "XXXXL_____", "XXXXL__JJJ", "XXXX___ZZJ", "XXXXIIIIZZ", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "だから１段だとIミノということになる" },
        { grid: ["X__LL_____", "XXXXL_____", "XXXXL_____", "XXXXOO__XX", "XXXXOO__XX", "XXXX_XXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "ミスった時のリカバリーに使いましょう" },
        { grid: ["X__LL_____", "XXXXL_____", "XXXXL_____", "XXXX____XX", "XXXX____XX", "XXXXOXXXXX", "XXXXOOXXXX", "XXXXOXXXXX"], percent: null, pieces: "", comment: "おわり" },
        { grid: ["JJ________", "J________X", "JIIII____X", "X_XXXXXXXX", "X__XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "#Q=[T](L)ST" },
        { grid: ["JJ________", "J_______LX", "JIIII_LLLX", "X_XXXXXXXX", "X__XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "#Q=[T](S)T" },
        { grid: ["______S___", "JJ____SS__", "J______SLX", "JIIII_LLLX", "X_XXXXXXXX", "X__XXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "#Q=[T](T)" },
      ],
    },
    {
      id: "wc_suki", title: "WC鋤の刃", source: "https://w.atwiki.jp/tetrismaps/pages/89.html", category: "中盤", total: 7,
      forms: [
        { grid: ["I_________", "I__XXXXXXX", "I__XXXXXXX", "ITTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "I刺しTSD" },
        { grid: ["___XXXXXXX", "LLLXXXXXXX", "LTTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "TSSからL削り" },
        { grid: ["I__XXXXXXX", "I__XXXXXXX", "I__XXXXXXX", "ITTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "屋根4段以上の場合" },
        { grid: ["___XXXXXXX", "___XXXXXXX", "___XXXXXXX", "LLLXXXXXXX", "LTTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "5段以上も" },
        { grid: ["___XXXXXXX", "LLLXXXXXXX", "LTTTXXXXXX", "XXTXXXXXXX", "XX_XXXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "TSSからLの場合" },
        { grid: ["___XXXXXXX", "___XXXXXXX", "_TTTXXXXXX", "XXTXXXXXXX", "__________", "__________", "__________", "___XXXXXXX", "___XXXXXXX", "_TTTXXXXXX", "XXTXXXXXXX", "__________", "__________", "__________", "___XXXXXXX", "LLLXXXXXXX", "L___XXXXXX", "XX_XXXXXXX"], percent: null, pieces: "", comment: "3/2/0" },
        { grid: ["_________T", "__L_____TT", "ZZ___SSJZZ", "JZZ_SSTJJJ", "X_XXXXXXXX", "X_XXXXXXXX", "X_XXXXXXXX", "X_XXXXXXXX"], percent: null, pieces: "", comment: "#Q=[T](I)JSL" },
      ],
    },
    {
      id: "ice_axe", title: "アイスアックス", source: "https://w.atwiki.jp/tetrismaps/pages/95.html", category: "中盤", total: 1,
      forms: [
        { grid: ["I_________", "I_________", "I____LXXXX", "I__LLLXXXX", "XXXX__XXXX", "XXXX_XXXXX"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "super_spiral", title: "超螺旋", source: "https://w.atwiki.jp/tetrismaps/pages/52.html", category: "中盤", total: 2,
      forms: [
        { grid: ["XXXXXXX___", "XXXXXX____", "XXXXXX_JJJ", "XXXXXX___J", "XXXXXX___L", "XXXXXX_LLL"], percent: null, pieces: "", comment: "" },
        { grid: ["XXXXXXX___", "XXXXXX____", "XXXXXX_JJJ", "XXXXXX__LJ", "XXXXXX_LLL"], percent: null, pieces: "", comment: "" },
      ],
    },
    {
      id: "super_spiral2", title: "超螺旋二号", source: "https://w.atwiki.jp/tetrismaps/pages/53.html", category: "中盤", total: 7,
      forms: [
        { grid: ["____Z_____", "___ZZ_____", "___Z______", "JJLL_ZZJJJ", "JOOL__ZZSJ", "JOOL___TSS", "IIII__TTTS"], percent: null, pieces: "", comment: "開幕テンプレ" },
        { grid: ["____X_____", "___XX_____", "___X______", "XXXXSXXXXX", "XXXXSSXXXX", "XXXXLLLXXX", "XXXXLSXXXX"], percent: null, pieces: "", comment: "消し方③" },
        { grid: ["____X_____", "___XX_____", "___X______", "XXXXLXXXXX", "XXXXLTXXXX", "XXXXTTTXXX", "XXXXLLXXXX"], percent: null, pieces: "", comment: "消し方④" },
        { grid: ["____LL____", "____XL____", "___XXL____", "___X______", "XXXXIXXXXX", "XXXXI_XXXX", "XXXXI__XXX", "XXXXI_XXXX"], percent: null, pieces: "", comment: "消し方⑤" },
        { grid: ["____X_____", "J__XX__ZZ_", "JJJXI___ZZ", "XXXXIXXXXX", "XXXXLLXXXX", "XXXXIL_XXX", "XXXXILXXXX"], percent: null, pieces: "", comment: "消し方⑥" },
        { grid: ["____J_____", "____JJJ___", "____X_____", "J__XX____L", "JJJXTTTLLL", "XXXXIXXXXX", "XXXXITXXXX", "XXXXI__XXX", "XXXXI_XXXX"], percent: null, pieces: "", comment: "消し方⑦" },
        { grid: ["___LLL____", "___L______", "OO_SS__J__", "OOSSTTTJJJ", "XXXXIXXXXX", "XXXXITXXXX", "XXXXI__XXX", "XXXXI_XXXX"], percent: null, pieces: "", comment: "消し方⑧" },
      ],
    },
    {
      id: "keito_kubiki", title: "鶏頭くびき", source: "https://w.atwiki.jp/tetrismaps/pages/381.html", category: "中盤", total: 4,
      forms: [
        { grid: ["_Z__XXXXXX", "ZZ___XXXXX", "ZLL_XXXXXX", "__L_XXXXXX", "__LXXXXXXX", "_XXXXXXXXX", "__________", "__________", "__________", "__________", "__________", "__________", "__________", "_Z__XXXXXX", "ZZ___XXXXX", "ZOO_XXXXXX", "_OO_XXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "鶏頭くびき(製作者:金雲雀)" },
        { grid: ["_Z__XXXXXX", "ZZTTTXXXXX", "ZLLTXXXXXX", "__L_XXXXXX", "__LXXXXXXX", "_XXXXXXXXX", "__________", "__________", "__________", "__________", "__________", "__________", "__________", "_Z__XXXXXX", "ZZTTTXXXXX", "ZOOTXXXXXX", "_OO_XXXXXX", "_XXXXXXXXX"], percent: null, pieces: "", comment: "TSD" },
        { grid: ["____Z__XXX", "XXXZZ___XX", "XXXZOO_XXX", "XXXJOO_XXX", "XXXJJJ_XXX", "XXXXX__XXX", "XXXXXX_XXX"], percent: null, pieces: "", comment: "鶏頭くびき" },
        { grid: ["____Z__XXX", "XXXZZTTTXX", "XXXZOOTXXX", "XXXJOO_XXX", "XXXJJJ_XXX", "XXXXX__XXX", "XXXXXX_XXX"], percent: null, pieces: "", comment: "TSD" },
      ],
    },
  ];
  window.TT_TEMPLATES.templates.push.apply(window.TT_TEMPLATES.templates, MID);
})();
