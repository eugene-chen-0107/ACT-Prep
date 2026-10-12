import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { AppPagePlaceholder } from '@/components/app-page-placeholder';
import { allNavigation } from '@/components/app-navigation';

export function generateStaticParams() {
  return allNavigation
    .filter((item) => item.href !== '/dashboard' && item.href !== '/progress' && item.href !== '/smart-practice' && item.href !== '/review' && item.href !== '/tests')
    .map((item) => ({ section: item.href.slice(1) }));
}

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = allNavigation.find((navigationItem) => navigationItem.href === `/${section}`);
  if (section === 'smart-practice') redirect('/smart-practice');
  if (section === 'review') redirect('/review');
  if (section === 'tests') redirect('/tests');
  if (!item || item.href === '/dashboard' || item.href === '/progress' || item.href === '/smart-practice' || item.href === '/review' || item.href === '/tests') notFound();
  return <AppPagePlaceholder item={item} />;
}
