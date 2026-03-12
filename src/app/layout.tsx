import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { CountdownProvider } from "@/components/countdown-provider";
import { CourseProvider } from "@/components/course-provider";
import { LearningRecordsProvider } from "@/components/learning-records-provider";
import { MaterialsProvider } from "@/components/materials-provider";
import { PracticeHubProvider } from "@/components/practice-hub-provider";
import { StudyTrackerProvider } from "@/components/study-tracker-provider";
import { loadCourseTemplatePayload } from "@/lib/course-template-server";
import { loadMaterialTemplatePayload } from "@/lib/material-template-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "公考管理系统",
  description: "个人公考学习驾驶舱，统一管理课程、记录、倒计时与复盘。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const courseTemplatePayload = loadCourseTemplatePayload();
  const materialTemplatePayload = loadMaterialTemplatePayload();

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <CountdownProvider>
          <StudyTrackerProvider>
            <PracticeHubProvider>
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
            </PracticeHubProvider>
          </StudyTrackerProvider>
        </CountdownProvider>
      </body>
    </html>
  );
}
