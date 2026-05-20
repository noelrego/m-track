export function formatInr(amountPaise: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amountPaise / 100);
}

export function parseInrToPaise(value: string) {
  const normalizedValue = value.trim().replace(/,/g, '');

  if (!/^\d+(\.\d{0,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [rupees, paise = ''] = normalizedValue.split('.');
  const amountPaise = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return null;
  }

  return amountPaise;
}
