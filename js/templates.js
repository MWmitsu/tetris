/* 練習テンプレート定義
   各テンプレは steps の列で表現する:
     { piece: 'O', rot: 0, col: 0 }
   col は「そのミノが実際に占める一番左の列」(0=左壁にぴったり)。
   回転状態ごとのローカル座標の差は app 側で吸収して px に変換する。
   落下行(py)はエンジンがその時点の積みに対して自動計算する
   → 人間の操作「回転して列へ動かしてハードドロップ」と一致。

   rot: 0=出現, 1=右回転(CW), 2=180, 3=左回転(CCW)。

   注意: テンプレ途中ではライン消去が起きない前提（最終手で揃える）。
   各テンプレは app の検証で「盤外/重なり/穴/PC成立」を自動チェックする。 */
window.TT_TEMPLATES = (function () {
  "use strict";

  // 手順型ドリルは廃止（要望により削除）。空配列にすると一覧の「手順型ドリル」セクションは出ない。
  const list = [];

  function byId(id) { return list.find(function (t) { return t.id === id; }); }
  function categories() {
    const out = [];
    list.forEach(function (t) { if (out.indexOf(t.category) < 0) out.push(t.category); });
    return out;
  }

  return { list: list, byId: byId, categories: categories };
})();
