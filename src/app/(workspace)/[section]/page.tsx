import { notFound } from 'next/navigation';
import { AppPagePlaceholder } from '@/components/app-page-placeholder';
import { allNavigation } from '@/components/app-navigation';

export function generateStaticParams() {
  return allNavigation
    .filter((item) => item.href !== '/dashboard')
    .map((item) => ({ section: item.href.slice(1) }));
}

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = allNavigation.find((navigationItem) => navigationItem.href === `/${section}`);
  if (!item || item.href === '/dashboard') notFound();
  return <AppPagePlaceholder item={item} />;
}
