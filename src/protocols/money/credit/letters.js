// src/protocols/money/credit/letters.js
import { DISPUTE_TYPES, BUREAUS } from './data.js';

export function generateLetterByType(type, dispute, prof) {
  const bureau = BUREAUS.find((b) => b.id === dispute.bureau);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const header = `${prof.name || '[YOUR NAME]'}
[YOUR ADDRESS]
[CITY, STATE ZIP]

${today}

${bureau?.name || '[BUREAU]'}
${bureau?.addr || '[ADDRESS]'}

`;
  const footer = `

Sincerely,

${prof.name || '[YOUR NAME]'}

Enclosures: Copy of government-issued ID, proof of address, relevant documentation`;
  const acctLine = dispute.accountNum ? `Account/Reference #: ${dispute.accountNum}\n` : '';

  if (type === 'followup') return header + `Re: SECOND NOTICE \u2014 Demand for Removal (FCRA Violation)
${acctLine}
To Whom It May Concern:

I previously submitted a dispute regarding the following item on my credit report on ${dispute.dateOpened || '[DATE]'}:

Creditor: ${dispute.creditor}
Dispute Type: ${DISPUTE_TYPES.find((t) => t.id === dispute.type)?.label || 'Inaccuracy'}
${dispute.amount ? `Amount: $${dispute.amount}\n` : ''}
More than 30 days have passed since my original dispute, and I have not received adequate results of your investigation as required by FCRA Section 611(a)(1).

Under the FCRA, you were required to:
1. Conduct a reasonable investigation within 30 days
2. Provide written results of said investigation
3. Remove or modify any unverified information

Your failure to respond within the statutory timeframe constitutes a violation of federal law. I demand that this item be immediately removed from my credit report.

If this item is not removed within 15 days of receipt of this letter, I will file complaints with the Consumer Financial Protection Bureau (CFPB), the Federal Trade Commission (FTC), and my state Attorney General's office. I may also pursue legal remedies under FCRA Section 616 and 617, which provide for actual damages, statutory damages up to $1,000, and attorney's fees.${footer}`;

  if (type === 'cfpb') return header + `Re: CFPB Complaint \u2014 FCRA Violation by ${bureau?.name || 'Bureau'}
${acctLine}
To: Consumer Financial Protection Bureau
1700 G Street NW, Washington, DC 20552

I am filing this complaint because ${bureau?.name || 'the credit bureau'} has failed to properly investigate my dispute regarding:

Creditor: ${dispute.creditor}
Type: ${DISPUTE_TYPES.find((t) => t.id === dispute.type)?.label || 'Inaccuracy'}
${dispute.amount ? `Amount: $${dispute.amount}\n` : ''}
Timeline of events:
- ${dispute.dateOpened || '[DATE]'}: Initial dispute letter sent via certified mail
- 30+ days elapsed with no adequate response or correction

The bureau has violated FCRA Section 611 by failing to conduct a reasonable investigation within 30 days. I request that the CFPB intervene and require the bureau to remove this unverified item from my credit report.

I have attached copies of my original dispute letter, certified mail receipt, and the relevant portion of my credit report.${footer}`;

  if (type === 'section609') return header + `Re: Request for Method of Verification \u2014 FCRA Section 609
${acctLine}
To Whom It May Concern:

Pursuant to FCRA Section 609(a)(1), I am requesting that you provide me with all information in my file at the time of my request, including the sources of the information.

Specifically, I am requesting the method of verification used to confirm the accuracy of the following account:

Creditor: ${dispute.creditor}
${dispute.amount ? `Amount: $${dispute.amount}\n` : ''}${dispute.accountNum ? `Account #: ${dispute.accountNum}\n` : ''}
Please provide:
1. The name, address, and telephone number of each person contacted regarding this account
2. A copy of any documents used to verify the accuracy of this information
3. The complete method of verification, including all procedures used

If you cannot provide adequate verification documentation, this item must be removed from my credit report per FCRA Section 611.${footer}`;

  if (type === 'goodwill') return `${prof.name || '[YOUR NAME]'}
[YOUR ADDRESS]
[CITY, STATE ZIP]

${today}

${dispute.creditor}
[CREDITOR ADDRESS]

Re: Goodwill Adjustment Request
${acctLine}
Dear ${dispute.creditor} Customer Service,

I am writing to request a goodwill adjustment on my account. I have been a loyal customer and have maintained a generally positive payment history. Unfortunately, I experienced a ${DISPUTE_TYPES.find((t) => t.id === dispute.type)?.label?.toLowerCase() || 'negative mark'} that is now appearing on my credit report.

${dispute.reason || 'Due to circumstances beyond my control, I fell behind on this account. Since then, I have taken steps to ensure all my accounts remain current.'}

I understand that you are under no obligation to make this adjustment, but I am asking as a gesture of goodwill. The negative mark is significantly impacting my credit score and my ability to achieve important financial goals.

I would greatly appreciate your consideration in removing or adjusting this item on my credit report. I value my relationship with ${dispute.creditor} and look forward to continuing as a customer.

Thank you for your time and consideration.

Sincerely,

${prof.name || '[YOUR NAME]'}`;

  if (type === 'pay_delete') return `${prof.name || '[YOUR NAME]'}
[YOUR ADDRESS]
[CITY, STATE ZIP]

${today}

${dispute.creditor}
[CREDITOR/COLLECTION AGENCY ADDRESS]

Re: Pay-for-Delete Agreement
${acctLine}
To Whom It May Concern:

I am writing regarding the account referenced above${dispute.amount ? ` with a balance of $${dispute.amount}` : ''}. I would like to resolve this matter and am prepared to make payment in full in exchange for the complete removal of this account from all three credit bureaus (Experian, Equifax, and TransUnion).

I am proposing the following agreement:
1. I will pay ${dispute.amount ? `$${dispute.amount}` : 'the full balance'} via [PAYMENT METHOD]
2. Upon receipt of payment, you will request deletion of this account from all three credit bureaus within 30 days
3. You will provide written confirmation of this agreement before payment is made

Please note that a payment plan or settlement without deletion is not acceptable. If this agreement is not possible, I will exercise my rights under the FCRA and FDCPA to dispute the validity of this debt.

Please respond in writing to the address above.

Sincerely,

${prof.name || '[YOUR NAME]'}`;

  if (type === 'debt_validation') return header + `Re: Debt Validation Request \u2014 FDCPA Section 809(b)
${acctLine}
To Whom It May Concern:

I am writing in response to a collection account from ${dispute.creditor}${dispute.amount ? ` in the amount of $${dispute.amount}` : ''}. Pursuant to the Fair Debt Collection Practices Act (FDCPA) Section 809(b), I am requesting validation of this debt.

Please provide the following:
1. The amount of the debt and how it was calculated
2. The name and address of the original creditor
3. Proof that you are licensed to collect debts in my state
4. A copy of the original signed agreement between myself and the original creditor
5. Proof of your authority to collect this debt (assignment or purchase agreement)
6. A complete payment history from the original creditor

Until this debt is validated, I demand that all collection activity cease and that you do not report or continue reporting this account to any credit bureau. Under the FDCPA, you must cease collection until adequate validation is provided.

If you cannot validate this debt, I demand that it be permanently removed from my credit report with all three bureaus.${footer}`;

  return generateDisputeLetter(dispute, prof);
}

export function generateDisputeLetter(dispute, prof) {
  const bureau = BUREAUS.find((b) => b.id === dispute.bureau);
  const dt = DISPUTE_TYPES.find((t) => t.id === dispute.type);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const reasons = {
    late_payment: `I am writing to dispute a late payment reported on my account with ${dispute.creditor}. After reviewing my records, I believe this late payment is being reported inaccurately. I have maintained timely payments on this account and request that you investigate this matter and correct the reporting to reflect my accurate payment history.`,
    collection: `I am writing to dispute a collection account from ${dispute.creditor}${dispute.amount ? ` in the amount of $${dispute.amount}` : ''}. I do not believe this debt is valid and/or it is being reported inaccurately. Under the FCRA, I request that you verify this debt with the original creditor and provide documentation proving the validity and accuracy of this account.`,
    charge_off: `I am writing to dispute a charge-off reported by ${dispute.creditor}. I believe this account is being reported inaccurately on my credit report. I request that you investigate the accuracy of the balance, dates, and status of this account and correct any inaccuracies.`,
    hard_inquiry: `I am writing to dispute a hard inquiry from ${dispute.creditor} that appears on my credit report. I did not authorize this credit pull and do not have a business relationship with this company. Under the FCRA Section 604, a permissible purpose is required for any credit inquiry. I request that this unauthorized inquiry be removed immediately.`,
    wrong_balance: `I am writing to dispute an incorrect balance being reported on my account with ${dispute.creditor}. The balance shown on my credit report does not match my records. I request that you investigate and correct the balance to accurately reflect my account status.`,
    wrong_account: `I am writing to dispute an account from ${dispute.creditor} that appears on my credit report. This account does not belong to me. I have no knowledge of this account and did not open or authorize it. This may be the result of a mixed file or identity error. I request immediate removal of this account from my credit report.`,
    wrong_status: `I am writing to dispute the reported status of my account with ${dispute.creditor}. The current status shown on my credit report is inaccurate. I request that you investigate and update the account status to reflect the correct information.`,
    duplicate: `I am writing to dispute a duplicate account from ${dispute.creditor} appearing on my credit report. This same debt is being reported multiple times, which is inaccurate and negatively impacts my credit score. I request that the duplicate entry be removed.`,
    outdated: `I am writing to dispute an account from ${dispute.creditor} that should have been removed from my credit report. Under the FCRA Section 605, most negative information must be removed after 7 years. This account has exceeded that timeframe and I request its immediate removal.`,
    bankruptcy: `I am writing to dispute incorrect bankruptcy information on my credit report related to ${dispute.creditor}. The reporting of this item is inaccurate. I request that you investigate and correct or remove this entry.`,
  };
  const customReason = dispute.reason ? `\n\nAdditionally: ${dispute.reason}` : '';
  return `${prof.name || '[YOUR NAME]'}
[YOUR ADDRESS]
[CITY, STATE ZIP]

${today}

${bureau?.name || '[BUREAU]'}
${bureau?.addr || '[ADDRESS]'}

Re: Dispute of Inaccurate Information
${dispute.accountNum ? `Account/Reference #: ${dispute.accountNum}` : ''}

To Whom It May Concern:

I am writing pursuant to the Fair Credit Reporting Act (FCRA), 15 U.S.C. \xA7 1681 et seq., to dispute inaccurate information on my credit report.

The following item is inaccurate and requires investigation:

Creditor: ${dispute.creditor || '[CREDITOR NAME]'}
Type of Dispute: ${dt?.label || 'Inaccurate Information'}
${dispute.amount ? `Amount in Question: $${dispute.amount}` : ''}

${reasons[dispute.type] || 'I am disputing this item as inaccurate.'}${customReason}

Under the FCRA, you are required to:
1. Conduct a reasonable investigation within 30 days
2. Forward all relevant documents to the information furnisher
3. Provide me with written results of the investigation
4. Remove or modify any information found to be inaccurate

I request that you investigate this matter and provide me with the results in writing. If the information cannot be verified, I request that it be promptly deleted from my credit report.

Please send your response to the address listed above.

Sincerely,

${prof.name || '[YOUR NAME]'}

Enclosures: Copy of credit report with disputed item(s) highlighted, copy of government-issued ID, proof of address`;
}

export function getScoreAnalysis(scores, disputes) {
  if (!scores.length) return { range: 'Unknown', color: '#6B7280', tips: [], latest: null, delta: 0 };
  const latest = scores[scores.length - 1].score;
  const prev = scores.length > 1 ? scores[scores.length - 2].score : null;
  const delta = prev ? latest - prev : 0;
  const range = latest >= 750 ? 'Excellent' : latest >= 700 ? 'Good' : latest >= 650 ? 'Fair' : latest >= 600 ? 'Poor' : 'Very Poor';
  const color = latest >= 750 ? '#34D399' : latest >= 700 ? '#60A5FA' : latest >= 650 ? '#FBBF24' : latest >= 600 ? '#F97316' : '#EF4444';
  const tips = [];
  const activeDisputes = disputes.filter((d) => d.status !== 'resolved');
  if (latest < 700) tips.push('Focus on removing negative items \u2014 each deletion can boost 20-50 points');
  if (activeDisputes.length > 0) tips.push(`${activeDisputes.length} active dispute${activeDisputes.length > 1 ? 's' : ''} in progress \u2014 follow up after 30 days`);
  if (latest < 750) tips.push('Keep credit utilization below 10% for maximum score impact');
  tips.push('Never miss a payment \u2014 payment history is 35% of your score');
  if (latest < 700) tips.push('Consider becoming an authorized user on an old account with perfect history');
  if (disputes.filter((d) => d.type === 'hard_inquiry').length > 0) tips.push('Hard inquiries fall off after 2 years \u2014 dispute any you didn\'t authorize');
  return { range, color, delta, latest, tips };
}
