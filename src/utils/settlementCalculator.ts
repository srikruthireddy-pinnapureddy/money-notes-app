export type Balance = {
  user_id: string;
  display_name: string;
  balance: number;
};

export type Settlement = {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
};

/**
 * Calculates the minimum number of transactions needed to settle all debts
 * Uses a greedy algorithm to match creditors with debtors
 */
export function calculateOptimalSettlements(balances: Balance[]): Settlement[] {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  
  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: Settlement[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Determine the settlement amount (minimum of what's owed and what's due)
    const settlementAmount = Math.min(creditor.balance, debtor.balance);

    if (settlementAmount > 0.01) {
      settlements.push({
        from_user_id: debtor.user_id,
        from_user_name: debtor.display_name,
        to_user_id: creditor.user_id,
        to_user_name: creditor.display_name,
        amount: Math.round(settlementAmount * 100) / 100, // Round to 2 decimals
      });

      // Update balances
      creditor.balance -= settlementAmount;
      debtor.balance -= settlementAmount;
    }

    // Move to next creditor or debtor if balance is settled
    if (creditor.balance < 0.01) i++;
    if (debtor.balance < 0.01) j++;
  }

  return settlements;
}
