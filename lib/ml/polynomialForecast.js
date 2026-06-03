/** Regressione polinomiale grado 2 (y = a + bx + cx²). */

function gaussianSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;

    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

export function polynomialForecast(prices, degree = 2, daysAhead = 5) {
  const n = prices?.length ?? 0;
  if (degree !== 2 || n < 5) return null;

  let s0 = 0,
    s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0,
    sy = 0,
    sxy = 0,
    sx2y = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = prices[i];
    const x2 = x * x;
    s0++;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  const coeffs = gaussianSolve(
    [
      [s0, s1, s2],
      [s1, s2, s3],
      [s2, s3, s4],
    ],
    [sy, sxy, sx2y]
  );
  if (!coeffs) return null;

  const [a, b, c] = coeffs;
  const predict = (x) => a + b * x + c * x * x;

  const forecasts = [];
  for (let k = 1; k <= daysAhead; k++) {
    const x = n + k;
    forecasts.push({ dayOffset: k, dayIndex: x, price: predict(x) });
  }

  return {
    degree: 2,
    coefficients: { a, b, c },
    forecasts,
  };
}
