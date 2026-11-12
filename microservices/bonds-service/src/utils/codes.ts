import { v4 as uuidv4 } from 'uuid';

export function generateBondCode(type: string): string {
  const prefix = {
    OXYGEN: 'OX2',
    FAUNA: 'FNA',
    CARBON24: 'CB24',
    HYDROGEN: 'H2V',
  }[type] || 'BND';

  const part1 = uuidv4().slice(0, 3).toUpperCase();
  const part2 = uuidv4().slice(0, 3).toUpperCase();

  return `${prefix}-${part1}-${part2}`;
}
