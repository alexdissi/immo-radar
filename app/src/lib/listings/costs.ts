import type { Costs, Financing } from "./types";

/** Financing assumptions used to compute all-in cost and monthly payment. */
export const DEFAULT_FINANCING: Financing = { downPayment: 60000, ratePct: 3.3, years: 25, insurancePct: 0.1, netIncome: 3100 };

const TRANSFER_TAX_RATE = 0.0580665; // Paris "droits de mutation"
const SECURITY_TAX_RATE = 0.001; // "contribution de sécurité immobilière"
const FLAT_NOTARY_EXTRAS = 1200; // formalities and disbursements
const GUARANTY_RATE = 0.011; // Crédit Logement style guaranty
const VAT_RATE = 0.2;

// Regulated notary fee brackets ("émoluments proportionnels").
const NOTARY_BRACKETS = [
  { upTo: 6500, rate: 0.0387 },
  { upTo: 17000, rate: 0.01596 },
  { upTo: 60000, rate: 0.01064 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.00799 },
];

/**
 * All-in purchase cost for an existing (non-new) property. Notary fees are based on the
 * seller's net price when agency fees are paid by the buyer.
 */
export function computeCosts(price: number, netPrice: number | undefined, f: Financing): Costs {
  const notaryFees = Math.round(notaryFeesFor(netPrice || price));
  const loanGuaranty = Math.round(GUARANTY_RATE * Math.max(price + notaryFees - f.downPayment, 0));
  const totalCost = price + notaryFees + loanGuaranty;
  const loan = Math.max(totalCost - f.downPayment, 0);
  const monthly = Math.round(monthlyPayment(loan, f));
  const debtRatio = f.netIncome > 0 ? Math.round((monthly / f.netIncome) * 1000) / 10 : 0;
  return { notaryFees, loanGuaranty, totalCost, loan, monthly, debtRatio };
}

export function notaryFeesFor(netPrice: number): number {
  if (netPrice <= 0) return 0;
  let emoluments = 0;
  let lower = 0;
  for (const { upTo, rate } of NOTARY_BRACKETS) {
    if (netPrice > lower) emoluments += (Math.min(netPrice, upTo) - lower) * rate;
    lower = upTo;
  }
  return netPrice * TRANSFER_TAX_RATE + emoluments * (1 + VAT_RATE) + Math.max(netPrice * SECURITY_TAX_RATE, 15) + FLAT_NOTARY_EXTRAS;
}

/** Fixed-rate annuity plus borrower insurance on the initial capital. */
export function monthlyPayment(loan: number, f: Financing): number {
  if (loan <= 0 || f.years <= 0) return 0;
  const n = f.years * 12;
  const r = f.ratePct / 100 / 12;
  const annuity = r > 0 ? (loan * r) / (1 - (1 + r) ** -n) : loan / n;
  return annuity + (loan * f.insurancePct) / 100 / 12;
}
