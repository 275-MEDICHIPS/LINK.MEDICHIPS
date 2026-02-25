/**
 * Seed: 오형태 내과의원 샘플 코스 2개
 * Idempotent: 이미 존재하면 건너뜀
 *
 * Usage: npx tsx prisma/seed-sample-courses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCourse(
  orgId: string,
  creatorId: string,
  courseData: {
    slug: string;
    riskLevel: string;
    thumbnailUrl: string;
    estimatedHours: number;
    translations: { locale: string; title: string; description: string }[];
    modules: {
      title_ko: string;
      title_en: string;
      lessons: {
        title_ko: string;
        title_en: string;
        videoUrl: string;
        durationMin: number;
      }[];
    }[];
  }
) {
  // 이미 존재하면 건너뜀
  const existing = await prisma.course.findFirst({
    where: { slug: courseData.slug },
  });
  if (existing) {
    console.log(`⏭️  코스 이미 존재: ${courseData.slug} (${existing.id})`);
    return existing;
  }

  const course = await prisma.course.create({
    data: {
      organizationId: orgId,
      creatorId: creatorId,
      slug: courseData.slug,
      riskLevel: courseData.riskLevel,
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: courseData.thumbnailUrl,
      estimatedHours: courseData.estimatedHours,
      translations: {
        create: courseData.translations,
      },
    },
  });

  for (let mi = 0; mi < courseData.modules.length; mi++) {
    const mod = courseData.modules[mi];
    const module = await prisma.module.create({
      data: {
        courseId: course.id,
        orderIndex: mi,
        translations: {
          create: [
            { locale: "ko", title: mod.title_ko },
            { locale: "en", title: mod.title_en },
          ],
        },
      },
    });

    for (let li = 0; li < mod.lessons.length; li++) {
      const l = mod.lessons[li];
      const lesson = await prisma.lesson.create({
        data: {
          moduleId: module.id,
          orderIndex: li,
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
  }

  console.log(`✅ 코스 생성: ${courseData.slug} (${course.id})`);
  return course;
}

async function main() {
  console.log("🌱 샘플 코스 시딩 시작...");

  // 1. 조직 찾기/생성
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

  // 2. 크리에이터 유저 (오형태)
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

  console.log(`✅ 크리에이터: ${creator.name} (${creator.id})`);

  // ─── 코스 1: 내시경 기초 마스터 ──────────────────────────────
  await seedCourse(org.id, creator.id, {
    slug: "endoscopy-basics-master",
    riskLevel: "L1",
    thumbnailUrl:
      "https://img.youtube.com/vi/4FxEljJTMWI/maxresdefault.jpg",
    estimatedHours: 1.5,
    translations: [
      {
        locale: "ko",
        title: "내시경 기초 마스터",
        description:
          "대장내시경과 위내시경의 기초를 체계적으로 학습합니다.",
      },
      {
        locale: "en",
        title: "Endoscopy Basics Master",
        description:
          "Systematically learn the basics of colonoscopy and gastroscopy.",
      },
    ],
    modules: [
      {
        title_ko: "대장내시경 기초",
        title_en: "Colonoscopy Basics",
        lessons: [
          {
            title_ko: "정상대장내시경 1",
            title_en: "Normal Colonoscopy 1",
            videoUrl: "https://www.youtube.com/watch?v=4FxEljJTMWI",
            durationMin: 5,
          },
          {
            title_ko: "정상대장내시경 2",
            title_en: "Normal Colonoscopy 2",
            videoUrl: "https://www.youtube.com/watch?v=rJ5qm_JdEjw",
            durationMin: 7,
          },
          {
            title_ko: "거품 대장내시경",
            title_en: "Bubble Colonoscopy",
            videoUrl: "https://www.youtube.com/watch?v=ILhqp7cZQkE",
            durationMin: 4,
          },
        ],
      },
      {
        title_ko: "대장 시술",
        title_en: "Colon Procedures",
        lessons: [
          {
            title_ko: "대장용종절제술",
            title_en: "Colon Polypectomy",
            videoUrl: "https://www.youtube.com/watch?v=mXKexlhJ4xM",
            durationMin: 8,
          },
        ],
      },
      {
        title_ko: "위내시경",
        title_en: "Gastroscopy",
        lessons: [
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
        ],
      },
    ],
  });

  // ─── 코스 2: 초음파 진단 입문 ──────────────────────────────
  await seedCourse(org.id, creator.id, {
    slug: "ultrasound-diagnosis-intro",
    riskLevel: "L1",
    thumbnailUrl:
      "https://img.youtube.com/vi/S5TikIaqGqU/maxresdefault.jpg",
    estimatedHours: 2.0,
    translations: [
      {
        locale: "ko",
        title: "초음파 진단 입문",
        description:
          "갑상선·복부 초음파와 통증시술의 기초를 배웁니다.",
      },
      {
        locale: "en",
        title: "Ultrasound Diagnosis Introduction",
        description:
          "Learn the basics of thyroid, abdominal ultrasound and pain procedures.",
      },
    ],
    modules: [
      {
        title_ko: "갑상선 초음파",
        title_en: "Thyroid Ultrasound",
        lessons: [
          {
            title_ko: "정상갑상선초음파",
            title_en: "Normal Thyroid Ultrasound",
            videoUrl: "https://www.youtube.com/watch?v=S5TikIaqGqU",
            durationMin: 10,
          },
        ],
      },
      {
        title_ko: "복부 초음파",
        title_en: "Abdominal Ultrasound",
        lessons: [
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
        ],
      },
      {
        title_ko: "통증시술",
        title_en: "Pain Procedures",
        lessons: [
          {
            title_ko: "Suprascapular Nerve Block",
            title_en: "Suprascapular Nerve Block",
            videoUrl: "https://www.youtube.com/watch?v=JJxNq0Fjhb4",
            durationMin: 15,
          },
        ],
      },
    ],
  });

  console.log("🎉 시드 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
