import { ResponsiveLine } from '@nivo/line';
import { formatInr } from '../../shared/utils/money';
import type { CurrentYearMonthlyExpenseResponse } from './reports.types';

interface YearlyExpenseLineChartProps {
  data: CurrentYearMonthlyExpenseResponse | null;
}

export function YearlyExpenseLineChart({ data }: YearlyExpenseLineChartProps) {
  const chartData = [
    {
      id: 'Total expense',
      data:
        data?.months.map((month) => ({
          x: month.label,
          y: month.totalPaise / 100,
          monthName: month.monthName,
          totalPaise: month.totalPaise,
        })) ?? [],
    },
  ];

  return (
    <div className="h-[280px] min-h-[280px]">
      <ResponsiveLine
        animate
        axisBottom={{
          tickPadding: 10,
          tickRotation: 0,
          tickSize: 0,
        }}
        axisLeft={{
          format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
          tickPadding: 10,
          tickSize: 0,
        }}
        colors={['#f36f4e']}
        curve="monotoneX"
        data={chartData}
        enableArea
        enableGridX={false}
        enablePoints
        gridYValues={4}
        lineWidth={3}
        margin={{ bottom: 42, left: 76, right: 24, top: 18 }}
        motionConfig="gentle"
        pointBorderColor="#ffffff"
        pointBorderWidth={2}
        pointColor="#f36f4e"
        pointSize={8}
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
              stroke: '#f36f4e',
              strokeOpacity: 0.35,
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
          const monthName =
            typeof point.data.monthName === 'string'
              ? point.data.monthName
              : String(point.data.xFormatted);

          return (
            <div className="rounded-md bg-white px-3 py-2 text-xs shadow-xl shadow-zinc-950/10">
              <p className="font-bold text-zinc-950">{monthName}</p>
              <p className="mt-1 text-zinc-500">{formatInr(totalPaise)}</p>
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
