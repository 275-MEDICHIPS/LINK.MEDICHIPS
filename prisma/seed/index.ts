import {
  PrismaClient,
  UserRole,
  AuthMethod,
  ConnectivityLevel,
  RiskLevel,
  ContentReviewStatus,
  ContentType,
  BadgeCategory,
  XpActionType,
  NotificationChannel,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MEDICHIPS-LINK database...");

  // ==================== Organizations ====================
  const koica = await prisma.organization.create({
    data: {
      name: "KOICA",
      slug: "koica",
      description: "Korea International Cooperation Agency",
      logoUrl: null,
    },
  });

  const phnomPenhHospital = await prisma.organization.create({
    data: {
      name: "Phnom Penh Municipal Hospital",
      slug: "phnom-penh-hospital",
      description: "KOICA partner hospital in Cambodia",
      parentId: koica.id,
    },
  });

  const nairobiClinic = await prisma.organization.create({
    data: {
      name: "Nairobi Community Health Center",
      slug: "nairobi-chc",
      description: "KOICA partner clinic in Kenya",
      parentId: koica.id,
    },
  });

  console.log("Organizations created");

  // ==================== Programs ====================
  const cambodiaProgram = await prisma.program.create({
    data: {
      name: "Cambodia Maternal Health 2026",
      description:
        "Training community health workers in maternal and neonatal care",
      organizationId: koica.id,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-12-31"),
      country: "KH",
      isActive: true,
      metadata: {
        budget: 250000,
        targetParticipants: 500,
      },
    },
  });

  const kenyaProgram = await prisma.program.create({
    data: {
      name: "Kenya Emergency Care 2026",
      description:
        "Basic emergency triage and care training for rural health workers",
      organizationId: koica.id,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      country: "KE",
      isActive: true,
      metadata: {
        budget: 180000,
        targetParticipants: 300,
      },
    },
  });

  console.log("Programs created");

  // ==================== Users ====================
  const pinHash = await bcrypt.hash("Admin123", 12);
  const learnerPinHash = await bcrypt.hash("Learn456", 12);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: "james.ahn@medichips.ai",
      name: "James Ahn",
      preferredLocale: "ko",
      connectivityLevel: ConnectivityLevel.HIGH,
      isActive: true,
      authMethods: {
        create: {
          method: AuthMethod.EMAIL_PASSWORD,
          identifier: "james.ahn@medichips.ai",
          credential: pinHash,
        },
      },
      memberships: {
        create: {
          organizationId: koica.id,
          role: UserRole.SUPER_ADMIN,
        },
      },
    },
  });

  // Org Admin
  const orgAdmin = await prisma.user.create({
    data: {
      email: "admin@phnompenh.kh",
      name: "Sokha Chea",
      preferredLocale: "km",
      connectivityLevel: ConnectivityLevel.MEDIUM,
      isActive: true,
      authMethods: {
        create: {
          method: AuthMethod.PIN_CODE,
          identifier: "sokha-pin",
          credential: pinHash,
        },
      },
      memberships: {
        create: {
          organizationId: phnomPenhHospital.id,
          role: UserRole.ORG_ADMIN,
        },
      },
    },
  });

  // Instructor
  const instructor = await prisma.user.create({
    data: {
      email: "dr.kim@medichips.ai",
      name: "Dr. Kim Soo-jin",
      preferredLocale: "ko",
      connectivityLevel: ConnectivityLevel.HIGH,
      isActive: true,
      authMethods: {
        create: {
          method: AuthMethod.EMAIL_PASSWORD,
          identifier: "dr.kim@medichips.ai",
          credential: pinHash,
        },
      },
      memberships: {
        create: {
          organizationId: koica.id,
          role: UserRole.INSTRUCTOR,
        },
      },
    },
  });

  // Supervisor
  const supervisor = await prisma.user.create({
    data: {
      email: "supervisor@phnompenh.kh",
      name: "Dara Pich",
      preferredLocale: "km",
      connectivityLevel: ConnectivityLevel.MEDIUM,
      isActive: true,
      authMethods: {
        create: {
          method: AuthMethod.PIN_CODE,
          identifier: "dara-pin",
          credential: pinHash,
        },
      },
      memberships: {
        create: {
          organizationId: phnomPenhHospital.id,
          role: UserRole.SUPERVISOR,
        },
      },
    },
  });

  // Create 5 learners
  const learnerNames = [
    {
      name: "Chanthy Sok",
      locale: "km",
      orgId: phnomPenhHospital.id,
      connectivity: ConnectivityLevel.LOW,
    },
    {
      name: "Vanna Chhum",
      locale: "km",
      orgId: phnomPenhHospital.id,
      connectivity: ConnectivityLevel.LOW,
    },
    {
      name: "Rachana Mao",
      locale: "km",
      orgId: phnomPenhHospital.id,
      connectivity: ConnectivityLevel.MEDIUM,
    },
    {
      name: "Amina Wanjiku",
      locale: "sw",
      orgId: nairobiClinic.id,
      connectivity: ConnectivityLevel.LOW,
    },
    {
      name: "Grace Otieno",
      locale: "sw",
      orgId: nairobiClinic.id,
      connectivity: ConnectivityLevel.MEDIUM,
    },
  ];

  const learners = [];
  for (const l of learnerNames) {
    const learner = await prisma.user.create({
      data: {
        name: l.name,
        preferredLocale: l.locale,
        connectivityLevel: l.connectivity,
        isActive: true,
        authMethods: {
          create: {
            method: AuthMethod.PIN_CODE,
            identifier: `${l.name.toLowerCase().replace(/\s/g, "-")}-pin`,
            credential: learnerPinHash,
          },
        },
        memberships: {
          create: {
            organizationId: l.orgId,
            role: UserRole.LEARNER,
          },
        },
      },
    });
    learners.push(learner);
  }

  console.log(
    "Users created (1 super admin, 1 org admin, 1 instructor, 1 supervisor, 5 learners)",
  );

  // ==================== Medical Specialties ====================
  const specialties = await Promise.all([
    prisma.medicalSpecialty.create({
      data: {
        name: "Maternal Health",
        description: "Pregnancy, childbirth, and postnatal care",
      },
    }),
    prisma.medicalSpecialty.create({
      data: {
        name: "Emergency Triage",
        description: "Emergency assessment and prioritization",
      },
    }),
    prisma.medicalSpecialty.create({
      data: {
        name: "Infection Control",
        description: "Prevention and control of infections",
      },
    }),
    prisma.medicalSpecialty.create({
      data: {
        name: "Pediatric Care",
        description: "Child health and development",
      },
    }),
    prisma.medicalSpecialty.create({
      data: {
        name: "Community Health",
        description: "Public health and community outreach",
      },
    }),
  ]);

  console.log("Medical specialties created");

  // ==================== Sample Course: Basic Emergency Obstetric Care ====================
  const course = await prisma.course.create({
    data: {
      organizationId: koica.id,
      slug: "basic-emergency-obstetric-care",
      riskLevel: RiskLevel.L2,
      status: ContentReviewStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
      translations: {
        create: [
          {
            locale: "en",
            title: "Basic Emergency Obstetric Care",
            description:
              "Essential skills for managing obstetric emergencies in resource-limited settings. Covers hemorrhage management, pre-eclampsia, and neonatal resuscitation.",
          },
          {
            locale: "ko",
            title: "기본 응급 산과 처치",
            description:
              "자원 제한 환경에서 산과 응급 상황 관리를 위한 필수 기술. 출혈 관리, 전자간증, 신생아 소생술을 다룹니다.",
          },
        ],
      },
      specialtyTags: {
        create: { specialtyId: specialties[0].id },
      },
    },
  });

  // Module 1: Introduction
  const module1 = await prisma.module.create({
    data: {
      courseId: course.id,
      orderIndex: 1,
      translations: {
        create: [
          { locale: "en", title: "Introduction to Obstetric Emergencies" },
          { locale: "ko", title: "산과 응급 상황 소개" },
        ],
      },
    },
  });

  // Lessons for Module 1
  const lesson1_1 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      contentType: ContentType.VIDEO,
      orderIndex: 1,
      durationMin: 5,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "What is Emergency Obstetric Care?",
            description:
              "Overview of emergency obstetric care and why it matters in resource-limited settings.",
          },
          {
            locale: "ko",
            title: "응급 산과 처치란?",
            description:
              "자원 제한 환경에서 응급 산과 처치의 개요와 중요성.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "video",
            videoAssetId: "sample-mux-asset-001",
            playbackId: "sample-playback-001",
            duration: 300,
            transcript: "Welcome to Basic Emergency Obstetric Care...",
            keyPoints: [
              "Emergency obstetric care saves lives of mothers and newborns",
              "Most obstetric deaths are preventable with timely intervention",
              "This course covers the 7 signal functions of Basic EmOC",
            ],
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  const lesson1_2 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      contentType: ContentType.TEXT,
      orderIndex: 2,
      durationMin: 3,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "The 7 Signal Functions of Basic EmOC",
            description: "Understanding the WHO-defined signal functions.",
          },
          {
            locale: "ko",
            title: "기본 EmOC의 7가지 핵심 기능",
            description: "WHO가 정의한 핵심 기능 이해하기.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "text",
            markdown:
              "# The 7 Signal Functions of Basic EmOC\n\n1. **Administer parenteral antibiotics** -- for infection\n2. **Administer uterotonic drugs** -- for hemorrhage\n3. **Administer parenteral anticonvulsants** -- for pre-eclampsia/eclampsia\n4. **Manual removal of placenta**\n5. **Removal of retained products** -- manual vacuum aspiration\n6. **Assisted vaginal delivery** -- vacuum extraction\n7. **Neonatal resuscitation** -- bag and mask\n\n> These 7 functions can prevent the majority of maternal and neonatal deaths when performed correctly and timely.",
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  const lesson1_3 = await prisma.lesson.create({
    data: {
      moduleId: module1.id,
      contentType: ContentType.QUIZ,
      orderIndex: 3,
      durationMin: 5,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "Module 1 Quiz",
            description:
              "Test your understanding of obstetric emergency basics.",
          },
          {
            locale: "ko",
            title: "모듈 1 퀴즈",
            description: "산과 응급 기초 이해도 테스트.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "quiz",
            passingScore: 80,
            questions: [
              {
                id: "q1",
                type: "MULTIPLE_CHOICE",
                text: "How many signal functions does Basic EmOC have?",
                options: ["5", "7", "9", "12"],
                correctAnswer: 1,
                explanation:
                  "Basic EmOC has 7 signal functions as defined by WHO.",
              },
              {
                id: "q2",
                type: "TRUE_FALSE",
                text: "Most obstetric deaths are preventable with timely intervention.",
                correctAnswer: true,
                explanation:
                  "Yes, the majority of maternal deaths can be prevented with proper EmOC.",
              },
              {
                id: "q3",
                type: "MULTIPLE_CHOICE",
                text: "Which drug is administered for post-partum hemorrhage?",
                options: [
                  "Antibiotics",
                  "Anticonvulsants",
                  "Uterotonic drugs",
                  "Analgesics",
                ],
                correctAnswer: 2,
                explanation:
                  "Uterotonic drugs (like oxytocin) are used to manage post-partum hemorrhage.",
              },
            ],
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  // Module 2: Hemorrhage Management
  const module2 = await prisma.module.create({
    data: {
      courseId: course.id,
      orderIndex: 2,
      translations: {
        create: [
          { locale: "en", title: "Post-Partum Hemorrhage Management" },
          { locale: "ko", title: "산후 출혈 관리" },
        ],
      },
    },
  });

  const lesson2_1 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      contentType: ContentType.VIDEO,
      orderIndex: 1,
      durationMin: 8,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "Recognizing Post-Partum Hemorrhage",
            description:
              "How to identify and assess severity of PPH.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "video",
            videoAssetId: "sample-mux-asset-002",
            playbackId: "sample-playback-002",
            duration: 480,
            keyPoints: [
              "PPH is defined as blood loss >500ml after vaginal delivery",
              "Assess uterine tone, trauma, tissue, and thrombin (4 T's)",
              "Call for help immediately if PPH is suspected",
            ],
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  const lesson2_2 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      contentType: ContentType.TEXT,
      orderIndex: 2,
      durationMin: 4,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "Step-by-Step: Uterine Massage",
            description: "Procedure for bimanual uterine compression.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "text",
            markdown:
              "# Bimanual Uterine Compression\n\n## When to perform\n- Uterine atony not responding to uterotonic drugs\n- Continued bleeding despite initial management\n\n## Steps\n1. Wear sterile gloves\n2. Insert one hand into the vagina and form a fist\n3. Place the other hand on the abdomen behind the uterus\n4. Compress the uterus firmly between both hands\n5. Maintain pressure for at least 5 minutes\n6. If bleeding stops, slowly release pressure\n7. Monitor closely for recurrence\n\nWarning: This is a life-saving procedure that requires proper training. Practice on simulation models before performing on patients.",
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  // Mission lesson - practical task
  const lesson2_3 = await prisma.lesson.create({
    data: {
      moduleId: module2.id,
      contentType: ContentType.MISSION,
      orderIndex: 3,
      durationMin: 15,
      isRequired: true,
      translations: {
        create: [
          {
            locale: "en",
            title: "Practice: PPH Assessment Drill",
            description:
              "Demonstrate PPH assessment and initial management on simulation model.",
          },
        ],
      },
      versions: {
        create: {
          version: 1,
          status: ContentReviewStatus.PUBLISHED,
          body: {
            type: "mission",
            instructions:
              "Record yourself performing a PPH assessment drill on a simulation model. Your video should demonstrate:\n1. Identification of PPH signs\n2. Calling for help\n3. Initial assessment using the 4 T's\n4. Administering uterotonic drugs\n5. Beginning uterine massage if needed",
            checklist: [
              "Correctly identifies PPH (>500ml blood loss)",
              "Calls for help within 30 seconds",
              "Assesses all 4 T's systematically",
              "Administers oxytocin correctly",
              "Demonstrates proper uterine massage technique",
            ],
            evidenceTypes: ["video", "image"],
            estimatedTime: 15,
          },
          publishedAt: new Date(),
        },
      },
    },
  });

  console.log(
    "Sample course created: Basic Emergency Obstetric Care (2 modules, 6 lessons)",
  );

  // ==================== Course Enrollments ====================
  for (const learner of learners.slice(0, 3)) {
    await prisma.courseEnrollment.create({
      data: {
        userId: learner.id,
        courseId: course.id,
        progressPct: Math.floor(Math.random() * 60),
      },
    });
  }

  // ==================== Program Enrollments ====================
  for (const learner of learners.slice(0, 3)) {
    await prisma.programEnrollment.create({
      data: {
        userId: learner.id,
        programId: cambodiaProgram.id,
      },
    });
  }
  for (const learner of learners.slice(3, 5)) {
    await prisma.programEnrollment.create({
      data: {
        userId: learner.id,
        programId: kenyaProgram.id,
      },
    });
  }

  // ==================== Lesson Progress ====================
  // Learner 1 has completed module 1
  await prisma.lessonProgress.create({
    data: {
      userId: learners[0].id,
      lessonId: lesson1_1.id,
      status: "COMPLETED",
      score: 100,
      timeSpentSec: 320,
    },
  });
  await prisma.lessonProgress.create({
    data: {
      userId: learners[0].id,
      lessonId: lesson1_2.id,
      status: "COMPLETED",
      score: 100,
      timeSpentSec: 180,
    },
  });
  await prisma.lessonProgress.create({
    data: {
      userId: learners[0].id,
      lessonId: lesson1_3.id,
      status: "COMPLETED",
      score: 80,
      timeSpentSec: 300,
    },
  });

  // Learner 2 is in progress
  await prisma.lessonProgress.create({
    data: {
      userId: learners[1].id,
      lessonId: lesson1_1.id,
      status: "COMPLETED",
      score: 100,
      timeSpentSec: 350,
    },
  });
  await prisma.lessonProgress.create({
    data: {
      userId: learners[1].id,
      lessonId: lesson1_2.id,
      status: "IN_PROGRESS",
      score: 0,
      timeSpentSec: 60,
    },
  });

  console.log("Progress data seeded");

  // ==================== Quiz Attempts ====================
  const now = new Date();
  const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

  await prisma.quizAttempt.create({
    data: {
      userId: learners[0].id,
      lessonId: lesson1_3.id,
      quizVersion: 1,
      score: 80,
      passed: true,
      attemptNumber: 1,
      idempotencyKey: crypto.randomUUID(),
      answers: {
        q1: { selected: 1, correct: true },
        q2: { selected: true, correct: true },
        q3: { selected: 1, correct: false },
      },
      startedAt: threeMinutesAgo,
      completedAt: now,
    },
  });

  console.log("Quiz attempts seeded");

  // ==================== Badge Definitions ====================
  const badges = await Promise.all([
    prisma.badgeDefinition.create({
      data: {
        slug: "first-steps",
        name: "First Steps",
        description: "Complete your first lesson",
        iconUrl: "/icons/badges/first-steps.svg",
        category: BadgeCategory.COMPLETION,
        criteria: { type: "lessons_completed", count: 1 },
        xpReward: 25,
      },
    }),
    prisma.badgeDefinition.create({
      data: {
        slug: "knowledge-seeker",
        name: "Knowledge Seeker",
        description: "Complete 10 lessons",
        iconUrl: "/icons/badges/knowledge-seeker.svg",
        category: BadgeCategory.COMPLETION,
        criteria: { type: "lessons_completed", count: 10 },
        xpReward: 50,
      },
    }),
    prisma.badgeDefinition.create({
      data: {
        slug: "quiz-master",
        name: "Quiz Master",
        description: "Pass 5 quizzes with 90%+ score",
        iconUrl: "/icons/badges/quiz-master.svg",
        category: BadgeCategory.MASTERY,
        criteria: { type: "quizzes_passed", count: 5, minScore: 90 },
        xpReward: 100,
      },
    }),
    prisma.badgeDefinition.create({
      data: {
        slug: "streak-7-day",
        name: "7-Day Streak",
        description: "Maintain a 7-day learning streak",
        iconUrl: "/icons/badges/streak-7.svg",
        category: BadgeCategory.STREAK,
        criteria: { type: "streak_days", count: 7 },
        xpReward: 75,
      },
    }),
    prisma.badgeDefinition.create({
      data: {
        slug: "field-ready",
        name: "Field Ready",
        description: "Complete all missions in a course",
        iconUrl: "/icons/badges/field-ready.svg",
        category: BadgeCategory.SPECIAL,
        criteria: { type: "all_missions_complete", courseId: "any" },
        xpReward: 150,
      },
    }),
    prisma.badgeDefinition.create({
      data: {
        slug: "certified-provider",
        name: "Certified Provider",
        description: "Earn your first certificate",
        iconUrl: "/icons/badges/certified.svg",
        category: BadgeCategory.COMPLETION,
        criteria: { type: "certificates_earned", count: 1 },
        xpReward: 200,
      },
    }),
  ]);

  // Award badge to learner 1
  await prisma.earnedBadge.create({
    data: { userId: learners[0].id, badgeId: badges[0].id },
  });

  console.log("Badges seeded");

  // ==================== XP Ledger ====================
  const xpActions = [
    {
      userId: learners[0].id,
      action: XpActionType.LESSON_COMPLETE,
      amount: 50,
      entityType: "Lesson",
      entityId: lesson1_1.id,
    },
    {
      userId: learners[0].id,
      action: XpActionType.LESSON_COMPLETE,
      amount: 50,
      entityType: "Lesson",
      entityId: lesson1_2.id,
    },
    {
      userId: learners[0].id,
      action: XpActionType.QUIZ_PASS,
      amount: 100,
      entityType: "Lesson",
      entityId: lesson1_3.id,
    },
    {
      userId: learners[0].id,
      action: XpActionType.BADGE_EARNED,
      amount: 75,
      entityType: "BadgeDefinition",
      entityId: badges[0].id,
    },
    {
      userId: learners[1].id,
      action: XpActionType.LESSON_COMPLETE,
      amount: 50,
      entityType: "Lesson",
      entityId: lesson1_1.id,
    },
  ];

  for (const xp of xpActions) {
    await prisma.xpLedger.create({
      data: {
        userId: xp.userId,
        action: xp.action,
        amount: xp.amount,
        entityType: xp.entityType,
        entityId: xp.entityId,
        idempotencyKey: crypto.randomUUID(),
      },
    });
  }

  console.log("XP ledger seeded");

  // ==================== Streaks ====================
  await prisma.streak.create({
    data: {
      userId: learners[0].id,
      currentStreak: 5,
      longestStreak: 5,
      lastActivityDate: new Date(),
      streakFreezes: 1,
    },
  });

  console.log("Streaks seeded");

  // ==================== Medical Glossary ====================
  const glossaryTerms = [
    {
      term: "Post-Partum Hemorrhage",
      definition: "Excessive bleeding (>500ml) after childbirth",
      abbreviation: "PPH",
      locale: "en",
    },
    {
      term: "Pre-eclampsia",
      definition:
        "Pregnancy complication with high blood pressure and organ damage",
      abbreviation: null,
      locale: "en",
    },
    {
      term: "Oxytocin",
      definition: "Hormone used to prevent/treat post-partum hemorrhage",
      abbreviation: null,
      locale: "en",
    },
    {
      term: "Uterotonic",
      definition: "Drug that stimulates uterine contractions",
      abbreviation: null,
      locale: "en",
    },
    {
      term: "Eclampsia",
      definition: "Seizures during pregnancy due to severe pre-eclampsia",
      abbreviation: null,
      locale: "en",
    },
    {
      term: "Triage",
      definition: "System for prioritizing patients based on severity",
      abbreviation: null,
      locale: "en",
    },
    {
      term: "Neonatal Resuscitation",
      definition: "Emergency procedures to help newborns breathe",
      abbreviation: "NRP",
      locale: "en",
    },
    {
      term: "Bimanual Compression",
      definition:
        "Manual compression of the uterus using both hands to control hemorrhage",
      abbreviation: null,
      locale: "en",
    },
  ];

  for (const term of glossaryTerms) {
    await prisma.medicalGlossary.create({
      data: {
        term: term.term,
        definition: term.definition,
        abbreviation: term.abbreviation,
        locale: term.locale,
        isVerified: true,
      },
    });
  }

  console.log("Medical glossary seeded");

  // ==================== Notification Templates ====================
  await Promise.all([
    prisma.notificationTemplate.create({
      data: {
        slug: "lesson-complete",
        channel: NotificationChannel.IN_APP,
        subject: "Lesson Complete!",
        body: 'Great job completing "{{lessonTitle}}"! Keep going!',
        variables: { lessonTitle: "string" },
      },
    }),
    prisma.notificationTemplate.create({
      data: {
        slug: "badge-earned",
        channel: NotificationChannel.PUSH,
        subject: "Badge Earned!",
        body: 'You\'ve earned the "{{badgeName}}" badge!',
        variables: { badgeName: "string" },
      },
    }),
    prisma.notificationTemplate.create({
      data: {
        slug: "streak-warning",
        channel: NotificationChannel.PUSH,
        subject: "Don't lose your streak!",
        body: "You haven't studied today. Complete a lesson to keep your {{streakDays}}-day streak!",
        variables: { streakDays: "number" },
      },
    }),
    prisma.notificationTemplate.create({
      data: {
        slug: "task-assigned",
        channel: NotificationChannel.PUSH,
        subject: "New Task Assigned",
        body: 'You have a new task: "{{taskTitle}}". Tap to view details.',
        variables: { taskTitle: "string" },
      },
    }),
    prisma.notificationTemplate.create({
      data: {
        slug: "task-submitted",
        channel: NotificationChannel.IN_APP,
        subject: "Task Submitted for Review",
        body: '{{learnerName}} submitted evidence for "{{taskTitle}}".',
        variables: { learnerName: "string", taskTitle: "string" },
      },
    }),
    prisma.notificationTemplate.create({
      data: {
        slug: "certificate-issued",
        channel: NotificationChannel.EMAIL,
        subject: "Certificate Issued!",
        body: 'Congratulations! Your certificate for "{{courseName}}" is ready. Download it from your profile.',
        variables: { courseName: "string" },
      },
    }),
  ]);

  console.log("Notification templates seeded");

  // ==================== Certificate Template ====================
  await prisma.certificateTemplate.create({
    data: {
      name: "Standard Course Completion",
      htmlTemplate: `
        <div style="width:800px;height:600px;border:3px solid #2563eb;padding:40px;text-align:center;font-family:serif;">
          <img src="/logo.svg" alt="MEDICHIPS-LINK" style="height:60px;margin-bottom:20px;" />
          <h1 style="color:#2563eb;margin:0;">Certificate of Completion</h1>
          <p style="font-size:14px;color:#666;margin:10px 0;">This is to certify that</p>
          <h2 style="color:#1e293b;font-size:28px;margin:10px 0;">{{recipientName}}</h2>
          <p style="font-size:14px;color:#666;">has successfully completed the course</p>
          <h3 style="color:#1e293b;font-size:22px;margin:10px 0;">{{courseName}}</h3>
          <p style="font-size:12px;color:#666;">Score: {{score}}% | Issued: {{issueDate}}</p>
          <p style="font-size:10px;color:#999;margin-top:30px;">Certificate #{{certificateNumber}} | Verify at link.medichips.ai/verify/{{certificateNumber}}</p>
        </div>
      `,
      isActive: true,
    },
  });

  console.log("Certificate templates seeded");

  // ==================== Impact Metrics ====================
  // ImpactMetric requires organizationId, period, metricType, and value (scalar).
  // Create individual metric rows instead of a single JSON blob.
  const impactMetrics = [
    { metricType: "totalEnrolled", value: 150 },
    { metricType: "activeRate", value: 0.78 },
    { metricType: "completionRate", value: 0.45 },
    { metricType: "avgScore", value: 82 },
    { metricType: "costPerWorker", value: 450 },
    { metricType: "competencyRate", value: 0.38 },
  ];

  for (const metric of impactMetrics) {
    await prisma.impactMetric.create({
      data: {
        organizationId: koica.id,
        period: "2026-Q1",
        metricType: metric.metricType,
        value: metric.value,
      },
    });
  }

  console.log("Impact metrics seeded");

  // ==================== Cost Records ====================
  await prisma.costRecord.create({
    data: {
      organizationId: koica.id,
      programId: cambodiaProgram.id,
      category: "training-materials",
      amount: 15000,
      currency: "USD",
      period: "2026-Q1",
      notes: "Initial course development and translation costs",
    },
  });

  console.log("Cost records seeded");

  console.log("\nSeed complete! Database populated with sample data.");
  console.log("   - 3 organizations (KOICA hierarchy)");
  console.log("   - 2 programs (Cambodia, Kenya)");
  console.log("   - 9 users (admin, instructor, supervisor, 5 learners)");
  console.log("   - 1 course (Basic Emergency Obstetric Care)");
  console.log("   - 2 modules, 6 lessons (video, text, quiz, mission)");
  console.log("   - 5 medical specialties, 8 glossary terms");
  console.log("   - 6 badge definitions, XP ledger, streaks");
  console.log("   - 6 notification templates, 1 certificate template");
  console.log("   - 6 impact metrics, 1 cost record");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
