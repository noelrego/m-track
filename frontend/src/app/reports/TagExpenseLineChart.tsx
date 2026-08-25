import { ResponsiveLine } from '@nivo/line';
import { formatInr } from '../../shared/utils/money';
import type { MonthlyTagExpenseTrendResponse } from './reports.types';

interface TagExpenseLineChartProps {
  data: MonthlyTagExpenseTrendResponse;
}

const tagTrendPalette = [
  '#f36f4e',
  '#287d75',
  '#8d78d6',
  '#f5b33d',
  '#2f6fed',
  '#242424',
  '#d94f70',
  '#46a0a8',
  '#9a6b2f',
  '#5f7d3c',
  '#7b5cb0',
  '#9f4f3a',
];

export function getTagTrendColor(tagId: string) {
  const hash = Array.from(tagId).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );

  return tagTrendPalette[hash % tagTrendPalette.length];
}

export function TagExpenseLineChart({ data }: TagExpenseLineChartProps) {
  const labelByMonthKey = new Map(
    data.months.map((month) => [month.monthKey, month.label]),
  );
  const tickValues =
    data.months.length > 8
      ? data.months
          .filter((_, index) => index % 2 === 0)
          .map((month) => month.monthKey)
      : undefined;
  const chartData = data.tags.map((tag) => ({
    id: tag.tagName,
    data: tag.months.map((month) => ({
      x: month.monthKey,
      y: month.totalPaise / 100,
      count: month.count,
      monthName: month.monthName,
      tagName: tag.tagName,
      totalPaise: month.totalPaise,
    })),
  }));

  return (
    <div className="h-[300px] min-h-[300px]">
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
        colors={data.tags.map((tag) => getTagTrendColor(tag.tagId))}
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
          const count =
            typeof point.data.count === 'number' ? point.data.count : 0;
          const monthName =
            typeof point.data.monthName === 'string'
              ? point.data.monthName
              : String(point.data.xFormatted);
          const tagName =
            typeof point.data.tagName === 'string'
              ? point.data.tagName
              : String(point.seriesId);
          const totalPaise =
            typeof point.data.totalPaise === 'number'
              ? point.data.totalPaise
              : Number(point.data.y) * 100;

          return (
            <div className="rounded-md bg-white px-3 py-2 text-xs shadow-xl shadow-zinc-950/10">
              <p className="font-bold text-zinc-950">{tagName}</p>
              <p className="mt-1 text-zinc-500">{monthName}</p>
              <p className="mt-1 font-semibold text-zinc-950">
                {formatInr(totalPaise)} · {count}{' '}
                {count === 1 ? 'expense' : 'expenses'}
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
