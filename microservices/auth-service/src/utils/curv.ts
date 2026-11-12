import { v4 as uuidv4 } from 'uuid';

export function generateCURVCode(): string {
  const part1 = uuidv4().slice(0, 4).toUpperCase();
  const part2 = uuidv4().slice(0, 4).toUpperCase();
  return `CURV-${part1}-${part2}`;
}
