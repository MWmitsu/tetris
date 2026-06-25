// ============================================================
//  フィネス（最少入力）データ — テトリス練習ツール  全7ミノ（O/I/L/J/S/Z/T）
// ------------------------------------------------------------
//  出典: shiwehi.com『×ミノ(の)最適化』fumenシリーズ（ユーザー提供）＋Ｏミノ（finesse_all.json を忠実収録）。
//  行動の数え方（重要）: ←/→ の「押下1回」＝1アクション（DAS長押しも1回）。回転1回=1アクション。
//    ハードドロップは設置操作で数えない。inputs が判定用トークン、inputs_jp がサイト原文（表示・権威）。
//  各配置は (orient, leftmost_col) で一意。shape（x=右,y=上; 空盤面ハードドロップ着地形の正規化セル）から
//  盤面の目標セルを生成し、プレイヤーの設置セルと一致比較（向き＋列）で判定する。
//  app.js は ←/→ の離散押下点（pressMove / パッド方向確定 / タッチ左右）と回転（tryRotate/180）で
//  G.finesseInputs を加算し、placement.inputs.length（最適アクション数）と比較する。
// ============================================================
(function () {
  window.TT_FINESSE =
{
 "title": "テトリス フィネス（最適化）全7ミノ — Claude Code 教材データ",
 "source": "shiwehi.com『×ミノ(の)最適化』fumenシリーズ（ユーザー提供）＋Oミノ",
 "input_model": {
  "TAP_L": "← 1タップ",
  "TAP_R": "→ 1タップ",
  "DAS_L": "←長押し(DASで左壁まで)",
  "DAS_R": "→長押し(DASで右壁まで)",
  "ROT_CW": "右回転(時計回り)",
  "ROT_CCW": "左回転(反時計回り)"
 },
 "conventions": {
  "coords": "x=0..9(左→右), y=0が最下段(上向き)。配置はすべて空盤面にハードドロップした着地形。",
  "spawn_rotation": "orientの『0/横』が出現時の向き。『右』=CW1回, 『左』=CCW1回, 『180』=180回転(右回転2回等)。",
  "leftmost_col": "そのミノが占める一番左の列。orient+leftmost_colで配置が一意。",
  "inputs": "出現直後からの最小入力列(長押し=1アクション)。inputs_jpがサイト原文(権威)。"
 },
 "pieces_order": [
  "O",
  "I",
  "L",
  "J",
  "S",
  "Z",
  "T"
 ],
 "pieces": {
  "I": {
   "placements": [
    {
     "orient": "横",
     "leftmost_col": 0,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 1,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 2,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 3,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 4,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 5,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 6,
     "bbox": [
      4,
      1
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       3,
       0
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 0,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 1,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "←長押し、左回転",
     "inputs": [
      "DAS_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 2,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "←長押し、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 3,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "←、左回転",
     "inputs": [
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 4,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 5,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 6,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "右回転、→",
     "inputs": [
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 7,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "→長押し、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 8,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "→長押し、右回転",
     "inputs": [
      "DAS_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 9,
     "bbox": [
      1,
      4
     ],
     "inputs_jp": "右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       0,
       3
      ]
     ]
    }
   ],
   "notes": []
  },
  "S": {
   "placements": [
    {
     "orient": "横",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→、→",
     "inputs": [
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、左回転",
     "inputs": [
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→",
     "inputs": [
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、←、左回転",
     "inputs": [
      "DAS_R",
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ]
     ]
    }
   ],
   "notes": [
    {
     "comment": "ここの→、→だけ難しい",
     "leftmost_col": 5
    }
   ]
  },
  "Z": {
   "placements": [
    {
     "orient": "横",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→、→",
     "inputs": [
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "横",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、左回転",
     "inputs": [
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→",
     "inputs": [
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、←、左回転",
     "inputs": [
      "DAS_R",
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "縦",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、右回転",
     "inputs": [
      "DAS_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    }
   ],
   "notes": [
    {
     "comment": "→、→が難しい。",
     "leftmost_col": 5
    }
   ]
  },
  "J": {
   "placements": [
    {
     "orient": "0",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→、→",
     "inputs": [
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、右回転",
     "inputs": [
      "DAS_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転、→",
     "inputs": [
      "DAS_L",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、右回転",
     "inputs": [
      "TAP_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→、右回転",
     "inputs": [
      "TAP_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→、→、右回転",
     "inputs": [
      "TAP_R",
      "TAP_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→長押し、←",
     "inputs": [
      "ROT_CW",
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、右回転",
     "inputs": [
      "DAS_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、右回転、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、右回転、右回転、→",
     "inputs": [
      "DAS_L",
      "ROT_CW",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、←",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転",
     "inputs": [
      "ROT_CW",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→、→",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→長押し、←",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し、→",
     "inputs": [
      "ROT_CCW",
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←",
     "inputs": [
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→",
     "inputs": [
      "ROT_CCW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→、→",
     "inputs": [
      "ROT_CCW",
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転、←",
     "inputs": [
      "DAS_R",
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    }
   ],
   "notes": [
    {
     "comment": "ここと",
     "leftmost_col": 6
    },
    {
     "comment": "ここが難しい。",
     "leftmost_col": 5
    }
   ]
  },
  "T": {
   "placements": [
    {
     "orient": "0",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→、→",
     "inputs": [
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、←長押し",
     "inputs": [
      "ROT_CW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転、→",
     "inputs": [
      "DAS_L",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、右回転",
     "inputs": [
      "TAP_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→",
     "inputs": [
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→、→",
     "inputs": [
      "ROT_CW",
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、右回転、←",
     "inputs": [
      "DAS_R",
      "ROT_CW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、右回転",
     "inputs": [
      "DAS_R",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、←長押し",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、←長押し、→",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、←",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転",
     "inputs": [
      "ROT_CW",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→、→",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→長押し、←",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "右回転、右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し、→",
     "inputs": [
      "ROT_CCW",
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←",
     "inputs": [
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→",
     "inputs": [
      "ROT_CCW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→、→",
     "inputs": [
      "ROT_CCW",
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転、←",
     "inputs": [
      "DAS_R",
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、→長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       1
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    }
   ],
   "notes": [
    {
     "comment": "この位置がポイント",
     "leftmost_col": 6
    }
   ]
  },
  "O": {
   "placements": [
    {
     "orient": "—",
     "leftmost_col": 0,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 1,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 2,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "←、←",
     "inputs": [
      "TAP_L",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 3,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 4,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 5,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 6,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "→、→",
     "inputs": [
      "TAP_R",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 7,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    },
    {
     "orient": "—",
     "leftmost_col": 8,
     "bbox": [
      2,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ]
     ]
    }
   ],
   "notes": [],
   "rotation_note": "回転対称＝回転不要"
  },
  "L": {
   "placements": [
    {
     "orient": "0",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し",
     "inputs": [
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、←",
     "inputs": [
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→",
     "inputs": [
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "操作なし",
     "inputs": [],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←",
     "inputs": [
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←、←",
     "inputs": [
      "TAP_L",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し、→",
     "inputs": [
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "0",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "←長押し",
     "inputs": [
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、左回転",
     "inputs": [
      "DAS_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→長押し、左回転、←",
     "inputs": [
      "DAS_R",
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "→、左回転",
     "inputs": [
      "TAP_R",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転",
     "inputs": [
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、左回転",
     "inputs": [
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←、←、左回転",
     "inputs": [
      "TAP_L",
      "TAP_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "左回転、←長押し、→",
     "inputs": [
      "ROT_CCW",
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "左",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、左回転",
     "inputs": [
      "DAS_L",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       2
      ],
      [
       1,
       0
      ],
      [
       1,
       1
      ],
      [
       1,
       2
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 7,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、左回転、左回転",
     "inputs": [
      "DAS_R",
      "ROT_CCW",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 6,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "→長押し、左回転、左回転、←",
     "inputs": [
      "DAS_R",
      "ROT_CCW",
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 5,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転、→",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 4,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 3,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転、←",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 2,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転、←、←",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW",
      "TAP_L",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 1,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転、←長押し、→",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW",
      "DAS_L",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "180",
     "leftmost_col": 0,
     "bbox": [
      3,
      2
     ],
     "inputs_jp": "左回転、左回転、←長押し",
     "inputs": [
      "ROT_CCW",
      "ROT_CCW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       1,
       1
      ],
      [
       2,
       1
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 8,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→長押し",
     "inputs": [
      "ROT_CW",
      "DAS_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 7,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→長押し、←",
     "inputs": [
      "ROT_CW",
      "DAS_R",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 6,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、→",
     "inputs": [
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 5,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転",
     "inputs": [
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 4,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、←",
     "inputs": [
      "ROT_CW",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 3,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、←、←",
     "inputs": [
      "ROT_CW",
      "TAP_L",
      "TAP_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 2,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転、→",
     "inputs": [
      "DAS_L",
      "ROT_CW",
      "TAP_R"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 1,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "←長押し、右回転",
     "inputs": [
      "DAS_L",
      "ROT_CW"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    },
    {
     "orient": "右",
     "leftmost_col": 0,
     "bbox": [
      2,
      3
     ],
     "inputs_jp": "右回転、←長押し",
     "inputs": [
      "ROT_CW",
      "DAS_L"
     ],
     "shape": [
      [
       0,
       0
      ],
      [
       0,
       1
      ],
      [
       0,
       2
      ],
      [
       1,
       0
      ]
     ]
    }
   ],
   "notes": [
    {
     "comment": "LミノはJミノの左右反転として生成（入力も左右・回転を反転）。サイト版の独自表現が必要なら『Lミノ最適化』fumenを提供してください。"
    }
   ],
   "derived_from": "J(左右反転)"
  }
 }
};
  // メタ情報（実装判定は pieces のキー＝収録済み全ミノから自動）
  window.TT_FINESSE.meta = {
    version: "v38",
    note: "←/→の押下1回=1アクション（DAS長押しも1回）。回転1回=1アクション。ハードドロップは数えない。inputs_jpがサイト原文(権威)。",
  };
})();
