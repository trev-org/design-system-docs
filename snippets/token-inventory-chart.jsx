import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { tokenStats } from "./generated/token-stats.mdx";

const colors = [
  "var(--lumen-color-brand-500)",
  "var(--lumen-color-blue-500)",
  "var(--lumen-color-green-500)",
  "var(--lumen-color-amber-500)",
  "var(--lumen-color-red-500)",
  "var(--lumen-color-brand-300)",
  "var(--lumen-color-neutral-500)",
];

const data = tokenStats.categories.map((category, index) => ({
  ...category,
  color: colors[index],
  percentage: Math.round((category.count / tokenStats.total) * 100),
}));

const TokenTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const category = payload[0].payload;
  return (
    <div className="lm-token-inventory__tooltip">
      <span style={{ backgroundColor: category.color }} aria-hidden="true" />
      <strong>{category.name}</strong>
      <span>
        {category.count} tokens · {category.percentage}%
      </span>
    </div>
  );
};

export const TokenInventoryChart = () => (
  <div className="lm-token-inventory not-prose">
    <div className="lm-token-inventory__visual" aria-hidden="true">
      <PieChart width={320} height={320}>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={78}
          outerRadius={118}
          paddingAngle={2}
          stroke="var(--lumen-color-bg-surface)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((category) => (
            <Cell key={category.name} fill={category.color} />
          ))}
        </Pie>
        <Tooltip content={<TokenTooltip />} />
      </PieChart>
      <div className="lm-token-inventory__total">
        <strong>{tokenStats.total}</strong>
        <span>tokens</span>
      </div>
    </div>

    <ul className="lm-token-inventory__legend" aria-label="Token categories">
      {data.map((category) => (
        <li key={category.name}>
          <span
            className="lm-token-inventory__dot"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
          <span className="lm-token-inventory__name">{category.name}</span>
          <strong>{category.count}</strong>
          <span className="lm-token-inventory__percentage">{category.percentage}%</span>
        </li>
      ))}
    </ul>
  </div>
);
