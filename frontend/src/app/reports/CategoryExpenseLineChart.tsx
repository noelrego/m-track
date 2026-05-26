import { ResponsiveLine } from '@nivo/line';
import { ExpenseCategoryKey } from '../../common';
import { formatInr } from '../../shared/utils/money';
import type { MonthlyCategoryExpenseTrendResponse } from './reports.types';

interface CategoryExpenseLineChartProps {
  data: MonthlyCategoryExpenseTrendResponse | null;
  selectedCategory: ExpenseCategoryKey | 'all';
}

const categoryColors: Record<ExpenseCategoryKey, string> = {
  [ExpenseCategoryKey.Needs]: '#66bfb6',
  [ExpenseCategoryKey.Wants]: '#f5b33d',
  [ExpenseCategoryKey.Emis]: '#8d78d6',
  [ExpenseCategoryKey.Extra]: '#f36f4e',
  [ExpenseCategoryKey.Invest]: '#242424',
};

export function CategoryExpenseLineChart({
  data,
  selectedCategory,
}: CategoryExpenseLineChartProps) {
  const visibleCategories =
    data?.categories.filter((category) =>
      selectedCategory === 'all'
        ? true
        : category.normalizedName === selectedCategory,
    ) ?? [];
  const labelByMonthKey = new Map(
    data?.months.map((month) => [month.monthKey, month.label]) ?? [],
  );
  const tickValues =
    (data?.months.length ?? 0) > 8
      ? data?.months
          .filter((_, index) => index % 2 === 0)
          .map((month) => month.monthKey)
      : undefined;
  const chartData = visibleCategories.map((category) => ({
    id: category.categoryName,
    data: category.months.map((month) => ({
      x: month.monthKey,
      y: month.totalPaise / 100,
      categoryName: category.categoryName,
      monthName: month.monthName,
      totalPaise: month.totalPaise,
    })),
  }));
  const colors = visibleCategories.map(
    (category) => categoryColors[category.normalizedName],
  );

  return (
    <div className="h-[260px] min-h-[260px]">
      <ResponsiveLine
        animate
        axisBottom={{
          format: (value) => labelByMonthKey.get(String(value)) ?? String(value),
          tickPadding: 10,
          tickRotation: 0,
          tickSize: 0,
          tickValues,
        }}
        axisLeft={{
          format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
          tickPadding: 10,
          tickSize: 0,
        }}
        colors={colors}
        curve="monotoneX"
        data={chartData}
        enableArea={false}
        enableGridX={false}
        enablePoints
        gridYValues={4}
        lineWidth={3}
        margin={{ bottom: 42, left: 76, right: 24, top: 18 }}
        motionConfig="gentle"
        pointBorderColor="#ffffff"
        pointBorderWidth={2}
        pointSize={7}
        role="application"
        theme={{
          axis: {
            ticks: {
              text: {
                fill: '#71717a',
                fontSize: 11,
              },
            },
          },
          crosshair: {
            line: {
              stroke: '#18181b',
              strokeOpacity: 0.18,
              strokeWidth: 1,
            },
          },
          grid: {
            line: {
              stroke: '#f0e5dc',
              strokeWidth: 1,
            },
          },
          tooltip: {
            container: {
              borderRadius: 8,
              boxShadow: '0 14px 30px rgba(24, 24, 27, 0.14)',
              color: '#18181b',
              fontSize: 12,
            },
          },
        }}
        tooltip={({ point }) => {
          const totalPaise =
            typeof point.data.totalPaise === 'number'
              ? point.data.totalPaise
              : Number(point.data.y) * 100;
          const categoryName =
            typeof point.data.categoryName === 'string'
              ? point.data.categoryName
              : String(point.seriesId);
          const monthName =
            typeof point.data.monthName === 'string'
              ? point.data.monthName
              : String(point.data.xFormatted);

          return (
            <div className="rounded-md bg-white px-3 py-2 text-xs shadow-xl shadow-zinc-950/10">
              <p className="font-bold text-zinc-950">{categoryName}</p>
              <p className="mt-1 text-zinc-500">{monthName}</p>
              <p className="mt-1 font-semibold text-zinc-950">
                {formatInr(totalPaise)}
              </p>
            </div>
          );
        }}
        useMesh
        xScale={{ type: 'point' }}
        yScale={{
          min: 0,
          stacked: false,
          type: 'linear',
        }}
      />
    </div>
  );
}
