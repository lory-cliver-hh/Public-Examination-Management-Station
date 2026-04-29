import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CountdownProvider } from "@/components/countdown-provider";
import { CourseProvider } from "@/components/course-provider";
import { DailyTodoProvider } from "@/components/daily-todo-provider";
import { LearningRecordsProvider } from "@/components/learning-records-provider";
import { MaterialsProvider } from "@/components/materials-provider";
import { MistakeNotebookProvider } from "@/components/mistake-notebook-provider";
import { PracticeHubProvider } from "@/components/practice-hub-provider";
import { StudyTrackerProvider } from "@/components/study-tracker-provider";
import { loadCourseTemplatePayload } from "@/lib/course-template-server";
import { loadMaterialTemplatePayload } from "@/lib/material-template-server";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const courseTemplatePayload = loadCourseTemplatePayload();
  const materialTemplatePayload = loadMaterialTemplatePayload();

  return (
    <CountdownProvider>
      <DailyTodoProvider>
        <StudyTrackerProvider>
          <PracticeHubProvider>
            <MistakeNotebookProvider>
              <LearningRecordsProvider>
                <CourseProvider
                  initialCatalog={courseTemplatePayload.catalog}
                  initialImportMeta={courseTemplatePayload.importMeta}
                >
                  <MaterialsProvider
                    initialCatalog={materialTemplatePayload.catalog}
                    initialImportMeta={materialTemplatePayload.importMeta}
                  >
                    <AppShell>{children}</AppShell>
                  </MaterialsProvider>
                </CourseProvider>
              </LearningRecordsProvider>
            </MistakeNotebookProvider>
          </PracticeHubProvider>
        </StudyTrackerProvider>
      </DailyTodoProvider>
    </CountdownProvider>
  );
}
