import { AppPagePlaceholder } from '@/components/app-page-placeholder';
import { getNavigationItem } from '@/components/app-navigation';

const dashboard = getNavigationItem('/dashboard');

export default function DashboardPage() {
  if (!dashboard) return null;
  return <AppPagePlaceholder item={dashboard} />;
}
