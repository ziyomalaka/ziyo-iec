import type {
  ContentSource,
  MaterialFormData,
  MaterialWizardState,
  QualificationLessonType,
  QualificationMaterialType,
  TestQuestion,
} from "@/lib/api/types/qualification";
import { QUALIFICATION_WIZARD_DRAFT_KEY, defaultMaterialTitle, formatLessonCode } from "@/lib/qualification/constants";

export type WizardLaunch = {
  step?: number;
  source?: ContentSource;
  directionId?: number;
  directionTitle?: string;
  moduleId?: number;
  moduleNumber?: number;
  moduleTitle?: string;
  lessonId?: number;
  lessonNumber?: number;
  lessonType?: QualificationLessonType;
  lessonTitle?: string;
  lessonCode?: string;
};

export function nextModuleNumber(modules?: { module_number?: number }[]) {
  return (modules ?? []).reduce((max, item) => Math.max(max, item.module_number ?? 0), 0) + 1;
}

export function nextLessonNumber(lessons?: { lesson_number?: number }[]) {
  return (lessons ?? []).reduce((max, item) => Math.max(max, item.lesson_number ?? 0), 0) + 1;
}

export function qualificationWizardPath(launch: WizardLaunch) {
  const search = new URLSearchParams();
  const setNum = (key: string, value?: number) => {
    if (value && value > 0) search.set(key, String(value));
  };
  const setStr = (key: string, value?: string) => {
    if (value?.trim()) search.set(key, value.trim());
  };
  setNum("step", launch.step);
  setStr("source", launch.source);
  setNum("directionId", launch.directionId);
  setStr("directionTitle", launch.directionTitle);
  setNum("moduleId", launch.moduleId);
  setNum("moduleNumber", launch.moduleNumber);
  setStr("moduleTitle", launch.moduleTitle);
  setNum("lessonId", launch.lessonId);
  setNum("lessonNumber", launch.lessonNumber);
  setStr("lessonType", launch.lessonType);
  setStr("lessonTitle", launch.lessonTitle);
  setStr("lessonCode", launch.lessonCode);
  const query = search.toString();
  return `/admin/software/qualification/material/create${query ? `?${query}` : ""}`;
}

export function launchFromSearch(search: { get: (key: string) => string | null }): WizardLaunch | null {
  const source = search.get("source");
  const directionId = Number(search.get("directionId") ?? "");
  const hasDirection = Number.isInteger(directionId) && directionId > 0;
  if (!hasDirection && source !== "mandatory") return null;
  const step = Number(search.get("step") ?? "");
  const moduleId = Number(search.get("moduleId") ?? "");
  const moduleNumber = Number(search.get("moduleNumber") ?? "");
  const lessonId = Number(search.get("lessonId") ?? "");
  const lessonNumber = Number(search.get("lessonNumber") ?? "");
  const lessonType = search.get("lessonType");
  const parsedSource = source === "it" ? "it" : source === "mandatory" ? "mandatory" : source === "qualification" ? "qualification" : undefined;
  return {
    directionId: hasDirection ? directionId : undefined,
    source: parsedSource,
    directionTitle: search.get("directionTitle") ?? "",
    step: Number.isInteger(step) && step >= 1 && step <= 7 ? step : undefined,
    moduleId: Number.isInteger(moduleId) && moduleId > 0 ? moduleId : undefined,
    moduleNumber: Number.isInteger(moduleNumber) && moduleNumber > 0 ? moduleNumber : undefined,
    moduleTitle: search.get("moduleTitle") ?? undefined,
    lessonId: Number.isInteger(lessonId) && lessonId > 0 ? lessonId : undefined,
    lessonNumber: Number.isInteger(lessonNumber) && lessonNumber > 0 ? lessonNumber : undefined,
    lessonType: lessonType === "THEORY" || lessonType === "PRACTICAL" ? lessonType : undefined,
    lessonTitle: search.get("lessonTitle") ?? undefined,
    lessonCode: search.get("lessonCode") ?? undefined,
  };
}

export function stateFromLaunch(launch: WizardLaunch): MaterialWizardState {
  const moduleNumber = launch.moduleNumber ?? 1;
  const moduleTitle = launch.moduleTitle ?? "";
  const lessonNumber = launch.lessonNumber ?? 1;
  const lessonTitle = launch.lessonTitle ?? "";
  const lessonType = launch.lessonType ?? null;
  const step = launch.lessonId
    ? launch.step ?? 4
    : launch.moduleId
      ? launch.step ?? 3
      : launch.directionId
        ? launch.step ?? 2
        : launch.step ?? 1;
  return {
    ...emptyWizardState(),
    step,
    directionId: launch.directionId ?? null,
    directionTitle: launch.directionTitle ?? "",
    moduleId: launch.moduleId ?? null,
    moduleNumber,
    moduleTitle,
    savedModuleNumber: launch.moduleId ? moduleNumber : null,
    savedModuleTitle: launch.moduleId ? moduleTitle : undefined,
    lessonId: launch.lessonId ?? null,
    lessonNumber,
    lessonType,
    lessonTitle,
    lessonCode: launch.lessonCode || formatLessonCode(moduleNumber, lessonNumber),
    savedLessonNumber: launch.lessonId ? lessonNumber : null,
    savedLessonType: launch.lessonId ? lessonType : null,
    savedLessonTitle: launch.lessonId ? lessonTitle : undefined,
    source: launch.source,
  };
}

export function shouldReuseDraft(draft: MaterialWizardState, launchKey: string) {
  return Boolean(launchKey) && draft.launchKey === launchKey;
}

export function asLessonType(value?: string | null): QualificationLessonType | undefined {
  return value === "THEORY" || value === "PRACTICAL" ? value : undefined;
}

export const emptyWizardState = (): MaterialWizardState => ({
  step: 1,
  directionId: null,
  directionTitle: "",
  moduleId: null,
  moduleNumber: 1,
  moduleTitle: "",
  lessonId: null,
  lessonNumber: 1,
  lessonType: null,
  lessonTitle: "",
  lessonCode: "",
  materialTypes: [],
  materials: [],
  status: "DRAFT",
  source: undefined,
});

export function emptyQuestions(): TestQuestion[] {
  return [
    {
      id: crypto.randomUUID(),
      question: "",
      options: [
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" },
      ],
      correctAnswer: "A",
    },
  ];
}

export function createMaterialForm(type: QualificationMaterialType, lessonCode: string): MaterialFormData {
  return {
    type,
    title: defaultMaterialTitle(type, lessonCode),
    description: "",
    file: null,
    uploaded: false,
    uploadProgress: 0,
    assignment: "",
    instruction: "",
    goal: "",
    procedure: "",
    questionsCount: 20,
    passingScore: 70,
    durationMinutes: 30,
    attempts: 3,
    questions: type === "TEST" ? emptyQuestions() : undefined,
  };
}

type SerializedWizard = Omit<MaterialWizardState, "materials"> & {
  materials: Array<Omit<MaterialFormData, "file"> & { file: null }>;
};

export function serializeWizard(state: MaterialWizardState): SerializedWizard {
  return {
    ...state,
    materials: state.materials.map((item) => ({
      ...item,
      file: null,
      uploadProgress: item.uploaded ? 100 : 0,
    })),
  };
}

export function loadWizardDraft(): MaterialWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(QUALIFICATION_WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MaterialWizardState;
    return {
      ...emptyWizardState(),
      ...parsed,
      materials: (parsed.materials ?? []).map((item) => ({ ...item, file: null })),
    };
  } catch {
    return null;
  }
}

export function saveWizardDraft(state: MaterialWizardState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(QUALIFICATION_WIZARD_DRAFT_KEY, JSON.stringify(serializeWizard(state)));
}

export function clearWizardDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(QUALIFICATION_WIZARD_DRAFT_KEY);
}

export function resetDownstreamFromDirection(state: MaterialWizardState): MaterialWizardState {
  return {
    ...state,
    moduleId: null,
    moduleNumber: 1,
    moduleTitle: "",
    savedModuleNumber: null,
    savedModuleTitle: "",
    lessonId: null,
    lessonNumber: 1,
    lessonTitle: "",
    lessonType: null,
    lessonCode: "",
    savedLessonNumber: null,
    savedLessonType: null,
    savedLessonTitle: "",
    materialTypes: [],
    materials: [],
  };
}

export function resetDownstreamFromModule(state: MaterialWizardState): MaterialWizardState {
  return {
    ...state,
    lessonId: null,
    lessonNumber: 1,
    lessonTitle: "",
    lessonType: null,
    lessonCode: "",
    savedLessonNumber: null,
    savedLessonType: null,
    savedLessonTitle: "",
    materialTypes: [],
    materials: [],
  };
}

export function isModuleDirty(state: MaterialWizardState) {
  if (!state.moduleId) return false;
  return (
    state.moduleNumber !== state.savedModuleNumber ||
    state.moduleTitle.trim() !== (state.savedModuleTitle ?? "").trim()
  );
}

export function isLessonDirty(state: MaterialWizardState) {
  if (!state.lessonId) return false;
  return (
    state.lessonNumber !== state.savedLessonNumber ||
    state.lessonType !== state.savedLessonType ||
    state.lessonTitle.trim() !== (state.savedLessonTitle ?? "").trim()
  );
}

export function syncMaterialsForTypes(state: MaterialWizardState): MaterialFormData[] {
  const code = state.lessonCode || formatLessonCode(state.moduleNumber, state.lessonNumber);
  return state.materialTypes.map((type) => {
    const existing = state.materials.find((item) => item.type === type);
    return existing ?? createMaterialForm(type, code);
  });
}
