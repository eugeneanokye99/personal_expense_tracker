import { useExpenseStore } from '../store/ExpenseStore';

const CATEGORY_COLORS = {
  'Food & Dining': '#8b5cf6',
  'Transportation': '#06b6d4',
  'Shopping': '#ec4899',
  'Entertainment': '#f59e0b',
  'Bills & Utilities': '#10b981',
  'Healthcare': '#ef4444',
  'Travel': '#3b82f6',
  'Other': '#6b7280'
};

export default function SpendRing() {
  const { expenses, getTotalSpent } = useExpenseStore();

  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const total = getTotalSpent();
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let currentAngle = 0;
  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  const strokeWidth = 20;

  const segments = sortedCategories.map(([category, amount]) => {
    const percentage = (amount / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const path = `
      M ${centerX} ${centerY}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `;

    currentAngle = endAngle;

    return {
      category,
      amount,
      percentage,
      path,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other
    };
  });

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 200 200" className="w-full h-auto">
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill={segment.color}
            opacity="0.8"
            className="transition-opacity hover:opacity-100"
          />
        ))}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth / 2}
          fill="#0f172a"
        />
      </svg>

      <div className="space-y-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-slate-300 text-sm">{segment.category}</span>
            </div>
            <span className="text-slate-400 text-sm">{segment.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
