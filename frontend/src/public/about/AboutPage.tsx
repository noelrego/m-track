import { Link } from 'react-router-dom';
import {
  ArrowDown,
  BarChart3,
  FolderTree,
  Home,
  LogIn,
  PlusCircle,
  ReceiptText,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: ReceiptText,
    title: 'Quick daily entries',
    text: 'Add expenses the moment they happen with category, tags, date, and note.',
  },
  {
    icon: BarChart3,
    title: 'Monthly clarity',
    text: 'See Needs, Wants, EMIs, Extra, and Invest totals across your month.',
  },
  {
    icon: Tags,
    title: 'Personal tags',
    text: 'Create your own tags for UPI, food, clothes, travel, or anything useful.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Your reports are scoped to your account, with admin access handled separately.',
  },
];

const usageSections = [
  {
    icon: Home,
    title: 'Home insights',
    text: 'Start from the dashboard to see this month against last month, plus your Needs and Wants movement at a glance.',
  },
  {
    icon: PlusCircle,
    title: 'Add expenses immediately',
    text: 'Record the amount, date, category, tags, and optional note while the spend is still fresh in your mind.',
  },
  {
    icon: Tags,
    title: 'Use tags your way',
    text: 'Create practical labels such as UPI, Food, Movie, Clothes, Travel, or any personal pattern you want to review later.',
  },
  {
    icon: FolderTree,
    title: 'Keep categories consistent',
    text: 'Track against stable groups like Needs, Wants, EMIs, Extra, and Invest so monthly reports stay comparable.',
  },
  {
    icon: BarChart3,
    title: 'Review monthly reports',
    text: 'Use charts and totals to understand where money went, which spends were highest, and what needs attention next month.',
  },
];

function AboutPage() {
  return (
    <main className="min-h-screen scroll-smooth bg-[#09110f] px-5 pb-16 pt-20 text-white sm:px-8 lg:px-12">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#09110f]/85 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link className="text-lg font-bold text-white" to="/login">
            SpendWise
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-emerald-200"
            to="/login"
          >
            <LogIn size={16} />
            Login
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-5xl">
        <section className="grid min-h-[calc(100vh-7rem)] items-start gap-10 pb-12 pt-8 lg:grid-cols-[1fr_0.9fr] lg:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
              SpendWise
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              A private money tracker for intentional daily spending
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              SpendWise is built for manually tracking expenses as they happen,
              so monthly reports reflect your habits instead of depending on bank
              statements later.
            </p>
            <button
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-emerald-300 px-4 py-3 text-sm font-bold text-zinc-950 shadow-[0_18px_45px_rgba(110,231,183,0.22)] transition hover:bg-emerald-200"
              onClick={() =>
                document
                  .getElementById('how-to-use')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              type="button"
            >
              How to use
              <ArrowDown size={16} />
            </button>
          </motion.div>

          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
          >
            {features.map((feature) => (
              <div
                className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent"
                key={feature.title}
              >
                <div className="grid size-10 place-items-center rounded-md bg-emerald-300 text-zinc-950">
                  <feature.icon size={18} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {feature.text}
                </p>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="scroll-mt-24 pt-4" id="how-to-use">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.35 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
              How to use this application
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              A simple monthly rhythm for better spending awareness
            </h2>
          </motion.div>

          <div className="mt-10 space-y-8">
            {usageSections.map((section, index) => {
              const isReversed = index % 2 === 1;
              return (
                <motion.article
                  className="grid items-stretch lg:grid-cols-2"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  viewport={{ once: true, amount: 0.28 }}
                  key={section.title}
                >
                  <div className={isReversed ? 'lg:col-start-2' : ''}>
                    <UsageContent section={section} index={index} />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

type UsageSection = (typeof usageSections)[number];

function UsageContent({
  section,
  index,
}: {
  section: UsageSection;
  index: number;
}) {
  const Icon = section.icon;

  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.085),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] before:absolute before:inset-x-7 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-md bg-emerald-300 text-zinc-950">
          <Icon size={19} />
        </div>
        <span className="text-sm font-bold text-zinc-500">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3 className="mt-8 text-2xl font-semibold text-white">
        {section.title}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        {section.text}
      </p>
    </div>
  );
}

export default AboutPage;
