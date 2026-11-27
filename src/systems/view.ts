// 画面の描画倍率（純粋ロジック）
// ドット絵の点の大きさをそろえるため、端末の実際の画素数で描き、
// 「1ドット＝整数個の画素」になる倍率を選ぶ。v0.1.3：画面の論理サイズで約1.33倍を目標にする（設計レビュー13 M8）。

export const TARGET_CSS_ZOOM = 4 / 3;

/** 1ドットを何画素で描くか（整数）。例：画素比3→4（=1.33倍）、画素比2→3（=1.5倍）、画素比1→1（=1倍） */
export function pixelZoom(devicePixelRatio: number, target = TARGET_CSS_ZOOM): number {
  const dpr = devicePixelRatio > 0 && Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  return Math.max(1, Math.round(target * dpr));
}

/** 描画用の画面の大きさ（画素）。論理サイズ×画素比を整数に丸める */
export function bufferSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): { width: number; height: number } {
  const dpr = devicePixelRatio > 0 && Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  return { width: Math.max(1, Math.round(cssWidth * dpr)), height: Math.max(1, Math.round(cssHeight * dpr)) };
}
