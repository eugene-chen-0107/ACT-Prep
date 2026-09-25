import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Atom,
  BookOpen,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  LockKeyhole,
  MessageCircleQuestion,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

const steps = [
  { number: '01', title: 'Diagnose', description: 'See where you are today with a quick, focused baseline across ACT sections.', icon: Target },
  { number: '02', title: 'Practice', description: 'Work on the skills that will make the biggest difference to your score.', icon: BookOpenCheck },
  { number: '03', title: 'Learn', description: 'Get clear, step-by-step explanations that make every answer count.', icon: Lightbulb },
  { number: '04', title: 'Improve', description: 'Watch your progress build and let your next steps adapt as you do.', icon: TrendingUp },
];

const features = [
  { title: 'Smart practice', description: 'A coach that adjusts to your answers, finds your gaps, and keeps practice at the right level.', icon: BrainCircuit, tone: 'green' },
  { title: 'Explanations that teach', description: 'Understand why an answer works—not just which option to pick—with friendly, clear walkthroughs.', icon: MessageCircleQuestion, tone: 'cream' },
  { title: 'Practice that feels personal', description: 'Spend more time on the skills you need and less time repeating what you already know.', icon: Target, tone: 'blue' },
  { title: 'Progress you can understand', description: 'Follow your score trends, section strengths, and small wins in one clear view.', icon: ChartNoAxesCombined, tone: 'gold' },
  { title: 'Full-length practice tests', description: 'Build confidence with realistic test sessions and focused review afterward.', icon: Clock3, tone: 'rose' },
  { title: 'A study plan that fits', description: 'Turn your target and timeline into manageable sessions that work around your week.', icon: GraduationCap, tone: 'sage' },
];

const sections = [
  { name: 'English', detail: 'Usage, mechanics & rhetoric', icon: PenLine, count: 'Grammar · Organization · Style', tone: 'section-green' },
  { name: 'Math', detail: 'Build fluency and confidence', icon: Atom, count: 'Algebra · Functions · Geometry', tone: 'section-blue' },
  { name: 'Reading', detail: 'Read closely, answer confidently', icon: BookOpen, count: 'Key ideas · Craft · Integration', tone: 'section-gold' },
  { name: 'Science', detail: 'Make sense of data and ideas', icon: FlaskConical, count: 'Data · Experiments · Viewpoints', tone: 'section-rose' },
];

const faqs = [
  { question: 'Is Northstar ACT really free?', answer: 'Yes. The goal is to make thoughtful ACT preparation accessible. You can start practicing without paying or entering payment details.' },
  { question: 'How is an ACT coach different from a question bank?', answer: 'A question bank gives you questions to browse. A coach helps you understand your starting point, chooses useful practice, explains your answers, and guides what to work on next.' },
  { question: 'Does it cover every ACT section?', answer: 'The platform is designed around English, Math, Reading, and Science, so your preparation can include the sections that matter for your goals.' },
  { question: 'Do I need to know my target score to start?', answer: 'No. You can begin with a diagnostic to get a sense of your current strengths and choose a goal later.' },
];

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`lp-brand${inverse ? ' lp-brand-inverse' : ''}`} aria-label="Northstar ACT home"><span className="lp-brand-mark"><Compass size={18} strokeWidth={2.1} /></span><span>northstar<span className="lp-brand-suffix">.act</span></span></Link>;
}

function ProductPreview() {
  return (
    <div className="lp-product-stage" aria-label="Preview of the Northstar ACT student dashboard">
      <div className="lp-product-glow" aria-hidden="true" />
      <div className="lp-product-window">
        <div className="lp-window-sidebar">
          <div className="lp-mini-brand"><span><Compass size={12} /></span><b>northstar</b></div>
          <div className="lp-mini-nav-label">YOUR PREP</div>
          <div className="lp-mini-nav lp-mini-nav-active"><span><ChartNoAxesCombined size={13} /></span>Dashboard</div>
          <div className="lp-mini-nav"><span><BrainCircuit size={13} /></span>Smart Practice</div>
          <div className="lp-mini-nav"><span><BookOpenCheck size={13} /></span>Practice</div>
          <div className="lp-mini-nav"><span><GraduationCap size={13} /></span>Study Plan</div>
          <div className="lp-mini-sidebar-note"><Sparkles size={12} /><span>One step at a time.</span></div>
        </div>
        <div className="lp-window-main">
          <div className="lp-window-topbar"><span>Good morning, Alex <span aria-hidden="true">✳</span></span><div className="lp-window-user"><span className="lp-live-dot" /> Your study space <span className="lp-window-avatar">A</span></div></div>
          <div className="lp-dashboard-content">
            <div className="lp-dashboard-greeting"><div><span className="lp-date-label">TUESDAY, OCTOBER 14</span><h3>You’re building momentum.</h3><p>Here’s your next best step toward your goal.</p></div><span className="lp-streak-pill"><span>✳</span> 5 day streak</span></div>
            <div className="lp-score-grid">
              <div className="lp-score-card"><div className="lp-score-card-top"><span>COMPOSITE SCORE</span><span className="lp-score-icon"><Target size={13} /></span></div><div className="lp-score-number">25 <small>/ 36</small></div><div className="lp-score-foot"><span className="lp-score-trend"><TrendingUp size={11} /> +2 points</span><span>since your start</span></div><div className="lp-score-track"><span /></div><div className="lp-score-scale"><span>Starting 23</span><span>Goal 29</span></div></div>
              <div className="lp-chart-card"><div className="lp-score-card-top"><span>YOUR PROGRESS</span><span className="lp-chart-period">Last 4 weeks <ChevronDown size={11} /></span></div><div className="lp-chart"><div className="lp-chart-y"><span>30</span><span>25</span><span>20</span></div><div className="lp-chart-main"><div className="lp-chart-grid"><i /><i /><i /></div><svg viewBox="0 0 260 86" preserveAspectRatio="none" aria-label="Score trend rising over four weeks"><path className="lp-chart-area" d="M0 68 C35 63 42 70 72 53 S118 55 143 39 S190 47 218 23 S244 29 260 10 L260 86 L0 86 Z" /><path className="lp-chart-line" d="M0 68 C35 63 42 70 72 53 S118 55 143 39 S190 47 218 23 S244 29 260 10" /><circle cx="260" cy="10" r="4" className="lp-chart-point" /></svg><div className="lp-chart-x"><span>Sep 16</span><span>Sep 23</span><span>Sep 30</span><span>Oct 7</span></div></div></div></div>
            </div>
            <div className="lp-dashboard-lower">
              <div className="lp-subject-card"><div className="lp-card-heading"><div><strong>Section snapshot</strong><span>You&apos;re finding your footing</span></div><ArrowUpRight size={14} /></div><div className="lp-subject-row"><span className="lp-subject-dot lp-dot-english" /><span>English</span><span className="lp-subject-bar"><i style={{ width: '72%' }} /></span><b>26</b></div><div className="lp-subject-row"><span className="lp-subject-dot lp-dot-math" /><span>Math</span><span className="lp-subject-bar"><i style={{ width: '55%' }} /></span><b>23</b></div><div className="lp-subject-row"><span className="lp-subject-dot lp-dot-reading" /><span>Reading</span><span className="lp-subject-bar"><i style={{ width: '68%' }} /></span><b>25</b></div><div className="lp-subject-row"><span className="lp-subject-dot lp-dot-science" /><span>Science</span><span className="lp-subject-bar"><i style={{ width: '62%' }} /></span><b>24</b></div></div>
              <div className="lp-next-card"><div className="lp-next-label"><Sparkles size={12} /> PICKED FOR YOU</div><h4>Make linear equations feel easy</h4><p>A quick set based on your recent Math practice.</p><div className="lp-next-meta"><span><Clock3 size={11} /> 8 min</span><span>6 questions</span></div><div className="lp-next-button">Continue practice <ArrowRight size={13} /></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-preview-note"><span className="lp-preview-note-icon"><Check size={13} /></span><span>Every session has a next step.</span></div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="lp-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <Brand />
          <nav className="lp-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">The coach</a><a href="#sections">ACT sections</a><a href="#faq">FAQ</a></nav>
          <div className="lp-header-actions"><Link href="/login" className="lp-login-link">Log in</Link><Link href="/signup" className="lp-header-cta">Create account <ArrowRight size={14} /></Link></div>
        </div>
      </header>

      <section className="lp-hero" id="top">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow"><span className="lp-eyebrow-icon"><Sparkles size={12} /></span> YOUR PERSONAL ACT COACH</div>
            <h1>Prepare smarter.<br /><em>Raise your ACT score.</em></h1>
            <p className="lp-hero-description">Not just more questions. A smarter way to prepare—with a coach that finds what to focus on, helps you learn from every answer, and adapts as you improve.</p>
            <div className="lp-hero-actions"><Link href="/signup" className="lp-button lp-button-primary">Start practicing <ArrowRight size={16} /></Link><Link href="/signup" className="lp-button lp-button-secondary"><Target size={15} /> Take a diagnostic</Link></div>
            <div className="lp-trust-row"><span className="lp-trust-icon"><ShieldCheck size={15} /></span><span>Free to use</span><i /> <span>No credit card</span><i /> <span>Built around you</span></div>
          </div>
          <ProductPreview />
        </div>
        <div className="lp-hero-bottom"><span>THE ACT, WITH A GAME PLAN</span><span className="lp-scroll-cue">A better way to prep <ArrowDownRight size={13} /></span></div>
      </section>

      <section className="lp-how lp-section" id="how-it-works">
        <div className="lp-container">
          <div className="lp-section-heading lp-heading-split"><div><span className="lp-kicker">A COACHING LOOP, NOT A QUESTION DUMP</span><h2>Know what to do next.</h2></div><p>Good preparation isn’t about doing everything. It’s about doing the right thing next—and understanding why.</p></div>
          <div className="lp-steps-grid">{steps.map((step) => { const Icon = step.icon; return <article className="lp-step" key={step.number}><div className="lp-step-top"><span className="lp-step-number">{step.number}</span><span className="lp-step-icon"><Icon size={17} /></span></div><h3>{step.title}</h3><p>{step.description}</p></article>; })}</div>
          <div className="lp-loop-caption"><span className="lp-loop-line" /><Sparkles size={13} /><span>Your plan gets a little smarter with every session.</span><span className="lp-loop-line" /></div>
        </div>
      </section>

      <section className="lp-features lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-heading lp-heading-center"><span className="lp-kicker">MORE THAN A QUESTION BANK</span><h2>A coach in your corner.</h2><p>Everything you need to turn practice into progress, all in one focused place.</p></div>
          <div className="lp-feature-grid">{features.map((feature) => { const Icon = feature.icon; return <article className="lp-feature-card" key={feature.title}><span className={`lp-feature-icon lp-feature-icon-${feature.tone}`}><Icon size={18} strokeWidth={1.8} /></span><h3>{feature.title}</h3><p>{feature.description}</p><ArrowUpRight className="lp-feature-arrow" size={15} /></article>; })}</div>
        </div>
      </section>

      <section className="lp-sections lp-section" id="sections">
        <div className="lp-container lp-section-content">
          <div className="lp-section-heading lp-heading-split"><div><span className="lp-kicker">FOUR SECTIONS. ONE CLEAR PLAN.</span><h2>The whole ACT,<br />made manageable.</h2></div><p>Build strength where you need it. Your coach brings every section into one clear, balanced preparation plan.</p></div>
          <div className="lp-act-grid">{sections.map((subject) => { const Icon = subject.icon; return <article className={`lp-act-card ${subject.tone}`} key={subject.name}><div className="lp-act-card-top"><span className="lp-act-icon"><Icon size={19} /></span><ArrowUpRight size={15} className="lp-act-arrow" /></div><h3>{subject.name}</h3><p>{subject.detail}</p><span className="lp-act-skills">{subject.count}</span></article>; })}</div>
          <div className="lp-act-footnote"><CircleHelp size={14} /><span>Your study plan can focus on the sections that matter most to your goals.</span></div>
        </div>
      </section>

      <section className="lp-explain lp-section">
        <div className="lp-container lp-explain-grid">
          <div className="lp-explain-copy"><span className="lp-kicker">THE WHY MATTERS</span><h2>Missed a question?<br /><em>That’s where learning starts.</em></h2><p>Instead of leaving you to guess, your coach walks through the reasoning, points out the useful idea, and helps you recognize it next time.</p><ul><li><span><Check size={12} /></span> Clear, step-by-step reasoning</li><li><span><Check size={12} /></span> Friendly explanations, no judgment</li><li><span><Check size={12} /></span> Practice that responds to what you learn</li></ul><Link href="/practice" className="lp-text-link">Explore ACT practice <ArrowRight size={14} /></Link></div>
          <div className="lp-explanation-card" aria-label="Example of a question explanation">
            <div className="lp-explanation-top"><span className="lp-question-label"><BookOpen size={13} /> MATH · LINEAR EQUATIONS</span><span className="lp-question-count">QUESTION 4 OF 8</span></div>
            <p className="lp-question-text">If <span>3x + 5 = 20</span>, what is the value of <span>x</span>?</p>
            <div className="lp-answer-list"><div className="lp-answer"><span>A</span> 3</div><div className="lp-answer lp-answer-correct"><span>B</span> 5 <Check size={14} /></div><div className="lp-answer"><span>C</span> 8</div><div className="lp-answer"><span>D</span> 15</div></div>
            <div className="lp-ai-explanation"><div className="lp-ai-heading"><span><Sparkles size={13} /> LET’S WALK THROUGH IT</span><BadgeLabel>GOT IT</BadgeLabel></div><p>First, subtract 5 from both sides: <strong>3x = 15</strong>. Now divide both sides by 3, so <strong>x = 5</strong>.</p><div className="lp-ai-tip"><Lightbulb size={13} /><span>Try undoing operations in reverse order: addition first, then multiplication.</span></div></div>
            <div className="lp-explanation-footer"><span><LockKeyhole size={12} /> Original practice question</span><span>Helpful? <span className="lp-helpful-yes">Yes</span></span></div>
          </div>
        </div>
      </section>

      <section className="lp-faq lp-section" id="faq">
        <div className="lp-container lp-faq-grid"><div className="lp-faq-intro"><span className="lp-kicker">GOOD QUESTIONS</span><h2>Before you dive in.</h2><p>A few things students often want to know.</p><a href="mailto:hello@northstar.act" className="lp-text-link">Still curious? Get in touch <ArrowRight size={14} /></a></div><div className="lp-faq-list">{faqs.map((faq) => <details className="lp-faq-item" key={faq.question}><summary>{faq.question}<ChevronDown size={16} /></summary><p>{faq.answer}</p></details>)}</div></div>
      </section>

      <section className="lp-final-cta" id="get-started"><div className="lp-final-cta-inner"><span className="lp-final-icon"><Compass size={19} /></span><span className="lp-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>Make your next hour<br />of studying <em>count.</em></h2><p>Start with one question. Your coach will help you find the next step.</p><div className="lp-hero-actions lp-final-actions"><Link href="/signup" className="lp-button lp-button-light">Start practicing <ArrowRight size={16} /></Link><Link href="/signup" className="lp-button lp-button-outline"><Target size={15} /> Take a diagnostic</Link></div><span className="lp-final-assurance"><Check size={13} /> Free to use. No credit card.</span></div></section>

      <footer className="lp-footer"><div className="lp-footer-inner"><Brand /><p>Thoughtful ACT prep, for wherever you’re headed.</p><div className="lp-footer-links"><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><Link href="/login">Log in</Link></div><span className="lp-copyright">© {new Date().getFullYear()} Northstar ACT</span></div></footer>
    </main>
  );
}

function BadgeLabel({ children }: { children: React.ReactNode }) {
  return <span className="lp-mini-badge">{children}</span>;
}
