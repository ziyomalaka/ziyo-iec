import { z } from "zod";

export const directionCreateSchema = z.object({
  title: z.string().trim().min(3, "Nomi kamida 3 belgi").max(255, "Nomi 255 belgidan oshmasin"),
  category_id: z.number().int().gt(0, "Bo'limni tanlang"),
});

export const moduleSchema = z.object({
  moduleNumber: z.number().int().min(1, "Modul raqami 1 dan kichik bo'lmasin"),
  moduleTitle: z.string().trim().min(3, "Mavzu kamida 3 belgi").max(255, "Mavzu 255 belgidan oshmasin"),
});

export const lessonSchema = z.object({
  lessonType: z.enum(["THEORY", "PRACTICAL"]),
  lessonNumber: z.number().int().min(1, "Dars raqami 1 dan kichik bo'lmasin"),
  lessonTitle: z.string().trim().min(3, "Mavzu kamida 3 belgi").max(255, "Mavzu 255 belgidan oshmasin"),
});

export const materialTypesSchema = z.object({
  materialTypes: z.array(z.enum(["VIDEO", "PRESENTATION", "GUIDE", "SEMINAR", "LABORATORY", "TEST"])).min(1),
});

export const testSchema = z.object({
  title: z.string().trim().min(1, "Test nomi majburiy"),
  passingScore: z.number().int().min(0).max(100),
  durationMinutes: z.number().int().min(1),
  attempts: z.number().int().min(1),
});
