import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { generateOriginalQuestion } from '@/lib/original-question-generation-service';
import { validateAndStoreOriginalQuestion } from '@/lib/original-question-lifecycle';
import { hasTrustedOrigin } from '@/lib/request-security';
import { createOriginalQuestionGenerationHandler } from '@/lib/original-question-generation-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handle = createOriginalQuestionGenerationHandler({
  hasTrustedOrigin,
  isAuthenticated: async () => {
    const session = await getAuth().api.getSession({ headers: await headers() });
    return Boolean(session?.user);
  },
  generate: generateOriginalQuestion,
  validate: (input, question) => validateAndStoreOriginalQuestion(input, question as Awaited<ReturnType<typeof generateOriginalQuestion>>),
});

export async function POST(request: Request) {
  return handle(request);
}
