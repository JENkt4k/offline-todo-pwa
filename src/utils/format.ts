export const fmt = (ms:number) => {
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2,'0')}`;
};
