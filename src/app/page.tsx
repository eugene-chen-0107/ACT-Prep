import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  CircleHelp,
  Compass,
  Flame,
  GraduationCap,
  MoveUpRight,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';

const steps = [
  { number: '01', title: 'Find your starting point', detail: 'A quick diagnostic maps what you know—and what to work on next.' },
  { number: '02', title: 'Practice with a purpose', detail: 'Get original, ACT-style questions picked for your goals.' },
  { number: '03', title: 'Understand every answer', detail: 'Clear explanations turn wrong answers into useful progress.' },
];

const subjects = ['English', 'Math', 'Reading', 'Science'];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <a className="flex items-center gap-2.5" href="#top" aria-label="Northstar ACT home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-lime">
            <Compass size={20} strokeWidth={2.2} />
          </span>
          <span className="text-[17px] font-bold tracking-[-0.04em]">northstar<span className="font-medium text-moss">.act</span></span>
        </a>
        <nav className="hidden items-center gap-9 text-[13px] font-medium text-ink/70 md:flex" aria-label="Main navigation">
          <a className="transition hover:text-ink" href="#how-it-works">How it works</a>
          <a className="transition hover:text-ink" href="#subjects">What you’ll practice</a>
          <a className="transition hover:text-ink" href="#promise">Our promise</a>
        </nav>
        <a className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-moss" href="#get-started">
          Get started <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={15} />
        </a>
      </header>

      <section id="top" className="mx-auto grid max-w-[1280px] items-center gap-14 px-6 pb-20 pt-12 sm:px-10 md:pb-28 md:pt-16 lg:grid-cols-[1fr_0.9fr] lg:gap-10 lg:px-16">
        <div className="relative z-10 max-w-[600px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3.5 py-2 text-[11px] font-semibold tracking-[0.11em] text-moss">
            <Sparkles size={13} /> YOUR NEXT CHAPTER STARTS HERE
          </div>
          <h1 className="text-[clamp(3.5rem,7.3vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-ink">
            A clearer path<br />to your <span className="relative inline-block italic text-moss">ACT goal<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 250 12" fill="none" aria-hidden="true"><path d="M3 8C61 2 168 1 246 6" stroke="#C6E58B" strokeWidth="6" strokeLinecap="round" /></svg></span>
          </h1>
          <p className="mt-8 max-w-[440px] text-[16px] leading-7 text-ink/65 sm:text-[17px]">
            A free study plan that starts where you are, focuses on what matters, and gets smarter with every question.
          </p>
          <div id="get-started" className="mt-9 flex flex-wrap items-center gap-4">
            <a className="group inline-flex items-center gap-3 rounded-full bg-ink px-6 py-4 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(24,58,49,0.65)] transition hover:-translate-y-0.5 hover:bg-moss" href="#how-it-works">
              Build my study plan <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} />
            </a>
            <span className="text-xs font-medium text-ink/50">Free to start. Always.</span>
          </div>
          <div className="mt-10 flex items-center gap-3 text-[12px] text-ink/55">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-cream bg-[#e7b58e] text-[10px] font-bold text-ink">A</span>
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-cream bg-[#bed4b4] text-[10px] font-bold text-ink">J</span>
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-cream bg-[#d5c5e2] text-[10px] font-bold text-ink">M</span>
            </div>
            <span>Made for your goals, at your pace.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
          <div className="absolute -right-6 -top-10 h-64 w-64 rounded-full bg-lime/45 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-[#dfe9d4] blur-3xl" />
          <div className="relative rotate-[1.2deg] rounded-[28px] border border-ink/[0.07] bg-white p-5 shadow-[0_28px_90px_-42px_rgba(24,58,49,0.32)] sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f1f5e9] text-moss"><GraduationCap size={21} /></span>
                <div><p className="text-[13px] font-bold tracking-tight">Your study snapshot</p><p className="mt-0.5 text-[11px] text-ink/45">A little progress, every day</p></div>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-cream text-ink/55"><ArrowUpRight size={15} /></span>
            </div>

            <div className="mt-7 rounded-[20px] bg-cream p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">Your ACT target</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">28<span className="ml-1 text-lg font-medium text-ink/35">/ 36</span></p></div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f0d3] px-2.5 py-1.5 text-[10px] font-semibold text-moss"><MoveUpRight size={12} /> +3 pts</span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full w-[68%] rounded-full bg-moss" /></div>
              <div className="mt-2 flex justify-between text-[10px] font-medium text-ink/40"><span>Starting point 25</span><span>Goal 28</span></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-ink/[0.07] p-4"><div className="flex items-center gap-2 text-ink/45"><Flame size={15} className="text-[#d59663]" /><span className="text-[10px] font-semibold uppercase tracking-wider">Study streak</span></div><p className="mt-3 text-[22px] font-semibold tracking-tight">5 <span className="text-xs font-medium text-ink/45">days</span></p><div className="mt-2 flex gap-1"><i className="h-1.5 flex-1 rounded-full bg-moss"/><i className="h-1.5 flex-1 rounded-full bg-moss"/><i className="h-1.5 flex-1 rounded-full bg-moss"/><i className="h-1.5 flex-1 rounded-full bg-moss"/><i className="h-1.5 flex-1 rounded-full bg-lime"/><i className="h-1.5 flex-1 rounded-full bg-ink/10"/><i className="h-1.5 flex-1 rounded-full bg-ink/10"/></div></div>
              <div className="rounded-[18px] border border-ink/[0.07] p-4"><div className="flex items-center gap-2 text-ink/45"><Target size={15} className="text-moss" /><span className="text-[10px] font-semibold uppercase tracking-wider">This week</span></div><p className="mt-3 text-[22px] font-semibold tracking-tight">72<span className="ml-1 text-xs font-medium text-ink/45">questions</span></p><p className="mt-2 text-[10px] font-medium text-moss">You’re right on track</p></div>
            </div>

            <div className="mt-5 rounded-[18px] border border-ink/[0.07] p-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-[12px] font-bold">Your next best step</p><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-moss"><Sparkles size={11} /> JUST FOR YOU</span></div>
              <div className="flex items-center gap-3 rounded-xl bg-[#f4f7ee] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-moss"><BookOpenCheck size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">Linear equations · 8 min</p><p className="mt-1 text-[10px] text-ink/45">Based on your last practice</p></div><span className="text-moss"><ArrowDownRight size={15} /></span></div>
            </div>
          </div>
          <div className="absolute -left-7 top-[42%] hidden -rotate-3 items-center gap-2 rounded-2xl border border-ink/[0.06] bg-white px-4 py-3 shadow-lg sm:flex"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0f5e6] text-moss"><Check size={16} /></span><span className="text-[11px] font-semibold">One step at a time.</span></div>
        </div>
      </section>

      <section id="subjects" className="border-y border-ink/[0.07] bg-white/65 py-7">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 px-6 sm:px-10 md:flex-row lg:px-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink/45">Every ACT section, one focused plan</p>
          <div className="flex flex-wrap justify-center gap-2.5">{subjects.map((subject) => <span key={subject} className="inline-flex items-center gap-2 rounded-full border border-ink/[0.09] px-4 py-2 text-[12px] font-medium text-ink/75"><span className="h-1.5 w-1.5 rounded-full bg-moss" />{subject}</span>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1280px] px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        <div className="grid gap-12 md:grid-cols-[0.75fr_1.25fr] md:gap-20">
          <div><p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-moss">A plan that moves with you</p><h2 className="max-w-[410px] text-4xl font-semibold leading-[1.08] tracking-[-0.06em] sm:text-5xl">Less guessing.<br />More <span className="italic text-moss">getting there.</span></h2><p className="mt-6 max-w-[360px] text-sm leading-6 text-ink/60">Big goals feel smaller when you know exactly what to do next. We help you find that next step.</p></div>
          <div className="divide-y divide-ink/10">{steps.map((step) => <article key={step.number} className="grid grid-cols-[48px_1fr] gap-4 py-6 first:pt-0 last:pb-0 sm:grid-cols-[64px_1fr] sm:gap-6"><span className="pt-1 text-xs font-semibold tracking-widest text-moss/65">{step.number}</span><div><h3 className="text-[17px] font-semibold tracking-tight">{step.title}</h3><p className="mt-2 max-w-[410px] text-[13px] leading-6 text-ink/55">{step.detail}</p></div></article>)}</div>
        </div>
      </section>

      <section id="promise" className="bg-ink px-6 py-20 text-white sm:px-10 md:py-24 lg:px-16">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-9 md:flex-row md:items-end">
          <div className="max-w-[590px]"><div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-lime"><CircleHelp size={14} /> A promise, not a paywall</div><h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.06em] sm:text-5xl">Your future shouldn’t<br className="hidden sm:block" /> depend on your budget.</h2><p className="mt-5 max-w-[450px] text-sm leading-6 text-white/60">Useful ACT prep should be within everyone’s reach. Northstar is free to use, so you can focus on what you’re here to do.</p></div>
          <a className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-lime px-6 py-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5" href="#get-started">Find your next step <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} /></a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 py-7 text-[11px] text-ink/45 sm:flex-row sm:px-10 lg:px-16">
        <a className="flex items-center gap-2 font-bold tracking-tight text-ink" href="#top"><span className="grid h-6 w-6 place-items-center rounded-lg bg-ink text-lime"><Compass size={14} /></span>northstar.act</a>
        <p>Built to help you find your way. © {new Date().getFullYear()} Northstar ACT</p>
        <span className="inline-flex items-center gap-1.5"><Timer size={12} /> Your pace, your path</span>
      </footer>
    </main>
  );
}
