import { range, pluck } from './utils';

describe('utils', () => {
  describe('range', () => {
    it('should return correct range from 1 to 5', () => {
      expect(range(1, 5)).toEqual([1, 2, 3, 4]);
    });

    it('should return correct range from 41 to 45', () => {
      expect(range(41, 45)).toEqual([41, 42, 43, 44]);
    });
  });

  describe('pluck', () => {
    it('should return an array of values from the given field', () => {
      const elements = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      expect(pluck(elements, 'name')).toEqual(['John', 'Jane', 'Bob']);
    });
  });
});
