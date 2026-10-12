import { PracticeTestExperience } from '@/components/practice-test-experience';
import { listPracticeTests } from '@/lib/practice-test-data';

export default async function TestsPage() {
  const { tests, activeAttempts } = await listPracticeTests();
  return <PracticeTestExperience initialTests={tests} activeAttempts={activeAttempts} />;
}
