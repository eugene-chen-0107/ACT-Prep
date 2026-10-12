import type { QuestionDifficulty, QuestionOption, QuestionType } from './schema';

export const demoSections = [
  { id: 'english', name: 'English', description: 'Usage, mechanics, rhetoric, and organization.', sortOrder: 1 },
  { id: 'math', name: 'Math', description: 'Pre-algebra through trigonometry and statistics.', sortOrder: 2 },
  { id: 'reading', name: 'Reading', description: 'Passage comprehension, craft, and evidence.', sortOrder: 3 },
  { id: 'science', name: 'Science', description: 'Data interpretation, research summaries, and conflicting viewpoints.', sortOrder: 4 },
] as const;

export type DemoTopic = {
  id: string;
  sectionId: string;
  parentTopicId: string | null;
  name: string;
  description: string;
  sortOrder: number;
};

// Content taxonomy is reference data, not UI configuration. Add or reorder topics
// here (or later in a content-management workflow) without changing components.
export const demoTopics: DemoTopic[] = [
  { id: 'english-conventions', sectionId: 'english', parentTopicId: null, name: 'Conventions of Standard English', description: 'Grammar, usage, punctuation, and sentence structure.', sortOrder: 1 },
  { id: 'english-agreement', sectionId: 'english', parentTopicId: 'english-conventions', name: 'Agreement and usage', description: 'Subject-verb agreement and precise usage.', sortOrder: 1 },
  { id: 'english-punctuation', sectionId: 'english', parentTopicId: 'english-conventions', name: 'Punctuation', description: 'Punctuation choices and sentence boundaries.', sortOrder: 2 },
  { id: 'english-production', sectionId: 'english', parentTopicId: null, name: 'Production of Writing', description: 'Organization, development, and rhetorical effectiveness.', sortOrder: 2 },
  { id: 'english-concision', sectionId: 'english', parentTopicId: 'english-production', name: 'Concision and style', description: 'Clear, direct, and appropriately styled writing.', sortOrder: 1 },
  { id: 'english-organization', sectionId: 'english', parentTopicId: 'english-production', name: 'Organization and transitions', description: 'Logical sequence, focus, and transitions.', sortOrder: 2 },

  { id: 'math-algebra', sectionId: 'math', parentTopicId: null, name: 'Algebra', description: 'Expressions, equations, inequalities, and systems.', sortOrder: 1 },
  { id: 'math-linear-equations', sectionId: 'math', parentTopicId: 'math-algebra', name: 'Linear equations', description: 'Solve and interpret linear equations.', sortOrder: 1 },
  { id: 'math-systems', sectionId: 'math', parentTopicId: 'math-algebra', name: 'Systems of equations', description: 'Solve and interpret systems of linear equations.', sortOrder: 2 },
  { id: 'math-functions', sectionId: 'math', parentTopicId: null, name: 'Functions', description: 'Function notation, representations, and behavior.', sortOrder: 2 },
  { id: 'math-function-notation', sectionId: 'math', parentTopicId: 'math-functions', name: 'Function notation', description: 'Evaluate and interpret functions.', sortOrder: 1 },
  { id: 'math-function-models', sectionId: 'math', parentTopicId: 'math-functions', name: 'Function models', description: 'Use functions to model relationships.', sortOrder: 2 },

  { id: 'reading-key-ideas', sectionId: 'reading', parentTopicId: null, name: 'Key Ideas and Details', description: 'Central ideas, evidence, and supported inferences.', sortOrder: 1 },
  { id: 'reading-explicit-detail', sectionId: 'reading', parentTopicId: 'reading-key-ideas', name: 'Explicit details', description: 'Locate information stated directly in a passage.', sortOrder: 1 },
  { id: 'reading-inference', sectionId: 'reading', parentTopicId: 'reading-key-ideas', name: 'Inference and evidence', description: 'Draw evidence-based conclusions from a passage.', sortOrder: 2 },
  { id: 'reading-craft', sectionId: 'reading', parentTopicId: null, name: 'Craft and Structure', description: 'Word choice, structure, point of view, and purpose.', sortOrder: 2 },
  { id: 'reading-vocabulary', sectionId: 'reading', parentTopicId: 'reading-craft', name: 'Words in context', description: 'Determine meaning from context and usage.', sortOrder: 1 },
  { id: 'reading-purpose', sectionId: 'reading', parentTopicId: 'reading-craft', name: 'Purpose and structure', description: 'Analyze how a passage is organized and why.', sortOrder: 2 },

  { id: 'science-data', sectionId: 'science', parentTopicId: null, name: 'Interpretation of Data', description: 'Read, compare, and infer from visual and numerical data.', sortOrder: 1 },
  { id: 'science-tables', sectionId: 'science', parentTopicId: 'science-data', name: 'Tables and graphs', description: 'Read values and relationships in data displays.', sortOrder: 1 },
  { id: 'science-trends', sectionId: 'science', parentTopicId: 'science-data', name: 'Trends and comparisons', description: 'Compare measurements and identify patterns.', sortOrder: 2 },
  { id: 'science-investigation', sectionId: 'science', parentTopicId: null, name: 'Scientific Investigation', description: 'Understand experimental design, variables, and evidence.', sortOrder: 2 },
  { id: 'science-variables', sectionId: 'science', parentTopicId: 'science-investigation', name: 'Variables and controls', description: 'Identify variables and controlled conditions.', sortOrder: 1 },
  { id: 'science-hypotheses', sectionId: 'science', parentTopicId: 'science-investigation', name: 'Hypotheses and predictions', description: 'Connect hypotheses to testable predictions.', sortOrder: 2 },
];

export type DemoQuestion = {
  id: string;
  slug: string;
  sectionId: string;
  topicId: string;
  subtopicId: string;
  subtopic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  estimatedTimeSeconds: number;
  tags: string[];
  prompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
};

// Original demo material for schema and application testing; not copied from an ACT test.
export const demoQuestions: DemoQuestion[] = [
  {
    id: 'demo-eng-001', slug: 'demo-english-subject-verb-001', sectionId: 'english', topicId: 'english-conventions', subtopicId: 'english-agreement',
    subtopic: 'Agreement and usage', difficulty: 'easy', questionType: 'multiple_choice', estimatedTimeSeconds: 45, tags: ['grammar', 'agreement'],
    prompt: 'The collection of field notes ___ in the archive beside the map.',
    options: [{ id: 'A', text: 'are stored' }, { id: 'B', text: 'is stored' }, { id: 'C', text: 'have stored' }, { id: 'D', text: 'were storing' }],
    correctAnswer: 'B', explanation: 'The subject is the singular noun “collection,” so it takes the singular verb “is stored.”',
  },
  {
    id: 'demo-eng-002', slug: 'demo-english-conciseness-002', sectionId: 'english', topicId: 'english-production', subtopicId: 'english-concision',
    subtopic: 'Concision and style', difficulty: 'medium', questionType: 'multiple_choice', estimatedTimeSeconds: 60, tags: ['rhetoric', 'concision'],
    prompt: 'Which choice most clearly and concisely completes the sentence? “After reviewing the survey responses, the committee ___.”',
    options: [{ id: 'A', text: 'made a decision to revise the schedule' }, { id: 'B', text: 'decided to revise the schedule' }, { id: 'C', text: 'came to the conclusion that the schedule should be revised' }, { id: 'D', text: 'was of the opinion that a schedule revision was needed' }],
    correctAnswer: 'B', explanation: '“Decided to revise” communicates the action directly without unnecessary wording.',
  },
  {
    id: 'demo-eng-003', slug: 'demo-english-transition-003', sectionId: 'english', topicId: 'english-production', subtopicId: 'english-organization',
    subtopic: 'Organization and transitions', difficulty: 'easy', questionType: 'multiple_choice', estimatedTimeSeconds: 50, tags: ['transitions', 'organization'],
    prompt: 'The first trial produced inconsistent readings. ___, the team recalibrated the sensor before collecting more data.',
    options: [{ id: 'A', text: 'For example' }, { id: 'B', text: 'As a result' }, { id: 'C', text: 'In contrast' }, { id: 'D', text: 'Meanwhile' }],
    correctAnswer: 'B', explanation: 'Recalibrating the sensor is a response to the inconsistent readings, so “As a result” expresses the logical relationship.',
  },
  {
    id: 'demo-math-001', slug: 'demo-math-linear-equation-001', sectionId: 'math', topicId: 'math-algebra', subtopicId: 'math-linear-equations',
    subtopic: 'Linear equations', difficulty: 'easy', questionType: 'multiple_choice', estimatedTimeSeconds: 45, tags: ['algebra', 'equations'],
    prompt: 'If 3x − 7 = 11, what is the value of x?',
    options: [{ id: 'A', text: '4' }, { id: 'B', text: '5' }, { id: 'C', text: '6' }, { id: 'D', text: '18' }],
    correctAnswer: 'C', explanation: 'Add 7 to both sides to get 3x = 18, then divide by 3 to get x = 6.',
  },
  {
    id: 'demo-math-002', slug: 'demo-math-function-value-002', sectionId: 'math', topicId: 'math-functions', subtopicId: 'math-function-notation',
    subtopic: 'Function notation', difficulty: 'medium', questionType: 'multiple_choice', estimatedTimeSeconds: 60, tags: ['functions', 'substitution'],
    prompt: 'For f(x) = x² − 2x, what is f(4)?',
    options: [{ id: 'A', text: '4' }, { id: 'B', text: '8' }, { id: 'C', text: '12' }, { id: 'D', text: '24' }],
    correctAnswer: 'B', explanation: 'Substitute 4 for x: f(4) = 4² − 2(4) = 16 − 8 = 8.',
  },
  {
    id: 'demo-math-003', slug: 'demo-math-system-equations-003', sectionId: 'math', topicId: 'math-algebra', subtopicId: 'math-systems',
    subtopic: 'Systems of equations', difficulty: 'medium', questionType: 'multiple_choice', estimatedTimeSeconds: 75, tags: ['algebra', 'systems'],
    prompt: 'The system x + y = 9 and x − y = 3 has what value of x?',
    options: [{ id: 'A', text: '3' }, { id: 'B', text: '4' }, { id: 'C', text: '6' }, { id: 'D', text: '9' }],
    correctAnswer: 'C', explanation: 'Adding the equations eliminates y and gives 2x = 12, so x = 6.',
  },
  {
    id: 'demo-read-001', slug: 'demo-reading-explicit-detail-001', sectionId: 'reading', topicId: 'reading-key-ideas', subtopicId: 'reading-explicit-detail',
    subtopic: 'Explicit details', difficulty: 'easy', questionType: 'passage_based', estimatedTimeSeconds: 60, tags: ['details', 'evidence'],
    prompt: 'A passage states: “The neighborhood garden opened in April, and volunteers planted tomatoes and beans during its first week.” Which statement is directly supported?',
    options: [{ id: 'A', text: 'The garden opened in spring.' }, { id: 'B', text: 'The garden produced the neighborhood’s most popular vegetables.' }, { id: 'C', text: 'The garden was funded by a school.' }, { id: 'D', text: 'Volunteers harvested crops in April.' }],
    correctAnswer: 'A', explanation: 'April is in spring, so the opening season is directly supported. The passage does not state the other claims.',
  },
  {
    id: 'demo-read-002', slug: 'demo-reading-word-in-context-002', sectionId: 'reading', topicId: 'reading-craft', subtopicId: 'reading-vocabulary',
    subtopic: 'Words in context', difficulty: 'medium', questionType: 'passage_based', estimatedTimeSeconds: 60, tags: ['vocabulary', 'context'],
    prompt: 'In the sentence “The researcher’s cautious conclusion reflected the limited sample,” cautious most nearly means:',
    options: [{ id: 'A', text: 'carefully qualified' }, { id: 'B', text: 'enthusiastically stated' }, { id: 'C', text: 'widely repeated' }, { id: 'D', text: 'immediately disproved' }],
    correctAnswer: 'A', explanation: 'A limited sample supports a restrained, carefully qualified conclusion rather than a sweeping claim.',
  },
  {
    id: 'demo-read-003', slug: 'demo-reading-inference-003', sectionId: 'reading', topicId: 'reading-key-ideas', subtopicId: 'reading-inference',
    subtopic: 'Inference and evidence', difficulty: 'medium', questionType: 'passage_based', estimatedTimeSeconds: 75, tags: ['inference', 'evidence'],
    prompt: 'A town library extended its evening hours after a survey found that many residents could not visit before 5 p.m. Which conclusion is best supported?',
    options: [{ id: 'A', text: 'The library expected evening visits to be more convenient for some residents.' }, { id: 'B', text: 'Every resident preferred evening hours.' }, { id: 'C', text: 'The library stopped opening in the morning.' }, { id: 'D', text: 'The survey measured how many books residents read.' }],
    correctAnswer: 'A', explanation: 'The survey identified a scheduling barrier, and extending hours directly responds to that barrier. The passage does not support the broader claims in the other choices.',
  },
  {
    id: 'demo-sci-001', slug: 'demo-science-table-trend-001', sectionId: 'science', topicId: 'science-data', subtopicId: 'science-tables',
    subtopic: 'Tables and graphs', difficulty: 'easy', questionType: 'data_interpretation', estimatedTimeSeconds: 45, tags: ['data', 'tables'],
    prompt: 'A sensor records 12 units at 9 a.m., 18 units at noon, and 24 units at 3 p.m. Which interval shows an increase of 6 units?',
    options: [{ id: 'A', text: '9 a.m. to noon only' }, { id: 'B', text: 'noon to 3 p.m. only' }, { id: 'C', text: 'both intervals' }, { id: 'D', text: 'neither interval' }],
    correctAnswer: 'C', explanation: 'The value rises from 12 to 18 (+6) and from 18 to 24 (+6).',
  },
  {
    id: 'demo-sci-002', slug: 'demo-science-controlled-variable-002', sectionId: 'science', topicId: 'science-investigation', subtopicId: 'science-variables',
    subtopic: 'Variables and controls', difficulty: 'medium', questionType: 'experiment_analysis', estimatedTimeSeconds: 60, tags: ['experiments', 'variables'],
    prompt: 'Two identical seedlings receive different amounts of light but the same soil, water, and container. Which factor is intentionally varied?',
    options: [{ id: 'A', text: 'Soil type' }, { id: 'B', text: 'Water amount' }, { id: 'C', text: 'Container size' }, { id: 'D', text: 'Light exposure' }],
    correctAnswer: 'D', explanation: 'Light exposure is the sole stated difference; soil, water, and container are held constant.',
  },
  {
    id: 'demo-sci-003', slug: 'demo-science-trend-003', sectionId: 'science', topicId: 'science-data', subtopicId: 'science-trends',
    subtopic: 'Trends and comparisons', difficulty: 'easy', questionType: 'data_interpretation', estimatedTimeSeconds: 50, tags: ['data', 'trends'],
    prompt: 'In a trial, plant height averages 4 cm in week 1, 7 cm in week 2, and 10 cm in week 3. What pattern is shown?',
    options: [{ id: 'A', text: 'Height increased by 3 cm each week.' }, { id: 'B', text: 'Height doubled every week.' }, { id: 'C', text: 'Height decreased after week 1.' }, { id: 'D', text: 'Height stayed constant.' }],
    correctAnswer: 'A', explanation: 'The increase is 7 − 4 = 3 cm and 10 − 7 = 3 cm, so the average height rises by 3 cm each week.',
  },
];

export const demoAchievements = [
  { key: 'first-practice', title: 'First Steps', description: 'Complete your first practice session.', icon: 'flag', criteria: { sessionsCompleted: 1 } },
  { key: 'ten-questions', title: 'Building Momentum', description: 'Answer ten practice questions.', icon: 'zap', criteria: { questionsAttempted: 10 } },
  { key: 'all-sections', title: 'Well Rounded', description: 'Practice all four ACT sections.', icon: 'compass', criteria: { sectionsPracticed: 4 } },
] as const;
