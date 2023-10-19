export function toBaseUnit(amount: string, decimals: number): string {
  const parts = amount.split('.');
  if (parts.length === 1) {
    return parts[0] + '0'.repeat(decimals);
  } else if (parts.length === 2) {
    if (parts[0].match(/^0+$/)) {
      return parts[1] + '0'.repeat(decimals - parts[1].length);
    } else {
      return parts[0] + parts[1] + '0'.repeat(decimals - parts[1].length);
    }
  } else {
    throw new Error('Invalid amount');
  }
}

export function fromBaseUnit(amount: string, decimals: number): string {
  if (amount.length <= decimals) {
    return '0.' + '0'.repeat(decimals - amount.length) + amount;
  } else {
    return amount.slice(0, amount.length - decimals) + '.' + amount.slice(amount.length - decimals);
  }
}