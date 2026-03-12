export type ExamCountdown = {
  id: string;
  name: string;
  date: string;
  emphasis: "primary" | "secondary" | "supporting";
  note: string;
};

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
};

export type FocusItem = {
  module: string;
  lesson: string;
  status: string;
  note: string;
  actionLabel: string;
  shareUrl?: string;
};

export type SubjectProgress = {
  subject: string;
  progress: number;
  target: string;
  note: string;
};

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  status: "未开始" | "学习中" | "已完成";
  chapter?: string;
  shareUrl?: string;
  shareCode?: string;
  note: string;
};

export type ModuleGroup = {
  name: string;
  emphasis: string;
  lessons: Lesson[];
};

export type CourseCatalog = {
  subject: string;
  weeklyGoal: string;
  progress: number;
  modules: ModuleGroup[];
};

export type MaterialItem = {
  id: string;
  title: string;
  chapter?: string;
  shareUrl?: string;
  shareCode?: string;
  note: string;
};

export type MaterialModuleGroup = {
  name: string;
  emphasis: string;
  items: MaterialItem[];
};

export type MaterialCatalog = {
  subject: string;
  summary: string;
  modules: MaterialModuleGroup[];
};

export type StudyRecord = {
  id: string;
  date: string;
  timeRange: string;
  duration: string;
  lesson: string;
  outcome: string;
  note: string;
};

export type PoliticalBrief = {
  id: string;
  title: string;
  summary: string;
  focus: string[];
  cadence: string;
};

export const examCountdowns: ExamCountdown[] = [
  {
    id: "national",
    name: "国考目标日",
    date: "2026-11-15T09:00:00+08:00",
    emphasis: "primary",
    note: "当前主目标，倒推刷题与申论节奏。",
  },
  {
    id: "province",
    name: "省考目标日",
    date: "2026-06-21T09:00:00+08:00",
    emphasis: "secondary",
    note: "用于阶段性检验，优先补齐资料分析和判断推理。",
  },
  {
    id: "career",
    name: "事业编目标日",
    date: "2026-07-19T09:00:00+08:00",
    emphasis: "supporting",
    note: "作为兜底选项，常识与公基同步预热。",
  },
];

export const dashboardStats: DashboardStat[] = [
  {
    label: "今日学习时长",
    value: "3.5h",
    detail: "上午完成 2 节资料分析，晚上补 1 节申论。",
  },
  {
    label: "连续打卡",
    value: "12 天",
    detail: "保持节奏，不追求虚高时长，先守住稳定推进。",
  },
  {
    label: "课程完成率",
    value: "18 / 56",
    detail: "本周关键是把“增长率”“概括归纳”推进完。",
  },
];

export const todayFocus: FocusItem[] = [
  {
    module: "资料分析",
    lesson: "增长率、倍数与现期基期的混合题型",
    status: "第一优先级",
    note: "先刷方法课，再做 20 题专项。",
    actionLabel: "打开夸克继续学习",
    shareUrl: "https://pan.quark.cn",
  },
  {
    module: "申论",
    lesson: "概括归纳题的高频答案结构",
    status: "第二优先级",
    note: "晚间回看 1 节课，再整理模板句。",
    actionLabel: "去看本节视频",
    shareUrl: "https://pan.quark.cn",
  },
  {
    module: "判断推理",
    lesson: "图形推理中的位置与数量复合规律",
    status: "可机动安排",
    note: "如果资料分析提前完成，再补这一节。",
    actionLabel: "保留到晚间",
  },
];

export const subjectProgress: SubjectProgress[] = [
  {
    subject: "资料分析",
    progress: 68,
    target: "本周目标：冲到 80%",
    note: "保持高频专项训练，避免只听课不刷题。",
  },
  {
    subject: "申论",
    progress: 42,
    target: "本周目标：完成概括归纳专题",
    note: "听课后立即做结构化复述，避免输入不输出。",
  },
  {
    subject: "判断推理",
    progress: 54,
    target: "本周目标：图形推理两章",
    note: "优先补薄弱模块，不要平均用力。",
  },
  {
    subject: "常识判断",
    progress: 31,
    target: "本周目标：建立专题索引",
    note: "暂不追求大量做题，先形成知识索引。",
  },
];

export const courseCatalog: CourseCatalog[] = [
  {
    subject: "行测",
    weeklyGoal: "本周要把资料分析和判断推理各推进 2 节",
    progress: 61,
    modules: [
      {
        name: "资料分析",
        emphasis: "高优先级突破项",
        lessons: [
          {
            id: "xa-1",
            title: "增长率题型拆分",
            duration: "46 分钟",
            status: "学习中",
            shareUrl: "https://pan.quark.cn",
            note: "配套做 15 题专项。",
          },
          {
            id: "xa-2",
            title: "倍数与比重速算",
            duration: "39 分钟",
            status: "未开始",
            shareUrl: "https://pan.quark.cn",
            note: "放到今晚第二节。",
          },
        ],
      },
      {
        name: "判断推理",
        emphasis: "保持节奏",
        lessons: [
          {
            id: "xb-1",
            title: "图形推理中的位置规律",
            duration: "41 分钟",
            status: "已完成",
            shareUrl: "https://pan.quark.cn",
            note: "错题已摘录到笔记。",
          },
          {
            id: "xb-2",
            title: "数量规律混合题",
            duration: "44 分钟",
            status: "学习中",
            shareUrl: "https://pan.quark.cn",
            note: "还差课后练习。",
          },
        ],
      },
    ],
  },
  {
    subject: "申论",
    weeklyGoal: "先把概括归纳和提出对策建立答题手感",
    progress: 42,
    modules: [
      {
        name: "概括归纳",
        emphasis: "当前第二优先级",
        lessons: [
          {
            id: "sa-1",
            title: "概括归纳题结构模板",
            duration: "53 分钟",
            status: "学习中",
            shareUrl: "https://pan.quark.cn",
            note: "课后需要做一篇真题。",
          },
          {
            id: "sa-2",
            title: "高分答案的概括颗粒度",
            duration: "36 分钟",
            status: "未开始",
            shareUrl: "https://pan.quark.cn",
            note: "准备周三晚间完成。",
          },
        ],
      },
      {
        name: "提出对策",
        emphasis: "预备项",
        lessons: [
          {
            id: "sb-1",
            title: "对策题的主体与层次",
            duration: "49 分钟",
            status: "未开始",
            shareUrl: "https://pan.quark.cn",
            note: "概括归纳结束后再开始。",
          },
        ],
      },
    ],
  },
];

export const studyRecords: StudyRecord[] = [
  {
    id: "r1",
    date: "2026-03-10",
    timeRange: "08:30 - 10:05",
    duration: "95 分钟",
    lesson: "资料分析｜增长率题型拆分",
    outcome: "看完方法课并完成 12 题练习。",
    note: "容易在现期基期混题中卡住，晚间再回刷一组。",
  },
  {
    id: "r2",
    date: "2026-03-10",
    timeRange: "19:40 - 20:30",
    duration: "50 分钟",
    lesson: "申论｜概括归纳题结构模板",
    outcome: "完成 1 节课和 1 页结构整理。",
    note: "重点记“问题 - 原因 - 对策”的切换信号词。",
  },
  {
    id: "r3",
    date: "2026-03-09",
    timeRange: "21:00 - 21:45",
    duration: "45 分钟",
    lesson: "判断推理｜数量规律混合题",
    outcome: "完成 18 题训练，正确率 72%。",
    note: "数量与位置复合题需要单独归纳。",
  },
  {
    id: "r4",
    date: "2026-03-08",
    timeRange: "15:10 - 16:00",
    duration: "50 分钟",
    lesson: "常识判断｜法律基础索引",
    outcome: "完成民法与行政法框架整理。",
    note: "先建目录，不急着大规模刷题。",
  },
];

export const materialsCatalog: MaterialCatalog[] = [
  {
    subject: "行测",
    summary: "共 4 份资料，按模块集中整理。",
    modules: [
      {
        name: "言语理解",
        emphasis: "高频刷题资料",
        items: [
          {
            id: "m-xy-1",
            title: "片段阅读讲义",
            chapter: "片段阅读",
            shareUrl: "https://pan.quark.cn",
            note: "适合配合课程同步翻看知识点和例题。",
          },
          {
            id: "m-xy-2",
            title: "片段阅读专项题册",
            chapter: "片段阅读",
            shareUrl: "https://pan.quark.cn",
            note: "听完课后直接刷题用。",
          },
        ],
      },
      {
        name: "资料分析",
        emphasis: "练习材料",
        items: [
          {
            id: "m-zl-1",
            title: "增长率专题讲义",
            chapter: "增长率",
            shareUrl: "https://pan.quark.cn",
            note: "配合课程中的基础题型一起使用。",
          },
          {
            id: "m-zl-2",
            title: "资料分析高频公式速记",
            chapter: "公式速记",
            shareUrl: "https://pan.quark.cn",
            note: "适合考前快速回顾。",
          },
        ],
      },
    ],
  },
  {
    subject: "申论",
    summary: "共 2 份资料，偏答题结构和模板。",
    modules: [
      {
        name: "概括归纳",
        emphasis: "答题模板",
        items: [
          {
            id: "m-sl-1",
            title: "概括归纳答题模板",
            chapter: "概括归纳",
            shareUrl: "https://pan.quark.cn",
            note: "适合边看课程边做结构整理。",
          },
          {
            id: "m-sl-2",
            title: "高分答案拆解示例",
            chapter: "高分答案",
            shareUrl: "https://pan.quark.cn",
            note: "结合课程讲解看答案结构。",
          },
        ],
      },
    ],
  },
];

export const weeklyReview = [
  "本周最值得继续保持的是资料分析的连贯刷题，而不是单纯累计课时。",
  "申论目前的瓶颈不是不会写，而是做完题后没有及时回写结构模板。",
  "常识与公基先做索引搭建，避免被零散知识点拖住主节奏。",
];

export const infoUpdatePlaceholder = [
  "国考公告：暂无更新",
  "省考通知：暂无更新",
  "事业编资讯：暂无更新",
];

export const politicalBriefs: PoliticalBrief[] = [
  {
    id: "innovation",
    title: "科技创新与新质生产力",
    summary:
      "适合作为时政与申论共用主题，重点记住“创新驱动、产业升级、现代化体系”这组三角关系。",
    focus: [
      "关键词：科技自立自强",
      "答题切口：发展方式转型",
      "关联模块：时政、申论综合分析",
    ],
    cadence: "每 18 秒轮播一条",
  },
  {
    id: "governance",
    title: "基层治理与民生服务",
    summary:
      "这一类素材适合和公基、申论案例题联动，关注服务下沉、数字治理、群众获得感。",
    focus: [
      "关键词：基层治理现代化",
      "答题切口：共建共治共享",
      "关联模块：申论对策题、公基政治",
    ],
    cadence: "每 18 秒轮播一条",
  },
  {
    id: "rural",
    title: "乡村振兴与区域协调",
    summary:
      "适合做时政积累卡，尤其适合材料分析题中的产业、人才、生态、组织四条主线。",
    focus: [
      "关键词：城乡融合发展",
      "答题切口：产业振兴与公共服务",
      "关联模块：时政、申论归纳概括",
    ],
    cadence: "每 18 秒轮播一条",
  },
];
