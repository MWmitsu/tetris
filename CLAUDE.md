# テトリス練習ツール（TetrisWeb）

## このプロジェクトは何か
SRS（ぷよぷよテトリス2互換）準拠の**練習特化**テトリスWebアプリ。ビルド不要・依存なしの素のHTML/CSS/JavaScript。PWA対応。

## 技術構成
- 素のJavaScript（フレームワーク／ビルドツールなし、npm不使用）。
- `index.html` を直接開いても動作（`file://` 可）。PWA（`manifest.webmanifest` + `sw.js`）。
- 保存データは `localStorage`（テンプレ／セットアップ）。

## 動かし方
- ローカル確認: `./serve.ps1`（既定 http://localhost:8230/ ）。ポート変更は `./serve.ps1 -Port 8231`。
- 公開: 変更を commit → `git push origin main` → GitHub Pages（origin: github.com/MWmitsu/tetris）。

## モジュール地図（js/）
- `app.js` … 画面／UI制御・エントリ
- `engine.js` … SRS本体（回転・壁蹴り・7-bag・T-Spin判定）
- `fumen.js` … テト譜（v115/v110）デコーダ
- `catalog.js` / `catalog_data.js` … セットアップ一覧・初期データ
- `templates*.js` … ドリル／完成形テンプレ
- `finesse.js` / `honeycup*.js` … 操作最適化・特殊配列

## 守ってほしいこと（品質）
- **正確性が命の箇所は壊さない**: `engine.js` のSRS回転／壁蹴りテーブル、`fumen.js` のデコーダは検証済み（公式SRS突合・本家3000件一致）。変更時は必ず動作確認し、結果を提示すること。
- 変更後は `serve.ps1` で起動してブラウザで動作させ、**コンソールエラー0**を確認して報告する。
- **`sw.js` を変更したら `const CACHE = 'tetris-practice-vNN'` の版番号を上げる**（古い画面が残る事故を防ぐ）。
- `localStorage` の保存データ形式を変えるときは、既存データの移行に配慮する。
- 大きな作り直しは、まず plan mode で計画を提示してから着手する。

## Don't
- npm／ビルドツール／外部CDN依存を導入しない（依存なし・`file://`動作の方針を維持）。
- 指示外の大規模リファクタをしない。まず提案する。
- 秘匿情報をコミットしない。
