import { Suspense } from "react";
import CoursesCatalogView from "@/components/dashboard/views/CoursesCatalogView";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function CoursesPage() {
  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <CoursesCatalogView />
    </Suspense>
  );
}
