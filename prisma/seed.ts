import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding internal medicine training data...\n");

  // ─── Organization ─────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: "서울대학교병원 국제진료센터",
      slug: "snuh-global",
      description: "Seoul National University Hospital - Global Medical Education",
      logoUrl: null,
    },
  });
  console.log("✅ Organization:", org.name);

  // ─── Admin User ───────────────────────────────────────────
  const adminPw = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Dr. James Ahn",
      email: "james.ahn@medichips.ai",
      preferredLocale: "ko",
      avatarUrl: null,
      authMethods: {
        create: {
          method: "EMAIL_PASSWORD",
          identifier: "james.ahn@medichips.ai",
          credential: adminPw,
        },
      },
      memberships: {
        create: {
          organizationId: org.id,
          role: "ORG_ADMIN",
        },
      },
    },
  });
  console.log("✅ Admin:", admin.name);

  // ─── Demo Learner ─────────────────────────────────────────
  const learnerPw = await bcrypt.hash("learner1234", 12);
  const learner = await prisma.user.create({
    data: {
      name: "Dr. Amina Hassan",
      email: "amina@demo.medichips.ai",
      preferredLocale: "en",
      avatarUrl: null,
      authMethods: {
        create: {
          method: "EMAIL_PASSWORD",
          identifier: "amina@demo.medichips.ai",
          credential: learnerPw,
        },
      },
      memberships: {
        create: {
          organizationId: org.id,
          role: "LEARNER",
        },
      },
    },
  });
  console.log("✅ Learner:", learner.name);

  // ─── Supervisor ───────────────────────────────────────────
  const supervisorPw = await bcrypt.hash("super1234", 12);
  const supervisor = await prisma.user.create({
    data: {
      name: "Dr. Park Jihoon",
      email: "jihoon.park@demo.medichips.ai",
      preferredLocale: "ko",
      authMethods: {
        create: {
          method: "EMAIL_PASSWORD",
          identifier: "jihoon.park@demo.medichips.ai",
          credential: supervisorPw,
        },
      },
      memberships: {
        create: {
          organizationId: org.id,
          role: "SUPERVISOR",
        },
      },
    },
  });
  console.log("✅ Supervisor:", supervisor.name);

  // ─── Course 1: 내과 기본 진료 (published, enrolled) ────────
  const course1 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "internal-medicine-basics",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: null,
      estimatedHours: 8,
      translations: {
        create: [
          {
            locale: "ko",
            title: "내과 기본 진료",
            description: "내과 의사를 위한 기본 진료 프로토콜. 환자 병력 청취, 신체검사, 기본 검사 오더 및 해석.",
          },
          {
            locale: "en",
            title: "Internal Medicine Fundamentals",
            description: "Essential clinical protocols for internal medicine. Patient history, physical examination, basic lab orders and interpretation.",
          },
        ],
      },
    },
  });

  // Modules for Course 1
  const c1modules = [
    { order: 0, ko: "환자 병력 청취", en: "Patient History Taking" },
    { order: 1, ko: "신체 검사 기본", en: "Physical Examination Basics" },
    { order: 2, ko: "기본 검사 오더 및 해석", en: "Basic Lab Orders & Interpretation" },
    { order: 3, ko: "초기 치료 계획 수립", en: "Initial Treatment Planning" },
  ];

  const modules1 = [];
  for (const m of c1modules) {
    const mod = await prisma.module.create({
      data: {
        courseId: course1.id,
        orderIndex: m.order,
        translations: {
          create: [
            { locale: "ko", title: m.ko },
            { locale: "en", title: m.en },
          ],
        },
      },
    });
    modules1.push(mod);
  }

  // Lessons for each module
  const c1lessons: { moduleIdx: number; order: number; ko: string; en: string; type: "VIDEO" | "TEXT" | "QUIZ" | "MISSION"; dur: number }[] = [
    // Module 0: 환자 병력 청취
    { moduleIdx: 0, order: 0, ko: "주요 증상(CC) 파악하기", en: "Identifying Chief Complaint", type: "VIDEO", dur: 5 },
    { moduleIdx: 0, order: 1, ko: "현병력(HPI) 수집 기법", en: "History of Present Illness Technique", type: "VIDEO", dur: 5 },
    { moduleIdx: 0, order: 2, ko: "과거력 및 사회력 청취", en: "Past & Social History", type: "TEXT", dur: 4 },
    { moduleIdx: 0, order: 3, ko: "병력 청취 퀴즈", en: "History Taking Quiz", type: "QUIZ", dur: 3 },
    // Module 1: 신체 검사
    { moduleIdx: 1, order: 0, ko: "활력징후 측정 및 해석", en: "Vital Signs Assessment", type: "VIDEO", dur: 5 },
    { moduleIdx: 1, order: 1, ko: "흉부 청진 기법", en: "Chest Auscultation Technique", type: "VIDEO", dur: 7 },
    { moduleIdx: 1, order: 2, ko: "복부 진찰 순서", en: "Abdominal Examination Steps", type: "VIDEO", dur: 6 },
    { moduleIdx: 1, order: 3, ko: "신체 검사 실습 과제", en: "Physical Exam Practice Task", type: "MISSION", dur: 5 },
    // Module 2: 검사 해석
    { moduleIdx: 2, order: 0, ko: "CBC 해석 기본", en: "CBC Interpretation Basics", type: "VIDEO", dur: 5 },
    { moduleIdx: 2, order: 1, ko: "간기능 검사(LFT) 해석", en: "Liver Function Test Interpretation", type: "TEXT", dur: 5 },
    { moduleIdx: 2, order: 2, ko: "신기능 검사 및 전해질", en: "Renal Function & Electrolytes", type: "TEXT", dur: 5 },
    { moduleIdx: 2, order: 3, ko: "검사 해석 퀴즈", en: "Lab Interpretation Quiz", type: "QUIZ", dur: 4 },
    // Module 3: 치료 계획
    { moduleIdx: 3, order: 0, ko: "약물 처방 기본 원칙", en: "Medication Prescribing Principles", type: "VIDEO", dur: 5 },
    { moduleIdx: 3, order: 1, ko: "환자 교육 및 퇴원 계획", en: "Patient Education & Discharge Plan", type: "TEXT", dur: 4 },
    { moduleIdx: 3, order: 2, ko: "치료 계획 종합 퀴즈", en: "Treatment Planning Quiz", type: "QUIZ", dur: 5 },
  ];

  const lessons1 = [];
  for (const l of c1lessons) {
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: modules1[l.moduleIdx].id,
        orderIndex: l.order,
        contentType: l.type,
        durationMin: l.dur,
        translations: {
          create: [
            { locale: "ko", title: l.ko },
            { locale: "en", title: l.en },
          ],
        },
      },
    });
    lessons1.push(lesson);
  }

  // ─── Course 2: 당뇨병 관리 (published, not enrolled) ──────
  const course2 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "diabetes-management",
      riskLevel: "L2",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: null,
      estimatedHours: 6,
      translations: {
        create: [
          {
            locale: "ko",
            title: "당뇨병 진단과 관리",
            description: "2형 당뇨병의 진단 기준, 혈당 조절 목표, 경구 약제 선택, 인슐린 요법 및 합병증 선별검사.",
          },
          {
            locale: "en",
            title: "Diabetes Diagnosis & Management",
            description: "Type 2 diabetes diagnostic criteria, glycemic targets, oral agents, insulin therapy, and complication screening.",
          },
        ],
      },
      modules: {
        create: [
          {
            orderIndex: 0,
            translations: { create: [{ locale: "ko", title: "당뇨병 진단 기준" }, { locale: "en", title: "Diabetes Diagnostic Criteria" }] },
          },
          {
            orderIndex: 1,
            translations: { create: [{ locale: "ko", title: "경구 혈당 강하제" }, { locale: "en", title: "Oral Hypoglycemic Agents" }] },
          },
          {
            orderIndex: 2,
            translations: { create: [{ locale: "ko", title: "인슐린 요법" }, { locale: "en", title: "Insulin Therapy" }] },
          },
          {
            orderIndex: 3,
            translations: { create: [{ locale: "ko", title: "합병증 선별 및 관리" }, { locale: "en", title: "Complication Screening & Management" }] },
          },
        ],
      },
    },
  });

  // ─── Course 3: 고혈압 관리 (published) ────────────────────
  const course3 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "hypertension-management",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: null,
      estimatedHours: 5,
      translations: {
        create: [
          {
            locale: "ko",
            title: "고혈압 진단과 약물 치료",
            description: "고혈압 단계별 분류, 생활습관 교정, 1차 약제 선택 알고리즘, 저항성 고혈압 접근.",
          },
          {
            locale: "en",
            title: "Hypertension Diagnosis & Drug Therapy",
            description: "BP staging, lifestyle modification, first-line medication algorithm, resistant hypertension approach.",
          },
        ],
      },
      modules: {
        create: [
          {
            orderIndex: 0,
            translations: { create: [{ locale: "ko", title: "고혈압 분류 및 진단" }, { locale: "en", title: "HTN Classification & Diagnosis" }] },
          },
          {
            orderIndex: 1,
            translations: { create: [{ locale: "ko", title: "항고혈압제 선택" }, { locale: "en", title: "Antihypertensive Selection" }] },
          },
          {
            orderIndex: 2,
            translations: { create: [{ locale: "ko", title: "저항성 고혈압 접근" }, { locale: "en", title: "Resistant Hypertension" }] },
          },
        ],
      },
    },
  });

  console.log("✅ Courses: 3 created");

  // ─── Enroll learner in Course 1 (65% progress) ───────────
  await prisma.courseEnrollment.create({
    data: {
      userId: learner.id,
      courseId: course1.id,
      progressPct: 65,
    },
  });

  // Mark first 9 lessons as completed, 10th in progress
  for (let i = 0; i < 10; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: learner.id,
        lessonId: lessons1[i].id,
        status: i < 9 ? "COMPLETED" : "IN_PROGRESS",
        timeSpentSec: i < 9 ? (lessons1[i].durationMin ?? 5) * 60 : 120,
        score: i < 9 ? 85 + Math.random() * 15 : null,
        updatedAt: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("✅ Lesson progress: 9 completed, 1 in progress");

  // ─── XP Ledger ────────────────────────────────────────────
  const xpEntries = [
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 9 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 8 },
    { action: "QUIZ_PASS" as const, amount: 30, days: 7 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 6 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 5 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 4 },
    { action: "MISSION_APPROVED" as const, amount: 50, days: 4 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 3 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 2 },
    { action: "QUIZ_PASS" as const, amount: 30, days: 2 },
    { action: "LESSON_COMPLETE" as const, amount: 20, days: 1 },
    { action: "DAILY_LOGIN" as const, amount: 5, days: 0 },
    { action: "STREAK_BONUS" as const, amount: 15, days: 0 },
    { action: "BADGE_EARNED" as const, amount: 25, days: 3 },
  ];

  for (let i = 0; i < xpEntries.length; i++) {
    const e = xpEntries[i];
    await prisma.xpLedger.create({
      data: {
        userId: learner.id,
        action: e.action,
        amount: e.amount,
        idempotencyKey: `seed-xp-${i}`,
        createdAt: new Date(Date.now() - e.days * 24 * 60 * 60 * 1000),
      },
    });
  }
  const totalXp = xpEntries.reduce((sum, e) => sum + e.amount, 0);
  console.log(`✅ XP: ${totalXp} total`);

  // ─── Streak ───────────────────────────────────────────────
  await prisma.streak.create({
    data: {
      userId: learner.id,
      currentStreak: 7,
      longestStreak: 12,
      lastActivityDate: new Date(),
      streakFreezes: 2,
    },
  });
  console.log("✅ Streak: 7 days current, 12 longest");

  // ─── Badge Definitions & Earned ───────────────────────────
  const badges = [
    { slug: "first-lesson", category: "COMPLETION" as const, name: "First Step", desc: "Complete your first lesson", icon: "/icons/badge-first.svg", xp: 10 },
    { slug: "five-streak", category: "STREAK" as const, name: "On Fire", desc: "5-day learning streak", icon: "/icons/badge-fire.svg", xp: 25 },
    { slug: "quiz-master", category: "MASTERY" as const, name: "Quiz Master", desc: "Score 90%+ on 3 quizzes", icon: "/icons/badge-quiz.svg", xp: 30 },
    { slug: "ten-lessons", category: "COMPLETION" as const, name: "Knowledge Seeker", desc: "Complete 10 lessons", icon: "/icons/badge-10.svg", xp: 20 },
    { slug: "team-player", category: "SOCIAL" as const, name: "Team Player", desc: "Help a peer with a task", icon: "/icons/badge-team.svg", xp: 15 },
  ];

  for (const b of badges) {
    const badge = await prisma.badgeDefinition.create({
      data: {
        slug: b.slug,
        category: b.category,
        name: b.name,
        description: b.desc,
        iconUrl: b.icon,
        xpReward: b.xp,
        criteria: {},
      },
    });

    // Learner earns first 4 badges
    if (["first-lesson", "five-streak", "quiz-master", "ten-lessons"].includes(b.slug)) {
      await prisma.earnedBadge.create({
        data: {
          userId: learner.id,
          badgeId: badge.id,
          earnedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log("✅ Badges: 5 defined, 4 earned");

  // ─── Tasks ────────────────────────────────────────────────
  const tasks = [
    {
      title: "활력징후 측정 실습 보고",
      desc: "실제 환자의 활력징후(혈압, 맥박, 체온, 호흡수)를 측정하고 사진과 함께 기록 제출",
      status: "IN_PROGRESS" as const,
      checklist: [
        { text: "혈압 측정 (양팔)", done: true },
        { text: "맥박 측정 (60초)", done: true },
        { text: "체온 측정", done: false },
        { text: "호흡수 측정", done: false },
        { text: "사진 증빙 첨부", done: false },
      ],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "흉부 청진 소견 기록",
      desc: "3명의 환자에 대해 흉부 청진을 실시하고, 정상/비정상 소견을 구분하여 기록 제출",
      status: "PENDING" as const,
      checklist: [
        { text: "환자 1 청진 소견", done: false },
        { text: "환자 2 청진 소견", done: false },
        { text: "환자 3 청진 소견", done: false },
        { text: "비정상 소견 감별 기록", done: false },
      ],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "CBC 결과 해석 리포트",
      desc: "실제 환자 CBC 결과 3건을 해석하고, 임상적 의의를 서술",
      status: "PENDING" as const,
      checklist: [
        { text: "CBC 결과 1 해석", done: false },
        { text: "CBC 결과 2 해석", done: false },
        { text: "CBC 결과 3 해석", done: false },
        { text: "임상 연관성 서술", done: false },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        lessonId: lessons1[7].id, // 신체 검사 실습 과제
        assigneeId: learner.id,
        creatorId: supervisor.id,
        source: "SUPERVISOR_ASSIGNED",
        status: t.status,
        title: t.title,
        description: t.desc,
        checklist: t.checklist,
        dueDate: t.dueDate,
      },
    });
  }
  console.log("✅ Tasks: 3 created (1 in progress, 2 pending)");

  // ─── Invite Code ──────────────────────────────────────────
  await prisma.inviteCode.create({
    data: {
      code: "SNUH2026",
      organization: { connect: { id: org.id } },
      role: "LEARNER",
      maxUses: 100,
      useCount: 1,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdBy: { connect: { id: admin.id } },
    },
  });
  console.log("✅ Invite code: SNUH2026");

  // ─── Summary ──────────────────────────────────────────────
  console.log("\n🎉 Seed complete!\n");
  console.log("📋 Demo accounts:");
  console.log("   Admin:      james.ahn@medichips.ai / admin1234");
  console.log("   Learner:    amina@demo.medichips.ai / learner1234");
  console.log("   Supervisor: jihoon.park@demo.medichips.ai / super1234");
  console.log("   Invite:     SNUH2026");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
