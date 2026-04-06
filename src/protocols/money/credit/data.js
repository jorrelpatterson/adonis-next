// src/protocols/money/credit/data.js

export const DISPUTE_TYPES = [
  { id: 'late_payment', label: 'Late Payment', icon: '\u23F0', impact: 'high', desc: '30/60/90 day late marks' },
  { id: 'collection', label: 'Collection Account', icon: '\u{1F4CB}', impact: 'high', desc: 'Accounts sent to collections' },
  { id: 'charge_off', label: 'Charge-Off', icon: '\u{1F6AB}', impact: 'high', desc: 'Accounts written off by creditor' },
  { id: 'hard_inquiry', label: 'Hard Inquiry', icon: '\u{1F50D}', impact: 'low', desc: 'Unauthorized credit pulls' },
  { id: 'wrong_balance', label: 'Incorrect Balance', icon: '\u{1F4B0}', impact: 'medium', desc: 'Balance reported incorrectly' },
  { id: 'wrong_account', label: 'Account Not Mine', icon: '\u2753', impact: 'high', desc: 'Identity error or fraud' },
  { id: 'wrong_status', label: 'Incorrect Status', icon: '\u{1F4CA}', impact: 'medium', desc: 'Closed shown as open, etc.' },
  { id: 'duplicate', label: 'Duplicate Account', icon: '\u{1F4D1}', impact: 'medium', desc: 'Same debt reported twice' },
  { id: 'outdated', label: 'Outdated Info', icon: '\u{1F4C5}', impact: 'medium', desc: 'Should have fallen off (7+ years)' },
  { id: 'bankruptcy', label: 'Bankruptcy Error', icon: '\u2696\uFE0F', impact: 'high', desc: 'Incorrect bankruptcy reporting' },
];

export const BUREAUS = [
  { id: 'experian', name: 'Experian', addr: 'P.O. Box 4500, Allen, TX 75013' },
  { id: 'equifax', name: 'Equifax', addr: 'P.O. Box 740256, Atlanta, GA 30374' },
  { id: 'transunion', name: 'TransUnion', addr: 'P.O. Box 2000, Chester, PA 19016' },
];

export const DISPUTE_STATUS = ['pending', 'sent', 'in_review', 'resolved', 'rejected'];

export const DISPUTE_IMPACT = {
  late_payment: { min: 20, max: 50, label: 'High' },
  collection: { min: 25, max: 60, label: 'High' },
  charge_off: { min: 20, max: 50, label: 'High' },
  hard_inquiry: { min: 3, max: 10, label: 'Low' },
  wrong_balance: { min: 5, max: 25, label: 'Medium' },
  wrong_account: { min: 30, max: 70, label: 'Very High' },
  wrong_status: { min: 10, max: 30, label: 'Medium' },
  duplicate: { min: 15, max: 40, label: 'Medium' },
  outdated: { min: 15, max: 35, label: 'Medium' },
  bankruptcy: { min: 30, max: 100, label: 'Very High' },
};

export const CREDIT_FACTORS = [
  { id: 'payment', label: 'Payment History', weight: 35, icon: '\u{1F4C6}', desc: 'On-time payments across all accounts' },
  { id: 'utilization', label: 'Credit Utilization', weight: 30, icon: '\u{1F4B3}', desc: 'Total balance vs total credit limits' },
  { id: 'age', label: 'Credit Age', weight: 15, icon: '\u23F3', desc: 'Average age of all accounts' },
  { id: 'mix', label: 'Credit Mix', weight: 10, icon: '\u{1F500}', desc: 'Variety of account types' },
  { id: 'inquiries', label: 'Hard Inquiries', weight: 10, icon: '\u{1F50D}', desc: 'Recent credit applications' },
];

export const LETTER_TYPES = [
  { id: 'initial', label: 'Initial Dispute', icon: '\u{1F4DD}', desc: 'Standard FCRA Section 611 dispute' },
  { id: 'followup', label: 'Follow-Up (Round 2)', icon: '\u{1F4EC}', desc: '30-day deadline passed, demand removal' },
  { id: 'cfpb', label: 'CFPB Complaint', icon: '\u{1F3DB}\uFE0F', desc: 'Escalate to Consumer Financial Protection Bureau' },
  { id: 'section609', label: '609 Letter', icon: '\u{1F4DC}', desc: 'Request method of verification under FCRA 609' },
  { id: 'goodwill', label: 'Goodwill Letter', icon: '\u{1F91D}', desc: 'Request removal based on good payment history' },
  { id: 'pay_delete', label: 'Pay-for-Delete', icon: '\u{1F4B0}', desc: 'Offer payment in exchange for removal' },
  { id: 'debt_validation', label: 'Debt Validation', icon: '\u{1F4CB}', desc: 'Demand proof debt is valid under FDCPA' },
];
