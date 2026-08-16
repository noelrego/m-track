import { CalendarDays, IndianRupee, Landmark } from 'lucide-react';
import { formatInr, normalizeInrInput, parseInrToPaise } from '../../shared/utils/money';
import type { EmiAmountMode, EmiScheduleFormValue } from './emi.types';

interface EmiScheduleFieldsProps {
  disabled?: boolean;
  onChange: (field: keyof EmiScheduleFormValue, value: string) => void;
  value: EmiScheduleFormValue;
}

export function EmiScheduleFields({
  disabled = false,
  onChange,
  value,
}: EmiScheduleFieldsProps) {
  const amountPaise = parseInrToPaise(value.amount) ?? 0;
  const numberOfMonths = Number(value.numberOfMonths);
  const hasValidMonths = Number.isInteger(numberOfMonths) && numberOfMonths > 0;
  const scheduledTotalPaise =
    value.amountMode === 'monthly' && hasValidMonths
      ? amountPaise * numberOfMonths
      : amountPaise;
  const monthlyPaise =
    value.amountMode === 'total' && hasValidMonths
      ? Math.floor(amountPaise / numberOfMonths)
      : amountPaise;
  const endDate =
    value.startDate && hasValidMonths
      ? getInstallmentDate(value.startDate, numberOfMonths - 1)
      : '';

  return (
    <div className="space-y-3.5 rounded-md border border-[#d8e9e6] bg-[#f5fbfa] p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">EMI name</span>
          <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-within:border-[#66bfb6] focus-within:ring-4 focus-within:ring-[#66bfb6]/10">
            <Landmark className="text-zinc-400" size={14} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
              disabled={disabled}
              maxLength={120}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="House loan"
              required
              value={value.name}
            />
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">Lender</span>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
            disabled={disabled}
            maxLength={120}
            onChange={(event) => onChange('lender', event.target.value)}
            placeholder="Optional"
            value={value.lender}
          />
        </label>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-800">Amount entered as</p>
        <div className="mt-1.5 grid grid-cols-2 rounded-md border border-[#d8e9e6] bg-white p-1">
          {(
            [
              ['monthly', 'Monthly EMI'],
              ['total', 'Total amount'],
            ] as [EmiAmountMode, string][]
          ).map(([mode, label]) => (
            <button
              className={[
                'rounded-md px-3 py-2 text-xs font-bold transition',
                value.amountMode === mode
                  ? 'bg-[#66bfb6] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900',
              ].join(' ')}
              disabled={disabled}
              key={mode}
              onClick={() => onChange('amountMode', mode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">First EMI date</span>
          <span className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-within:border-[#66bfb6] focus-within:ring-4 focus-within:ring-[#66bfb6]/10">
            <CalendarDays className="text-zinc-400" size={14} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              disabled={disabled}
              onChange={(event) => onChange('startDate', event.target.value)}
              required
              type="date"
              value={value.startDate}
            />
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">
            {value.amountMode === 'monthly' ? 'Monthly amount' : 'Total amount'}
          </span>
          <span className="mt-1.5 flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-within:border-[#66bfb6] focus-within:ring-4 focus-within:ring-[#66bfb6]/10">
            <IndianRupee className="text-zinc-400" size={14} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              disabled={disabled}
              inputMode="decimal"
              onChange={(event) =>
                onChange('amount', normalizeInrInput(event.target.value))
              }
              pattern="\d+(\.\d{0,2})?"
              placeholder="25000"
              required
              type="text"
              value={value.amount}
            />
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">Months</span>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#66bfb6] focus:ring-4 focus:ring-[#66bfb6]/10"
            disabled={disabled}
            inputMode="numeric"
            max={600}
            min={1}
            onChange={(event) => onChange('numberOfMonths', event.target.value)}
            required
            step={1}
            type="number"
            value={value.numberOfMonths}
          />
        </label>
      </div>

      {amountPaise && hasValidMonths ? (
        <div className="grid gap-2 rounded-md bg-white px-3 py-2.5 text-xs sm:grid-cols-3">
          <SummaryValue label="Monthly" value={formatInr(monthlyPaise)} />
          <SummaryValue label="Installments" value={String(numberOfMonths)} />
          <SummaryValue
            label={endDate ? `Ends ${formatDateLabel(endDate)}` : 'Scheduled total'}
            value={formatInr(scheduledTotalPaise)}
          />
        </div>
      ) : null}
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-zinc-400">{label}</p>
      <p className="mt-0.5 font-bold text-zinc-800">{value}</p>
    </div>
  );
}

function getInstallmentDate(startDateValue: string, monthOffset: number) {
  const [year, month, day] = startDateValue.split('-').map(Number);
  const targetMonthIndex = month - 1 + monthOffset;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = targetMonthIndex % 12;
  const lastDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  const date = new Date(
    targetYear,
    normalizedMonthIndex,
    Math.min(day, lastDay),
  );

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}
