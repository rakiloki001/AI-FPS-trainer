export const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

export const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};
