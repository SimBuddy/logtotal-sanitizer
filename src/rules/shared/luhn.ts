export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits) || /^0+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let doubleIt = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);

    if (doubleIt) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    doubleIt = !doubleIt;
  }

  return sum % 10 === 0;
}
