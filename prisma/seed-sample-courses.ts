/**
 * Seed: 오형태 내과의원 샘플 코스 2개
 *
 * Usage: npx tsx prisma/seed-sample-courses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding sample courses...");

  // 1. Find or create organization
  let org = await prisma.organization.findFirst({
    where: { slug: "medichips-default" },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "MEDICHIPS",
        slug: "medichips-default",
        description: "Default organization",
      },
    });
  }

  // 2. Create creator user (오형태)
  let creator = await prisma.user.findFirst({
    where: { email: "ohht@medichips.ai" },
  });
  if (!creator) {
    creator = await prisma.user.create({
      data: {
        email: "ohht@medichips.ai",
        name: "오형태",
        avatarUrl: null,
        creatorTitle: "내과 전문의",
        creatorBio: "오형태내과의원 원장. 내시경·초음파 전문.",
        creatorField: "내과",
        preferredLocale: "ko",
      },
    });
  } else {
    creator = await prisma.user.update({
      where: { id: creator.id },
      data: {
        creatorTitle: "내과 전문의",
        creatorBio: "오형태내과의원 원장. 내시경·초음파 전문.",
        creatorField: "내과",
      },
    });
  }

  console.log(`✅ Creator: ${creator.name} (${creator.id})`);

  // ─── Course 1: 내시경 기초 마스터 ──────────────────────────────

  const course1 = await prisma.course.create({
    data: {
      organizationId: org.id,
      creatorId: creator.id,
      slug: "endoscopy-basics-master",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://img.youtube.com/vi/4FxEljJTMWI/maxresdefault.jpg",
      estimatedHours: 1.5,
      translations: {
        create: [
          {
            locale: "ko",
            title: "내시경 기초 마스터",
            description: "대장내시경과 위내시경의 기초를 체계적으로 학습합니다.",
          },
          {
            locale: "en",
            title: "Endoscopy Basics Master",
            description: "Systematically learn the basics of colonoscopy and gastroscopy.",
          },
        ],
      },
    },
  });

  // Module 1: 대장내시경 기초
  const mod1_1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      orderIndex: 0,
      translations: {
        create: [
          { locale: "ko", title: "대장내시경 기초" },
          { locale: "en", title: "Colonoscopy Basics" },
        ],
      },
    },
  });

  const lessons1_1 = [
    {
      title_ko: "정상대장내시경 1",
      title_en: "Normal Colonoscopy 1",
      videoUrl: "https://www.youtube.com/watch?v=4FxEljJTMWI",
      durationMin: 5,
      thumbnailUrl: "https://img.youtube.com/vi/4FxEljJTMWI/maxresdefault.jpg",
    },
    {
      title_ko: "정상대장내시경 2",
      title_en: "Normal Colonoscopy 2",
      videoUrl: "https://www.youtube.com/watch?v=rJ5qm_JdEjw",
      durationMin: 7,
      thumbnailUrl: "https://img.youtube.com/vi/rJ5qm_JdEjw/maxresdefault.jpg",
    },
    {
      title_ko: "거품 대장내시경",
      title_en: "Bubble Colonoscopy",
      videoUrl: "https://www.youtube.com/watch?v=ILhqp7cZQkE",
      durationMin: 4,
      thumbnailUrl: "https://img.youtube.com/vi/ILhqp7cZQkE/maxresdefault.jpg",
    },
  ];

  for (let i = 0; i < lessons1_1.length; i++) {
    const l = lessons1_1[i];
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: mod1_1.id,
        orderIndex: i,
        contentType: "VIDEO",
        durationMin: l.durationMin,
        translations: {
          create: [
            { locale: "ko", title: l.title_ko },
            { locale: "en", title: l.title_en },
          ],
        },
      },
    });
    await prisma.contentVersion.create({
      data: {
        lessonId: lesson.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        body: { videoUrl: l.videoUrl },
      },
    });
  }

  // Module 2: 대장 시술
  const mod1_2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      orderIndex: 1,
      translations: {
        create: [
          { locale: "ko", title: "대장 시술" },
          { locale: "en", title: "Colon Procedures" },
        ],
      },
    },
  });

  const lesson_polypectomy = await prisma.lesson.create({
    data: {
      moduleId: mod1_2.id,
      orderIndex: 0,
      contentType: "VIDEO",
      durationMin: 8,
      translations: {
        create: [
          { locale: "ko", title: "대장용종절제술" },
          { locale: "en", title: "Colon Polypectomy" },
        ],
      },
    },
  });
  await prisma.contentVersion.create({
    data: {
      lessonId: lesson_polypectomy.id,
      version: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      body: { videoUrl: "https://www.youtube.com/watch?v=mXKexlhJ4xM" },
    },
  });

  // Module 3: 위내시경
  const mod1_3 = await prisma.module.create({
    data: {
      courseId: course1.id,
      orderIndex: 2,
      translations: {
        create: [
          { locale: "ko", title: "위내시경" },
          { locale: "en", title: "Gastroscopy" },
        ],
      },
    },
  });

  const gastroscopyLessons = [
    {
      title_ko: "위염 내시경 1",
      title_en: "Gastritis Endoscopy 1",
      videoUrl: "https://www.youtube.com/watch?v=9lDcfLv7BvQ",
      durationMin: 6,
    },
    {
      title_ko: "위염 내시경 2",
      title_en: "Gastritis Endoscopy 2",
      videoUrl: "https://www.youtube.com/watch?v=HxzpEfVxAVQ",
      durationMin: 5,
    },
  ];

  for (let i = 0; i < gastroscopyLessons.length; i++) {
    const l = gastroscopyLessons[i];
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: mod1_3.id,
        orderIndex: i,
        contentType: "VIDEO",
        durationMin: l.durationMin,
        translations: {
          create: [
            { locale: "ko", title: l.title_ko },
            { locale: "en", title: l.title_en },
          ],
        },
      },
    });
    await prisma.contentVersion.create({
      data: {
        lessonId: lesson.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        body: { videoUrl: l.videoUrl },
      },
    });
  }

  console.log(`✅ Course 1: ${course1.slug} (${course1.id})`);

  // ─── Course 2: 초음파 진단 입문 ──────────────────────────────

  const course2 = await prisma.course.create({
    data: {
      organizationId: org.id,
      creatorId: creator.id,
      slug: "ultrasound-diagnosis-intro",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://img.youtube.com/vi/S5TikIaqGqU/maxresdefault.jpg",
      estimatedHours: 2.0,
      translations: {
        create: [
          {
            locale: "ko",
            title: "초음파 진단 입문",
            description: "갑상선·복부 초음파와 통증시술의 기초를 배웁니다.",
          },
          {
            locale: "en",
            title: "Ultrasound Diagnosis Introduction",
            description: "Learn the basics of thyroid, abdominal ultrasound and pain procedures.",
          },
        ],
      },
    },
  });

  // Module 1: 갑상선
  const mod2_1 = await prisma.module.create({
    data: {
      courseId: course2.id,
      orderIndex: 0,
      translations: {
        create: [
          { locale: "ko", title: "갑상선 초음파" },
          { locale: "en", title: "Thyroid Ultrasound" },
        ],
      },
    },
  });

  const thyroidLesson = await prisma.lesson.create({
    data: {
      moduleId: mod2_1.id,
      orderIndex: 0,
      contentType: "VIDEO",
      durationMin: 10,
      translations: {
        create: [
          { locale: "ko", title: "정상갑상선초음파" },
          { locale: "en", title: "Normal Thyroid Ultrasound" },
        ],
      },
    },
  });
  await prisma.contentVersion.create({
    data: {
      lessonId: thyroidLesson.id,
      version: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      body: { videoUrl: "https://www.youtube.com/watch?v=S5TikIaqGqU" },
    },
  });

  // Module 2: 복부 초음파
  const mod2_2 = await prisma.module.create({
    data: {
      courseId: course2.id,
      orderIndex: 1,
      translations: {
        create: [
          { locale: "ko", title: "복부 초음파" },
          { locale: "en", title: "Abdominal Ultrasound" },
        ],
      },
    },
  });

  const abdominalLessons = [
    {
      title_ko: "정상복부초음파",
      title_en: "Normal Abdominal Ultrasound",
      videoUrl: "https://www.youtube.com/watch?v=Yd02FJzwQ50",
      durationMin: 12,
    },
    {
      title_ko: "담낭용종 오진 사례",
      title_en: "Gallbladder Polyp Misdiagnosis Case",
      videoUrl: "https://www.youtube.com/watch?v=K2q1JQSv-jk",
      durationMin: 8,
    },
  ];

  for (let i = 0; i < abdominalLessons.length; i++) {
    const l = abdominalLessons[i];
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: mod2_2.id,
        orderIndex: i,
        contentType: "VIDEO",
        durationMin: l.durationMin,
        translations: {
          create: [
            { locale: "ko", title: l.title_ko },
            { locale: "en", title: l.title_en },
          ],
        },
      },
    });
    await prisma.contentVersion.create({
      data: {
        lessonId: lesson.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        body: { videoUrl: l.videoUrl },
      },
    });
  }

  // Module 3: 통증시술
  const mod2_3 = await prisma.module.create({
    data: {
      courseId: course2.id,
      orderIndex: 2,
      translations: {
        create: [
          { locale: "ko", title: "통증시술" },
          { locale: "en", title: "Pain Procedures" },
        ],
      },
    },
  });

  const nerveBlockLesson = await prisma.lesson.create({
    data: {
      moduleId: mod2_3.id,
      orderIndex: 0,
      contentType: "VIDEO",
      durationMin: 15,
      translations: {
        create: [
          { locale: "ko", title: "Suprascapular Nerve Block" },
          { locale: "en", title: "Suprascapular Nerve Block" },
        ],
      },
    },
  });
  await prisma.contentVersion.create({
    data: {
      lessonId: nerveBlockLesson.id,
      version: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      body: { videoUrl: "https://www.youtube.com/watch?v=JJxNq0Fjhb4" },
    },
  });

  console.log(`✅ Course 2: ${course2.slug} (${course2.id})`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
