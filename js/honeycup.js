/* はちみつ砲（Honey Cup）収録テト譜
   出典: https://shiwehi.com/tetris/template/honeycup.php ／ fumen v115（プレーン状態図・検証済み）
   各セクションの各ページが、app側で「完成形(field型)」練習テンプレ1つに展開される（全36形）。
   配色: 水色=I 黄=O 紫=T 緑=S 赤=Z 青=J 橙=L／灰=確定スタック(ガベージ表現)。 */
window.TT_SETUPS = (window.TT_SETUPS || []);
window.TT_SETUPS.push({
  key: "honeycup",
  name: "はちみつ砲",
  desc: "TST→TSD→8段パーフェクトクリアの高火力開幕。1巡目で土台→2巡目TST→3巡目TSD＋パフェ。",
  src: "shiwehi.com（テト譜 v115）",
  sections: [
    {
      fumen: "v115@8gg0AeR4Feg0R4glDewwh0ilAeBtxwRpzhAeBtwwRpJeAgHfgzhFeh0R4BeRpBeg0R4CeRphlg0xhwwBtjlxhg0xwBtQphli0wwBtRpxwT4AeBtQpxwJeAAAfgTaFehHxDBexSBeQLhHwhhlQaQpAtgWglBeQpgWQpwwhlgWCeQpglQpAtAeBPDexSHewwOeAAA",
      labels: ["基本形① 1巡目セット完了", "基本形② 2巡目TST型", "基本形③ 3巡目TSD＋8段パフェ形"],
    },
    {
      fumen: "v115@+gR4GeR4glDewwBeilAeBtxwRpzhAeBtwwRpJeAgH+gxDDeBtAexDQpDewhBtxhQpwwRpQLwhRphlAtg0Q4APwSAPhWJeAAA",
      labels: ["1巡目 左(ホールド)型", "1巡目 右(反転)型"],
    },
    {
      fumen: "v115@fgzhFexwR4Beh0BewwR4Ceg0ilwwB8AeBtg0glRpC8BeBtA8RpC8AeJ8AeE8JeAgHvgAPIeAPCtFeAPqeAAApgxhDewhwSBewhEewhwSAPQawhGeQaglHehldeAAAggyhFeQLAPDeRpBeQLEeQpAewhAeQLEeAtxhoeAAAggCtGewhAPQaBeAPwhCeBPCeAPBtGeAPQaAtoeAAAfgQ4ilFeQ4xwglBeg0whBeQ4xwCeg0xhQpQ4BewwBth0whQpCexwBtAeRpCewwZeAAAfgDAFeDABeBABeCACeDACeQpFACeQpQLAABeBACeQLBAXeAAA",
      labels: ["2巡目 理想形P1", "2巡目 理想形P2", "2巡目 理想形P3", "2巡目 理想形P4", "2巡目 理想形P5", "2巡目→必ずTSTが入る形", "TST3列消去後の残り地形"],
    },
    {
      fumen: "v115@zgzhili0D8glR4Btg0D8R4B8BtC8ywH8wwE8JeAgH3gBtglwhBPDeAtxSRpAPDeQawSBeQpgWdeAAA3gBPgWAPwhAtDeAPRpBPAtDewhQpBeQaAtdeAAA3gBtglRaAPDeAtxSQaAewSDeQawSBexSdeAAA5gglwwFewSQaglwwAtQaDewSQaBeAtQadeAAA3gAPxSQaBtDeQaAeySAtDeRaBewSgldeAAA3gCthWAPDeAtRphWAPDexwheAAA6ghWIexhHeRadeAAA3gwSAPQLCtDeCPglwhQpDeBPBexhdeAAA3gRpAthWAPDexhAthWAPneAAA5giWEeQpwhgWAexhDeBtBeRaCehlQaHewhOeAAA3gBPgWxhAtDeQayhAeQpHeRpEewhHeAPOeAAA6gRpHexhIehWdeAAA3gQpxhGeglhWPehWglHeQpOeAAA6ghWAPGehWAPneAAA",
      labels: ["3巡目 パフェ基準形(PC形)", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13", "P14", "P15"],
    },
    {
      fumen: "v115@zgzhCeywD8CeywD8BeB8xwC8CeH8AeE8JeAgHcgQ4hlGeR4glCeBtCeQ4glDeBtAehWwhGehWwhHexhdeAAA",
      labels: ["3巡目 火力派生A(非パフェ時)", "3巡目 火力派生B(非パフェ時)"],
    },
    {
      fumen: "v115@2gT4CeD8S4CeD8R4B8BeC8ywH8wwE8JeAgH",
      labels: ["4列REN派生"],
    },
    {
      fumen: "v115@dgRpwhGeRpwhAeR4BeglAeh0whR4CeglAeg0wwwhB8AeBthlg0wwC8BeBtA8xwC8AeJ8AeE8JeAgHAhwwhWGexwhWFewwZeAAA",
      labels: ["妥協形 2巡目A(TST前)", "妥協形 2巡目B(TST設置)"],
    },
    {
      fumen: "v115@fgh0FeRpg0EeglAeRpg0wwBtilwhC8xwBtR4whC8wwB8R4A8whE8CeA8whF8AeE8JeAgHngxSAeQ4DegWwhCeglQpAPhWglAeRLAeQpglBPxSDeQLBAwDwSGeywAeQ4FewwOeAAA5gAPFeglAeBPDeilAeAPGeSLHeQLOeAAAfghHHegHwDEeQaxSAeQawDDeQaxSgWQawDgWDeRLgWxwgWBeAPAeRLBeQaglAeAtAPwDCeiHAeAPAewDLeAAA",
      labels: ["妥協形 3巡目TSTドネイトA", "妥協形 3巡目TSTドネイトB", "妥協形 3巡目TSTドネイトC", "妥協形 3巡目TSTドネイトD"],
    },
  ],
});
