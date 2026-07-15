import { describe, expect, it } from 'vitest';

import { calculateInvoiceAmounts } from './invoice.service.js';

describe('invoice calculations', () => {
  it('calculates fractional quantities using minor units without floating-point drift', () => {
    const result = calculateInvoiceAmounts(
      [
        { description: 'Engineering hours', quantityMilli: 12_500, unitAmountMinor: 8_750 },
        { description: 'Platform fee', quantityMilli: 1_000, unitAmountMinor: 2_999 },
      ],
      1_125,
      500,
    );

    expect(result.lineItems.map((item) => item.totalMinor)).toEqual([109_375, 2_999]);
    expect(result.subtotalMinor).toBe(112_374);
    expect(result.totalMinor).toBe(112_999);
  });

  it('rejects discounts that would produce a negative invoice', () => {
    expect(() =>
      calculateInvoiceAmounts(
        [{ description: 'Small item', quantityMilli: 1_000, unitAmountMinor: 100 }],
        0,
        101,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVOICE_DISCOUNT_INVALID' }));
  });
});
