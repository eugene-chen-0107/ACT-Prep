import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { sections, topics } from '@/db/schema';
import { getAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const [activeSections, activeTopics] = await Promise.all([
    db.select({ id: sections.id, name: sections.name })
      .from(sections).where(eq(sections.isActive, true)).orderBy(asc(sections.sortOrder)),
    db.select({ id: topics.id, sectionId: topics.sectionId, name: topics.name })
      .from(topics).where(and(eq(topics.isActive, true), isNull(topics.parentTopicId))).orderBy(asc(topics.sortOrder)),
  ]);
  return NextResponse.json(
    { sections: activeSections, topics: activeTopics },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
