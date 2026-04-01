export type KprParams = {
  principal: number;
  annualInterestRate: number;
  tenureYears: number;
};

/**
 * Cicilan bulanan anuitas: M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
 * P = pokok pinjaman (rupiah), r = suku bunga bulanan, n = jumlah bulan.
 */
export function calculateMonthlyInstallment(params: KprParams): number {
  const { principal, annualInterestRate, tenureYears } = params;
  if (principal <= 0 || tenureYears <= 0) return 0;

  const monthlyRate = annualInterestRate / 100 / 12;
  const n = Math.round(tenureYears * 12);
  if (n <= 0) return 0;

  if (monthlyRate === 0) {
    return Math.round(principal / n);
  }

  const pow = Math.pow(1 + monthlyRate, n);
  const monthly = (principal * (monthlyRate * pow)) / (pow - 1);
  return Math.round(monthly);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
