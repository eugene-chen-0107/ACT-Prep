import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import type { AppNavigationItem } from './app-navigation';

export function AppPagePlaceholder({ item }: { item: AppNavigationItem }) {
  const Icon = item.icon;
  return (
    <div className="app-placeholder">
      <div className="app-placeholder-kicker"><Icon size={14} aria-hidden="true" /> Northstar ACT · {item.label}</div>
      <h2>{item.label}</h2>
      <p className="app-placeholder-lede">{item.description}. This space is ready for the next part of your preparation experience.</p>
      <section className="app-placeholder-panel" aria-label={`${item.label} coming soon`}>
        <div className="app-placeholder-panel-inner">
          <span className="app-placeholder-icon"><Compass size={21} /></span>
          <h3>Your next step is taking shape</h3>
          <p>This section is a placeholder for now. Your navigation and workspace are ready; learning features will be added here.</p>
          <Link className="app-placeholder-link" href="/dashboard">Back to dashboard <ArrowRight size={14} /></Link>
        </div>
      </section>
    </div>
  );
}
