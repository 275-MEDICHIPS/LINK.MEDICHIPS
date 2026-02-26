/**
 * 오형태내과의원 YouTube 채널 전체 의료 영상 → 7개 풀코스
 * 채널: UC74FDMxha8Y00LCaOOCf_8w
 *
 * Usage: DATABASE_URL="..." npx tsx prisma/seed-full-courses.ts
 */
import { PrismaClient, RiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

interface LessonDef {
  title_ko: string;
  title_en: string;
  videoUrl: string;
  durationMin: number;
  startTimeSec?: number;
  endTimeSec?: number;
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

function yt(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
function thumb(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

async function seedCourse(orgId: string, creatorId: string, courseData: CourseDef) {
  const existing = await prisma.course.findFirst({
    where: { slug: courseData.slug },
  });

  if (existing) {
    console.log(`⏭️  이미 존재: ${courseData.slug} — 건너뜀`);
    return existing;
  }

  const totalLessons = courseData.modules.reduce((s, m) => s + m.lessons.length, 0);
  console.log(`🆕 코스 생성: ${courseData.slug} (${totalLessons}개 레슨)`);

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
      // Compute segment: use explicit values or default to 0..durationMin*60
      const startSec = l.startTimeSec ?? 0;
      const endSec = l.endTimeSec ?? l.durationMin * 60;
      await prisma.contentVersion.create({
        data: {
          lessonId: lesson.id,
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date(),
          body: {
            videoUrl: l.videoUrl,
            startTimeSec: startSec,
            endTimeSec: endSec,
          },
        },
      });
    }
    console.log(`  📦 ${mod.title_ko}: ${mod.lessons.length}개 레슨`);
  }

  console.log(`✅ 완료: ${courseData.slug}`);
  return course;
}

// ═══════════════════════════════════════════════════════════════
// 코스 데이터 정의
// ═══════════════════════════════════════════════════════════════

const COURSES: CourseDef[] = [
  // ─── 코스 1: 대장내시경 완전정복 ───────────────────────────
  {
    slug: "colonoscopy-master",
    riskLevel: "L1",
    thumbnailUrl: thumb("kr-4DUZwuI8"),
    estimatedHours: 5,
    translations: [
      { locale: "ko", title: "대장내시경 완전정복", description: "정상 소견부터 용종절제술까지, 대장내시경의 모든 것을 배웁니다." },
      { locale: "en", title: "Complete Colonoscopy", description: "From normal findings to polypectomy, learn everything about colonoscopy." },
    ],
    modules: [
      {
        title_ko: "정상 대장내시경",
        title_en: "Normal Colonoscopy",
        lessons: [
          { title_ko: "정상대장내시경 1", title_en: "Normal Colonoscopy 1", videoUrl: yt("kr-4DUZwuI8"), durationMin: 5 },
          { title_ko: "정상대장내시경 2", title_en: "Normal Colonoscopy 2", videoUrl: yt("-wUGfK0Gekc"), durationMin: 7 },
          { title_ko: "정상대장내시경 3", title_en: "Normal Colonoscopy 3", videoUrl: yt("nZAH8-SvjQ4"), durationMin: 5 },
          { title_ko: "정상 대장내시경소견 1", title_en: "Normal Colonoscopic Finding 1", videoUrl: yt("H-idXHz12C4"), durationMin: 6 },
          { title_ko: "정상 대장내시경소견 2", title_en: "Normal Colonoscopic Finding 2", videoUrl: yt("OpbXX_rQ2to"), durationMin: 5 },
          { title_ko: "정상 대장내시경소견 3", title_en: "Normal Colonoscopic Finding 3", videoUrl: yt("5nG95zmKSiI"), durationMin: 6 },
          { title_ko: "정상 대장내시경소견 4", title_en: "Normal Colonoscopic Finding 4", videoUrl: yt("iKXwX5JQmD0"), durationMin: 5 },
          { title_ko: "정상대장내시경 A", title_en: "Normal Colonoscopy A", videoUrl: yt("5pvvenKk5Qk"), durationMin: 6 },
          { title_ko: "정상대장내시경 B", title_en: "Normal Colonoscopy B", videoUrl: yt("DVNx2lHDAco"), durationMin: 5 },
          { title_ko: "정상대장내시경 C", title_en: "Normal Colonoscopy C", videoUrl: yt("0tzgRQTih6k"), durationMin: 6 },
          { title_ko: "정상 대장내시경 소견", title_en: "Normal Colonoscopy Findings", videoUrl: yt("wlgCnOBKFdc"), durationMin: 5 },
          { title_ko: "검진대장내시경", title_en: "Screening Colonoscopy", videoUrl: yt("ow7ayXh41Uo"), durationMin: 7 },
          { title_ko: "루틴 대장내시경", title_en: "Routine Colonoscopy", videoUrl: yt("5vgCaxWzxaA"), durationMin: 6 },
          { title_ko: "루틴 대장내시경 2", title_en: "Routine Colonoscopy 2", videoUrl: yt("sLCFIcz3EsM"), durationMin: 5 },
        ],
      },
      {
        title_ko: "어려운 대장내시경",
        title_en: "Difficult Colonoscopy",
        lessons: [
          { title_ko: "까다로운 대장내시경 1", title_en: "Tricky Colonoscopy 1", videoUrl: yt("IJJ7tw9PzJo"), durationMin: 8 },
          { title_ko: "까다로운 대장내시경 2", title_en: "Tricky Colonoscopy 2", videoUrl: yt("zcS-cQwcpXg"), durationMin: 7 },
          { title_ko: "어려운 대장내시경", title_en: "Difficult Colonoscopy", videoUrl: yt("g3ZTGuZFsSk"), durationMin: 9 },
          { title_ko: "만만하지 않은 대장내시경", title_en: "Challenging Colonoscopy", videoUrl: yt("nZompPy7O1s"), durationMin: 8 },
          { title_ko: "역시 대장내시경은 어려워요", title_en: "Colonoscopy Is Hard", videoUrl: yt("RNFO9Kw7muw"), durationMin: 7 },
          { title_ko: "거품이 많은 대장내시경", title_en: "Foamy Colonoscopy", videoUrl: yt("xlWsy7jvD1o"), durationMin: 6 },
          { title_ko: "거품 대장내시경 소견", title_en: "Foamy Colonoscopy Findings", videoUrl: yt("_glrZ58KlWo"), durationMin: 5 },
          { title_ko: "장정결 불량 대장내시경 1", title_en: "Poor Bowel Prep 1", videoUrl: yt("JEwNU9LgI0s"), durationMin: 6 },
          { title_ko: "장정결 불량 대장내시경 2", title_en: "Poor Bowel Prep 2", videoUrl: yt("VIrjSyn2ZZU"), durationMin: 7 },
          { title_ko: "대장내시경 회수시간", title_en: "Withdrawal Time", videoUrl: yt("2tyzEf6Iykc"), durationMin: 5 },
        ],
      },
      {
        title_ko: "대장용종절제술",
        title_en: "Colon Polypectomy",
        lessons: [
          { title_ko: "대장용종절제술 (24.11)", title_en: "Polypectomy Nov 2024", videoUrl: yt("jZObjc2TsGg"), durationMin: 8 },
          { title_ko: "Cold Snare 용종절제술 1", title_en: "Cold Snare Polypectomy 1", videoUrl: yt("jUDj9XImiaM"), durationMin: 7 },
          { title_ko: "Cold Snare 용종절제술 2", title_en: "Cold Snare Polypectomy 2", videoUrl: yt("cSr5l3AVY8Q"), durationMin: 6 },
          { title_ko: "Cold Snare 용종절제술 3", title_en: "Cold Snare Polypectomy 3", videoUrl: yt("qA8N0SlOX04"), durationMin: 7 },
          { title_ko: "Cold Snare 용종절제술 4", title_en: "Cold Snare Polypectomy 4", videoUrl: yt("xkm4U_FNly8"), durationMin: 6 },
          { title_ko: "Snare 용종절제술", title_en: "Snare Polypectomy", videoUrl: yt("0GJ44sbnFug"), durationMin: 8 },
          { title_ko: "대장용종 분할절제술", title_en: "Piecemeal Resection", videoUrl: yt("MxJhSiTBh2Y"), durationMin: 10 },
          { title_ko: "분할점막절제술", title_en: "Piecemeal Mucosal Resection", videoUrl: yt("I8VcB4729rY"), durationMin: 9 },
          { title_ko: "횡행결장 용종절제술", title_en: "Transverse Colon Polypectomy", videoUrl: yt("43zcpem3slw"), durationMin: 7 },
          { title_ko: "다발성 용종절제술", title_en: "Multiple Polypectomy", videoUrl: yt("eQMxaToNF38"), durationMin: 8 },
          { title_ko: "까다로운 용종절제술", title_en: "Difficult Polypectomy", videoUrl: yt("ClJdqJgNx4E"), durationMin: 9 },
          { title_ko: "맹장·횡행결장 용종절제", title_en: "Cecum & Transverse Polypectomy", videoUrl: yt("lLtCl9zaHEQ"), durationMin: 7 },
        ],
      },
      {
        title_ko: "대장 질환",
        title_en: "Colon Diseases",
        lessons: [
          { title_ko: "대장게실증", title_en: "Colonic Diverticulosis", videoUrl: yt("1sp5_fC1JII"), durationMin: 5 },
          { title_ko: "구불결장 게실증", title_en: "Sigmoid Diverticulosis", videoUrl: yt("GOlOWUchK-0"), durationMin: 5 },
          { title_ko: "허혈성장염", title_en: "Ischemic Colitis", videoUrl: yt("S5QzcdbLPZ0"), durationMin: 6 },
          { title_ko: "대장내시경 OT", title_en: "Colonoscopy Orientation", videoUrl: yt("Tp1wT7fODek"), durationMin: 10 },
        ],
      },
    ],
  },

  // ─── 코스 2: 위내시경 완전정복 ──────────────────────────────
  {
    slug: "gastroscopy-master",
    riskLevel: "L1",
    thumbnailUrl: thumb("4QInXzXSoWI"),
    estimatedHours: 6,
    translations: [
      { locale: "ko", title: "위내시경 완전정복", description: "정상 위내시경부터 위염, 위용종, 위암까지 체계적으로 학습합니다." },
      { locale: "en", title: "Complete Gastroscopy", description: "From normal gastroscopy to gastritis, polyps, and cancer." },
    ],
    modules: [
      {
        title_ko: "정상 위내시경",
        title_en: "Normal Gastroscopy",
        lessons: [
          { title_ko: "위내시경의 정석", title_en: "Standard Gastroscopy", videoUrl: yt("4QInXzXSoWI"), durationMin: 8 },
          { title_ko: "위내시경 기본", title_en: "Basic Gastroscopy", videoUrl: yt("jvO7B8-JVoM"), durationMin: 7 },
          { title_ko: "정상 위내시경", title_en: "Normal Gastroscopy", videoUrl: yt("l_XPoptxXxc"), durationMin: 6 },
          { title_ko: "NBI 위내시경", title_en: "NBI Gastroscopy", videoUrl: yt("67FdVf8ygJk"), durationMin: 7 },
          { title_ko: "검진위내시경", title_en: "Screening Gastroscopy", videoUrl: yt("n-A7R56X9IM"), durationMin: 5 },
          { title_ko: "검진위내시경 순서", title_en: "Gastroscopy Sequence", videoUrl: yt("V1gqGC1IWZc"), durationMin: 6 },
          { title_ko: "20대 위내시경", title_en: "Gastroscopy in 20s", videoUrl: yt("Zbt9L9bNAFc"), durationMin: 5 },
        ],
      },
      {
        title_ko: "만성표재성위염",
        title_en: "Chronic Superficial Gastritis",
        lessons: [
          { title_ko: "만성표재성위염 기본", title_en: "CSG Basic", videoUrl: yt("GJuVV9FCW8M"), durationMin: 5 },
          { title_ko: "만성표재성위염 a", title_en: "CSG Case a", videoUrl: yt("Wb1_pvaRZzc"), durationMin: 4 },
          { title_ko: "만성표재성위염 b", title_en: "CSG Case b", videoUrl: yt("YLm4k7rR6KQ"), durationMin: 5 },
          { title_ko: "만성표재성위염 d", title_en: "CSG Case d", videoUrl: yt("rLMXtqycKBw"), durationMin: 4 },
          { title_ko: "만성표재성위염 A", title_en: "CSG Case A", videoUrl: yt("drP9tpbLVYU"), durationMin: 5 },
          { title_ko: "만성표재성위염 B", title_en: "CSG Case B", videoUrl: yt("U25z7wFJECw"), durationMin: 4 },
          { title_ko: "흔한 만성표재성위염", title_en: "Common CSG", videoUrl: yt("Zd4pvk6N0bo"), durationMin: 5 },
          { title_ko: "다양한 만성표재성위염", title_en: "Various CSG", videoUrl: yt("HgGw2ccvKxA"), durationMin: 5 },
          { title_ko: "만성표재성위염 (24.07)", title_en: "CSG Jul 2024", videoUrl: yt("66cvFg2lfNw"), durationMin: 4 },
          { title_ko: "만성표재성위염 (24.08)", title_en: "CSG Aug 2024", videoUrl: yt("Lue-JFxVCy0"), durationMin: 5 },
        ],
      },
      {
        title_ko: "위축성위염 · 미란성위염",
        title_en: "Atrophic & Erosive Gastritis",
        lessons: [
          { title_ko: "위축성위염 1", title_en: "Atrophic Gastritis 1", videoUrl: yt("lOAwmpkSwf0"), durationMin: 5 },
          { title_ko: "위축성위염 2", title_en: "Atrophic Gastritis 2", videoUrl: yt("BYjUUSuMa6I"), durationMin: 5 },
          { title_ko: "위축성위염 초음파", title_en: "Atrophic Gastritis US", videoUrl: yt("Yhe01Srq2yU"), durationMin: 6 },
          { title_ko: "만성위축성위염", title_en: "Chronic Atrophic Gastritis", videoUrl: yt("Rkmu10J5OGE"), durationMin: 5 },
          { title_ko: "NBI 위축성위염 진단", title_en: "NBI Atrophic Gastritis Dx", videoUrl: yt("kiF4YPFgmfk"), durationMin: 7 },
          { title_ko: "미란성위염 1", title_en: "Erosive Gastritis 1", videoUrl: yt("L95erl3oovU"), durationMin: 5 },
          { title_ko: "미란성위염 2", title_en: "Erosive Gastritis 2", videoUrl: yt("XR8aC9_mj1o"), durationMin: 5 },
          { title_ko: "위전정부 미란성위염", title_en: "Antral Erosive Gastritis", videoUrl: yt("6T5l77ZwYHg"), durationMin: 4 },
          { title_ko: "융기된 미란성위염", title_en: "Elevated Erosive Gastritis", videoUrl: yt("nhdM3JPWHr0"), durationMin: 5 },
        ],
      },
      {
        title_ko: "위염 실전 케이스",
        title_en: "Gastritis Clinical Cases",
        lessons: [
          { title_ko: "위염 케이스 (24.11)", title_en: "Gastritis Nov 2024", videoUrl: yt("ltM2kJ0dYfQ"), durationMin: 5 },
          { title_ko: "위염 케이스 2 (24.11)", title_en: "Gastritis Nov 2024 #2", videoUrl: yt("CW0x6GGjsyo"), durationMin: 5 },
          { title_ko: "위염 케이스 (24.10)", title_en: "Gastritis Oct 2024", videoUrl: yt("jGTqG3SVyJM"), durationMin: 6 },
          { title_ko: "위염 케이스 2 (24.10)", title_en: "Gastritis Oct 2024 #2", videoUrl: yt("4Ly_EaNVpGk"), durationMin: 5 },
          { title_ko: "위염 케이스 3 (24.10)", title_en: "Gastritis Oct 2024 #3", videoUrl: yt("WB1mw6aVnm4"), durationMin: 5 },
          { title_ko: "위염 케이스 (24.09)", title_en: "Gastritis Sep 2024", videoUrl: yt("fE-OaaE0ecQ"), durationMin: 6 },
          { title_ko: "위염 케이스 2 (24.09)", title_en: "Gastritis Sep 2024 #2", videoUrl: yt("4cRluXm_1mY"), durationMin: 5 },
          { title_ko: "위염 케이스 (24.08)", title_en: "Gastritis Aug 2024", videoUrl: yt("M5KXZmHRyu4"), durationMin: 5 },
        ],
      },
      {
        title_ko: "위용종 · 위종양 · 위궤양",
        title_en: "Gastric Polyps, Tumors & Ulcers",
        lessons: [
          { title_ko: "위궤양", title_en: "Gastric Ulcer", videoUrl: yt("5sRg7kgKWb0"), durationMin: 6 },
          { title_ko: "위용종 (24.11)", title_en: "Gastric Polyp", videoUrl: yt("iWzOdN8euYs"), durationMin: 5 },
          { title_ko: "위선저용종", title_en: "Gastric Fundal Polyp", videoUrl: yt("-DMtVyPiOAQ"), durationMin: 5 },
          { title_ko: "위체부용종", title_en: "Gastric Body Polyp", videoUrl: yt("lr7iSPUBrok"), durationMin: 5 },
          { title_ko: "위체부 대만 용종", title_en: "Greater Curvature Polyp", videoUrl: yt("HWbExtnguvw"), durationMin: 4 },
          { title_ko: "위상피하종양", title_en: "Gastric SET", videoUrl: yt("qnFE3t1LX2A"), durationMin: 6 },
          { title_ko: "상피하종양과 조기위암", title_en: "SET and Early Gastric Cancer", videoUrl: yt("2eDa6gmGjVc"), durationMin: 7 },
          { title_ko: "저도이형성 위선종", title_en: "Low-grade Dysplasia Adenoma", videoUrl: yt("dzGqIo-ZJbM"), durationMin: 6 },
          { title_ko: "이게 위암이라고??", title_en: "This Is Gastric Cancer??", videoUrl: yt("Hbv4IpG3fRw"), durationMin: 5 },
          { title_ko: "위암 예방의 확실한 방법", title_en: "Definite Way to Prevent GC", videoUrl: yt("w2IghwP54d0"), durationMin: 6 },
        ],
      },
      {
        title_ko: "식도 질환",
        title_en: "Esophageal Diseases",
        lessons: [
          { title_ko: "역류성식도염 LA-B", title_en: "Reflux Esophagitis LA-B", videoUrl: yt("1CsWcD4ivbw"), durationMin: 5 },
          { title_ko: "식도열공탈장 + 미란성식도염", title_en: "Hiatal Hernia + Erosive Esophagitis", videoUrl: yt("OH0imTIsKTo"), durationMin: 6 },
          { title_ko: "하부식도 종양의 정체", title_en: "Lower Esophageal Tumor", videoUrl: yt("RBEHcaDivps"), durationMin: 5 },
          { title_ko: "음식물 잔류 위내시경", title_en: "Food Residue Gastroscopy", videoUrl: yt("bb1Y3xaG1dY"), durationMin: 4 },
        ],
      },
    ],
  },

  // ─── 코스 3: 복부초음파 완전정복 ──────────────────────────
  {
    slug: "abdominal-ultrasound-master",
    riskLevel: "L1",
    thumbnailUrl: thumb("l5eEdR2OH0w"),
    estimatedHours: 6,
    translations: [
      { locale: "ko", title: "복부초음파 완전정복", description: "정상 복부초음파부터 간담도·췌장 질환까지 체계적으로 학습합니다." },
      { locale: "en", title: "Complete Abdominal Ultrasound", description: "From normal abdominal US to hepatobiliary and pancreatic diseases." },
    ],
    modules: [
      {
        title_ko: "정상 복부초음파",
        title_en: "Normal Abdominal Ultrasound",
        lessons: [
          { title_ko: "정상복부초음파 (24.11)", title_en: "Normal Abd US Nov 2024", videoUrl: yt("l5eEdR2OH0w"), durationMin: 10 },
          { title_ko: "정상 복부초음파 1", title_en: "Normal Abd US 1", videoUrl: yt("eb-nbW4SnaU"), durationMin: 8 },
          { title_ko: "정상 복부초음파 2", title_en: "Normal Abd US 2", videoUrl: yt("L1ur7KvdqTo"), durationMin: 8 },
          { title_ko: "정상 상복부초음파 1", title_en: "Normal Upper Abd US 1", videoUrl: yt("It09i_OfQfo"), durationMin: 9 },
          { title_ko: "정상 상복부초음파 2", title_en: "Normal Upper Abd US 2", videoUrl: yt("RaziXttrJE8"), durationMin: 8 },
          { title_ko: "정상 상복부초음파 3", title_en: "Normal Upper Abd US 3", videoUrl: yt("KFrPBdSAWUY"), durationMin: 9 },
          { title_ko: "정상 상복부초음파 (24.09)", title_en: "Normal Upper Abd US Sep 2024", videoUrl: yt("tN40Rea8LKM"), durationMin: 8 },
          { title_ko: "정상 하복부초음파", title_en: "Normal Lower Abd US", videoUrl: yt("XGkJDQmO0nY"), durationMin: 7 },
          { title_ko: "베이직 복부초음파", title_en: "Basic Abd US", videoUrl: yt("o-LmWPhtiWs"), durationMin: 8 },
          { title_ko: "기본 복부초음파", title_en: "Fundamental Abd US", videoUrl: yt("y75jBnGRQU4"), durationMin: 9 },
          { title_ko: "복부초음파 루틴", title_en: "Abd US Routine", videoUrl: yt("BfkDI73aO78"), durationMin: 10 },
          { title_ko: "췌장전장 보이는 복부초음파", title_en: "Full Pancreas Visualization", videoUrl: yt("4lTOXfyeI2U"), durationMin: 8 },
        ],
      },
      {
        title_ko: "특수 상황 복부초음파",
        title_en: "Special Cases Abd US",
        lessons: [
          { title_ko: "비만 환자 복부초음파", title_en: "Obese Patient Abd US", videoUrl: yt("wPNwj6rsp3M"), durationMin: 8 },
          { title_ko: "마른 환자 상복부초음파", title_en: "Thin Patient Upper Abd US", videoUrl: yt("f5WYi8sKfX4"), durationMin: 7 },
          { title_ko: "가스 많은 복부초음파", title_en: "Gas-filled Abd US", videoUrl: yt("XNycUFjwjuo"), durationMin: 6 },
          { title_ko: "음수법 복부초음파", title_en: "Water Ingestion Technique", videoUrl: yt("2xUUr10hEPU"), durationMin: 8 },
          { title_ko: "소아 복부초음파", title_en: "Pediatric Abd US", videoUrl: yt("Z0KQhIr-XlQ"), durationMin: 7 },
          { title_ko: "90대 어머님 복부초음파", title_en: "Elderly Patient Abd US", videoUrl: yt("vRwQEo8N0zQ"), durationMin: 6 },
          { title_ko: "B형간염 환자 복부초음파", title_en: "HBV Patient Abd US", videoUrl: yt("U6DX8kvI0bM"), durationMin: 8 },
          { title_ko: "정상 충수돌기", title_en: "Normal Appendix", videoUrl: yt("PdWkRJJG8a8"), durationMin: 5 },
        ],
      },
      {
        title_ko: "간 질환",
        title_en: "Liver Diseases",
        lessons: [
          { title_ko: "지방간 1", title_en: "Fatty Liver 1", videoUrl: yt("xlN_7SyL-tE"), durationMin: 5 },
          { title_ko: "지방간 2", title_en: "Fatty Liver 2", videoUrl: yt("2dNIwXdsNpw"), durationMin: 6 },
          { title_ko: "간내 지방간", title_en: "Intrahepatic Fatty Liver", videoUrl: yt("RSn-ucLE_y8"), durationMin: 5 },
          { title_ko: "간낭종 S2 및 우신낭종", title_en: "Liver Cyst S2 & Renal Cyst", videoUrl: yt("5QUDGqOTWUA"), durationMin: 6 },
          { title_ko: "간낭종", title_en: "Liver Cyst", videoUrl: yt("cXji06l4GWw"), durationMin: 5 },
          { title_ko: "우측 간낭종 S6", title_en: "Right Liver Cyst S6", videoUrl: yt("0iXSm-mdPqg"), durationMin: 5 },
          { title_ko: "다발성 격막 간낭종", title_en: "Septated Liver Cyst", videoUrl: yt("u-3ymU1aCEc"), durationMin: 6 },
          { title_ko: "간혈관종 S7", title_en: "Hemangioma S7", videoUrl: yt("twqcQYh99Y0"), durationMin: 5 },
          { title_ko: "알콜성 간경변 1", title_en: "Alcoholic Cirrhosis 1", videoUrl: yt("PkiLB3VXG3E"), durationMin: 7 },
          { title_ko: "알콜성 간경변 2", title_en: "Alcoholic Cirrhosis 2", videoUrl: yt("QbwO8A2Jku0"), durationMin: 6 },
          { title_ko: "복수 동반 알콜성간경화", title_en: "Cirrhosis with Ascites", videoUrl: yt("r5WQTKyQfOc"), durationMin: 7 },
        ],
      },
      {
        title_ko: "담도 질환",
        title_en: "Biliary Diseases",
        lessons: [
          { title_ko: "담석증 (24.10)", title_en: "Gallstones Oct 2024", videoUrl: yt("_aie39_IegI"), durationMin: 6 },
          { title_ko: "담석증 (24.09)", title_en: "Gallstones Sep 2024", videoUrl: yt("JQ7BXoDAiuE"), durationMin: 5 },
          { title_ko: "담석증 초음파소견", title_en: "Gallstones US Findings", videoUrl: yt("YPc-LLVnirM"), durationMin: 6 },
          { title_ko: "다발성 담석증", title_en: "Multiple Gallstones", videoUrl: yt("T0xtwuGp-40"), durationMin: 5 },
          { title_ko: "담낭용종 오진 케이스", title_en: "GB Polyp Misdiagnosis", videoUrl: yt("v8W6fLLRjc4"), durationMin: 6 },
          { title_ko: "담관석 + 담관확장", title_en: "CBD Stone with Dilatation", videoUrl: yt("4R3vh-w3bQI"), durationMin: 7 },
          { title_ko: "간외담관·간내담관 확장", title_en: "Bile Duct Dilatation", videoUrl: yt("SSAsFKswd7w"), durationMin: 6 },
          { title_ko: "담낭벽비후 및 간내담도확장", title_en: "GB Wall Thickening", videoUrl: yt("9HXld4Wy_jM"), durationMin: 5 },
          { title_ko: "담낭선근종증", title_en: "Adenomyomatosis", videoUrl: yt("r3xtpheoaCA"), durationMin: 5 },
        ],
      },
      {
        title_ko: "췌장 질환",
        title_en: "Pancreatic Diseases",
        lessons: [
          { title_ko: "췌담관팽대부암 1", title_en: "Ampulla of Vater Cancer 1", videoUrl: yt("5MIavMBADP8"), durationMin: 7 },
          { title_ko: "췌담관팽대부암 2", title_en: "Ampulla of Vater Cancer 2", videoUrl: yt("sk0lx_s5wCo"), durationMin: 6 },
          { title_ko: "바터팽대부암", title_en: "Vater Ampulla Cancer", videoUrl: yt("EqzhJcyRlIw"), durationMin: 7 },
          { title_ko: "췌장 낭성종양", title_en: "Pancreatic Cystic Neoplasm", videoUrl: yt("tpUH6De8Orc"), durationMin: 6 },
          { title_ko: "췌장두부 낭성종양 (IPMN)", title_en: "Pancreatic IPMN", videoUrl: yt("YnpLtZ97S0s"), durationMin: 7 },
          { title_ko: "혹시 췌장암?", title_en: "Pancreatic Head Mass", videoUrl: yt("Xf8BqI01Sso"), durationMin: 6 },
        ],
      },
      {
        title_ko: "비뇨기 · 비장",
        title_en: "Urologic & Splenic",
        lessons: [
          { title_ko: "요로결석 + 수신증", title_en: "Urolithiasis + Hydronephrosis", videoUrl: yt("FIw_4jrYr7Y"), durationMin: 6 },
          { title_ko: "우측요로결석", title_en: "Right Urolithiasis", videoUrl: yt("V2hqJ9mFuao"), durationMin: 5 },
          { title_ko: "요관류", title_en: "Ureterocele", videoUrl: yt("mZVAL65OISI"), durationMin: 5 },
          { title_ko: "비장 종양 1", title_en: "Spleen Mass 1", videoUrl: yt("HFr_Z7lk1eM"), durationMin: 6 },
          { title_ko: "비장 종양 2", title_en: "Spleen Mass 2", videoUrl: yt("o0PvJW8RG64"), durationMin: 5 },
        ],
      },
    ],
  },

  // ─── 코스 4: 갑상선초음파 & 조직검사 ──────────────────────
  {
    slug: "thyroid-ultrasound-master",
    riskLevel: "L2",
    thumbnailUrl: thumb("T7CZiISKumk"),
    estimatedHours: 4,
    translations: [
      { locale: "ko", title: "갑상선초음파 & 조직검사", description: "정상 갑상선초음파, 결절 평가, 세침흡인검사까지 마스터합니다." },
      { locale: "en", title: "Thyroid Ultrasound & Biopsy", description: "Master normal thyroid US, nodule evaluation, and FNA biopsy." },
    ],
    modules: [
      {
        title_ko: "정상 갑상선초음파",
        title_en: "Normal Thyroid Ultrasound",
        lessons: [
          { title_ko: "정상갑상선초음파 (24.11)", title_en: "Normal Thyroid US Nov 2024", videoUrl: yt("T7CZiISKumk"), durationMin: 8 },
          { title_ko: "정상갑상선 (24.11)", title_en: "Normal Thyroid Nov 2024", videoUrl: yt("fdBU-zfnw5s"), durationMin: 7 },
          { title_ko: "정상갑상선초음파 A", title_en: "Normal Thyroid US A", videoUrl: yt("YgVcNFufuPc"), durationMin: 6 },
          { title_ko: "정상 갑상선초음파 1", title_en: "Normal Thyroid US 1", videoUrl: yt("EwPnO9Et7fg"), durationMin: 7 },
          { title_ko: "베이직 갑상선초음파", title_en: "Basic Thyroid US", videoUrl: yt("_Bvdxk1PzC8"), durationMin: 6 },
          { title_ko: "정상 갑상선 초음파", title_en: "Normal Thyroid Ultrasound", videoUrl: yt("NlFekgRiyzs"), durationMin: 7 },
          { title_ko: "갑상선초음파 기본", title_en: "Thyroid US Fundamentals", videoUrl: yt("_S4MdnfVeaI"), durationMin: 8 },
          { title_ko: "갑상선항진증 초음파", title_en: "Hyperthyroidism US", videoUrl: yt("9UT5oH8loXs"), durationMin: 6 },
        ],
      },
      {
        title_ko: "갑상선결절 · 갑상선암",
        title_en: "Thyroid Nodules & Cancer",
        lessons: [
          { title_ko: "하시모토갑상선염", title_en: "Hashimoto Thyroiditis", videoUrl: yt("Kuo4QNzsAas"), durationMin: 7 },
          { title_ko: "갑상선결절 혜성꼬리 sign 1", title_en: "Comet Tail Sign 1", videoUrl: yt("UozLAO6wQ1I"), durationMin: 5 },
          { title_ko: "갑상선결절 혜성꼬리 sign 2", title_en: "Comet Tail Sign 2", videoUrl: yt("LwYBV4g1JXk"), durationMin: 5 },
          { title_ko: "다발성 갑상선결절", title_en: "Multiple Thyroid Nodules", videoUrl: yt("lyov04jQC0U"), durationMin: 6 },
          { title_ko: "좌측 갑상선결절", title_en: "Left Thyroid Nodule", videoUrl: yt("9x5DUMnRv3c"), durationMin: 5 },
          { title_ko: "다양한 갑상선결절", title_en: "Various Thyroid Nodules", videoUrl: yt("_FJ2yJ_uP0s"), durationMin: 7 },
          { title_ko: "갑상선 낭종", title_en: "Thyroid Cyst", videoUrl: yt("oW62PTxeqpM"), durationMin: 5 },
          { title_ko: "갑상선유두암", title_en: "Papillary Thyroid Cancer", videoUrl: yt("skD-EIVPZ24"), durationMin: 6 },
          { title_ko: "갑상선유두암 + 세침생검", title_en: "PTC with FNA", videoUrl: yt("iyvtwrbZxY0"), durationMin: 7 },
        ],
      },
      {
        title_ko: "세침흡인조직검사 (FNA)",
        title_en: "Fine Needle Aspiration",
        lessons: [
          { title_ko: "FNA in-plane 1", title_en: "FNA In-plane 1", videoUrl: yt("nFK_x6rXOfs"), durationMin: 6 },
          { title_ko: "FNA in-plane 2", title_en: "FNA In-plane 2", videoUrl: yt("3VnOuRzFeds"), durationMin: 5 },
          { title_ko: "FNA out-of-plane", title_en: "FNA Out-of-plane", videoUrl: yt("FlYo0MUWR4I"), durationMin: 6 },
          { title_ko: "우측 결절 FNA in-plane", title_en: "Rt Nodule FNA In-plane", videoUrl: yt("dQXHOXVvWR8"), durationMin: 7 },
          { title_ko: "우측 결절 FNA out-of-plane", title_en: "Rt Nodule FNA Out-of-plane", videoUrl: yt("5MxmjiB0vLI"), durationMin: 6 },
          { title_ko: "암 의심 FNA out-of-plane", title_en: "Suspicious FNA OOP", videoUrl: yt("Ec07NHMdj7I"), durationMin: 7 },
          { title_ko: "암 의심 FNA in-plane", title_en: "Suspicious FNA IP", videoUrl: yt("alH9EsmEPkA"), durationMin: 6 },
          { title_ko: "갑상선유두암 FNA out-of-plane", title_en: "PTC FNA Out-of-plane", videoUrl: yt("X18XWgoNDy0"), durationMin: 7 },
          { title_ko: "갑상선 FNA 기본", title_en: "Thyroid FNA Basic", videoUrl: yt("Dai83VlfU9k"), durationMin: 6 },
          { title_ko: "결절 FNA out-of-plane", title_en: "Nodule FNA OOP", videoUrl: yt("pU-P55MTRZk"), durationMin: 5 },
          { title_ko: "갑상선 조직검사 in-plane", title_en: "Thyroid Bx In-plane", videoUrl: yt("BxHfT_vzMqc"), durationMin: 6 },
        ],
      },
    ],
  },

  // ─── 코스 5: 심초음파 · 혈관초음파 ────────────────────────
  {
    slug: "cardiac-vascular-ultrasound",
    riskLevel: "L2",
    thumbnailUrl: thumb("xMtm_YSQ9t0"),
    estimatedHours: 4,
    translations: [
      { locale: "ko", title: "심초음파 · 혈관초음파", description: "심초음파와 경동맥초음파의 정상 소견과 질환을 학습합니다." },
      { locale: "en", title: "Cardiac & Vascular Ultrasound", description: "Learn normal findings and diseases in echocardiography and carotid ultrasound." },
    ],
    modules: [
      {
        title_ko: "정상 심초음파",
        title_en: "Normal Echocardiography",
        lessons: [
          { title_ko: "베이직 심초음파", title_en: "Basic Echo", videoUrl: yt("xMtm_YSQ9t0"), durationMin: 10 },
          { title_ko: "심초음파 루틴", title_en: "Echo Routine", videoUrl: yt("XpCwj-ou7LQ"), durationMin: 9 },
          { title_ko: "정상 심초음파 a", title_en: "Normal Echo a", videoUrl: yt("f2CYBE0iL0I"), durationMin: 8 },
          { title_ko: "정상 심초음파 (24.07)", title_en: "Normal Echo Jul 2024", videoUrl: yt("FCZ89INxCb8"), durationMin: 7 },
          { title_ko: "정상 심초음파 (24.08)", title_en: "Normal Echo Aug 2024", videoUrl: yt("bwSAasBFmwo"), durationMin: 8 },
          { title_ko: "정상 심초음파 소견", title_en: "Normal Echo Findings", videoUrl: yt("bUAQZZVWeBI"), durationMin: 7 },
          { title_ko: "또다른 정상 심초음파", title_en: "Another Normal Echo", videoUrl: yt("eoyxVB8nTKs"), durationMin: 8 },
          { title_ko: "심장이 서있는 심초음파", title_en: "Vertical Heart Echo", videoUrl: yt("f1Qa5iejD78"), durationMin: 7 },
        ],
      },
      {
        title_ko: "심장 질환",
        title_en: "Cardiac Diseases",
        lessons: [
          { title_ko: "Impaired Relaxation", title_en: "Impaired Relaxation", videoUrl: yt("UiIEgB0XWU4"), durationMin: 7 },
          { title_ko: "Impaired Relaxation 2", title_en: "Impaired Relaxation 2", videoUrl: yt("Lw6RjKIlYzI"), durationMin: 6 },
          { title_ko: "Grade I Impaired Relaxation", title_en: "Grade I IR", videoUrl: yt("e9sv9s_Kn2A"), durationMin: 7 },
          { title_ko: "비후성심근병증 1", title_en: "HCMP 1", videoUrl: yt("x6hxKZ5BPWM"), durationMin: 8 },
          { title_ko: "비후성심근병증 2", title_en: "HCMP 2", videoUrl: yt("0qWeIZMctsw"), durationMin: 7 },
          { title_ko: "대동맥판 폐쇄부전증", title_en: "Aortic Regurgitation", videoUrl: yt("LsakLtM5BYE"), durationMin: 6 },
          { title_ko: "대동맥판막 협착+폐쇄부전", title_en: "AS + AR", videoUrl: yt("RAWcossDBQk"), durationMin: 8 },
          { title_ko: "퇴행성 대동맥판막 협착증", title_en: "Degenerative Aortic Stenosis", videoUrl: yt("k7hDIBAG00A"), durationMin: 7 },
          { title_ko: "COPD 동반 심초음파", title_en: "Echo with COPD", videoUrl: yt("TaZCmmbBY3o"), durationMin: 7 },
          { title_ko: "부정맥 환자 심초음파", title_en: "Echo with Arrhythmia", videoUrl: yt("HS4e-X-i2xk"), durationMin: 6 },
        ],
      },
      {
        title_ko: "경동맥초음파",
        title_en: "Carotid Ultrasound",
        lessons: [
          { title_ko: "베이직 경동맥초음파", title_en: "Basic Carotid US", videoUrl: yt("Y-LGC9wuDDo"), durationMin: 8 },
          { title_ko: "베이직 경동맥초음파 2", title_en: "Basic Carotid US 2", videoUrl: yt("-obVf_wp_js"), durationMin: 7 },
          { title_ko: "정상 경동맥초음파", title_en: "Normal Carotid US", videoUrl: yt("j4_jlUEQWFk"), durationMin: 6 },
          { title_ko: "정상 경동맥초음파 1", title_en: "Normal Carotid US 1", videoUrl: yt("JfDTqBMtNGo"), durationMin: 7 },
          { title_ko: "정상적인 경동맥초음파", title_en: "Typical Normal Carotid", videoUrl: yt("otJ7u2c5tYA"), durationMin: 6 },
          { title_ko: "경미한 IMT 증가 경동맥", title_en: "Mild IMT Increase", videoUrl: yt("m3KxEPkj_yU"), durationMin: 7 },
          { title_ko: "너무나 정상적인 경동맥초음파", title_en: "Perfectly Normal Carotid", videoUrl: yt("w9bn2FzFvmQ"), durationMin: 6 },
          { title_ko: "경동맥초음파 기본", title_en: "Carotid US Fundamentals", videoUrl: yt("GJCoQ2iakV0"), durationMin: 8 },
        ],
      },
    ],
  },

  // ─── 코스 6: 초음파 유도 신경차단술 ──────────────────────
  {
    slug: "nerve-block-master",
    riskLevel: "L2",
    thumbnailUrl: thumb("zptZAyPiSh4"),
    estimatedHours: 7,
    translations: [
      { locale: "ko", title: "초음파 유도 신경차단술 마스터", description: "성상신경절, 미추신경, 경추 내측지 등 다양한 신경차단술을 마스터합니다." },
      { locale: "en", title: "US-Guided Nerve Block Master", description: "Master various nerve blocks: SGB, caudal, cervical MBB, and more." },
    ],
    modules: [
      {
        title_ko: "성상신경절 차단술 (SGB)",
        title_en: "Stellate Ganglion Block",
        lessons: [
          { title_ko: "성상신경절 차단술 기본", title_en: "SGB Basic", videoUrl: yt("zptZAyPiSh4"), durationMin: 8 },
          { title_ko: "성상신경절 차단술 1", title_en: "SGB 1", videoUrl: yt("Ys9Uamqxc2s"), durationMin: 7 },
          { title_ko: "성상신경절 차단술 2", title_en: "SGB 2", videoUrl: yt("2iiW6XczEMY"), durationMin: 6 },
          { title_ko: "성상신경절 차단술 3", title_en: "SGB 3", videoUrl: yt("sEzgXwgUeLA"), durationMin: 7 },
          { title_ko: "만병통치 SGB 1", title_en: "Versatile SGB 1", videoUrl: yt("7HJaGPczN1M"), durationMin: 6 },
          { title_ko: "만병통치 SGB 2", title_en: "Versatile SGB 2", videoUrl: yt("3WNeKZFjA8M"), durationMin: 7 },
          { title_ko: "만병통치 SGB 3", title_en: "Versatile SGB 3", videoUrl: yt("jY_2KtK36-Q"), durationMin: 6 },
          { title_ko: "확실한 SGB 1", title_en: "Reliable SGB 1", videoUrl: yt("2cCWybCwayA"), durationMin: 7 },
          { title_ko: "확실한 SGB 2", title_en: "Reliable SGB 2", videoUrl: yt("8ssumORjCmk"), durationMin: 6 },
          { title_ko: "확실한 SGB 3", title_en: "Reliable SGB 3", videoUrl: yt("6B0rRPuNvtY"), durationMin: 7 },
          { title_ko: "효과적인 SGB", title_en: "Effective SGB", videoUrl: yt("vn18TtDLbJQ"), durationMin: 6 },
          { title_ko: "수족냉증 SGB", title_en: "SGB for Cold Hands", videoUrl: yt("BcIFZL4W9Cw"), durationMin: 7 },
          { title_ko: "성상신경절 차단술 (24.08)", title_en: "SGB Aug 2024", videoUrl: yt("xabSJN6fw7s"), durationMin: 6 },
          { title_ko: "성상신경절 차단술 (24.10)", title_en: "SGB Oct 2024", videoUrl: yt("RNKcGIjxr9w"), durationMin: 7 },
        ],
      },
      {
        title_ko: "미추신경차단술",
        title_en: "Caudal Nerve Block",
        lessons: [
          { title_ko: "미추신경차단술 기본", title_en: "Caudal Block Basic", videoUrl: yt("GIPgopcmqqU"), durationMin: 7 },
          { title_ko: "미추신경차단술 2", title_en: "Caudal Block 2", videoUrl: yt("PXHQXCa1m6k"), durationMin: 6 },
          { title_ko: "미추신경차단술 3", title_en: "Caudal Block 3", videoUrl: yt("73oUyQp9Ev0"), durationMin: 7 },
          { title_ko: "미추신경차단술 A", title_en: "Caudal Block A", videoUrl: yt("qrh7e_ZMVr8"), durationMin: 6 },
          { title_ko: "미추신경차단술 1", title_en: "Caudal Block 1", videoUrl: yt("vSvAvVrPwLA"), durationMin: 7 },
          { title_ko: "미추신경차단술 (24.08)", title_en: "Caudal Block Aug 2024", videoUrl: yt("TnHxRUGm60M"), durationMin: 6 },
          { title_ko: "꼬리뼈 주사", title_en: "Caudal Injection", videoUrl: yt("v6VlS8Yxufc"), durationMin: 5 },
          { title_ko: "꼬리뼈 신경차단술", title_en: "Coccygeal Nerve Block", videoUrl: yt("B1uOlKL8Kzs"), durationMin: 6 },
        ],
      },
      {
        title_ko: "상완 · 견갑 신경차단술",
        title_en: "Brachial & Scapular Blocks",
        lessons: [
          { title_ko: "상견갑신경차단술 (24.11)", title_en: "Suprascapular Block Nov 2024", videoUrl: yt("qFDJY_tV2hQ"), durationMin: 7 },
          { title_ko: "상견갑신경차단술 (24.10)", title_en: "Suprascapular Block Oct 2024", videoUrl: yt("RNKcGIjxr9w"), durationMin: 6 },
          { title_ko: "상견갑신경차단술 기본", title_en: "Suprascapular Block Basic", videoUrl: yt("mdg0Gcsj0LA"), durationMin: 7 },
          { title_ko: "상완신경총 차단술", title_en: "Brachial Plexus Block", videoUrl: yt("Sw4ohWtCUUM"), durationMin: 8 },
          { title_ko: "상완신경총 차단술 2", title_en: "Brachial Plexus Block 2", videoUrl: yt("aUg6-EH-Vw4"), durationMin: 7 },
          { title_ko: "쇄골상부 상완신경총", title_en: "Supraclavicular Brachial Plexus", videoUrl: yt("JkVr9MD0vt0"), durationMin: 8 },
          { title_ko: "액와신경 차단술", title_en: "Axillary Nerve Block", videoUrl: yt("GLXOesiw5U0"), durationMin: 7 },
        ],
      },
      {
        title_ko: "경추 · 요추 신경차단술",
        title_en: "Cervical & Lumbar Blocks",
        lessons: [
          { title_ko: "경추 내측지 차단술", title_en: "Cervical MBB", videoUrl: yt("soCg8ay8Kdk"), durationMin: 7 },
          { title_ko: "경추 내측지 차단술 2", title_en: "Cervical MBB 2", videoUrl: yt("38mnmg4qTGw"), durationMin: 6 },
          { title_ko: "경추4-7 내측분지차단술", title_en: "C4-7 MBB", videoUrl: yt("kSiQglR8NVE"), durationMin: 8 },
          { title_ko: "경추 내측지차단술", title_en: "Cervical MBB", videoUrl: yt("Vj29dRMXuEE"), durationMin: 7 },
          { title_ko: "경추6번 신경근차단술", title_en: "C6 Nerve Root Block", videoUrl: yt("Ubk6KEhnsPE"), durationMin: 7 },
          { title_ko: "경추6번 신경근차단술 2", title_en: "C6 Root Block 2", videoUrl: yt("KrSOoHRl3G8"), durationMin: 6 },
          { title_ko: "요추신경총 차단술", title_en: "Lumbar Plexus Block", videoUrl: yt("VlevOEkioKk"), durationMin: 8 },
          { title_ko: "요추신경총 차단술 2", title_en: "Lumbar Plexus Block 2", videoUrl: yt("cx30cVlIpUA"), durationMin: 7 },
          { title_ko: "요추 후관절주사 + MBB", title_en: "Lumbar Facet + MBB", videoUrl: yt("J7HQBrvYrq0"), durationMin: 8 },
        ],
      },
      {
        title_ko: "기타 신경차단술",
        title_en: "Other Nerve Blocks",
        lessons: [
          { title_ko: "대후두신경 차단술", title_en: "Greater Occipital Nerve Block", videoUrl: yt("aIzGtioxsbg"), durationMin: 6 },
          { title_ko: "대후두신경 차단술 2", title_en: "GON Block 2", videoUrl: yt("epk5eBs0Umg"), durationMin: 6 },
          { title_ko: "제3후두신경 차단술", title_en: "Third Occipital Nerve Block", videoUrl: yt("L2Xqx_hO2F0"), durationMin: 7 },
          { title_ko: "대퇴부 폐쇄신경 차단술", title_en: "Obturator Nerve Block", videoUrl: yt("7GYuklug4Fs"), durationMin: 7 },
          { title_ko: "폐쇄신경차단술", title_en: "Obturator Block", videoUrl: yt("8L6Tz5P8E_o"), durationMin: 6 },
          { title_ko: "대퇴신경차단술", title_en: "Femoral Nerve Block", videoUrl: yt("odlxMOm11Cs"), durationMin: 7 },
          { title_ko: "흉추 방척추 신경차단술", title_en: "Thoracic Paravertebral Block", videoUrl: yt("z4nQRXR1hhM"), durationMin: 8 },
          { title_ko: "늑간신경 차단술", title_en: "Intercostal Nerve Block", videoUrl: yt("o3-HUyq9pQ4"), durationMin: 6 },
          { title_ko: "흉근신경차단술 PECS 1&2", title_en: "PECS Block 1&2", videoUrl: yt("Th62v75UKNQ"), durationMin: 8 },
          { title_ko: "이상근 주사", title_en: "Piriformis Injection", videoUrl: yt("FLnHs5n3iXs"), durationMin: 6 },
          { title_ko: "이상근 주사 2", title_en: "Piriformis Injection 2", videoUrl: yt("FWRdHzChOVg"), durationMin: 6 },
          { title_ko: "장요근 구획차단술", title_en: "Psoas Compartment Block", videoUrl: yt("3R-UlyoOOSY"), durationMin: 8 },
        ],
      },
    ],
  },

  // ─── 코스 7: 관절주사 & 초음파 유도 생검 ─────────────────
  {
    slug: "joint-injection-biopsy",
    riskLevel: "L2",
    thumbnailUrl: thumb("embjv_B62Bo"),
    estimatedHours: 5,
    translations: [
      { locale: "ko", title: "관절주사 & 초음파 유도 생검", description: "어깨·무릎·발목 관절주사와 초음파 유도 생검 술기를 배웁니다." },
      { locale: "en", title: "Joint Injections & US-Guided Biopsy", description: "Learn shoulder, knee, ankle joint injections and US-guided biopsy." },
    ],
    modules: [
      {
        title_ko: "어깨 · 팔꿈치 관절주사",
        title_en: "Shoulder & Elbow Injections",
        lessons: [
          { title_ko: "어깨 관절강내주사", title_en: "Shoulder Joint Injection", videoUrl: yt("embjv_B62Bo"), durationMin: 7 },
          { title_ko: "견봉하점액낭염 주사 (24.11)", title_en: "Subacromial Bursitis Inj Nov", videoUrl: yt("WNxsEr3sHwI"), durationMin: 6 },
          { title_ko: "견봉하점액낭염 주사 (24.07)", title_en: "Subacromial Bursitis Inj Jul", videoUrl: yt("5PXmbNY7f_Y"), durationMin: 7 },
          { title_ko: "견봉하 점액낭염", title_en: "Subacromial Bursitis", videoUrl: yt("e_c-qynQK9Y"), durationMin: 5 },
          { title_ko: "견쇄관절 주사 out-of-plane", title_en: "AC Joint Inj OOP", videoUrl: yt("0f1Gc6HkamM"), durationMin: 6 },
          { title_ko: "견쇄관절 주사 in-plane", title_en: "AC Joint Inj IP", videoUrl: yt("nGgjeSvKKOQ"), durationMin: 6 },
          { title_ko: "테니스엘보 주사 1", title_en: "Tennis Elbow Injection 1", videoUrl: yt("UM8dwO4cLqI"), durationMin: 5 },
          { title_ko: "테니스엘보 주사 2", title_en: "Tennis Elbow Injection 2", videoUrl: yt("o868eiM_1zI"), durationMin: 5 },
          { title_ko: "내측상과염 (골퍼엘보)", title_en: "Golfer's Elbow", videoUrl: yt("8iMXLKGDjg4"), durationMin: 6 },
        ],
      },
      {
        title_ko: "무릎 · 고관절 · 발목 관절주사",
        title_en: "Knee, Hip & Ankle Injections",
        lessons: [
          { title_ko: "무릎 관절강내주사", title_en: "Knee Joint Injection", videoUrl: yt("Sl3hd-MsNDw"), durationMin: 6 },
          { title_ko: "무릎 관절액흡인 후 주사", title_en: "Knee Aspiration + Injection", videoUrl: yt("RRYqcH12Mz0"), durationMin: 7 },
          { title_ko: "무릎 관절연골주사", title_en: "Knee Cartilage Injection", videoUrl: yt("-yGmfrvbIcs"), durationMin: 6 },
          { title_ko: "고관절강내 주사", title_en: "Hip Joint Injection", videoUrl: yt("rm1WOzUwhRg"), durationMin: 8 },
          { title_ko: "고관절 주사 2", title_en: "Hip Joint Injection 2", videoUrl: yt("-MySFf9P7SM"), durationMin: 7 },
          { title_ko: "발목 관절강내 주사 1", title_en: "Ankle Joint Injection 1", videoUrl: yt("MPqVw7og_q8"), durationMin: 6 },
          { title_ko: "발목 관절강내 주사 2", title_en: "Ankle Joint Injection 2", videoUrl: yt("aowaO5ekfds"), durationMin: 5 },
          { title_ko: "발목 관절 주사 (24.08)", title_en: "Ankle Injection Aug 2024", videoUrl: yt("eY2-1CVhf8c"), durationMin: 6 },
          { title_ko: "천장관절강내 주사", title_en: "SI Joint Injection", videoUrl: yt("ZegBzOd0j8Q"), durationMin: 7 },
          { title_ko: "손목관절 주사", title_en: "Wrist Joint Injection", videoUrl: yt("gKFu7zJ0UG4"), durationMin: 6 },
          { title_ko: "거위발 점액낭염", title_en: "Pes Anserine Bursitis", videoUrl: yt("H85CxVcGsEk"), durationMin: 5 },
        ],
      },
      {
        title_ko: "류마티스 · 통풍 초음파",
        title_en: "Rheumatic & Gout US",
        lessons: [
          { title_ko: "류마티스관절염 초음파", title_en: "RA Ultrasound", videoUrl: yt("J_bkNBGw7wk"), durationMin: 6 },
          { title_ko: "건선 관절염", title_en: "Psoriatic Arthritis", videoUrl: yt("OJ8NFza8rkI"), durationMin: 5 },
          { title_ko: "통풍 (제1중족지관절)", title_en: "Gout 1st MTP", videoUrl: yt("rPhfopEiy-c"), durationMin: 5 },
          { title_ko: "통풍 관해기 초음파", title_en: "Gout Remission US", videoUrl: yt("a4YQVAUlxUU"), durationMin: 5 },
          { title_ko: "건선 Psoriasis", title_en: "Psoriasis", videoUrl: yt("gQAb-SziPrk"), durationMin: 5 },
          { title_ko: "내측상과 활막염", title_en: "Medial Epicondyle Synovitis", videoUrl: yt("CTNV1aE6qO8"), durationMin: 5 },
        ],
      },
      {
        title_ko: "초음파 유도 생검",
        title_en: "US-Guided Biopsy",
        lessons: [
          { title_ko: "경부임파선 총생검 1", title_en: "Cervical LN Gun Bx 1", videoUrl: yt("QNHglbErN-w"), durationMin: 7 },
          { title_ko: "경부임파선 총생검 2", title_en: "Cervical LN Gun Bx 2", videoUrl: yt("ImVvLpcJIJo"), durationMin: 6 },
          { title_ko: "경부임파선 총생검 3", title_en: "Cervical LN Gun Bx 3", videoUrl: yt("OVyl3OcoCQ4"), durationMin: 7 },
          { title_ko: "경부결절 중심총생검", title_en: "Cervical Nodule Core Bx", videoUrl: yt("k2hnuOhRQJo"), durationMin: 6 },
          { title_ko: "이하선림프절 총생검", title_en: "Submandibular LN Gun Bx", videoUrl: yt("Jq5NUo37a9w"), durationMin: 7 },
          { title_ko: "악하선 종물 총생검", title_en: "Submandibular Mass Gun Bx", videoUrl: yt("pXxHDEvvH6c"), durationMin: 6 },
          { title_ko: "액와림프절 총생검", title_en: "Axillary LN Gun Bx", videoUrl: yt("2cEzZV0UbPY"), durationMin: 7 },
          { title_ko: "유방결절 총생검", title_en: "Breast Nodule Gun Bx", videoUrl: yt("JTnVYq2_KXg"), durationMin: 8 },
          { title_ko: "유방 섬유낭종", title_en: "Fibrocystic Change", videoUrl: yt("6HtzMPXnPJY"), durationMin: 6 },
          { title_ko: "부신 우연종", title_en: "Adrenal Incidentaloma", videoUrl: yt("E1vSCJrvoxo"), durationMin: 6 },
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 오형태내과의원 풀코스 시딩 시작...\n");

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
        creatorBio: "오형태내과의원 원장. 내시경·초음파·통증시술 전문. YouTube 400+ 의료 영상.",
        creatorField: "내과",
        preferredLocale: "ko",
      },
    });
  } else {
    creator = await prisma.user.update({
      where: { id: creator.id },
      data: {
        creatorTitle: "내과 전문의",
        creatorBio: "오형태내과의원 원장. 내시경·초음파·통증시술 전문. YouTube 400+ 의료 영상.",
        creatorField: "내과",
      },
    });
  }
  console.log(`👤 크리에이터: ${creator.name} (${creator.id})\n`);

  // 3. 코스 생성
  let totalLessons = 0;
  for (const courseDef of COURSES) {
    await seedCourse(org.id, creator.id, courseDef);
    totalLessons += courseDef.modules.reduce((s, m) => s + m.lessons.length, 0);
    console.log("");
  }

  console.log(`\n🎉 시드 완료! 총 ${COURSES.length}개 코스, ${totalLessons}개 레슨`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
