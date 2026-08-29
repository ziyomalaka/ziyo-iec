"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";
import type { LearningMaterial } from "@/lib/api/types/learning";
import type { LessonTestData, LessonTestResult, TestSubmitAnswer } from "@/lib/api/learning-test";
import {
  fetchLessonTest,
  fetchLessonTestSummaries,
  submitLessonTest,
  lessonTestErrorMessage,
  canRetryTest,
  isAttemptsExhausted,
  findQuestionResult,
  attachSubmittedAnswers,
  formatTestPercent,
  pointsPerQuestion,
  unansweredQuestionIndexes,
  isTestFullyAnswered,
} from "@/lib/api/learning-test";
import { recordSubmitForResults, readLessonTestAttempt, saveLessonTestAttempt } from "@/lib/api/learning-progress";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { MAX_LESSON_TEST_ATTEMPTS } from "@/lib/learning/required-materials";
import { useLearningChrome } from "@/components/dashboard/learning/LearningChromeContext";
import { Link } from "@/i18n/navigation";

// ─── Holat tiplari ────────────────────────────────────────────────────────────
type Phase =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string; status?: number }
  | { type: "no-test" }
  | { type: "active"; test: LessonTestData }
  | { type: "submitting"; test: LessonTestData; timedOut?: boolean }
  | { type: "result"; result: LessonTestResult; test: LessonTestData }
  | { type: "restudy"; result: LessonTestResult; test?: LessonTestData }
  | { type: "attempts-exhausted"; result?: LessonTestResult; test?: LessonTestData };

type LessonTestProps = {
  lessonId: number;
  materials?: LearningMaterial[];
  /** Barcha mavjud majburiy materiallar tugatildimi */
  materialsUnlocked?: boolean;
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  compactCard?: boolean;
  onResolved?: (hasTest: boolean) => void;
  /**
   * Test o'tildi YOKI 2 urinish tugadi — darsni yakunlash / progress.
   */
  onFinished?: () => void;
  /** "Keyingi darsga o'tish" — modal yopiladi va keyingi dars ochiladi */
  onContinue?: () => void;
};

/** Materiallar ichidan test materialini (type="test") topadi */
function findTestMaterial(materials: LearningMaterial[] | undefined): LearningMaterial | null {
  if (!materials?.length) return null;
  return (
    materials.find(
      (m) =>
        m.type === "test" ||
        m.material_type === "test" ||
        String(m.type ?? "").toLowerCase() === "test" ||
        String(m.material_type ?? "").toLowerCase() === "test"
    ) ?? null
  );
}

// ─── Bosh komponent ───────────────────────────────────────────────────────────
export default function LessonTest({
  lessonId,
  materials,
  materialsUnlocked = true,
  courseTitle,
  moduleTitle,
  lessonTitle,
  compactCard,
  onResolved,
  onFinished,
  onContinue,
}: LessonTestProps) {
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [knownTestId, setKnownTestId] = useState<number | null>(null);
  const [knownTestTitle, setKnownTestTitle] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [attemptLimit, setAttemptLimit] = useState(MAX_LESSON_TEST_ATTEMPTS);
  const [submitHint, setSubmitHint] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { setHideBottomNav } = useLearningChrome();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedCalledRef = useRef(false);
  const localAttemptRef = useRef(0);
  const submitRef = useRef<(() => Promise<void>) | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;
  const metaRef = useRef({ courseTitle, moduleTitle, lessonTitle });
  metaRef.current = { courseTitle, moduleTitle, lessonTitle };

  useEffect(() => { setMounted(true); }, []);

  const materialTest = findTestMaterial(materials);
  const materialTestId = materialTest?.id ?? null;

  // Swagger:
  // 1) GET /learning/lessons/{id} → tests[0].id (materials orqali)
  // 2) bo'sh bo'lsa → GET /learning/lessons/{id}/tests
  // 403 ≠ "test yo'q"
  useEffect(() => {
    let cancelled = false;
    setCurrent(0);
    setMarked({});
    setSubmitHint(null);
    setKnownTestTitle(materialTest?.title ?? null);
    finishedCalledRef.current = false;
    localAttemptRef.current = 0;
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    setModalOpen(false);
    setChecking(true);

    const hasAuthorization = Boolean(typeof window !== "undefined" ? getAuthToken() : null);
    console.log("STUDENT TEST AUTH:", { hasAuthorization, lessonId });
    console.log("STUDENT LessonTest mount lessonId:", lessonId);
    console.log("STUDENT LessonTest materialTestId (tests[0].id):", materialTestId);

    const saved = readLessonTestAttempt(lessonId);
    if (saved?.result) {
      localAttemptRef.current = saved.result.attempt ?? 0;
      setAnswers(saved.answers);
      setKnownTestId(saved.testId || materialTestId);
      setKnownTestTitle(saved.test?.title ?? materialTest?.title ?? null);
      const snapshot = saved.test ?? { id: saved.testId || 0, questions: [] };
      const exhausted = isAttemptsExhausted(saved.result, MAX_LESSON_TEST_ATTEMPTS);
      if (saved.result.passed) {
        setPhase({ type: "result", result: saved.result, test: snapshot });
      } else if (exhausted) {
        setPhase({ type: "attempts-exhausted", result: saved.result, test: snapshot });
      } else {
        setPhase({ type: "result", result: saved.result, test: snapshot });
      }
      setChecking(false);
      onResolvedRef.current?.(true);
      if (saved.result.passed || exhausted) {
        finishedCalledRef.current = true;
        onFinishedRef.current?.();
      }
      return;
    }

    setAnswers({});
    if (materialTestId) {
      setKnownTestId(materialTestId);
      setPhase({ type: "idle" });
      setChecking(false);
      onResolvedRef.current?.(true);
      return;
    }

    void (async () => {
      try {
        const summaries = await fetchLessonTestSummaries(lessonId);
        if (cancelled) return;
        const first = summaries[0];
        if (first) {
          setKnownTestId(first.id);
          setKnownTestTitle(first.title ?? null);
          setPhase({ type: "idle" });
          onResolvedRef.current?.(true);
        } else {
          setKnownTestId(null);
          setKnownTestTitle(null);
          setPhase({ type: "no-test" });
          onResolvedRef.current?.(false);
        }
      } catch (err) {
        if (cancelled) return;
        setKnownTestId(null);
        setKnownTestTitle(null);
        const status = err instanceof ApiError ? err.status : undefined;
        if (status === 404) {
          setPhase({ type: "no-test" });
          onResolvedRef.current?.(false);
        } else {
          if (status === 403) {
            console.log("STUDENT LESSON TESTS 403 DIAG:", {
              lessonId,
              hasAuthorization,
              note: "Swagger: ariza tasdiqlanmagan / dars yopiq — yoki role policy",
            });
          }
          onResolvedRef.current?.(true);
          setPhase({
            type: "error",
            message: lessonTestErrorMessage(err),
            status,
          });
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, materialTestId, materialTest?.title]);

  // Taymer — vaqt tugasa ham javobsiz testdi yubormaydi
  useEffect(() => {
    if (phase.type !== "active") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          const currentPhase = phaseRef.current;
          if (
            currentPhase.type === "active" &&
            isTestFullyAnswered(currentPhase.test.questions, answersRef.current)
          ) {
            void submitRef.current?.();
          } else {
            setSubmitHint("Vaqt tugadi. Barcha savollarni belgilamasdan testni yakunlab bo'lmaydi.");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase.type]);

  const persistAttempt = (
    test: LessonTestData,
    result: LessonTestResult,
    submittedAnswers: Record<number, number>
  ) => {
    saveLessonTestAttempt({
      lessonId,
      testId: test.id,
      test,
      result,
      answers: submittedAnswers,
      savedAt: new Date().toISOString(),
    });
  };

  const startTest = async () => {
    if (!materialsUnlocked) {
      setPhase({
        type: "error",
        message: "Testni boshlash uchun dars materiallarini yakunlang.",
      });
      return;
    }

    const saved = readLessonTestAttempt(lessonId);
    if (saved?.result) {
      const exhausted = isAttemptsExhausted(saved.result, MAX_LESSON_TEST_ATTEMPTS);
      if (saved.result.passed || exhausted) {
        const snapshot = saved.test ?? { id: saved.testId || 0, questions: [] };
        setAnswers(saved.answers);
        setModalOpen(false);
        setPhase(
          saved.result.passed
            ? { type: "result", result: saved.result, test: snapshot }
            : { type: "attempts-exhausted", result: saved.result, test: snapshot }
        );
        return;
      }
    }

    setPhase({ type: "loading" });
    setCurrent(0);
    setAnswers({});
    setMarked({});
    setSubmitHint(null);

    try {
      const preloadedId = knownTestId ?? findTestMaterial(materials)?.id ?? undefined;
      console.log("TEST FETCH lessonId:", lessonId, "testId:", preloadedId ?? "(resolve via /tests)");

      const test = await fetchLessonTest(lessonId, preloadedId);

      if (!test || test.questions.length === 0) {
        setPhase({
          type: "error",
          message: preloadedId
            ? `Test #${preloadedId} topilmadi yoki savollar yo'q.`
            : "Bu darsda test yo'q",
          status: 404,
        });
        return;
      }
      const limit = MAX_LESSON_TEST_ATTEMPTS;
      setAttemptLimit(limit);
      setKnownTestId(test.id);
      setKnownTestTitle(test.title ?? knownTestTitle);
      setSeconds((test.duration_minutes ?? 30) * 60);
      setModalOpen(true);
      setPhase({ type: "active", test });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      // Backend attempt tugagan / blocked
      if (status === 403 || status === 409) {
        const locked: LessonTestResult = {
          passed: false,
          attempt: MAX_LESSON_TEST_ATTEMPTS,
          attempts_remaining: 0,
          remaining_attempts: 0,
        };
        const prev = readLessonTestAttempt(lessonId);
        saveLessonTestAttempt({
          lessonId,
          testId: prev?.testId ?? knownTestId ?? 0,
          test: prev?.test ?? null,
          result: prev?.result
            ? { ...prev.result, attempt: Math.max(prev.result.attempt ?? 0, MAX_LESSON_TEST_ATTEMPTS) }
            : locked,
          answers: prev?.answers ?? {},
          savedAt: new Date().toISOString(),
        });
        setModalOpen(false);
        setPhase({
          type: "attempts-exhausted",
          result: prev?.result ?? locked,
          test: prev?.test ?? undefined,
        });
        if (!finishedCalledRef.current) {
          finishedCalledRef.current = true;
          onFinished?.();
        }
        return;
      }
      setPhase({
        type: "error",
        message: lessonTestErrorMessage(err),
        status,
      });
    }
  };

  const submit = useCallback(async (timedOut = false) => {
    setPhase((prev) => {
      if (prev.type !== "active") return prev;
      const missing = unansweredQuestionIndexes(prev.test.questions, answersRef.current);
      if (missing.length) {
        setCurrent(missing[0]);
        setSubmitHint(
          timedOut
            ? "Vaqt tugadi. Barcha savollarni belgilamasdan testni yakunlab bo'lmaydi."
            : `Barcha savollarni belgilang — ${missing.length} ta javobsiz.`
        );
        return prev;
      }
      setSubmitHint(null);
      return { type: "submitting", test: prev.test, timedOut };
    });
  }, []);

  submitRef.current = () => submit(true);

  // Submitting holatida so'rov yuboramiz
  useEffect(() => {
    if (phase.type !== "submitting") return;
    const { test, timedOut } = phase;

    const run = async () => {
      const currentAnswers = answersRef.current;
      const missing = unansweredQuestionIndexes(test.questions, currentAnswers);
      if (missing.length) {
        setCurrent(missing[0]);
        setSubmitHint(
          timedOut
            ? "Vaqt tugadi. Barcha savollarni belgilamasdan testni yakunlab bo'lmaydi."
            : `Barcha savollarni belgilang — ${missing.length} ta javobsiz.`
        );
        setPhase({ type: "active", test });
        return;
      }

      const submitAnswers: TestSubmitAnswer[] = test.questions.map((q) => ({
        question_id: q.id,
        answer_id: currentAnswers[q.id] ?? 0,
      }));
      if (submitAnswers.some((a) => a.answer_id <= 0)) {
        setSubmitHint("Barcha savollarni belgilamasdan testni yakunlab bo'lmaydi.");
        setPhase({ type: "active", test });
        return;
      }

      try {
        const result = attachSubmittedAnswers(
          await submitLessonTest(test.id, lessonId, submitAnswers),
          currentAnswers,
          test.questions,
          test.passing_score
        );
        localAttemptRef.current += 1;
        const attempt = result.attempt ?? localAttemptRef.current;
        const remaining = Math.max(0, MAX_LESSON_TEST_ATTEMPTS - attempt);
        const normalized: LessonTestResult = {
          ...result,
          attempt,
          attempts_remaining: remaining,
          remaining_attempts: remaining,
          can_retry: !result.passed && remaining > 0,
        };

        recordSubmitForResults({
          lessonId,
          testId: test.id,
          testTitle: test.title ?? knownTestTitle ?? undefined,
          courseTitle: metaRef.current.courseTitle,
          moduleTitle: metaRef.current.moduleTitle,
          lessonTitle: metaRef.current.lessonTitle,
          result: normalized,
        });
        persistAttempt(test, normalized, currentAnswers);

        if (timerRef.current) clearInterval(timerRef.current);
        if (autoCloseRef.current) {
          clearTimeout(autoCloseRef.current);
          autoCloseRef.current = null;
        }

        const exhausted = isAttemptsExhausted(normalized, MAX_LESSON_TEST_ATTEMPTS);
        setPhase(
          exhausted && !normalized.passed
            ? { type: "attempts-exhausted", result: normalized, test }
            : { type: "result", result: normalized, test }
        );
        autoCloseRef.current = setTimeout(() => {
          autoCloseRef.current = null;
          setModalOpen(false);
          if ((normalized.passed || exhausted) && !finishedCalledRef.current) {
            finishedCalledRef.current = true;
            onFinished?.();
          }
        }, 1600);
      } catch (err) {
        const status = err instanceof ApiError ? err.status : undefined;
        if (status === 403 || status === 409) {
          localAttemptRef.current = Math.max(localAttemptRef.current, attemptLimit);
          const locked: LessonTestResult = {
            passed: false,
            attempt: MAX_LESSON_TEST_ATTEMPTS,
            attempts_remaining: 0,
            remaining_attempts: 0,
          };
          persistAttempt(test, locked, currentAnswers);
          setModalOpen(false);
          setPhase({ type: "attempts-exhausted", result: locked, test });
          if (!finishedCalledRef.current) {
            finishedCalledRef.current = true;
            onFinished?.();
          }
          return;
        }
        const msg =
          timedOut
            ? "Vaqt tugadi. Test yakunlanmadi — qayta urinib ko'ring."
            : lessonTestErrorMessage(err);
        setPhase({
          type: "error",
          message: msg,
          status,
        });
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.type]);

  const retry = async () => {
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    if (phase.type === "result" && !canRetryTest(phase.result, attemptLimit)) {
      setModalOpen(false);
      if (!finishedCalledRef.current) {
        finishedCalledRef.current = true;
        onFinished?.();
      }
      onContinue?.();
      return;
    }
    if (phase.type === "attempts-exhausted") return;
    setPhase({ type: "idle" });
    setCurrent(0);
    setAnswers({});
    setMarked({});
    await startTest();
  };

  const ensureFinished = () => {
    if (finishedCalledRef.current) return;
    finishedCalledRef.current = true;
    onFinished?.();
  };

  const closeModal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    setModalOpen(false);
    setLeaveOpen(false);
    if (
      (phase.type === "result" &&
        (phase.result.passed || isAttemptsExhausted(phase.result, attemptLimit))) ||
      phase.type === "attempts-exhausted"
    ) {
      ensureFinished();
    }
  };

  const continueAfterTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    setModalOpen(false);
    ensureFinished();
    onContinue?.();
  };

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  const isModalOpen =
    modalOpen &&
    (phase.type === "active" ||
      phase.type === "submitting" ||
      phase.type === "result" ||
      phase.type === "attempts-exhausted" ||
      phase.type === "restudy");

  useEffect(() => {
    setHideBottomNav(isModalOpen);
    return () => setHideBottomNav(false);
  }, [isModalOpen, setHideBottomNav]);

  const modalTest =
    phase.type === "active" ||
    phase.type === "submitting" ||
    phase.type === "result"
      ? phase.test
      : phase.type === "attempts-exhausted" || phase.type === "restudy"
        ? phase.test
        : null;

  const modalResult =
    phase.type === "result" ||
    phase.type === "attempts-exhausted" ||
    phase.type === "restudy"
      ? phase.result
      : null;

  if (!checking && phase.type === "no-test") return null;

  const cardClass = compactCard
    ? "flex w-full min-h-11 flex-col items-stretch gap-3 rounded-2xl border border-[#E8EDF5] bg-white px-4 py-3 text-left"
    : "mt-4 rounded-xl border border-[#E8EDF5] bg-[#F7F9FC] p-5";

  return (
    <>
      <section className={compactCard ? "" : "mt-8 border-t border-[#E8EDF5] pt-6"}>
        {compactCard ? null : <h2 className="text-base font-bold text-[#0C2340]">Dars testi</h2>}

        {checking && (
          <div className={cn(cardClass, "text-sm text-[#64748B]")}>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
              Savollar yuklanmoqda...
            </div>
          </div>
        )}

        {!checking && phase.type === "restudy" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">Dars o&apos;zlashtirilmadi</p>
            <p className="mt-1 text-sm text-amber-800">
              Materiallarni qayta ko&apos;rib chiqing, so&apos;ng testni yana topshirishingiz mumkin.
            </p>
            {phase.result.message ? (
              <p className="mt-2 text-xs text-amber-700">{phase.result.message}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {phase.test ? (
                <button
                  type="button"
                  onClick={() => setPhase({ type: "result", result: phase.result, test: phase.test! })}
                  className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900"
                >
                  Natijani ko&apos;rish
                </button>
              ) : null}
              {canRetryTest(phase.result, attemptLimit) ? (
                <button
                  type="button"
                  onClick={() => setPhase({ type: "idle" })}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white"
                >
                  Darsga qaytish
                </button>
              ) : null}
            </div>
          </div>
        )}

        {!checking && phase.type === "attempts-exhausted" && (
          <div className="mt-4 rounded-xl border border-[#E8EDF5] bg-[#F7F9FC] p-5">
            <p className="text-sm font-semibold text-[#0C2340]">Test yakunlandi</p>
            {phase.result?.percentage != null || phase.result?.score != null ? (
              <p className="mt-2 text-sm text-[#64748B]">
                Natija: {formatTestPercent(phase.result.percentage ?? phase.result.score ?? 0)}%
              </p>
            ) : null}
            <p className="mt-1 text-sm text-[#64748B]">
              Urinishlar: {phase.result?.attempt != null ? phase.result.attempt : attemptLimit} /{" "}
              {attemptLimit}
            </p>
            <p className="mt-2 text-sm text-[#64748B]">Natijangiz saqlandi.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {phase.test && phase.result ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340]"
                >
                  To&apos;g&apos;ri / noto&apos;g&apos;ri javoblar
                </button>
              ) : null}
              <button
                type="button"
                onClick={continueAfterTest}
                className="inline-flex rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Keyingi darsga o&apos;tish →
              </button>
            </div>
          </div>
        )}

        {!checking && phase.type === "idle" && (
          <div className={cardClass}>
            <p className="text-sm font-semibold text-[#0C2340]">{knownTestTitle || `${lessonTitle || "Dars"} testi`}</p>
            {!materialsUnlocked ? (
              <>
                <p className="text-sm text-[#64748B]">🔒 Test · Dars materiallarini yakunlang.</p>
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-5 text-sm font-semibold text-white"
                >
                  Testni boshlash
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-[#64748B]">O&apos;tish bali backenddan olinadi. Maksimal urinish: {attemptLimit}.</p>
                <button
                  type="button"
                  onClick={() => void startTest()}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Testni boshlash
                </button>
              </>
            )}
          </div>
        )}

        {phase.type === "loading" && (
          <div className="mt-4 flex items-center gap-3 text-sm text-[#64748B]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            Test yuklanmoqda...
          </div>
        )}

        {phase.type === "error" && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{phase.message}</p>
            <button
              type="button"
              onClick={startTest}
              className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {isModalOpen && (
          <div className="mt-4 flex items-center gap-3 text-sm text-[#64748B]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
            {phase.type === "submitting" ? "Javoblar yuborilmoqda..." : "Test oynasi ochiq..."}
          </div>
        )}

        {phase.type === "result" && (
          <ResultBadge
            result={phase.result}
            attemptLimit={attemptLimit}
            onRetry={() => void retry()}
            onReopen={() => setModalOpen(true)}
          />
        )}
      </section>

      {mounted && isModalOpen && modalTest
        ? createPortal(
            <TestModal
              phase={phase}
              test={modalTest}
              result={modalResult}
              current={current}
              answers={answers}
              marked={marked}
              seconds={seconds}
              attemptLimit={attemptLimit}
              submitHint={submitHint}
              leaveOpen={leaveOpen}
              onLeaveAsk={() => setLeaveOpen(true)}
              onLeaveStay={() => setLeaveOpen(false)}
              onLeaveExit={() => {
                setLeaveOpen(false);
                setModalOpen(false);
              }}
              onAnswer={(qId, aId) => {
                setAnswers((prev) => ({ ...prev, [qId]: aId }));
                setSubmitHint(null);
              }}
              onMark={(qId) => setMarked((prev) => ({ ...prev, [qId]: !prev[qId] }))}
              onNext={() => {
                if (phase.type === "active")
                  setCurrent((c) => Math.min(c + 1, modalTest.questions.length - 1));
              }}
              onPrev={() => setCurrent((c) => Math.max(c - 1, 0))}
              onJump={(i) => setCurrent(i)}
              onSubmit={() => void submit(false)}
              onRetry={() => void retry()}
              onClose={closeModal}
              onContinue={continueAfterTest}
            />,
            document.body
          )
        : null}
    </>
  );
}

// ─── To'liq ekran modal ───────────────────────────────────────────────────────
function TestModal({
  phase, test, result, current, answers, marked, seconds, attemptLimit, submitHint,
  leaveOpen, onLeaveAsk, onLeaveStay, onLeaveExit,
  onAnswer, onMark, onNext, onPrev, onJump, onSubmit, onRetry, onClose, onContinue,
}: {
  phase: Phase;
  test: LessonTestData;
  result: LessonTestResult | null | undefined;
  current: number;
  answers: Record<number, number>;
  marked: Record<number, boolean>;
  seconds: number;
  attemptLimit: number;
  submitHint?: string | null;
  leaveOpen?: boolean;
  onLeaveAsk?: () => void;
  onLeaveStay?: () => void;
  onLeaveExit?: () => void;
  onAnswer: (qId: number, aId: number) => void;
  onMark: (qId: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onJump: (i: number) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const isSubmitting = phase.type === "submitting";
  const isReview =
    phase.type === "result" ||
    phase.type === "attempts-exhausted" ||
    phase.type === "restudy";
  const questions = test.questions;
  const question = questions[current];
  const answered = questions.filter((q) => Boolean(answers[q.id])).length;
  const missingCount = questions.length - answered;
  const allAnswered = isTestFullyAnswered(questions, answers);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const OPTS = ["A", "B", "C", "D", "E"];
  const isLowTime = seconds > 0 && seconds <= 60;
  const [unansweredOpen, setUnansweredOpen] = useState(false);
  useLockBodyScroll(true);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#F7F9FC] pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#E8EDF5] bg-white px-3 py-3 shadow-sm sm:items-center sm:gap-4 sm:px-6">
        <div className="min-w-0">
          {!isReview ? (
            <button
              type="button"
              onClick={onLeaveAsk}
              className="mb-1 inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB]"
            >
              ← Test
            </button>
          ) : null}
          <p className="truncate text-sm font-semibold text-[#0C2340]">
            {test.title || "Dars testi"}
          </p>
          {test.passing_score ? (
            <p className="text-xs text-[#94A3B8]">O'tish bali: {test.passing_score}%</p>
          ) : null}
          {test.questions.length > 0 ? (
            <p className="text-xs text-[#94A3B8]">
              Har savol: {formatTestPercent(pointsPerQuestion(test.questions.length))}%
              {" "}· {test.questions.length} savol = 100%
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {!isReview && !isSubmitting && (
            <div className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums",
              seconds === 0
                ? "bg-gray-100 text-gray-400"
                : isLowTime
                  ? "animate-pulse bg-red-100 text-red-600"
                  : "bg-[#EEF4FF] text-[#2563EB]"
            )}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
          )}
          {isReview && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-sm text-[#64748B] hover:bg-[#F1F5F9]"
            >
              Yopish ✕
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          {isReview && result ? (
            <ResultPanel
              result={result}
              test={test}
              answers={answers}
              attemptLimit={attemptLimit}
              onRetry={onRetry}
              onClose={onClose}
              onContinue={onContinue}
            />
          ) : null}

          {isSubmitting && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
              <p className="text-[#64748B]">
                {(phase as Extract<Phase, { type: "submitting" }>).timedOut
                  ? "Vaqt tugadi — natija hisoblanmoqda..."
                  : "Javoblar yuborilmoqda..."}
              </p>
            </div>
          )}

          {!isReview && !isSubmitting && question ? (
            <>
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E8EDF5]">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all"
                  style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                />
              </div>

              <p className="mb-1 text-xs text-[#94A3B8]">
                Savol {current + 1} / {questions.length} &nbsp;·&nbsp; Javoblandi: {answered}
                &nbsp;·&nbsp; {formatTestPercent(pointsPerQuestion(questions.length))}%
              </p>
              {submitHint ? (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {submitHint}
                </p>
              ) : null}

              <h2 className="mb-5 break-words text-base font-semibold leading-snug text-[#0C2340] sm:text-lg">
                {question.question}
              </h2>

              <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJump(i)}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all",
                      current === i && "ring-2 ring-[#2563EB] ring-offset-1",
                      answers[q.id]
                        ? "bg-[#2563EB] text-white"
                        : marked[q.id]
                          ? "bg-amber-100 text-amber-700"
                          : "bg-[#F1F5F9] text-[#64748B]"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {question.answers.map((opt, idx) => (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm transition-all sm:gap-4 sm:px-5 sm:py-4",
                      answers[question.id] === opt.id
                        ? "border-[#2563EB] bg-[#EEF4FF] font-semibold text-[#2563EB]"
                        : "border-[#E8EDF5] bg-white text-[#0C2340] hover:border-[#93C5FD]"
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                      answers[question.id] === opt.id
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-[#CBD5E1] text-[#64748B]"
                    )}>
                      {OPTS[idx] ?? idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{opt.text}</span>
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={answers[question.id] === opt.id}
                      onChange={() => onAnswer(question.id, opt.id)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button type="button" disabled={current === 0} onClick={onPrev}
                  className="min-h-11 w-full rounded-xl border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-[#F1F5F9] sm:w-auto">
                  ← Oldingi
                </button>
                <button type="button" onClick={() => onMark(question.id)}
                  className={cn(
                    "min-h-11 w-full rounded-xl border px-4 py-2 text-sm font-medium sm:w-auto",
                    marked[question.id]
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-[#E8EDF5] bg-white text-[#64748B] hover:bg-[#F1F5F9]"
                  )}>
                  {marked[question.id] ? "★ Belgilangan" : "☆ Belgilash"}
                </button>
                {current < questions.length - 1 ? (
                  <button type="button" onClick={onNext}
                    className="min-h-11 w-full rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8] sm:w-auto">
                    Keyingi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!allAnswered) {
                        setUnansweredOpen(true);
                        return;
                      }
                      onSubmit();
                    }}
                    disabled={isSubmitting}
                    className="min-h-11 w-full rounded-xl bg-[#2563EB] px-6 py-2 text-sm font-bold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300 sm:ml-auto sm:w-auto"
                  >
                    {isSubmitting ? "Test yuborilmoqda..." : "Testni yakunlash"}
                  </button>
                )}
              </div>
            </>
          ) : null}
        </main>

        {!isReview && !isSubmitting && (
          <aside className="hidden w-48 shrink-0 overflow-y-auto border-l border-[#E8EDF5] bg-white p-4 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Savollar</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => (
                <button key={q.id} type="button" onClick={() => onJump(i)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all",
                    current === i && "ring-2 ring-[#2563EB] ring-offset-1",
                    answers[q.id]
                      ? "bg-[#2563EB] text-white"
                      : marked[q.id]
                        ? "bg-amber-100 text-amber-700"
                        : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E8EDF5]"
                  )}>
                  {i + 1}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      {unansweredOpen ? (
        <div className="absolute inset-0 z-10 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="text-sm font-semibold text-[#0C2340]">
              Sizda javob berilmagan {missingCount} ta savol bor.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setUnansweredOpen(false);
                  const missing = unansweredQuestionIndexes(questions, answers);
                  if (missing.length) onJump(missing[0]);
                }}
                className="min-h-11 rounded-xl bg-[#2563EB] text-sm font-semibold text-white"
              >
                Davom ettirish
              </button>
              <button
                type="button"
                onClick={() => setUnansweredOpen(false)}
                className="min-h-11 rounded-xl border border-[#E8EDF5] text-sm font-medium"
              >
                Testga qaytish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leaveOpen ? (
        <div className="absolute inset-0 z-10 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="text-sm font-semibold text-[#0C2340]">Test hali yakunlanmagan.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onLeaveStay}
                className="min-h-11 rounded-xl bg-[#2563EB] text-sm font-semibold text-white"
              >
                Testga qaytish
              </button>
              <button
                type="button"
                onClick={onLeaveExit}
                className="min-h-11 rounded-xl border border-[#E8EDF5] text-sm font-medium"
              >
                Testdan chiqish
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Natija paneli + har savol to'g'ri/noto'g'ri ─────────────────────────────
function ResultPanel({ result, test, answers, attemptLimit, onRetry, onClose, onContinue }: {
  result: LessonTestResult;
  test: LessonTestData;
  answers: Record<number, number>;
  attemptLimit: number;
  onRetry: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const canRetry = canRetryTest(result, attemptLimit);
  const exhausted = isAttemptsExhausted(result, attemptLimit);
  const attemptsLeft = result.attempts_remaining ?? result.remaining_attempts;
  const n = test.questions.length || result.total_count || 0;
  const perQuestion = pointsPerQuestion(n);
  const pct =
    result.percentage ??
    (result.correct_count != null && n
      ? (result.correct_count * 100) / n
      : result.score);

  const title = result.passed
    ? "O'tdingiz"
    : exhausted
      ? "Testdan o'tmadingiz"
      : "O'tmadingiz — 1 imkon qoldi";

  return (
    <div className="mx-auto w-full max-w-2xl py-6">
      <div className="text-center">
        <div className="text-5xl">{result.passed ? "🎉" : exhausted ? "📋" : "❌"}</div>
        <h2 className={cn("mt-3 text-2xl font-bold", result.passed ? "text-green-700" : "text-[#0C2340]")}>
          {title}
        </h2>
        {result.message ? <p className="mt-2 text-sm text-[#64748B]">{result.message}</p> : null}
        {result.passed ? (
          <p className="mt-2 text-sm text-green-700">Natija saqlandi. Test yopiladi.</p>
        ) : null}
        {exhausted && !result.passed ? (
          <p className="mt-2 text-sm text-[#64748B]">
            2 urinish tugadi. Natija saqlanadi va keyingi dars ochiladi.
          </p>
        ) : null}
        {!result.passed && canRetry ? (
          <p className="mt-2 text-sm text-[#64748B]">Yana 1 marta topshirishingiz mumkin.</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {n > 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#94A3B8]">Har savol</p>
              <p className="text-xl font-bold text-[#0C2340]">{formatTestPercent(perQuestion)}%</p>
            </div>
          ) : null}
          {result.correct_count != null && n > 0 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#94A3B8]">To&apos;g&apos;ri</p>
              <p className="text-xl font-bold text-[#0C2340]">
                {result.correct_count} / {n}
              </p>
            </div>
          ) : null}
          {pct != null ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#94A3B8]">Natija</p>
              <p className="text-xl font-bold text-[#0C2340]">{formatTestPercent(pct)}%</p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-[#94A3B8]">Urinishlar</p>
            <p className="text-xl font-bold text-[#0C2340]">
              {result.attempt != null ? result.attempt : "—"} / {attemptLimit}
            </p>
          </div>
          {!exhausted && (attemptsLeft != null || (canRetry && result.attempt != null)) ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#94A3B8]">Qolgan</p>
              <p className="text-xl font-bold text-[#0C2340]">
                {attemptsLeft ?? Math.max(0, attemptLimit - (result.attempt ?? 0))}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#64748B]">
          Savollar natijasi
        </h3>
        {test.questions.map((q, index) => {
          const row = findQuestionResult(result, q.id);
          const selectedId = answers[q.id] ?? row?.answer_id;
          const selected = q.answers.find((a) => a.id === selectedId);
          const selectedText =
            selected?.text || row?.selected_answer_text || "Javoblanmagan";
          const knownCorrect = row?.is_correct === true;
          const knownWrong = row?.is_correct === false;
          const correctOpt =
            row?.correct_answer_id != null
              ? q.answers.find((a) => a.id === row.correct_answer_id)
              : undefined;
          const correctByLetter = (() => {
            const raw = row?.correct_answer_text?.trim().toUpperCase();
            if (raw && /^[A-J]$/.test(raw)) return q.answers[raw.charCodeAt(0) - 65];
            return undefined;
          })();
          const resolvedCorrectText =
            correctOpt?.text ||
            correctByLetter?.text ||
            (row?.correct_answer_text && !/^[A-J]$/i.test(row.correct_answer_text.trim())
              ? row.correct_answer_text
              : undefined) ||
            (knownCorrect ? selectedText : undefined);

          return (
            <div
              key={q.id}
              className={cn(
                "rounded-xl border p-4",
                knownCorrect
                  ? "border-green-200 bg-green-50"
                  : knownWrong
                    ? "border-red-200 bg-red-50"
                    : "border-[#E8EDF5] bg-white"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[#0C2340]">
                  {index + 1}. {q.question}
                </p>
                {knownCorrect || knownWrong ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2.5 py-1 text-xs font-bold",
                      knownCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    )}
                  >
                    {knownCorrect
                      ? `To'g'ri · +${formatTestPercent(perQuestion)}%`
                      : "Noto'g'ri · 0%"}
                  </span>
                ) : n > 0 ? (
                  <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {formatTestPercent(perQuestion)}%
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {q.answers.map((opt, optIdx) => {
                  const isSelected = selectedId === opt.id;
                  const isCorrectOpt =
                    (row?.correct_answer_id != null && opt.id === row.correct_answer_id) ||
                    (correctByLetter != null && opt.id === correctByLetter.id) ||
                    (resolvedCorrectText != null &&
                      opt.text.trim().toLowerCase() === resolvedCorrectText.trim().toLowerCase()) ||
                    (knownCorrect && isSelected);
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        isCorrectOpt
                          ? "border-green-400 bg-green-100 text-green-900"
                          : isSelected && knownWrong
                            ? "border-red-300 bg-red-100 text-red-900"
                            : isSelected
                              ? "border-[#2563EB] bg-[#EEF4FF] text-[#0C2340]"
                              : "border-[#E8EDF5] bg-white text-[#64748B]"
                      )}
                    >
                      <span className="mr-2 font-bold">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      {opt.text}
                      {isCorrectOpt ? (
                        <span className="ml-2 text-xs font-semibold">✓ To&apos;g&apos;ri javob</span>
                      ) : null}
                      {isSelected ? (
                        <span className="ml-2 text-xs font-semibold">Sizning javobingiz</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-sm text-[#64748B]">
                Sizning javobingiz:{" "}
                <span className="font-medium text-[#0C2340]">{selectedText}</span>
              </p>
              {resolvedCorrectText ? (
                <p className="mt-1 text-sm font-medium text-green-800">
                  To&apos;g&apos;ri javob: {resolvedCorrectText}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {result.passed ? (
          <button
            type="button"
            onClick={onContinue}
            className="w-full max-w-xs rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Keyingi darsga o&apos;tish
          </button>
        ) : null}
        {exhausted && !result.passed ? (
          <button
            type="button"
            onClick={onContinue}
            className="w-full max-w-xs rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Keyingi darsga o&apos;tish
          </button>
        ) : null}
        {!result.passed && canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-full max-w-xs rounded-xl border-2 border-[#2563EB] px-6 py-3 font-semibold text-[#2563EB] hover:bg-[#EEF4FF]"
          >
            Testni qayta ishlash
          </button>
        ) : null}
        <Link
          href="/dashboard/results"
          className="text-sm font-medium text-[#2563EB]"
        >
          Natijalarimni ko&apos;rish
        </Link>
        {!result.passed && canRetry ? (
          <button type="button" onClick={onClose} className="text-sm text-[#94A3B8] hover:text-[#64748B]">
            Yopish
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Natija badge (modal yopilgandan keyin) ───────────────────────────────────
function ResultBadge({ result, attemptLimit, onRetry, onReopen }: {
  result: LessonTestResult; attemptLimit: number; onRetry: () => void; onReopen: () => void;
}) {
  const canRetry = canRetryTest(result, attemptLimit);
  const exhausted = isAttemptsExhausted(result, attemptLimit);
  const left =
    result.attempts_remaining ??
    result.remaining_attempts ??
    (result.attempt != null ? Math.max(0, attemptLimit - result.attempt) : null);

  return (
    <div className={cn(
      "mt-4 flex items-center gap-4 rounded-xl border p-4",
      result.passed ? "border-green-200 bg-green-50" : "border-[#E8EDF5] bg-[#F7F9FC]"
    )}>
      <span className="text-2xl">{result.passed ? "✅" : exhausted ? "📋" : "❌"}</span>
      <div className="flex-1">
        <p className={cn("font-semibold", result.passed ? "text-green-700" : "text-[#0C2340]")}>
          {result.passed
            ? "Testdan o'tdingiz — dars yakunlandi"
            : exhausted
              ? "Test yakunlandi — natija saqlandi"
              : "O'tmadingiz"}
        </p>
        {result.percentage != null || result.score != null ? (
          <p className="text-sm text-[#64748B]">
            Natija: {formatTestPercent(result.percentage ?? result.score ?? 0)}%
            {result.correct_count != null && result.total_count
              ? ` · ${result.correct_count}/${result.total_count}`
              : ""}
            {result.attempt != null ? ` · Urinish: ${result.attempt}/${attemptLimit}` : ""}
            {!result.passed && canRetry && left != null ? ` · Qolgan: ${left}` : ""}
          </p>
        ) : result.correct_count != null && result.total_count ? (
          <p className="text-sm text-[#64748B]">
            {result.correct_count}/{result.total_count} to'g'ri
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onReopen}
          className="rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs text-[#64748B] hover:bg-[#F1F5F9]">
          Ko'rish
        </button>
        {!result.passed && canRetry ? (
          <button type="button" onClick={onRetry}
            className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]">
            Yana 1 marta
          </button>
        ) : null}
      </div>
    </div>
  );
}
