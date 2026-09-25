import type { QuestionDifficulty, QuestionOption } from './schema';

export const demoSections = [
  { id: 'english', name: 'English', description: 'Usage, mechanics, rhetoric, and organization.', sortOrder: 1 },
  { id: 'math', name: 'Math', description: 'Pre-algebra through trigonometry and statistics.', sortOrder: 2 },
  { id: 'reading', name: 'Reading', description: 'Passage comprehension, craft, and evidence.', sortOrder: 3 },
  { id: 'science', name: 'Science', description: 'Data interpretation, research summaries, and conflicting viewpoints.', sortOrder: 4 },
] as const;

export const demoTopics = [
  { id: 'english-conventions', sectionId: 'english', name: 'Conventions of Standard English', sortOrder: 1 },
  { id: 'english-production', sectionId: 'english', name: 'Production of Writing', sortOrder: 2 },
  { id: 'math-algebra', sectionId: 'math', name: 'Algebra', sortOrder: 1 },
  { id: 'math-functions', sectionId: 'math', name: 'Functions', sortOrder: 2 },
  { id: 'reading-key-ideas', sectionId: 'reading', name: 'Key Ideas and Details', sortOrder: 1 },
  { id: 'reading-craft', sectionId: 'reading', name: 'Craft and Structure', sortOrder: 2 },
  { id: 'science-data', sectionId: 'science', name: 'Interpretation of Data', sortOrder: 1 },
  { id: 'science-investigation', sectionId: 'science', name: 'Scientific Investigation', sortOrder: 2 },
] as const;

export type DemoQuestion = {
  id: string;
  slug: string;
  sectionId: string;
  topicId: string;
  subtopic: string;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
};

// Original demo material for schema and application testing; not copied from an ACT test.
export const demoQuestions: DemoQuestion[] = [
  {
    id: 'demo-eng-001', slug: 'demo-english-subject-verb-001', sectionId: 'english', topicId: 'english-conventions',
    subtopic: 'Subject-verb agreement', difficulty: 'easy',
    prompt: 'The collection of field notes ___ in the archive beside the map.',
    options: [{ id: 'A', text: 'are stored' }, { id: 'B', text: 'is stored' }, { id: 'C', text: 'have stored' }, { id: 'D', text: 'were storing' }],
    correctAnswer: 'B', explanation: 'The subject is the singular noun “collection,” so it takes the singular verb “is stored.”',
  },
  {
    id: 'demo-eng-002', slug: 'demo-english-conciseness-002', sectionId: 'english', topicId: 'english-production',
    subtopic: 'Concision', difficulty: 'medium',
    prompt: 'Which choice most clearly and concisely completes the sentence? “After reviewing the survey responses, the committee ___.”',
    options: [{ id: 'A', text: 'made a decision to revise the schedule' }, { id: 'B', text: 'decided to revise the schedule' }, { id: 'C', text: 'came to the conclusion that the schedule should be revised' }, { id: 'D', text: 'was of the opinion that a schedule revision was needed' }],
    correctAnswer: 'B', explanation: '“Decided to revise” communicates the action directly without unnecessary wording.',
  },
  {
    id: 'demo-math-001', slug: 'demo-math-linear-equation-001', sectionId: 'math', topicId: 'math-algebra',
    subtopic: 'Linear equations', difficulty: 'easy',
    prompt: 'If 3x − 7 = 11, what is the value of x?',
    options: [{ id: 'A', text: '4' }, { id: 'B', text: '5' }, { id: 'C', text: '6' }, { id: 'D', text: '18' }],
    correctAnswer: 'C', explanation: 'Add 7 to both sides to get 3x = 18, then divide by 3 to get x = 6.',
  },
  {
    id: 'demo-math-002', slug: 'demo-math-function-value-002', sectionId: 'math', topicId: 'math-functions',
    subtopic: 'Function notation', difficulty: 'medium',
    prompt: 'For f(x) = x² − 2x, what is f(4)?',
    options: [{ id: 'A', text: '4' }, { id: 'B', text: '8' }, { id: 'C', text: '12' }, { id: 'D', text: '24' }],      correctAnswer: 'B', explanation: 'Substitute 4 for x: f(4) = 4² − 2(4) = 16 − 8 = 8.',
  },
  {
    id: 'demo-read-001', slug: 'demo-reading-explicit-detail-001', sectionId: 'reading', topicId: 'reading-key-ideas',
    subtopic: 'Explicit details', difficulty: 'easy',
    prompt: 'A passage states: “The neighborhood garden opened in April, and volunteers planted tomatoes and beans during its first week.” Which statement is directly supported?',
    options: [{ id: 'A', text: 'The garden opened in spring.' }, { id: 'B', text: 'The garden produced the neighborhood’s most popular vegetables.' }, { id: 'C', text: 'The garden was funded by a school.' }, { id: 'D', text: 'Volunteers harvested crops in April.' }],
    correctAnswer: 'A', explanation: 'April is in spring, so the opening season is directly supported. The passage does not state the other claims.',
  },
  {
    id: 'demo-read-002', slug: 'demo-reading-word-in-context-002', sectionId: 'reading', topicId: 'reading-craft',
    subtopic: 'Word meaning in context', difficulty: 'medium',
    prompt: 'In the sentence “The researcher’s cautious conclusion reflected the limited sample,” cautious most nearly means:',
    options: [{ id: 'A', text: 'carefully qualified' }, { id: 'B', text: 'enthusiastically stated' }, { id: 'C', text: 'widely repeated' }, { id: 'D', text: 'immediately disproved' }],
    correctAnswer: 'A', explanation: 'A limited sample supports a restrained, carefully qualified conclusion rather than a sweeping claim.',
  },
  {
    id: 'demo-sci-001', slug: 'demo-science-table-trend-001', sectionId: 'science', topicId: 'science-data',
    subtopic: 'Reading data tables', difficulty: 'easy',
    prompt: 'A sensor records 12 units at 9 a.m., 18 units at noon, and 24 units at 3 p.m. Which interval shows an increase of 6 units?',
    options: [{ id: 'A', text: '9 a.m. to noon only' }, { id: 'B', text: 'noon to 3 p.m. only' }, { id: 'C', text: 'both intervals' }, { id: 'D', text: 'neither interval' }],
    correctAnswer: 'C', explanation: 'The value rises from 12 to 18 (+6) and from 18 to 24 (+6).',
  },
  {
    id: 'demo-sci-002', slug: 'demo-science-controlled-variable-002', sectionId: 'science', topicId: 'science-investigation',
    subtopic: 'Experimental design', difficulty: 'medium',
    prompt: 'Two identical seedlings receive different amounts of light but the same soil, water, and container. Which factor is intentionally varied?',
    options: [{ id: 'A', text: 'Soil type' }, { id: 'B', text: 'Water amount' }, { id: 'C', text: 'Container size' }, { id: 'D', text: 'Light exposure' }],
    correctAnswer: 'D', explanation: 'Light exposure is the sole stated difference; soil, water, and container are held constant.',
  },
];

export const demoAchievements = [
  { key: 'first-practice', title: 'First Steps', description: 'Complete your first practice session.', icon: 'flag', criteria: { sessionsCompleted: 1 } },
  { key: 'ten-questions', title: 'Building Momentum', description: 'Answer ten practice questions.', icon: 'zap', criteria: { questionsAttempted: 10 } },
  { key: 'all-sections', title: 'Well Rounded', description: 'Practice all four ACT sections.', icon: 'compass', criteria: { sectionsPracticed: 4 } },
] as const;
