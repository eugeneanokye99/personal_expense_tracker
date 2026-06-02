const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type CopyFn = (data: Record<string, any>) => { title: string; body: string };
type AlertVariant = { funny: CopyFn; serious: CopyFn };

export const ALERT_COPY: Record<string, AlertVariant> = {
  repeat_merchant: {
    funny: ({ merchant, count }) => {
      const options = [
        { title: 'Did you marry this shop?', body: `${count} times at ${merchant} this week. Chale, your salary is basically a direct transfer to them. Are you sponsoring their children's education?` },
        { title: 'You have a type.', body: `${count}rd time at ${merchant} this week. They know your name by now.` },
        { title: 'Chale, you have a type!', body: `${count} visits to ${merchant} this week. They should put your face on their signpost at this rate.` }
      ];
      return pickRandom(options);
    },
    serious: ({ merchant, count }) => ({ title: 'Repeat Merchant', body: `You have visited ${merchant} ${count} times this week.` }),
  },
  high_ride_count: {
    funny: ({ count }) => {
      const options = [
        { title: 'East Legon Prince, are you walking-disabled?', body: `${count} rides this month. Your legs are not just for decoration, you know. Walk small, it is free and your bank account is literally begging you.` },
        { title: 'Bolt frequent flyer?', body: `${count} rides this month. At this point Bolt should be paying you.` },
        { title: 'East Legon big boy?', body: `${count} rides this month. Are you trying to buy the Bolt car or what? Try walking, it is free.` }
      ];
      return pickRandom(options);
    },
    serious: ({ count }) => ({ title: 'High Transport Usage', body: `${count} rides this month. Review your transport budget.` }),
  },
  big_single_spend: {
    funny: ({ amount }) => {
      const options = [
        { title: 'Who are you trying to impress?', body: `₵${amount} gone in a single tap! Chale, you are spending like a corrupt politician. Your savings account is in the ICU on life support.` },
        { title: 'Big purchase energy.', body: `₵${amount} in one transaction. Your savings account would like a word.` },
        { title: 'Chale, who are you showing off to?', body: `₵${amount} in a single tap! Your savings account is in critical condition. Emergency meeting required.` }
      ];
      return pickRandom(options);
    },
    serious: ({ amount, category }) => ({ title: 'Large Transaction', body: `₵${amount} is over 50% of your ${category} budget.` }),
  },
  weekend_splurge: {
    funny: () => {
      const options = [
        { title: 'Weekend Big Spender, prepare to eat sand!', body: 'Your weekend spend is 3x your weekday average. You went to the pub and shouted "bills on me," didn\'t you? Get ready for gari and water till payday.' },
        { title: 'Your wallet has a social life.', body: 'Weekend spend is 3x your weekday average. The streets are calling.' },
        { title: 'The streets are calling you.', body: 'Your weekend spend is 3x your weekday average. Chale, you are sponsoring the entire pub or what?' }
      ];
      return pickRandom(options);
    },
    serious: () => ({ title: 'Weekend Spending', body: 'Your weekend spending is significantly higher than your weekday average.' }),
  },
  night_spending: {
    funny: () => {
      const options = [
        { title: 'Late night foolishness?', body: 'Transactions detected after 10 PM. Sending MoMo to a premium "baby" who doesn\'t even love you, or late-night pork? Go to sleep, sleep is free!' },
        { title: 'After hours.', body: 'Three transactions after 10pm this week. Late night, expensive habits.' },
        { title: 'Late night cravings?', body: 'Late night transactions detected after 10 PM. Are you buying Gob3 or sending MoMo to a premium "baby"? Reveal your secrets.' }
      ];
      return pickRandom(options);
    },
    serious: () => ({ title: 'Late Night Spending', body: 'You have made 3 or more transactions after 10pm this week.' }),
  },
  consistent_merchant: {
    funny: ({ merchant }) => {
      const options = [
        { title: 'Are you their shareholder?', body: `Four weeks in a row at ${merchant}. You are literally the reason their business is still open. Show some self-respect and cook at home.` },
        { title: 'Respect the loyalty.', body: `Four weeks in a row at ${merchant}. We respect the commitment.` },
        { title: 'Are you their landlord?', body: `Four weeks in a row at ${merchant}. You should ask them for shares in the company.` }
      ];
      return pickRandom(options);
    },
    serious: ({ merchant }) => ({ title: 'Consistent Merchant', body: `You have visited ${merchant} every week for the past 4 weeks.` }),
  },
  monthly_increase: {
    funny: ({ category, pct }) => {
      const options = [
        { title: 'Absolute financial madness!', body: `Your ${category} spending jumped ${pct}% this month. Did your ancestors tell you that money grows on neem trees? Seek help immediately.` },
        { title: 'Somewhere to be?', body: `Your ${category} spend jumped ${pct}% this month. Any reason?` },
        { title: 'Chale, dial it down!', body: `Your ${category} spending jumped ${pct}% this month. Did you win a lottery we don't know about?` }
      ];
      return pickRandom(options);
    },
    serious: ({ category, pct }) => ({ title: `${category} Spending Up`, body: `Your ${category} spending increased ${pct}% compared to last month.` }),
  },
  budget_warning: {
    funny: ({ category, pct }) => {
      const options = [
        { title: 'Your wallet is crying in Ga.', body: `You have blown through ${pct}% of your ${category} budget. If you don't park the car and start walking, poverty is waiting for you at the next junction.` },
        { title: 'Getting close.', body: `You have used ${pct}% of your ${category} budget. Ease up a little.` },
        { title: 'Your budget is screaming.', body: `You have used ${pct}% of your ${category} limit. Park the car and prepare to walk if it's Transport.` }
      ];
      return pickRandom(options);
    },
    serious: ({ category, pct }) => ({ title: 'Budget Warning', body: `You have used ${pct}% of your ${category} budget.` }),
  },
  budget_over: {
    funny: ({ category }) => {
      const options = [
        { title: 'Zero self-control.', body: `Your ${category} budget is dead and buried. You have completely failed. May your bank account receive emergency deliverance prayers.` },
        { title: 'Budget? What budget?', body: `Your ${category} budget is gone. No judgement — but maybe slow down.` },
        { title: 'Budget has left the chat.', body: `Your ${category} budget is completely blown. May your bank account rest in peace.` }
      ];
      return pickRandom(options);
    },
    serious: ({ category, spent, limit }) => ({ title: 'Budget Exceeded', body: `You have spent ₵${spent} against a ₵${limit} ${category} budget.` }),
  },
  encouraging_under_budget: {
    funny: () => {
      const options = [
        { title: 'A literal miracle.', body: 'You actually stayed under budget this week. Rare. Historic. We are checking if our database is broken.' },
        { title: 'Historic.', body: 'First week under budget. Rare. Historic, even.' },
        { title: 'Miracle of the year.', body: 'You actually stayed under budget this week. We are printing a certificate for you.' }
      ];
      return pickRandom(options);
    },
    serious: () => ({ title: 'Under Budget', body: 'You are tracking under budget this week. Keep it up.' }),
  },
  three_months_tracking: {
    funny: () => {
      const options = [
        { title: 'Discipline! Are you sure you are Ghanaian?', body: 'You have tracked for 3 months. Most people quit in week two. We respect the stubbornness.' },
        { title: 'Three months. Respect.', body: 'Most people quit by month two. You did not. Respect.' },
        { title: 'Discipline! Respect.', body: 'You have tracked for 3 months. Even your bank manager is impressed.' }
      ];
      return pickRandom(options);
    },
    serious: () => ({ title: 'Three Months of Tracking', body: 'You have been tracking your expenses for three months. Great discipline.' }),
  },
};
