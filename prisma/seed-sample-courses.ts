/**
 * Seed: 오형태 내과의원 샘플 코스 2개
 * Idempotent: 이미 존재하면 비디오 URL과 썸네일만 업데이트
 *
 * Usage: npx tsx prisma/seed-sample-courses.ts
 */
import { PrismaClient, RiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

interface LessonDef {
  title_ko: string;
  title_en: string;
  videoUrl: string;
  durationMin: number;
}

interface ModuleDef {
  title_ko: string;
  title_en: string;
  lessons: LessonDef[];
}

interface CourseDef {
  slug: string;
  riskLevel: RiskLevel;
  thumbnailUrl: string;
  estimatedHours: number;
  translations: { locale: string; title: string; description: string }[];
  modules: ModuleDef[];
}

async function seedCourse(orgId: string, creatorId: string, courseData: CourseDef) {
  const existing = await prisma.course.findFirst({
    where: { slug: courseData.slug },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { versions: { where: { status: "PUBLISHED" }, take: 1 } },
          },
        },
      },
    },
  });

  if (existing) {
    console.log(`🔄 기존 코스 업데이트: ${courseData.slug}`);

    // 코스 썸네일 업데이트
    await prisma.course.update({
      where: { id: existing.id },
      data: { thumbnailUrl: courseData.thumbnailUrl },
    });

    // 기존 모듈/레슨의 비디오 URL 업데이트
    for (let mi = 0; mi < existing.modules.length && mi < courseData.modules.length; mi++) {
      const existingMod = existing.modules[mi];
      const newMod = courseData.modules[mi];

      for (let li = 0; li < existingMod.lessons.length && li < newMod.lessons.length; li++) {
        const existingLesson = existingMod.lessons[li];
        const newLesson = newMod.lessons[li];

        // ContentVersion body 업데이트 또는 생성
        if (existingLesson.versions[0]) {
          await prisma.contentVersion.update({
            where: { id: existingLesson.versions[0].id },
            data: { body: { videoUrl: newLesson.videoUrl } },
          });
        } else {
          await prisma.contentVersion.create({
            data: {
              lessonId: existingLesson.id,
              version: 1,
              status: "PUBLISHED",
              publishedAt: new Date(),
              body: { videoUrl: newLesson.videoUrl },
            },
          });
        }
        console.log(`  📹 ${newLesson.title_ko}: ${newLesson.videoUrl}`);
      }
    }

    console.log(`✅ 코스 업데이트 완료: ${courseData.slug}`);
    return existing;
  }

  // 새 코스 생성
  const course = await prisma.course.create({
    data: {
      organizationId: orgId,
      creatorId,
      slug: courseData.slug,
      riskLevel: courseData.riskLevel,
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: courseData.thumbnailUrl,
      estimatedHours: courseData.estimatedHours,
      translations: { create: courseData.translations },
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

  // 1. 조직
  let org = await prisma.organization.findFirst({ where: { slug: "medichips-default" } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "MEDICHIPS", slug: "medichips-default", description: "Default organization" },
    });
  }

  // 2. 크리에이터
  let creator = await prisma.user.findFirst({ where: { email: "ohht@medichips.ai" } });
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
    thumbnailUrl: "https://img.youtube.com/vi/LdbZAiwERPQ/hqdefault.jpg",
    estimatedHours: 1.5,
    translations: [
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
    modules: [
      {
        title_ko: "대장내시경 기초",
        title_en: "Colonoscopy Basics",
        lessons: [
          {
            title_ko: "대장내시경의 이해",
            title_en: "Understanding Colonoscopy",
            videoUrl: "https://www.youtube.com/watch?v=LdbZAiwERPQ",
            durationMin: 5,
          },
          {
            title_ko: "대장내시경 시술 과정",
            title_en: "Colonoscopy Procedure",
            videoUrl: "https://www.youtube.com/watch?v=mh90RPA-C10",
            durationMin: 7,
          },
          {
            title_ko: "대장내시경 수행 방법",
            title_en: "How Colonoscopy is Performed",
            videoUrl: "https://www.youtube.com/watch?v=JdbLEYSRLMA",
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
            videoUrl: "https://www.youtube.com/watch?v=ewCIqAAJGPg",
            durationMin: 8,
          },
        ],
      },
      {
        title_ko: "위내시경",
        title_en: "Gastroscopy",
        lessons: [
          {
            title_ko: "위산 분비와 위염",
            title_en: "Gastric Acid Physiology",
            videoUrl: "https://www.youtube.com/watch?v=Rcb6I7gsl-Y",
            durationMin: 6,
          },
          {
            title_ko: "헬리코박터 파일로리와 궤양",
            title_en: "H. Pylori and Ulcers",
            videoUrl: "https://www.youtube.com/watch?v=y-shOXdsJeA",
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
    thumbnailUrl: "https://img.youtube.com/vi/0nzZT46Dmw0/hqdefault.jpg",
    estimatedHours: 2.0,
    translations: [
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
    modules: [
      {
        title_ko: "갑상선 초음파",
        title_en: "Thyroid Ultrasound",
        lessons: [
          {
            title_ko: "갑상선 초음파 해부학",
            title_en: "Thyroid Ultrasound Anatomy",
            videoUrl: "https://www.youtube.com/watch?v=0nzZT46Dmw0",
            durationMin: 10,
          },
        ],
      },
      {
        title_ko: "복부 초음파",
        title_en: "Abdominal Ultrasound",
        lessons: [
          {
            title_ko: "정상 복부 초음파",
            title_en: "Normal Abdominal Ultrasound",
            videoUrl: "https://www.youtube.com/watch?v=3pIL7c-8UH8",
            durationMin: 12,
          },
          {
            title_ko: "간 초음파 해부학",
            title_en: "Liver Ultrasound Anatomy",
            videoUrl: "https://www.youtube.com/watch?v=x6hXhLNc-jU",
            durationMin: 8,
          },
        ],
      },
      {
        title_ko: "통증시술",
        title_en: "Pain Procedures",
        lessons: [
          {
            title_ko: "초음파 유도 신경차단술",
            title_en: "Ultrasound-Guided Nerve Block",
            videoUrl: "https://www.youtube.com/watch?v=tMy978ZwaDU",
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
