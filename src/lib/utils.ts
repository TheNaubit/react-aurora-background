/**
 * It returns a random number between the min and max values
 * @param {number} min - The minimum number that can be returned.
 * @param {number} max - The maximum number of the range.
 * @returns A random number between min and max.
 */
export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
