import { ResponsiveBar } from '@nivo/bar';
import type { CurrentMonthWeeklyReportResponse } from './home.types';

interface WeeklyExpenseChartProps {
  data: CurrentMonthWeeklyReportResponse | null;
}

const chartKeys = ['Needs', 'Wants', 'Extra'];

export function WeeklyExpenseChart({ data }: WeeklyExpenseChartProps) {
  const chartData =
    data?.weeks.map((week) => ({
      week: week.label,
      Needs: week.needsTotalPaise / 100,
      Wants: week.wantsTotalPaise / 100,
      Extra: week.extraTotalPaise / 100,
    })) ?? [];

  return (
    <div className="h-[300px] min-h-[300px]">
      <ResponsiveBar
        animate
        axisBottom={{
          tickPadding: 8,
          tickRotation: 0,
          tickSize: 0,
        }}
        axisLeft={{
          format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
          tickPadding: 8,
          tickSize: 0,
        }}
        borderRadius={5}
        colors={['#f5b33d', '#66bfb6', '#f36f4e']}
        data={chartData}
        enableGridX={false}
        enableLabel={false}
        gridYValues={4}
        groupMode="grouped"
        indexBy="week"
        keys={chartKeys}
        margin={{ bottom: 42, left: 72, right: 18, top: 16 }}
        motionConfig="gentle"
        padding={0.32}
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
          grid: {
            line: {
              stroke: '#f0e5dc',
              strokeWidth: 1,
            },
          },
          legends: {
            text: {
              fill: '#3f3f46',
              fontSize: 12,
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
        tooltip={({ id, value, indexValue, color }) => (
          <div className="rounded-md bg-white px-3 py-2 text-xs shadow-xl shadow-zinc-950/10">
            <div className="flex items-center gap-2 font-bold text-zinc-950">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {id} · {indexValue}
            </div>
            <p className="mt-1 text-zinc-500">
              ₹{Number(value).toLocaleString('en-IN')}
            </p>
          </div>
        )}
        valueScale={{ type: 'linear' }}
      />
    </div>
  );
}
