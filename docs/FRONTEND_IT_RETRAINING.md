# IT Panel — Qayta tayyorlash (frontend)

## Ierarxiya

```
Yo'nalish → Modul → Dars → Material (LECTURE | VIDEO | MUSTAQIL_ISH | …)
```

Alohida “blog” entity yo‘q — bloklar yo'nalish `description` ichidagi `ZM_BLOCKS:` meta.

## API prefiks

```
/api/v1/admin/retraining/{panel}/...
```

`{panel}`: `umumiy` | `pedagogik` | `kasbiy`

| retraining_type | panel |
|---|---|
| `UMUMIY_QAYTA_TAYYORLASH` | `umumiy` |
| `PEDAGOGIK_QAYTA_TAYYORLASH` | `pedagogik` |
| `KASBIY_QAYTA_TAYYORLASH` | `kasbiy` |

## FE BUG FIX — panel mismatch (404 “qayta tayyorlash yo'nalishi topilmadi”)

**Sabab:** Dars boshqa panel (masalan `kasbiy`) ostida, lekin frontend URL da `umumiy` ishlatgan. Backend cross-panel so‘rovni 404 bilan rad etadi — bu to‘g‘ri.

**Qoidalar:**

1. **`umumiy` hardcode qilinmaydi** — fallback olib tashlandi.
2. **`resolveRetrainingPanel()`** (`lib/retraining/admin-panels.ts`):
   - Birinchi: `direction.retraining_type` → panel slug
   - Keyin: `direction.retraining_panel`
   - Oxirida: route / URL `?panel=`
3. **`requireRetrainingPanel()`** (`lib/api/retraining-admin.ts`) — barcha panel-scoped API chaqiruvlarida ishlatiladi:
   - `createRetrainingMaterial` / `submitRetrainingLessonMaterial`
   - `getRetrainingLessonMaterials`
   - `createRetrainingModule` / `createRetrainingLesson`
   - `getRetrainingModuleLessons` / `publishRetrainingLesson`
4. Material/material wizard chaqiruvlarida `{ direction }` context uzating — API `{panel}` yo'nalish turidan olinadi.
5. Wizard URL: har doim `?source=retraining&panel={slug}` (`qualificationWizardPath` → `retrainingPanel`). Panel draft/state da ham saqlanadi (`MaterialWizardState.retrainingPanel`).
6. `withPanel()` API dan kelgan `retraining_type` ni route panel bilan ustiga yozmaydi — `{panel}` API chaqiruvi yo'nalish turidan olinadi.

## FE BUG FIX — Bug A: panel mismatch (404 “yo'nalishi topilmadi”)

Yuqoridagi **panel mismatch** bo'limi.

## FE BUG FIX — Bug B: `moduleId = directionId` (404 “modul topilmadi”)

**Sabab:** Yo'nalish yaratilgach `response.id` (masalan `875`) xato bilan `moduleId` ga copy qilingan yoki modul create response parser yo'nalish obyektini modul deb o'qigan.

**Qoidalar:**

1. **Step 1:** faqat `directionId = direction.id`; `moduleId = null`.
2. **Step 2:** `POST .../{directionId}/modules` → `moduleId = response.module.id` (wrapper: `data.id`, `module.id`).
3. **Step 3:** `POST .../modules/{moduleId}/lessons` — `moduleId` faqat Step 2 response yoki tanlangan modul PK.
4. **Step 4:** `POST .../lessons/{lessonId}/materials` — faqat dars PK.
5. **QAT'IYAN taqiqlangan:** `moduleId ?? directionId`, `moduleId || directionId`, `setModuleId(directionId)`.
6. **React stale state:** `confirmedModuleIdRef` + local `createdModuleId` — `setModuleId` dan keyin eski state bilan API chaqirma.
7. **URL:** `moduleId` query faqat modul muvaffaqiyatli yaratilgandan / mavjud modul tanlangandan keyin.
8. **`parseModuleRows`:** bo'sh `modules[]` da yo'nalish qatorini modul deb parse qilmasin.
9. Dev log: `Retraining wizard IDs`, `Module created`, `Creating lesson`.

## Material yaratish

```
POST /api/v1/admin/files          → file_id
POST /api/v1/admin/retraining/{panel}/lessons/{lessonId}/materials
```

`lessonId` — darsning real primary key (`lesson.id`), `lesson_number` emas.

### Material type (Bug C — `lesson_materials_type_check`)

API ga faqat canonical `type`: `VIDEO`, `LECTURE`, `MUSTAQIL_ISH`, `PRESENTATION`, `GUIDE`, `SEMINAR`, `LABORATORY`, `TEST`.

`normalizeMaterialType()` (`lib/retraining/material-types.ts`) — wizard `GUIDE` (Ma'ruza matni) → `LECTURE`.

23514 constraint xatoda retry bloklanadi; payload rebuild bilan normalized type yuboriladi.

Dev console: `Material payload { type, title, file_id }` — POST dan oldin.

Agar canonical type (`LECTURE`, `MUSTAQIL_ISH`) yuborilsa-yu 23514 bo'lsa — **DATABASE** (eski constraint):

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'lesson_materials_type_check';

ALTER TABLE lesson_materials DROP CONSTRAINT IF EXISTS lesson_materials_type_check;
ALTER TABLE lesson_materials ADD CONSTRAINT lesson_materials_type_check
  CHECK (type IN (
    'VIDEO', 'LECTURE', 'MUSTAQIL_ISH', 'PRESENTATION',
    'GUIDE', 'SEMINAR', 'LABORATORY'
  ));
```
