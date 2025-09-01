export function computeStats(durationsMs: number[]) {
  if (!durationsMs.length) return { meanMin: null, medianMin: null, modeMin: null };
  const mins = durationsMs.map(d => Math.round(d / 60000)).sort((a,b)=>a-b);
  const mean = Math.round(mins.reduce((a,b)=>a+b,0) / mins.length);
  const median = mins.length%2 ? mins[(mins.length-1)/2] : Math.round((mins[mins.length/2-1]+mins[mins.length/2])/2);
  let mode=mins[0], best=0, i=0;
  while (i<mins.length) { const v=mins[i]; let j=i; while(j<mins.length && mins[j]===v) j++; const c=j-i; if (c>best) {best=c; mode=v;} i=j; }
  return { meanMin: mean, medianMin: median, modeMin: mode };
}
