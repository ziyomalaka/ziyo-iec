/**
 * O'quv jarayoni — Dars testlari API (Student-facing)
 *
 * Ishlatiladi:
 *   GET  /learning/lessons/{lessonId}/tests  → testlar ro'yxati
 *   GET  /learning/tests/{testId}            → savollar (is_correct yo'q)
 *   POST /learning/tests/{testId}/submit     → javoblarni topshirish
 *
 * Ishlatilmasin (student):
 *   /api/v1/admin/tests/...
 *   /admin/it/tests/...
 */

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { withLearningAccessRetry } from "@/lib/api/learning-access";
import { parsePositiveInt, asList, unwrapApiPayload } from "@/lib/api/unwrap";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

// ─── Typlar ──────────────────────────────────────────────────────────────────

export type LessonTestAnswer = {
  id: number;
  text: string;
};

export type LessonTestQuestion = {
  id: number;
  question: string;
  sort_order?: number;
  answers: LessonTestAnswer[];
};

export type LessonTestData = {
  id: number;
  lesson_id?: number;
  title?: string;
  passing_score?: number;
  duration_minutes?: number;
  attempt_limit?: number;
  questions: LessonTestQuestion[];
};

export type LessonTestSummary = {
  id: number;
  title?: string;
  lesson_id?: number;
  passing_score?: number;
  duration_minutes?: number;
  attempt_limit?: number;
  question_count?: number;
  status?: string;
};

export type TestSubmitAnswer = {
  question_id: number;
  answer_id: number;
};

export type MasteryStatus = "in_progress" | "not_mastered" | "completed";

/** Submit javobidagi har bir savol natijasi (faqat submitdan keyin) */
export type LessonTestQuestionResult = {
  question_id: number;
  /** Noma'lum bo'lsa — UI badge chiqarmaydi */
  is_correct?: boolean;
  answer_id?: number;
  correct_answer_id?: number;
  /** Backend matn sifatida qaytarsa */
  correct_answer_text?: string;
  selected_answer_text?: string;
};

export type LessonTestResult = {
  passed: boolean;
  score?: number;
  percentage?: number;
  correct_count?: number;
  total_count?: number;
  attempt?: number;
  /** Backend: attempts_remaining */
  attempts_remaining?: number;
  /** @deprecated alias — attempts_remaining */
  remaining_attempts?: number;
  can_retry?: boolean;
  restudy_required?: boolean;
  mastery_status?: MasteryStatus;
  message?: string;
  /** Har savol: to'g'ri / noto'g'ri — faqat submit response */
  results?: LessonTestQuestionResult[];
};

export const NO_SUBMIT_API = "SUBMIT_API_NOT_READY";

export function findQuestionResult(
  result: LessonTestResult | undefined,
  questionId: number
): LessonTestQuestionResult | undefined {
  return result?.results?.find((r) => r.question_id === questionId);
}

/** Javob belgilangan savol indekslari (0-based) — bo'sh qolganlar. */
export function unansweredQuestionIndexes(
  questions: { id: number }[],
  answers: Record<number, number>
): number[] {
  const missing: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const id = questions[i]?.id;
    if (!id || !answers[id]) missing.push(i);
  }
  return missing;
}

export function isTestFullyAnswered(
  questions: { id: number }[],
  answers: Record<number, number>
): boolean {
  return questions.length > 0 && unansweredQuestionIndexes(questions, answers).length === 0;
}

/** UI uchun status-aware xabar (403 ≠ test yo'q). */
export function lessonTestErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tizimga qayta kiring.";
    if (err.status === 403) return "Ushbu testga kirishga ruxsat yo'q.";
    if (err.status === 404) return "Bu darsda test mavjud emas.";
    if (err.status === 502 || err.status === 503) return "Server vaqtincha javob bermayapti.";
    if (err.status >= 500) return "Serverda xatolik.";
    return err.message || "Test yuklanmadi.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Test yuklanmadi.";
}

// ─── Normallashtirish ────────────────────────────────────────────────────────

function asAnswer(item: unknown, index: number): LessonTestAnswer | null {
  const row = asRecord(item);
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.answer_id) ??
    parsePositiveInt(row.answerId);
  if (!id) return null;
  const text =
    typeof row.answer === "string" && row.answer ? row.answer :
    typeof row.text === "string" && row.text ? row.text :
    typeof row.value === "string" && row.value ? row.value :
    typeof row.content === "string" && row.content ? row.content :
    `Variant ${index + 1}`;
  return { id, text };
}

function asQuestion(item: unknown): LessonTestQuestion | null {
  const row = asRecord(item);
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.question_id) ??
    parsePositiveInt(row.questionId);
  if (!id) return null;

  const questionText =
    typeof row.question === "string" ? row.question :
    typeof row.text === "string" ? row.text :
    typeof row.title === "string" ? row.title :
    typeof row.content === "string" ? row.content : "";

  const answersRaw =
    Array.isArray(row.answers) ? (row.answers as unknown[]) :
    Array.isArray(row.options) ? (row.options as unknown[]) :
    Array.isArray(row.variants) ? (row.variants as unknown[]) : [];

  const answers = answersRaw
    .map((a, i) => asAnswer(a, i))
    .filter((a): a is LessonTestAnswer => a !== null);

  return {
    id,
    question: questionText,
    sort_order: parsePositiveInt(row.sort_order) ?? parsePositiveInt(row.order) ?? undefined,
    answers,
  };
}

function asTestData(data: unknown, lessonId?: number): LessonTestData | null {
  const row = asRecord(unwrapApiPayload(data));
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.test_id) ??
    parsePositiveInt(row.testId);
  if (!id) return null;

  const questionsRaw =
    Array.isArray(row.questions) ? (row.questions as unknown[]) :
    Array.isArray(row.items) ? (row.items as unknown[]) : [];

  const questions = questionsRaw
    .map(asQuestion)
    .filter((q): q is LessonTestQuestion => q !== null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    id,
    lesson_id: parsePositiveInt(row.lesson_id) ?? lessonId,
    title: typeof row.title === "string" ? row.title : undefined,
    passing_score: parsePositiveInt(row.passing_score) ?? undefined,
    duration_minutes: parsePositiveInt(row.duration_minutes) ?? undefined,
    attempt_limit: parsePositiveInt(row.attempt_limit) ?? undefined,
    questions,
  };
}

function asSummary(item: unknown, lessonId: number): LessonTestSummary | null {
  const row = asRecord(item);
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.test_id) ??
    parsePositiveInt(row.testId);
  if (!id) return null;
  return {
    id,
    title: typeof row.title === "string" ? row.title : undefined,
    lesson_id: parsePositiveInt(row.lesson_id) ?? lessonId,
    passing_score: parsePositiveInt(row.passing_score) ?? undefined,
    duration_minutes: parsePositiveInt(row.duration_minutes) ?? undefined,
    attempt_limit: parsePositiveInt(row.attempt_limit) ?? undefined,
    question_count: parsePositiveInt(row.question_count) ?? undefined,
    status: typeof row.status === "string" ? row.status : undefined,
  };
}

/**
 * Swagger: array of LearningTestSummary.
 * Ba'zi backendlar bitta object yoki { data: [...] } qaytarishi mumkin.
 */
function normalizeTestSummaries(data: unknown, lessonId: number): LessonTestSummary[] {
  const list = asList<unknown>(data, ["items", "tests", "data"]);
  if (list.length) {
    return list
      .map((item) => asSummary(item, lessonId))
      .filter((t): t is LessonTestSummary => t !== null);
  }

  // Bitta object: { id, lesson_id, title, ... }
  const single = asSummary(unwrapApiPayload(data), lessonId);
  return single ? [single] : [];
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

function asMasteryStatus(value: unknown): MasteryStatus | undefined {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "in_progress" || raw === "not_mastered" || raw === "completed") {
    return raw;
  }
  return undefined;
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function looksLikeQuestionResult(item: unknown): boolean {
  const row = asRecord(item);
  if (
    row.question_id != null ||
    row.questionId != null ||
    row.is_correct != null ||
    row.isCorrect != null ||
    row.correct_answer_id != null ||
    row.selected_answer_id != null ||
    row.answer_id != null
  ) {
    return true;
  }
  const nestedAnswers = Array.isArray(row.answers) ? row.answers : [];
  return nestedAnswers.some((ans) => {
    const a = asRecord(ans);
    return a.is_correct != null || a.isCorrect != null;
  });
}

function pickNamedResultArray(obj: Record<string, unknown>): unknown[] {
  const keys = [
    "results",
    "question_results",
    "answers_review",
    "answer_results",
    "question_answers",
    "user_answers",
    "details",
    "items",
    "questions",
    "answers",
    "review",
  ];
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value) && value.length && value.some(looksLikeQuestionResult)) {
      return value;
    }
  }
  return [];
}

function collectResultArraysDeep(root: unknown, depth = 0): unknown[] {
  if (root == null || depth > 5) return [];
  if (Array.isArray(root)) {
    if (root.length && root.some(looksLikeQuestionResult)) return root;
    for (const item of root) {
      const found = collectResultArraysDeep(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (typeof root !== "object") return [];
  const obj = root as Record<string, unknown>;
  const named = pickNamedResultArray(obj);
  if (named.length) return named;
  for (const value of Object.values(obj)) {
    const found = collectResultArraysDeep(value, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function pickResultArrays(...objs: Record<string, unknown>[]): unknown[] {
  for (const obj of objs) {
    const named = pickNamedResultArray(obj);
    if (named.length) return named;
  }
  for (const obj of objs) {
    const deep = collectResultArraysDeep(obj, 0);
    if (deep.length) return deep;
  }
  return [];
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseScore(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim().replace("%", ""));
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseNonNegativeInt(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

/** 100% ni savollar soniga teng bo'lib: 1 savol = 100%, 19 savol = 100/19. */
export function pointsPerQuestion(questionCount: number): number {
  if (questionCount <= 0) return 0;
  return 100 / questionCount;
}

export function formatTestPercent(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function equalWeightPercentage(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  return (correctCount * 100) / questionCount;
}

function asQuestionResult(item: unknown): LessonTestQuestionResult | null {
  const row = asRecord(item);
  const questionId =
    parsePositiveInt(row.question_id) ??
    parsePositiveInt(row.questionId) ??
    parsePositiveInt(asRecord(row.question).id) ??
    (Array.isArray(row.answers) || typeof row.question === "string"
      ? parsePositiveInt(row.id)
      : undefined);
  if (!questionId) return null;

  const correctNested = asRecord(row.correct_answer ?? row.correctAnswer ?? row.right_answer);
  const selectedNested = asRecord(row.selected_answer ?? row.user_answer ?? row.chosen_answer);

  const answersList = Array.isArray(row.answers)
    ? (row.answers as unknown[])
    : Array.isArray(row.options)
      ? (row.options as unknown[])
      : [];
  let correctFromListId: number | undefined;
  let correctFromListText: string | undefined;
  for (const ans of answersList) {
    const a = asRecord(ans);
    if (asBool(a.is_correct) === true || asBool(a.isCorrect) === true) {
      correctFromListId =
        parsePositiveInt(a.id) ?? parsePositiveInt(a.answer_id) ?? undefined;
      correctFromListText = pickText(a.answer, a.text, a.value, a.content);
      break;
    }
  }

  const answerId =
    parsePositiveInt(row.answer_id) ??
    parsePositiveInt(row.answerId) ??
    parsePositiveInt(row.selected_answer_id) ??
    parsePositiveInt(row.selectedAnswerId) ??
    parsePositiveInt(row.user_answer_id) ??
    parsePositiveInt(selectedNested.id) ??
    parsePositiveInt(selectedNested.answer_id) ??
    undefined;

  const correctAnswerId =
    parsePositiveInt(row.correct_answer_id) ??
    parsePositiveInt(row.correctAnswerId) ??
    parsePositiveInt(row.right_answer_id) ??
    parsePositiveInt(correctNested.id) ??
    parsePositiveInt(correctNested.answer_id) ??
    correctFromListId ??
    undefined;

  let isCorrect =
    asBool(row.is_correct) ??
    asBool(row.isCorrect) ??
    asBool(row.correct) ??
    asBool(row.is_right) ??
    asBool(row.passed);
  if (isCorrect === undefined && answerId != null && correctAnswerId != null) {
    isCorrect = answerId === correctAnswerId;
  }

  return {
    question_id: questionId,
    is_correct: isCorrect,
    answer_id: answerId,
    correct_answer_id: correctAnswerId,
    correct_answer_text:
      pickText(
        row.correct_answer_text,
        row.correctAnswerText,
        typeof row.correct_answer === "string" ? row.correct_answer : undefined,
        typeof row.right_answer === "string" ? row.right_answer : undefined,
        row.right_answer_text,
        correctNested.answer,
        correctNested.text,
        correctNested.value,
        correctFromListText
      ) ?? undefined,
    selected_answer_text:
      pickText(
        row.selected_answer_text,
        row.user_answer_text,
        row.answer_text,
        selectedNested.answer,
        selectedNested.text,
        typeof row.answer === "string" ? row.answer : undefined
      ) ?? undefined,
  };
}

function asResult(data: unknown): LessonTestResult {
  const row = asRecord(unwrapApiPayload(data));
  const nested = {
    ...asPlainObject(row.data),
    ...asPlainObject(row.result),
    ...asPlainObject(typeof row.attempt === "object" ? row.attempt : undefined),
    ...asPlainObject(row.payload),
    ...asPlainObject(row.submission),
  };
  const src: Record<string, unknown> = { ...nested, ...row };

  const passed =
    typeof src.passed === "boolean" ? src.passed :
    typeof src.is_passed === "boolean" ? src.is_passed :
    src.passed === "true" || src.passed === 1 || src.passed === "1" ||
    src.is_passed === "true" || src.is_passed === 1 || false;

  const attemptsRemaining =
    parsePositiveInt(src.attempts_remaining) ??
    parsePositiveInt(src.remaining_attempts) ??
    (src.attempts_remaining === 0 || src.remaining_attempts === 0 ? 0 : undefined);

  const canRetry = asBool(src.can_retry);
  const restudyRequired = asBool(src.restudy_required) === true;
  const masteryStatus = asMasteryStatus(src.mastery_status);

  const resultsRaw = pickResultArrays(src, nested, row);
  const results = resultsRaw
    .map(asQuestionResult)
    .filter((r): r is LessonTestQuestionResult => r !== null);

  const correctFromResults = results.length
    ? results.filter((r) => r.is_correct === true).length
    : undefined;

  return {
    passed,
    score: parseScore(src.score) ?? parseScore(src.total_score),
    percentage:
      parseScore(src.percentage) ??
      parseScore(src.percent) ??
      parseScore(src.score_percent),
    correct_count:
      parseNonNegativeInt(src.correct_count) ??
      parseNonNegativeInt(src.correct) ??
      parseNonNegativeInt(src.correct_answers) ??
      correctFromResults,
    total_count:
      parsePositiveInt(src.total_count) ??
      parsePositiveInt(src.total) ??
      parsePositiveInt(src.question_count) ??
      (results.length || undefined),
    attempt:
      parsePositiveInt(row.attempt) ??
      parsePositiveInt(src.attempt_number) ??
      parsePositiveInt(asPlainObject(row.attempt).number) ??
      parsePositiveInt(asPlainObject(row.attempt).attempt_number) ??
      undefined,
    attempts_remaining: attemptsRemaining,
    remaining_attempts: attemptsRemaining,
    can_retry: canRetry,
    restudy_required: restudyRequired || undefined,
    mastery_status: masteryStatus,
    message: typeof src.message === "string" ? src.message : undefined,
    results: results.length ? results : undefined,
  };
}

/** 0% / 100% yoki bitta savol — qaysi savol to'g'ri/noto'g'ri ekanini aniqlash mumkin. */
function inferUniformCorrectness(
  result: LessonTestResult,
  questionCount: number
): boolean | undefined {
  if (questionCount <= 0) return undefined;
  if (questionCount === 1 && typeof result.passed === "boolean") return result.passed;
  const pct = result.percentage ?? result.score;
  const correct = result.correct_count;
  const total = result.total_count ?? questionCount;
  if (pct === 100 || (correct != null && total > 0 && correct >= total)) return true;
  if (pct === 0 || correct === 0) return false;
  return undefined;
}

function resolveCorrectCount(result: LessonTestResult, questionCount: number): number | undefined {
  const rows = result.results ?? [];
  const known = rows.filter((row) => typeof row.is_correct === "boolean");
  if (known.length === questionCount && questionCount > 0) {
    return known.filter((row) => row.is_correct === true).length;
  }
  if (result.correct_count != null) return result.correct_count;
  if (result.percentage === 0 || result.score === 0) return 0;
  if (result.percentage === 100) return questionCount;
  const score = result.score;
  if (
    score != null &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= questionCount &&
    (result.percentage == null || result.percentage === score)
  ) {
    return score;
  }
  return undefined;
}

/** Jami 100% — har savol 100/n. */
export function applyEqualQuestionScoring(
  result: LessonTestResult,
  questionCount: number,
  passingScore?: number
): LessonTestResult {
  if (questionCount <= 0) return result;
  const correctCount = resolveCorrectCount(result, questionCount);
  if (correctCount == null) {
    return { ...result, total_count: questionCount };
  }
  const percentage = Math.round(equalWeightPercentage(correctCount, questionCount) * 100) / 100;
  const passed =
    passingScore != null ? percentage >= passingScore : result.passed;
  return {
    ...result,
    correct_count: correctCount,
    total_count: questionCount,
    percentage,
    score: percentage,
    passed,
  };
}

/** Submit javoblarini natija qatorlariga qo'shadi — UI har doim savollarni ko'rsatadi. */
export function attachSubmittedAnswers(
  result: LessonTestResult,
  answers: Record<number, number>,
  questions: LessonTestQuestion[],
  passingScore?: number
): LessonTestResult {
  if (!questions.length) return result;
  const byQ = new Map((result.results ?? []).map((row) => [row.question_id, row]));
  const uniform = inferUniformCorrectness(result, questions.length);

  const results = questions.map((q) => {
    const existing = byQ.get(q.id);
    const answerId = answers[q.id] ?? existing?.answer_id;
    const selectedText =
      existing?.selected_answer_text ??
      q.answers.find((a) => a.id === answerId)?.text;
    const correctId = existing?.correct_answer_id;
    let isCorrect = existing?.is_correct;
    if (isCorrect === undefined && answerId != null && correctId != null) {
      isCorrect = answerId === correctId;
    }
    if (isCorrect === undefined && uniform !== undefined) {
      isCorrect = uniform;
    }
    return {
      question_id: q.id,
      is_correct: isCorrect,
      answer_id: answerId,
      correct_answer_id: correctId,
      correct_answer_text: existing?.correct_answer_text,
      selected_answer_text: selectedText,
    };
  });

  return applyEqualQuestionScoring({ ...result, results }, questions.length, passingScore);
}

/** Qayta topshirish mumkinmi — 1-urinish fail → yana 1 imkon (jami 2). */
export function canRetryTest(result: LessonTestResult, attemptLimit = 2): boolean {
  if (result.passed) return false;
  return (result.attempt ?? 0) < attemptLimit;
}

/** Ikkinchi urinish ham ishlatilgan */
export function isAttemptsExhausted(result: LessonTestResult, attemptLimit = 2): boolean {
  if (result.passed) return false;
  return (result.attempt ?? 0) >= attemptLimit;
}

/**
 * Dars yakunlanishi: testdan o'tdi YOKI 2 urinish tugadi.
 * restudy_required qayta urinishni to'xtatmaydi.
 */
export function shouldFinishLessonAfterTest(
  result: LessonTestResult,
  attemptLimit = 2
): boolean {
  if (result.passed === true) return true;
  return isAttemptsExhausted(result, attemptLimit);
}

function logStudentTestAuth(lessonId: number) {
  if (typeof window === "undefined") return;
  const token = getAuthToken();
  console.log("STUDENT TEST AUTH:", {
    hasAuthorization: Boolean(token),
    lessonId,
  });
}

// ─── API funksiyalar ──────────────────────────────────────────────────────────

/**
 * GET /learning/lessons/{lessonId}/tests
 * 401/403/5xx — ApiError throw (bo'sh array emas).
 * 404 yoki 200 + bo'sh — [].
 */
export async function fetchLessonTestSummaries(lessonId: number): Promise<LessonTestSummary[]> {
  logStudentTestAuth(lessonId);

  try {
    const data = await withLearningAccessRetry(() =>
      apiRequest<unknown>(`/learning/lessons/${lessonId}/tests`)
    );
    const tests = normalizeTestSummaries(data, lessonId);
    console.log("STUDENT LESSON TESTS OK:", {
      lessonId,
      count: tests.length,
      ids: tests.map((t) => t.id),
    });
    return tests;
  } catch (err) {
    if (err instanceof ApiError) {
      console.log("STUDENT LESSON TESTS ERROR:", {
        lessonId,
        status: err.status,
        message: err.message,
      });
      // 404 = haqiqatan yo'q
      if (err.status === 404) return [];
      throw err;
    }
    throw err;
  }
}

/** GET /learning/lessons/{id}/tests → tests[0].id (yoki null agar yo'q) */
export async function fetchLessonTestId(lessonId: number): Promise<number | null> {
  const list = await fetchLessonTestSummaries(lessonId);
  return list[0]?.id ?? null;
}

/** GET /learning/tests/{testId} */
export async function fetchTestByTestId(
  testId: number,
  lessonId?: number
): Promise<LessonTestData | null> {
  try {
    const data = await withLearningAccessRetry(() =>
      apiRequest<unknown>(`/learning/tests/${testId}`)
    );
    return asTestData(data, lessonId);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return null;
      throw err;
    }
    throw err;
  }
}

/**
 * 1. preloadedTestId → GET /learning/tests/{id}
 * 2. GET /learning/lessons/{id}/tests → tests[0].id → GET /learning/tests/{id}
 */
export async function fetchLessonTest(
  lessonId: number,
  preloadedTestId?: number
): Promise<LessonTestData | null> {
  if (preloadedTestId) {
    const test = await fetchTestByTestId(preloadedTestId, lessonId);
    if (test) return test;
  }

  const testId = await fetchLessonTestId(lessonId);
  if (!testId) return null;

  return fetchTestByTestId(testId, lessonId);
}

export async function submitLessonTest(
  testId: number,
  lessonId: number,
  answers: TestSubmitAnswer[]
): Promise<LessonTestResult> {
  // POST /learning/tests/{id}/submit — faqat student learning API
  const body = JSON.stringify({
    answers: answers.map((a) => ({
      question_id: a.question_id,
      answer_id: a.answer_id,
    })),
    ...(lessonId > 0 ? { lesson_id: lessonId } : {}),
  });

  try {
    const data = await apiRequest<unknown>(`/learning/tests/${testId}/submit`, {
      method: "POST",
      body,
    });
    return asResult(data);
  } catch (err) {
    const code = err instanceof ApiError ? err.status : (err as { status?: number })?.status;
    const raw = err instanceof ApiError ? err.raw : (err as { raw?: string })?.raw;

    // 409 / ba'zi 4xx — body ichida natija yoki restudy bo'lishi mumkin
    if (raw && (code === 400 || code === 409 || code === 422)) {
      try {
        const parsed = asResult(JSON.parse(raw));
        if (
          parsed.results?.length ||
          parsed.passed !== undefined ||
          parsed.score != null ||
          parsed.percentage != null
        ) {
          return parsed;
        }
      } catch {
        /* ignore */
      }
    }

    if (code === 409) {
      return {
        passed: false,
        can_retry: false,
        message: err instanceof ApiError ? err.message : "Urinishlar tugadi",
      };
    }

    throw err;
  }
}
