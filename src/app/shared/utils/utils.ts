export const range = (start: number, end: number): number[] => {
  return [...Array(end - start).keys()].map((i) => i + start);
};

export const pluck = (elements: any[], field: string): any[] => {
  return elements.map((element) => element[field]);
}
