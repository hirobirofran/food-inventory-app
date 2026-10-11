export function formatQuantity(n: number): string {
  // 1.4 - 0.4 = 0.9999999999999999 のような浮動小数点の誤差を、表示精度（小数 1 桁）に丸めてから判定する
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
