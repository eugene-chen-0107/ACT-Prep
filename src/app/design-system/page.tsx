'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Compass,
  FlaskConical,
  GraduationCap,
  Info,
  LayoutGrid,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeading,
  Dropdown,
  EmptyState,
  Input,
  LoadingState,
  Modal,
  ProgressBar,
  Tabs,
  Tooltip,
} from '@/components/ui';

const tabItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'english', label: 'English' },
  { id: 'math', label: 'Math' },
];
const colorTokens = [
  { name: 'Ink', variable: '--color-ink', hex: '#183A31' },
  { name: 'Forest', variable: '--color-forest', hex: '#315F4D' },
  { name: 'Moss', variable: '--color-moss', hex: '#52755B' },
  { name: 'Lime', variable: '--color-lime', hex: '#D2ED8C' },
  { name: 'Canvas', variable: '--color-canvas', hex: '#F7F7F2' },
  { name: 'Border', variable: '--color-border', hex: '#E3E8DF' },
  { name: 'Success', variable: '--color-success', hex: '#26704E' },
  { name: 'Warning', variable: '--color-warning', hex: '#916217' },
  { name: 'Danger', variable: '--color-danger', hex: '#A33C35' },
  { name: 'Info', variable: '--color-info', hex: '#345E86' },
];

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="ds-section" id={id}><div className="ds-section-heading"><span className="ds-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{children}</section>;
}

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('english');

  return (
    <main className="ds-shell">
      <header className="ds-topbar">
        <Link href="/" className="ds-brand"><span className="ds-mark"><Compass size={17} /></span><span>northstar<span className="ds-brand-muted">.act</span></span></Link>
        <div className="ds-topbar-right"><Badge tone="success"><span className="ds-status-dot" /> Design system</Badge><span className="ds-version">Foundations · v1.0</span></div>
      </header>

      <div className="ds-layout">
        <aside className="ds-sidebar" aria-label="Design system sections">
          <p className="ds-sidebar-label">FOUNDATIONS</p>
          <a href="#foundations"><Compass size={15} /> Tokens</a>
          <a href="#type"><GraduationCap size={15} /> Typography</a>
          <a href="#spacing"><LayoutGrid size={15} /> Spacing & shape</a>
          <p className="ds-sidebar-label ds-sidebar-label-spaced">COMPONENTS</p>
          <a href="#actions"><ArrowRight size={15} /> Actions & fields</a>
          <a href="#feedback"><Info size={15} /> Feedback</a>
          <a href="#navigation"><BookOpen size={15} /> Navigation</a>
          <a href="#states"><Sparkles size={15} /> States</a>
          <div className="ds-sidebar-note"><span className="ds-note-icon"><Target size={15} /></span><p>Calm, clear, and made for progress.</p></div>
        </aside>

        <div className="ds-main">
          <section className="ds-intro">
            <span className="ds-eyebrow">NORTHSTAR ACT · UI FOUNDATIONS</span>
            <h1>A thoughtful system<br className="ds-desktop-break" /> for <em>focused learning.</em></h1>
            <p>A clear, consistent visual language for every step from first diagnostic to test-day confidence. Quietly confident. Always student-first.</p>
            <div className="ds-intro-tags"><Badge>Accessible by default</Badge><Badge>Responsive by design</Badge><Badge>Reduced motion ready</Badge></div>
          </section>

          <Section id="foundations" eyebrow="01 · FOUNDATIONS" title="Color with purpose">
            <Card padded>
              <div className="ds-color-grid">{colorTokens.map((token) => <div className="ds-swatch" key={token.name}><div className="ds-swatch-color" style={{ backgroundColor: `var(${token.variable})` }} /><div className="ds-swatch-meta"><span>{token.name}</span><code>{token.hex}</code></div></div>)}</div>
              <div className="ds-color-note"><span className="ds-color-note-mark" /><span>Forest neutrals create focus; muted semantic tones make status easy to scan.</span></div>
            </Card>
            <div className="ds-token-lower">
              <Card padded><CardHeading title="Surface hierarchy" description="Subtle layers, no unnecessary effects" /><div className="ds-surface-stack"><div className="ds-surface-row"><span className="ds-surface-chip ds-surface-canvas" /> Canvas <code>#F7F7F2</code></div><div className="ds-surface-row"><span className="ds-surface-chip ds-surface-white" /> Surface <code>#FFFFFF</code></div><div className="ds-surface-row"><span className="ds-surface-chip ds-surface-muted" /> Muted <code>#F1F3EC</code></div></div></Card>
              <Card padded><CardHeading title="Elevation" description="Shadows are reserved for hierarchy" /><div className="ds-elevation-list"><span className="ds-elevation-sample ds-elevation-sm">Subtle</span><span className="ds-elevation-sample ds-elevation-md">Raised</span><span className="ds-elevation-sample ds-elevation-focus">Focus</span></div></Card>
            </div>
          </Section>

          <Section id="type" eyebrow="02 · TYPOGRAPHY" title="Clarity at every size">
            <Card padded className="ds-type-card"><div className="ds-type-example"><span className="ds-type-label">DISPLAY · 40 / 44 · SEMIBOLD</span><p className="ds-type-display">Small steps.<br /><em>Strong scores.</em></p></div><div className="ds-type-details"><div><span className="ds-type-label">HEADING · 20 / 28 · SEMIBOLD</span><p className="ds-type-heading">A little practice goes a long way.</p></div><div><span className="ds-type-label">BODY · 14 / 22 · REGULAR</span><p className="ds-type-body">A clear explanation helps every learner understand not only what the answer is, but why it works.</p></div><div className="ds-type-caption"><span className="ds-type-label">LABEL · 11 / 16 · MEDIUM</span><span className="ds-mini-label">WEEKLY STUDY GOAL</span></div></div></Card>
          </Section>

          <Section id="spacing" eyebrow="03 · SPACING & SHAPE" title="Room to think">
            <div className="ds-token-lower">
              <Card padded><CardHeading title="Spacing scale" description="A consistent 4px rhythm" /><div className="ds-spacing-list">{[{ label: '4', size: 4 }, { label: '8', size: 8 }, { label: '12', size: 12 }, { label: '16', size: 16 }, { label: '24', size: 24 }, { label: '32', size: 32 }, { label: '48', size: 48 }].map((item) => <div className="ds-spacing-row" key={item.label}><code>{item.label}px</code><span className="ds-spacing-bar" style={{ width: item.size * 2 }} /></div>)}</div></Card>
              <Card padded><CardHeading title="Corners & controls" description="Soft utility, not softness for its own sake" /><div className="ds-radius-list"><span className="ds-radius-sample ds-radius-sm">8px</span><span className="ds-radius-sample ds-radius-md">12px</span><span className="ds-radius-sample ds-radius-lg">16px</span><span className="ds-radius-sample ds-radius-pill">Pill</span></div></Card>
            </div>
          </Section>

          <Section id="actions" eyebrow="04 · ACTIONS & FIELDS" title="Simple, useful actions">
            <Card padded>
              <CardHeading title="Buttons" description="Distinct hierarchy without visual noise" />
              <div className="ds-component-row ds-button-row"><Button><Sparkles size={15} /> Create a study plan</Button><Button variant="secondary">Secondary</Button><Button variant="quiet">Quiet action</Button><Button variant="danger">Remove</Button><Button size="sm" variant="secondary">Small</Button><Button size="lg">Large action <ArrowRight size={15} /></Button><Button disabled>Unavailable</Button></div>
              <div className="ds-divider" /><CardHeading title="Fields" description="Clear labels, visible focus, helpful validation" />
              <div className="ds-fields-grid"><Input label="Email address" name="student-email" placeholder="you@example.com" hint="Used only for your study account." /><Dropdown label="ACT section" name="act-section" value={section} onChange={(event) => setSection(event.target.value)} options={[{ label: 'English', value: 'english' }, { label: 'Math', value: 'math' }, { label: 'Reading', value: 'reading' }, { label: 'Science', value: 'science' }]} /><Input label="Study goal" name="goal" placeholder="e.g. Raise my score by 3 points" error="Please enter a specific goal." /></div>
              <div className="ds-search-row"><label className="ds-search-wrap"><Search size={15} /><input aria-label="Search design system" placeholder="Search questions, topics, or skills" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span className="ds-search-hint">⌘ K</span></div>
            </Card>
          </Section>

          <Section id="feedback" eyebrow="05 · FEEDBACK" title="Encouraging, informative feedback">
            <div className="ds-token-lower">
              <Card padded><CardHeading title="Badges" description="Compact status and category markers" /><div className="ds-component-row ds-badge-row"><Badge>In progress</Badge><Badge tone="success"><Check size={12} /> Mastered</Badge><Badge tone="warning">Needs review</Badge><Badge tone="danger">Overdue</Badge><Badge tone="info">Recommended</Badge></div></Card>
              <Card padded><CardHeading title="Progress" description="Progress that informs, never pressures" /><div className="ds-progress-list"><ProgressBar label="Weekly practice" value={72} /><ProgressBar label="English skills" value={8} max={10} /><ProgressBar label="Just getting started" value={0} showValue={false} /></div></Card>
            </div>
            <Card padded className="ds-alert-card"><CardHeading title="Alerts" description="Semantic color plus a clear message" /><div className="ds-alert-stack"><Alert tone="success" title="Nice work">Your practice set is complete. Your progress has been saved.</Alert><Alert tone="warning" title="One more step">Finish your diagnostic to get a personalized plan.</Alert><Alert tone="danger" title="Connection interrupted">Your answer was not saved. Try again when you’re back online.</Alert><Alert tone="info">You can revisit this explanation any time in Mistake review.</Alert></div></Card>
          </Section>

          <Section id="navigation" eyebrow="06 · NAVIGATION & OVERLAYS" title="Navigation that stays out of the way">
            <Card padded><CardHeading title="Tabs" description="Keyboard-accessible, horizontally scrollable on small screens" /><div className="ds-tabs-wrap"><Tabs items={tabItems} value={activeTab} onValueChange={setActiveTab} label="Practice sections" /></div><div className="ds-tab-panel" role="tabpanel" id="Practice-sections-panel" aria-labelledby={`Practice-sections-${activeTab}-tab`}><BookOpen size={16} /><span>{activeTab === 'overview' ? 'A quick overview of your preparation.' : `Focused practice in ${activeTab}.`}</span></div></Card>
            <div className="ds-token-lower ds-overlay-row">
              <Card padded><CardHeading title="Tooltip" description="Helpful context on hover or keyboard focus" /><div className="ds-tooltip-example"><span>What counts as a streak?</span><Tooltip label="A streak is one completed practice session each day."><button className="ds-help-button" type="button" aria-label="What counts as a streak?"><CircleHelp size={16} /></button></Tooltip></div></Card>
              <Card padded><CardHeading title="Modal" description="Focused dialogs with responsive presentation" /><p className="ds-modal-copy">Use a dialog for a focused decision—not routine navigation.</p><Button variant="secondary" onClick={() => setModalOpen(true)}>Preview dialog</Button></Card>
            </div>
          </Section>

          <Section id="states" eyebrow="07 · STATES" title="Thoughtful at every moment">
            <div className="ds-token-lower ds-states-grid">
              <Card padded><CardHeading title="Loading" description="Quiet skeletons reserve content space" /><div className="ds-loading-preview"><LoadingState label="Preparing your summary" lines={3} /></div></Card>
              <Card><EmptyState icon={<FlaskConical size={19} />} title="Your practice starts here" description="Choose a section to see questions selected for your current goals." action={<Button size="sm">Explore practice <ArrowRight size={13} /></Button>} /></Card>
            </div>
          </Section>

          <footer className="ds-footer"><span className="ds-footer-mark"><Compass size={14} /></span><span>Northstar ACT design system</span><span className="ds-footer-dot">·</span><span>Made for clarity and progress</span></footer>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ready for your next step?" description="A small, focused choice helps keep your study plan personal." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Not now</Button><Button onClick={() => setModalOpen(false)}>Sounds good <ArrowRight size={14} /></Button></>}>
        <div className="ds-modal-content"><span className="ds-modal-icon"><Target size={19} /></span><div><strong>Your plan stays flexible.</strong><p>Change your goals and schedule whenever you need to. Your progress is yours to shape.</p></div></div>
      </Modal>
    </main>
  );
}
