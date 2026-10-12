import { Suspense } from 'react';
import { SmartPracticeExperience } from '@/components/smart-practice-experience';

export default function SmartPracticePage() {
  return <Suspense fallback={<div className="smart-loading">Preparing Smart Practice…</div>}><SmartPracticeExperience /></Suspense>;
}
