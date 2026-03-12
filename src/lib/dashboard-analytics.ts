import type { CourseCatalog, Lesson } from "@/lib/mock-data";

type LessonEntry = {
  subject: string;
  moduleName: string;
  lesson: Lesson;
};

export type CourseSummary = {
  totalLessons: number;
  completedLessons: number;
  activeLessons: number;
  pendingLessons: number;
  completionRate: number;
};

export type FocusLesson = {
  id: string;
  module: string;
  lesson: string;
  status: string;
  note: string;
  actionLabel: string;
  shareUrl?: string;
  lessonStatus: Lesson["status"];
};

export type SubjectSnapshot = {
  subject: string;
  progress: number;
  target: string;
  note: string;
};

function flattenCatalog(catalog: CourseCatalog[]) {
  return catalog.flatMap<LessonEntry>((subject) =>
    subject.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        subject: subject.subject,
        moduleName: module.name,
        lesson,
      })),
    ),
  );
}

export function getCourseSummary(catalog: CourseCatalog[]): CourseSummary {
  const lessons = flattenCatalog(catalog);
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(
    ({ lesson }) => lesson.status === "已完成",
  ).length;
  const activeLessons = lessons.filter(({ lesson }) => lesson.status === "学习中").length;
  const pendingLessons = Math.max(totalLessons - completedLessons - activeLessons, 0);

  return {
    totalLessons,
    completedLessons,
    activeLessons,
    pendingLessons,
    completionRate:
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
  };
}

export function getFocusLessons(catalog: CourseCatalog[], limit = 3): FocusLesson[] {
  const statusPriority: Record<Lesson["status"], number> = {
    学习中: 0,
    未开始: 1,
    已完成: 2,
  };

  return flattenCatalog(catalog)
    .sort((left, right) => {
      const statusDiff =
        statusPriority[left.lesson.status] - statusPriority[right.lesson.status];

      if (statusDiff !== 0) {
        return statusDiff;
      }

      if (left.lesson.shareUrl && !right.lesson.shareUrl) {
        return -1;
      }

      if (!left.lesson.shareUrl && right.lesson.shareUrl) {
        return 1;
      }

      return left.lesson.title.localeCompare(right.lesson.title, "zh-CN");
    })
    .slice(0, limit)
    .map(({ subject, moduleName, lesson }) => ({
      id: lesson.id,
      module: `${subject} · ${moduleName}`,
      lesson: lesson.title,
      status:
        lesson.status === "学习中"
          ? "正在推进"
          : lesson.status === "未开始"
            ? "下一节"
            : "已完成，可回看",
      note:
        lesson.note !== "已从 Excel 导入。"
          ? lesson.note
          : lesson.chapter
            ? `章节：${lesson.chapter}`
            : "已导入课程，可直接打开夸克继续学习。",
      actionLabel:
        lesson.status === "学习中"
          ? "继续学习"
          : lesson.status === "未开始"
            ? "打开夸克"
            : "回看本节",
      shareUrl: lesson.shareUrl,
      lessonStatus: lesson.status,
    }));
}

export function getSubjectSnapshots(catalog: CourseCatalog[]): SubjectSnapshot[] {
  return catalog.map((subject) => {
    const summary = getCourseSummary([subject]);

    return {
      subject: subject.subject,
      progress: summary.completionRate,
      target: `已完成 ${summary.completedLessons} / ${summary.totalLessons} 节课时`,
      note:
        summary.activeLessons > 0
          ? `当前 ${summary.activeLessons} 节正在学习中，先把在推进的模块收口。`
          : summary.pendingLessons > 0
            ? `还有 ${summary.pendingLessons} 节待开始，适合按模块顺序往下推进。`
            : "这个科目已全部完成，可以转入复盘和刷题。",
    };
  });
}
