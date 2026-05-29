type CopyFn = (data: Record<string, unknown>) => { title: string; body: string };
type AlertVariant = { funny: CopyFn; serious: CopyFn };

export const ALERT_COPY: Record<string, AlertVariant> = {
  repeat_merchant: {
    funny: ({ merchant, count }) => ({ title: 'You have a type.', body: `${count}rd time at ${merchant} this week. They know your name by now.` }),
    serious: ({ merchant, count }) => ({ title: 'Repeat Merchant', body: `You have visited ${merchant} ${count} times this week.` }),
  },
  high_ride_count: {
    funny: ({ count }) => ({ title: 'Bolt frequent flyer?', body: `${count} rides this month. At this point Bolt should be paying you.` }),
    serious: ({ count }) => ({ title: 'High Transport Usage', body: `${count} rides this month. Review your transport budget.` }),
  },
  big_single_spend: {
    funny: ({ amount }) => ({ title: 'Big purchase energy.', body: `₵${amount} in one transaction. Your savings account would like a word.` }),
    serious: ({ amount, category }) => ({ title: 'Large Transaction', body: `₵${amount} is over 50% of your ${category} budget.` }),
  },
  weekend_splurge: {
    funny: () => ({ title: 'Your wallet has a social life.', body: 'Weekend spend is 3x your weekday average. The streets are calling.' }),
    serious: () => ({ title: 'Weekend Spending', body: 'Your weekend spending is significantly higher than your weekday average.' }),
  },
  night_spending: {
    funny: () => ({ title: 'After hours.', body: 'Three transactions after 10pm this week. Late night, expensive habits.' }),
    serious: () => ({ title: 'Late Night Spending', body: 'You have made 3 or more transactions after 10pm this week.' }),
  },
  consistent_merchant: {
    funny: ({ merchant }) => ({ title: 'Respect the loyalty.', body: `Four weeks in a row at ${merchant}. We respect the commitment.` }),
    serious: ({ merchant }) => ({ title: 'Consistent Merchant', body: `You have visited ${merchant} every week for the past 4 weeks.` }),
  },
  monthly_increase: {
    funny: ({ category, pct }) => ({ title: 'Somewhere to be?', body: `Your ${category} spend jumped ${pct}% this month. Any reason?` }),
    serious: ({ category, pct }) => ({ title: `${category} Spending Up`, body: `Your ${category} spending increased ${pct}% compared to last month.` }),
  },
  budget_warning: {
    funny: ({ category, pct }) => ({ title: 'Getting close.', body: `You have used ${pct}% of your ${category} budget. Ease up a little.` }),
    serious: ({ category, pct }) => ({ title: 'Budget Warning', body: `You have used ${pct}% of your ${category} budget.` }),
  },
  budget_over: {
    funny: ({ category }) => ({ title: 'Budget? What budget?', body: `Your ${category} budget is gone. No judgement — but maybe slow down.` }),
    serious: ({ category, spent, limit }) => ({ title: 'Budget Exceeded', body: `You have spent ₵${spent} against a ₵${limit} ${category} budget.` }),
  },
  encouraging_under_budget: {
    funny: () => ({ title: 'Historic.', body: 'First week under budget. Rare. Historic, even.' }),
    serious: () => ({ title: 'Under Budget', body: 'You are tracking under budget this week. Keep it up.' }),
  },
  three_months_tracking: {
    funny: () => ({ title: 'Three months. Respect.', body: 'Most people quit by month two. You did not. Respect.' }),
    serious: () => ({ title: 'Three Months of Tracking', body: 'You have been tracking your expenses for three months. Great discipline.' }),
  },
};
