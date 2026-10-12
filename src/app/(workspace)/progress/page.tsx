import { ProgressExperience } from '@/components/progress-experience';
import { getMyProgressAnalytics } from '@/lib/progress-data';

export default async function ProgressPage() {
  const analytics = await getMyProgressAnalytics();
  return <ProgressExperience analytics={analytics} />;
}
