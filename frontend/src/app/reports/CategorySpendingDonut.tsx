import { ResponsivePie } from '@nivo/pie';
import { Loader2 } from 'lucide-react';
import { formatInr } from '../../shared/utils/money';
import { categoryColors } from './category-colors';
import type { MonthlyCategoryExpenseTrendResponse } from './reports.types';

interface CategorySpendingDonutProps {
  data: MonthlyCategoryExpenseTrendResponse | null;
  isLoading: boolean;
  rangeLabel: string;
}

export function CategorySpendingDonut({
  data,
  isLoading,
  rangeLabel,
}: CategorySpendingDonutProps) {
  const chartData =
    data?.categories
      .map((category) => {
        const totalPaise = category.months.reduce(
          (total, month) => total + month.totalPaise,
          0,
        );

        return {
          color: categoryColors[category.normalizedName],
          id: category.normalizedName,
          label: category.categoryName,
          totalPaise,
          value: totalPaise,
        };
      })
      .filter((category) => category.totalPaise > 0)
      .sort((first, second) => second.totalPaise - first.totalPaise) ?? [];
  const totalPaise = chartData.reduce(
    (total, category) => total + category.totalPaise,
    0,
  );

  return (
    <section className="flex h-full min-h-[365px] flex-col rounded-lg border border-[#eadfd5] bg-white p-5 shadow-xl shadow-[#dfb49f]/15 sm:p-6">
      <div>
        <p className="text-[10px] font-bold uppercase text-[#287d75]">
          Category share
        </p>
        <h3 className="mt-1 text-xl font-bold text-zinc-950">Spending mix</h3>
        <p className="mt-1 text-xs text-zinc-500">{rangeLabel}</p>
      </div>

      {isLoading && !data ? (
        <div className="grid flex-1 place-items-center text-sm text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            Loading mix...
          </span>
        </div>
      ) : chartData.length ? (
        <>
          <div className="relative mx-auto h-[205px] w-full max-w-[280px] flex-1">
            <ResponsivePie
              activeOuterRadiusOffset={6}
              animate
              arcLinkLabelsSkipAngle={10}
              colors={{ datum: 'data.color' }}
              cornerRadius={4}
              data={chartData}
              enableArcLabels={false}
              enableArcLinkLabels={false}
              innerRadius={0.7}
              margin={{ bottom: 10, left: 10, right: 10, top: 10 }}
              motionConfig="gentle"
              padAngle={2}
              role="application"
              tooltip={({ datum }) => {
                const percentage = totalPaise
                  ? Math.round((datum.data.totalPaise / totalPaise) * 100)
                  : 0;

                return (
                  <div className="rounded-md bg-white px-3 py-2 text-xs shadow-xl shadow-zinc-950/10">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: datum.data.color }}
                      />
                      <p className="font-bold text-zinc-950">{datum.label}</p>
                    </div>
                    <p className="mt-1 text-zinc-500">
                      {formatInr(datum.data.totalPaise)} · {percentage}%
                    </p>
                  </div>
                );
              }}
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="max-w-[125px]">
                <p
                  className="truncate text-sm font-extrabold text-zinc-950"
                  title={formatInr(totalPaise)}
                >
                  {formatInr(totalPaise)}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase text-zinc-400">
                  Total spend
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-100 pt-3">
            {chartData.map((category) => (
              <div className="flex min-w-0 items-center gap-2" key={category.id}>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-zinc-600">
                  {category.label}
                </span>
                <span className="text-[10px] font-bold text-zinc-900">
                  {Math.round((category.totalPaise / totalPaise) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <p className="text-sm font-bold text-zinc-700">No spending yet</p>
            <p className="mt-1 text-xs text-zinc-400">
              Category shares will appear here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
