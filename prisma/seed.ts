import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VIDEO_URL = "https://storage.googleapis.com/medichips-link-assets/videos/dental-resin-treatment.mp4";
const nextVid = () => VIDEO_URL;

const badgeIcon = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" x="50" text-anchor="middle" font-size="70">${emoji}</text></svg>`)}`;

type CT = "VIDEO" | "TEXT" | "QUIZ" | "MISSION";
interface LDef { mi: number; o: number; ko: string; en: string; t: CT; d: number; }

async function createLessonsWithContent(
  modules: { id: string }[],
  defs: LDef[],
  quizBodies: Record<number, object>,
) {
  const lessons: { id: string; contentType: string; durationMin: number | null }[] = [];
  for (let i = 0; i < defs.length; i++) {
    const l = defs[i];
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: modules[l.mi].id,
        orderIndex: l.o,
        contentType: l.t,
        durationMin: l.d,
        translations: {
          create: [
            { locale: "ko", title: l.ko },
            { locale: "en", title: l.en },
          ],
        },
      },
    });

    let body: object;
    if (l.t === "VIDEO") {
      body = {
        videoUrl: nextVid(),
        markdownContent: `## ${l.en}\n\nKey learning objectives for this video lesson.\n\n- Understand core dental concepts\n- Apply clinical reasoning to oral health\n- Practice hands-on dental skills`,
        notes: "Review this material before proceeding to the next lesson.",
      };
    } else if (l.t === "TEXT") {
      body = {
        markdownContent: `## ${l.en}\n\n### Overview\n\nThis lesson covers essential knowledge for dental clinical practice.\n\n### Key Points\n\n1. **Systematic approach** — Follow established dental protocols\n2. **Clinical correlation** — Always correlate with patient oral presentation\n3. **Documentation** — Record dental findings accurately in the chart\n\n### Summary\n\nApply these principles consistently in your dental practice.`,
      };
    } else if (l.t === "QUIZ") {
      body = quizBodies[i] || {
        questions: [
          { id: "q1", type: "multiple_choice", question: `What is the primary focus of ${l.en.toLowerCase()}?`, options: ["Correct answer", "Distractor A", "Distractor B", "Distractor C"], correctIndex: 0, explanation: "This is the correct approach based on dental clinical guidelines." },
          { id: "q2", type: "multiple_choice", question: "Which finding requires immediate attention?", options: ["Critical finding", "Normal variant", "Benign finding", "Expected result"], correctIndex: 0, explanation: "Critical findings require immediate dental intervention." },
          { id: "q3", type: "multiple_choice", question: "What is the recommended next step?", options: ["Follow protocol", "Wait and observe", "Repeat test", "Discharge"], correctIndex: 0, explanation: "Following established protocol ensures patient safety." },
        ],
        passingScore: 70,
        timeLimit: 300,
      };
    } else {
      body = {
        markdownContent: `## Mission: ${l.en}\n\nComplete the following practical tasks to demonstrate dental competency.\n\n### Instructions\n\n1. Follow the checklist below\n2. Document each step with evidence\n3. Submit for supervisor review`,
        checklist: [
          { text: "Complete initial oral assessment", required: true },
          { text: "Document findings in dental chart", required: true },
          { text: "Submit evidence photos", required: true },
        ],
      };
    }

    await prisma.contentVersion.create({
      data: {
        lessonId: lesson.id,
        version: 1,
        body,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    lessons.push({ id: lesson.id, contentType: l.t, durationMin: l.d });
  }
  return lessons;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding comprehensive demo data (Dentistry)...\n");

  // ─── Clean ────────────────────────────────────────────────────────────────
  console.log("🧹 Cleaning existing data...");
  await prisma.$transaction([
    prisma.outcomeRecord.deleteMany(),
    prisma.costRecord.deleteMany(),
    prisma.impactMetric.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.issuedCertificate.deleteMany(),
    prisma.certificateTemplate.deleteMany(),
    prisma.verificationRecord.deleteMany(),
    prisma.improvementPlan.deleteMany(),
    prisma.competencyAssessment.deleteMany(),
    prisma.taskEvidence.deleteMany(),
    prisma.task.deleteMany(),
    prisma.earnedBadge.deleteMany(),
    prisma.badgeDefinition.deleteMany(),
    prisma.streak.deleteMany(),
    prisma.xpLedger.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.missionSubmission.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.courseEnrollment.deleteMany(),
    prisma.reviewComment.deleteMany(),
    prisma.contentAuditLog.deleteMany(),
    prisma.contentVersion.deleteMany(),
    prisma.lessonTranslation.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.moduleTranslation.deleteMany(),
    prisma.module.deleteMany(),
    prisma.courseTranslation.deleteMany(),
    prisma.courseSpecialtyTag.deleteMany(),
    prisma.aiGeneratedDraft.deleteMany(),
    prisma.aiSourceDocument.deleteMany(),
    prisma.aiCourseJob.deleteMany(),
    prisma.programCourse.deleteMany(),
    prisma.programEnrollment.deleteMany(),
    prisma.course.deleteMany(),
    prisma.program.deleteMany(),
    prisma.medicalSpecialty.deleteMany(),
    prisma.medicalGlossary.deleteMany(),
    prisma.translationJob.deleteMany(),
    prisma.inviteCode.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.userAuth.deleteMany(),
    prisma.organizationMembership.deleteMany(),
    prisma.orgApiKey.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  // ─── Organization ─────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: "서울대학교 치의학대학원 글로벌교육센터",
      slug: "snu-dental-global",
      description: "Seoul National University School of Dentistry - Global Dental Education",
      logoUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=200&h=200&fit=crop",
    },
  });
  console.log("✅ Organization:", org.name);

  // ─── Users ────────────────────────────────────────────────────────────────
  const [adminPw, learnerPw, superPw] = await Promise.all([
    bcrypt.hash("admin1234", 12),
    bcrypt.hash("learner1234", 12),
    bcrypt.hash("super1234", 12),
  ]);

  const userDefs = [
    { name: "Dr. James Ahn", email: "james.ahn@medichips.ai", pw: adminPw, locale: "ko", role: "ORG_ADMIN" as const, avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Amina Hassan", email: "amina@demo.medichips.ai", pw: learnerPw, locale: "en", role: "LEARNER" as const, avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Park Jihoon", email: "jihoon.park@demo.medichips.ai", pw: superPw, locale: "ko", role: "SUPERVISOR" as const, avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Fatima Nkosi", email: "fatima@demo.medichips.ai", pw: learnerPw, locale: "en", role: "LEARNER" as const, avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964e7c8?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Samuel Osei", email: "samuel@demo.medichips.ai", pw: learnerPw, locale: "en", role: "LEARNER" as const, avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Grace Mwangi", email: "grace@demo.medichips.ai", pw: learnerPw, locale: "en", role: "LEARNER" as const, avatar: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Ibrahim Diallo", email: "ibrahim@demo.medichips.ai", pw: learnerPw, locale: "en", role: "LEARNER" as const, avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100&h=100&fit=crop&crop=face" },
    { name: "Dr. Chen Wei", email: "chen.wei@demo.medichips.ai", pw: learnerPw, locale: "en", role: "INSTRUCTOR" as const, avatar: "https://images.unsplash.com/photo-1580281657527-47f249e8f4df?w=100&h=100&fit=crop&crop=face" },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const u of userDefs) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        preferredLocale: u.locale,
        avatarUrl: u.avatar,
        authMethods: {
          create: {
            method: "EMAIL_PASSWORD",
            identifier: u.email,
            credential: u.pw,
          },
        },
        memberships: {
          create: { organizationId: org.id, role: u.role },
        },
      },
    });
    users[u.email] = user;
  }

  const admin = users["james.ahn@medichips.ai"];
  const amina = users["amina@demo.medichips.ai"];
  const supervisor = users["jihoon.park@demo.medichips.ai"];
  const fatima = users["fatima@demo.medichips.ai"];
  const samuel = users["samuel@demo.medichips.ai"];
  const grace = users["grace@demo.medichips.ai"];
  const ibrahim = users["ibrahim@demo.medichips.ai"];
  console.log(`✅ Users: ${Object.keys(users).length} created`);

  // ─── Dental Specialties ────────────────────────────────────────────────────
  const specDefs = [
    { name: "General Dentistry", desc: "Comprehensive dental diagnosis and treatment", icon: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=64&h=64&fit=crop" },
    { name: "Periodontics", desc: "Gum disease and supporting structures", icon: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=64&h=64&fit=crop" },
    { name: "Endodontics", desc: "Root canal therapy and dental pulp treatment", icon: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=64&h=64&fit=crop" },
    { name: "Prosthodontics", desc: "Dental prostheses including crowns, bridges, and dentures", icon: "https://images.unsplash.com/photo-1579684453423-f84349ef60b0?w=64&h=64&fit=crop" },
    { name: "Oral Surgery", desc: "Surgical procedures of the oral cavity and jaw", icon: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=64&h=64&fit=crop" },
  ];
  const specialties: Record<string, { id: string }> = {};
  for (const s of specDefs) {
    specialties[s.name] = await prisma.medicalSpecialty.create({
      data: { name: s.name, description: s.desc, iconUrl: s.icon },
    });
  }
  console.log("✅ Dental Specialties: 5 created");

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 1: 치과 기본 진료 (Dental Examination Fundamentals)
  // ═══════════════════════════════════════════════════════════════════════════
  const course1 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "dental-exam-fundamentals",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&h=450&fit=crop",
      estimatedHours: 8,
      translations: {
        create: [
          { locale: "ko", title: "치과 기본 진료", description: "치과 의사를 위한 기본 진료 프로토콜. 구강 검진, 치과 방사선 판독, 치아우식증 진단 및 치료 계획 수립." },
          { locale: "en", title: "Dental Examination Fundamentals", description: "Essential clinical protocols for dentistry. Oral examination, dental radiograph interpretation, caries diagnosis and treatment planning." },
        ],
      },
    },
  });

  const c1ModDefs = [
    { ko: "환자 구강 검진", en: "Patient Oral Examination" },
    { ko: "치과 방사선 촬영 및 판독", en: "Dental Radiography & Interpretation" },
    { ko: "치아우식증 진단", en: "Dental Caries Diagnosis" },
    { ko: "치료 계획 수립", en: "Treatment Planning" },
  ];
  const c1Mods: { id: string }[] = [];
  for (let i = 0; i < c1ModDefs.length; i++) {
    c1Mods.push(await prisma.module.create({
      data: { courseId: course1.id, orderIndex: i, translations: { create: [{ locale: "ko", title: c1ModDefs[i].ko }, { locale: "en", title: c1ModDefs[i].en }] } },
    }));
  }

  const c1QuizBodies: Record<number, object> = {
    3: { // Oral Examination Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the correct order for a comprehensive oral examination?", options: ["Extraoral → Intraoral soft tissue → Periodontal → Dental charting", "Dental charting → Periodontal → Soft tissue → Extraoral", "Radiographs → Extraoral → Dental → Soft tissue", "Periodontal → Radiographs → Dental → Soft tissue"], correctIndex: 0, explanation: "A systematic approach starts from extraoral examination and progresses to detailed dental charting." },
        { id: "q2", type: "multiple_choice", question: "Which tool is essential for detecting proximal caries clinically?", options: ["Dental explorer and bitewing radiograph", "Mouth mirror only", "Periodontal probe", "Dental floss only"], correctIndex: 0, explanation: "Proximal caries are often detected by explorer tactile sense combined with bitewing radiographs." },
        { id: "q3", type: "multiple_choice", question: "What does FDI tooth numbering system use for the upper right first molar?", options: ["16", "3", "26", "46"], correctIndex: 0, explanation: "In FDI notation, the upper right quadrant is 1, and the first molar is the 6th tooth." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    11: { // Caries Diagnosis Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What does ICDAS code 3 represent?", options: ["Localized enamel breakdown without visible dentin", "Sound enamel", "Cavitation into dentin", "First visual change in enamel"], correctIndex: 0, explanation: "ICDAS 3 indicates localized enamel breakdown without clinical visual signs of dentin involvement." },
        { id: "q2", type: "multiple_choice", question: "Which radiographic finding indicates dentin caries?", options: ["Radiolucency extending past the DEJ", "Radiolucency limited to outer enamel", "Normal anatomic shadow", "Periapical radiolucency"], correctIndex: 0, explanation: "Radiolucency past the dentinoenamel junction (DEJ) indicates caries has reached dentin." },
        { id: "q3", type: "multiple_choice", question: "What is the most common site for primary caries in adults?", options: ["Proximal surfaces of posterior teeth", "Occlusal surfaces of premolars", "Labial surfaces of anteriors", "Lingual surfaces of molars"], correctIndex: 0, explanation: "Proximal surfaces of posterior teeth are the most common site for new caries in adults." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    14: { // Treatment Planning Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the first phase in dental treatment planning?", options: ["Emergency/urgent phase (pain relief, infection control)", "Restorative phase", "Prosthetic phase", "Maintenance phase"], correctIndex: 0, explanation: "Treatment always begins with addressing emergency conditions like acute pain or infection." },
        { id: "q2", type: "multiple_choice", question: "For a tooth with irreversible pulpitis, what is the recommended treatment?", options: ["Root canal therapy or extraction", "Observation and reassessment", "Fluoride varnish application", "Scaling and root planing"], correctIndex: 0, explanation: "Irreversible pulpitis requires endodontic treatment or extraction as the pulp cannot recover." },
        { id: "q3", type: "multiple_choice", question: "When should periodontal treatment precede restorative work?", options: ["When active periodontal disease is present", "Only in elderly patients", "Never — restore first", "Only if the patient requests it"], correctIndex: 0, explanation: "Periodontal health must be established before definitive restorative treatment for long-term success." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c1Lessons = await createLessonsWithContent(c1Mods, [
    { mi: 0, o: 0, ko: "구외 검사 및 TMJ 평가", en: "Extraoral Exam & TMJ Assessment", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "구내 연조직 검사", en: "Intraoral Soft Tissue Examination", t: "VIDEO", d: 5 },
    { mi: 0, o: 2, ko: "치주 검사 및 치아 차트 작성", en: "Periodontal Exam & Dental Charting", t: "VIDEO", d: 4 },
    { mi: 0, o: 3, ko: "구강 검진 퀴즈", en: "Oral Examination Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "치근단 방사선 촬영법", en: "Periapical Radiograph Technique", t: "VIDEO", d: 5 },
    { mi: 1, o: 1, ko: "교익 방사선 촬영 및 판독", en: "Bitewing Radiograph & Interpretation", t: "VIDEO", d: 7 },
    { mi: 1, o: 2, ko: "파노라마 방사선 판독", en: "Panoramic Radiograph Interpretation", t: "VIDEO", d: 6 },
    { mi: 1, o: 3, ko: "방사선 판독 실습 과제", en: "Radiograph Interpretation Practice Task", t: "MISSION", d: 5 },
    { mi: 2, o: 0, ko: "치아우식 분류 (ICDAS)", en: "Caries Classification (ICDAS)", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "우식 위험도 평가 (CRA)", en: "Caries Risk Assessment (CRA)", t: "VIDEO", d: 5 },
    { mi: 2, o: 2, ko: "예방적 우식 관리", en: "Preventive Caries Management", t: "VIDEO", d: 5 },
    { mi: 2, o: 3, ko: "우식 진단 퀴즈", en: "Caries Diagnosis Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "수복 재료 선택 원칙", en: "Restorative Material Selection Principles", t: "VIDEO", d: 5 },
    { mi: 3, o: 1, ko: "단계별 치료 계획 수립", en: "Phased Treatment Plan Development", t: "VIDEO", d: 4 },
    { mi: 3, o: 2, ko: "치료 계획 종합 퀴즈", en: "Treatment Planning Quiz", t: "QUIZ", d: 5 },
  ], c1QuizBodies);

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 2: 치주질환 진단과 치료 (Periodontal Disease Diagnosis & Treatment)
  // ═══════════════════════════════════════════════════════════════════════════
  const course2 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "periodontal-disease",
      riskLevel: "L2",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=450&fit=crop",
      estimatedHours: 6,
      translations: {
        create: [
          { locale: "ko", title: "치주질환 진단과 치료", description: "치주질환의 분류, 치주 탐침 검사, 스케일링 및 치근활택술, 치주 수술 적응증 및 유지관리." },
          { locale: "en", title: "Periodontal Disease Diagnosis & Treatment", description: "Periodontal disease classification, probing examination, scaling & root planing, surgical indications, and maintenance therapy." },
        ],
      },
    },
  });

  const c2ModDefs = [
    { ko: "치주질환 분류 및 진단", en: "Periodontal Disease Classification" },
    { ko: "비외과적 치주 치료", en: "Non-Surgical Periodontal Therapy" },
    { ko: "외과적 치주 치료", en: "Surgical Periodontal Therapy" },
    { ko: "치주 유지관리", en: "Periodontal Maintenance" },
  ];
  const c2Mods: { id: string }[] = [];
  for (let i = 0; i < c2ModDefs.length; i++) {
    c2Mods.push(await prisma.module.create({
      data: { courseId: course2.id, orderIndex: i, translations: { create: [{ locale: "ko", title: c2ModDefs[i].ko }, { locale: "en", title: c2ModDefs[i].en }] } },
    }));
  }

  const c2QuizBodies: Record<number, object> = {
    2: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "What probing depth indicates a periodontal pocket?", options: ["≥ 4mm with attachment loss", "≥ 2mm", "≥ 6mm only", "Any depth with bleeding"], correctIndex: 0, explanation: "Probing depths ≥4mm with clinical attachment loss indicate true periodontal pockets." },
        { id: "q2", type: "multiple_choice", question: "What is the hallmark sign of gingivitis?", options: ["Bleeding on probing without attachment loss", "Bone loss on radiograph", "Tooth mobility", "Gingival recession"], correctIndex: 0, explanation: "Gingivitis is characterized by gingival inflammation with bleeding but no attachment loss." },
        { id: "q3", type: "multiple_choice", question: "In the 2018 AAP/EFP classification, Stage III periodontitis involves?", options: ["≥5mm CAL or bone loss extending to middle third of root", "1-2mm CAL", "CAL only at incisors", "No bone loss"], correctIndex: 0, explanation: "Stage III involves severe periodontitis with ≥5mm CAL and significant bone loss." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    8: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "When is flap surgery indicated in periodontal treatment?", options: ["When non-surgical therapy fails to resolve deep pockets ≥5mm", "As first-line treatment for all patients", "Only for cosmetic improvement", "When probing depth is 3mm"], correctIndex: 0, explanation: "Surgical intervention is indicated when SRP fails to adequately reduce deep pockets." },
        { id: "q2", type: "multiple_choice", question: "What is the primary goal of guided tissue regeneration (GTR)?", options: ["Promote selective repopulation of periodontal ligament cells", "Remove all bacteria from pocket", "Replace lost teeth", "Whiten teeth surfaces"], correctIndex: 0, explanation: "GTR uses barriers to allow PDL cells to preferentially repopulate the defect area." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    11: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the recommended recall interval for periodontal maintenance?", options: ["Every 3 months for the first year after active treatment", "Once a year", "Every 6 months only", "Only when symptoms recur"], correctIndex: 0, explanation: "3-month recalls are standard after active periodontal treatment to monitor and maintain results." },
        { id: "q2", type: "multiple_choice", question: "Which index measures the patient's oral hygiene compliance?", options: ["O'Leary Plaque Control Record", "DMFT index", "PSR/PSE index", "BPE score"], correctIndex: 0, explanation: "The O'Leary Plaque Control Record quantifies plaque presence on tooth surfaces to assess home care." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c2Lessons = await createLessonsWithContent(c2Mods, [
    { mi: 0, o: 0, ko: "치주질환 역학 및 위험 요인", en: "Periodontal Disease Epidemiology & Risk Factors", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "치주 탐침 검사 기법", en: "Periodontal Probing Technique", t: "VIDEO", d: 5 },
    { mi: 0, o: 2, ko: "치주질환 분류 퀴즈", en: "Periodontal Classification Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "스케일링 및 치근활택술 (SRP)", en: "Scaling & Root Planing (SRP)", t: "VIDEO", d: 6 },
    { mi: 1, o: 1, ko: "초음파 스케일러 vs 수동 스케일러", en: "Ultrasonic vs Hand Scalers", t: "VIDEO", d: 5 },
    { mi: 1, o: 2, ko: "국소 항균제 적용", en: "Local Antimicrobial Delivery", t: "VIDEO", d: 6 },
    { mi: 2, o: 0, ko: "치주 판막 수술", en: "Periodontal Flap Surgery", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "골유도재생술 (GTR/GBR)", en: "Guided Tissue/Bone Regeneration", t: "VIDEO", d: 5 },
    { mi: 2, o: 2, ko: "치주 수술 퀴즈", en: "Periodontal Surgery Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "치주 유지관리 프로토콜", en: "Periodontal Maintenance Protocol", t: "VIDEO", d: 5 },
    { mi: 3, o: 1, ko: "환자 구강위생 교육", en: "Patient Oral Hygiene Instruction", t: "VIDEO", d: 5 },
    { mi: 3, o: 2, ko: "유지관리 퀴즈", en: "Maintenance Therapy Quiz", t: "QUIZ", d: 4 },
  ], c2QuizBodies);

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 3: 근관치료 기초 (Endodontic Treatment Fundamentals)
  // ═══════════════════════════════════════════════════════════════════════════
  const course3 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "endodontic-fundamentals",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&h=450&fit=crop",
      estimatedHours: 5,
      translations: {
        create: [
          { locale: "ko", title: "근관치료 기초", description: "치수 질환의 진단, 근관 형성 및 세척, 근관 충전, 근관치료 후 수복." },
          { locale: "en", title: "Endodontic Treatment Fundamentals", description: "Pulp disease diagnosis, canal shaping & irrigation, obturation, and post-endodontic restoration." },
        ],
      },
    },
  });

  const c3ModDefs = [
    { ko: "치수 질환 진단", en: "Pulp Disease Diagnosis" },
    { ko: "근관 형성 및 세척", en: "Canal Shaping & Irrigation" },
    { ko: "근관 충전 및 수복", en: "Obturation & Restoration" },
  ];
  const c3Mods: { id: string }[] = [];
  for (let i = 0; i < c3ModDefs.length; i++) {
    c3Mods.push(await prisma.module.create({
      data: { courseId: course3.id, orderIndex: i, translations: { create: [{ locale: "ko", title: c3ModDefs[i].ko }, { locale: "en", title: c3ModDefs[i].en }] } },
    }));
  }

  const c3QuizBodies: Record<number, object> = {
    2: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "What test differentiates reversible from irreversible pulpitis?", options: ["Cold test — lingering pain (>10 sec) suggests irreversible", "Percussion test only", "Visual inspection alone", "Mobility test"], correctIndex: 0, explanation: "Lingering pain to cold stimulus (>10 seconds) is a classic sign of irreversible pulpitis." },
        { id: "q2", type: "multiple_choice", question: "What radiographic finding indicates pulp necrosis?", options: ["Periapical radiolucency", "Widened PDL space only", "Normal periapical appearance", "Hypercementosis"], correctIndex: 0, explanation: "Periapical radiolucency indicates chronic infection from a necrotic pulp." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    5: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the most commonly used irrigation solution in root canal therapy?", options: ["Sodium hypochlorite (NaOCl)", "Sterile saline only", "Chlorhexidine only", "Hydrogen peroxide only"], correctIndex: 0, explanation: "NaOCl is the gold standard irrigant due to its bactericidal and tissue-dissolving properties." },
        { id: "q2", type: "multiple_choice", question: "What is the working length in endodontics?", options: ["Distance from reference point to 0.5-1mm short of radiographic apex", "Total tooth length", "Distance to the tip of the file", "Estimated root length on radiograph"], correctIndex: 0, explanation: "Working length is measured to the apical constriction, typically 0.5-1mm from radiographic apex." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    8: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the most widely used obturation technique?", options: ["Lateral condensation with gutta-percha", "Single cone only", "Silver points", "Paste fill only"], correctIndex: 0, explanation: "Lateral condensation with gutta-percha and sealer is the most predictable obturation technique." },
        { id: "q2", type: "multiple_choice", question: "When is a post needed after root canal therapy?", options: ["When insufficient coronal tooth structure remains for retention", "Always after RCT", "Never — crowns are sufficient", "Only in anterior teeth"], correctIndex: 0, explanation: "Posts are needed only when there is inadequate remaining tooth structure to retain the core buildup." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c3Lessons = await createLessonsWithContent(c3Mods, [
    { mi: 0, o: 0, ko: "치수 생활력 검사", en: "Pulp Vitality Testing", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "치수 질환 분류", en: "Pulp Disease Classification", t: "VIDEO", d: 4 },
    { mi: 0, o: 2, ko: "치수 진단 퀴즈", en: "Pulp Diagnosis Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "근관 접근 및 형성", en: "Access Cavity & Canal Shaping", t: "VIDEO", d: 6 },
    { mi: 1, o: 1, ko: "근관 세척 프로토콜", en: "Irrigation Protocol", t: "VIDEO", d: 5 },
    { mi: 1, o: 2, ko: "근관 형성 퀴즈", en: "Canal Shaping Quiz", t: "QUIZ", d: 4 },
    { mi: 2, o: 0, ko: "근관 충전 기법", en: "Obturation Techniques", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "근관치료 후 수복", en: "Post-Endodontic Restoration", t: "VIDEO", d: 5 },
    { mi: 2, o: 2, ko: "충전 및 수복 퀴즈", en: "Obturation & Restoration Quiz", t: "QUIZ", d: 4 },
  ], c3QuizBodies);

  console.log(`✅ Courses: 3 (${c1Lessons.length + c2Lessons.length + c3Lessons.length} lessons, all with content)`);

  // ─── Course Specialty Tags ────────────────────────────────────────────────
  await prisma.courseSpecialtyTag.createMany({
    data: [
      { courseId: course1.id, specialtyId: specialties["General Dentistry"].id },
      { courseId: course1.id, specialtyId: specialties["Prosthodontics"].id },
      { courseId: course2.id, specialtyId: specialties["Periodontics"].id },
      { courseId: course2.id, specialtyId: specialties["General Dentistry"].id },
      { courseId: course2.id, specialtyId: specialties["Oral Surgery"].id },
      { courseId: course3.id, specialtyId: specialties["Endodontics"].id },
      { courseId: course3.id, specialtyId: specialties["General Dentistry"].id },
    ],
  });

  // ─── Course Enrollments ───────────────────────────────────────────────────
  const enrollments = [
    { userId: amina.id, courseId: course1.id, pct: 65 },
    { userId: fatima.id, courseId: course1.id, pct: 30 },
    { userId: samuel.id, courseId: course1.id, pct: 45 },
    { userId: samuel.id, courseId: course2.id, pct: 20 },
    { userId: grace.id, courseId: course2.id, pct: 55 },
    { userId: ibrahim.id, courseId: course3.id, pct: 40 },
    { userId: ibrahim.id, courseId: course1.id, pct: 10 },
  ];
  for (const e of enrollments) {
    await prisma.courseEnrollment.create({
      data: { userId: e.userId, courseId: e.courseId, progressPct: e.pct },
    });
  }
  console.log("✅ Enrollments: 7 created");

  // ─── Lesson Progress (Amina in Course 1: 9 done, 1 in progress) ─────────
  for (let i = 0; i < 10; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: amina.id,
        lessonId: c1Lessons[i].id,
        status: i < 9 ? "COMPLETED" : "IN_PROGRESS",
        timeSpentSec: i < 9 ? (c1Lessons[i].durationMin ?? 5) * 60 : 120,
        score: i < 9 ? 85 + Math.random() * 15 : null,
        updatedAt: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
      },
    });
  }
  // Fatima progress on course 1
  for (let i = 0; i < 4; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: fatima.id,
        lessonId: c1Lessons[i].id,
        status: i < 3 ? "COMPLETED" : "IN_PROGRESS",
        timeSpentSec: i < 3 ? (c1Lessons[i].durationMin ?? 5) * 60 : 60,
        score: i < 3 ? 80 + Math.random() * 20 : null,
      },
    });
  }
  // Samuel progress on course 1
  for (let i = 0; i < 6; i++) {
    await prisma.lessonProgress.create({
      data: {
        userId: samuel.id,
        lessonId: c1Lessons[i].id,
        status: i < 5 ? "COMPLETED" : "IN_PROGRESS",
        timeSpentSec: i < 5 ? (c1Lessons[i].durationMin ?? 5) * 60 : 90,
        score: i < 5 ? 75 + Math.random() * 25 : null,
      },
    });
  }
  console.log("✅ Lesson progress created for 3 users");

  // ─── Quiz Attempts ────────────────────────────────────────────────────────
  const quizLessonIndices = [3, 11]; // Course 1 quiz lessons that Amina completed
  for (const idx of quizLessonIndices) {
    await prisma.quizAttempt.create({
      data: {
        userId: amina.id,
        lessonId: c1Lessons[idx].id,
        quizVersion: 1,
        answers: {
          responses: [
            { questionId: "q1", selectedIndex: 0, correct: true },
            { questionId: "q2", selectedIndex: 0, correct: true },
            { questionId: "q3", selectedIndex: 1, correct: false },
          ],
        },
        score: 90,
        passed: true,
        attemptNumber: 1,
        idempotencyKey: `seed-quiz-amina-${idx}`,
        startedAt: new Date(Date.now() - (9 - idx) * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - (9 - idx) * 24 * 60 * 60 * 1000 + 180000),
      },
    });
  }
  console.log("✅ Quiz attempts: 2 for Amina");

  // ─── XP Ledger ────────────────────────────────────────────────────────────
  interface XpDef { userId: string; action: "LESSON_COMPLETE" | "QUIZ_PASS" | "MISSION_APPROVED" | "STREAK_BONUS" | "BADGE_EARNED" | "DAILY_LOGIN" | "TASK_COMPLETE"; amount: number; days: number; }

  const allXp: XpDef[] = [
    // Amina (highest XP)
    ...Array.from({ length: 9 }, (_, i) => ({ userId: amina.id, action: "LESSON_COMPLETE" as const, amount: 20, days: 9 - i })),
    { userId: amina.id, action: "QUIZ_PASS", amount: 30, days: 7 },
    { userId: amina.id, action: "QUIZ_PASS", amount: 30, days: 2 },
    { userId: amina.id, action: "MISSION_APPROVED", amount: 50, days: 4 },
    { userId: amina.id, action: "BADGE_EARNED", amount: 25, days: 3 },
    { userId: amina.id, action: "STREAK_BONUS", amount: 15, days: 0 },
    { userId: amina.id, action: "DAILY_LOGIN", amount: 5, days: 0 },
    // Fatima
    ...Array.from({ length: 3 }, (_, i) => ({ userId: fatima.id, action: "LESSON_COMPLETE" as const, amount: 20, days: 5 - i })),
    { userId: fatima.id, action: "DAILY_LOGIN", amount: 5, days: 0 },
    { userId: fatima.id, action: "STREAK_BONUS", amount: 15, days: 0 },
    // Samuel
    ...Array.from({ length: 5 }, (_, i) => ({ userId: samuel.id, action: "LESSON_COMPLETE" as const, amount: 20, days: 7 - i })),
    { userId: samuel.id, action: "QUIZ_PASS", amount: 30, days: 4 },
    { userId: samuel.id, action: "DAILY_LOGIN", amount: 5, days: 0 },
    // Grace
    ...Array.from({ length: 4 }, (_, i) => ({ userId: grace.id, action: "LESSON_COMPLETE" as const, amount: 20, days: 6 - i })),
    { userId: grace.id, action: "STREAK_BONUS", amount: 15, days: 0 },
    // Ibrahim
    ...Array.from({ length: 3 }, (_, i) => ({ userId: ibrahim.id, action: "LESSON_COMPLETE" as const, amount: 20, days: 4 - i })),
    { userId: ibrahim.id, action: "DAILY_LOGIN", amount: 5, days: 0 },
  ];

  for (let i = 0; i < allXp.length; i++) {
    const e = allXp[i];
    await prisma.xpLedger.create({
      data: {
        userId: e.userId,
        action: e.action,
        amount: e.amount,
        idempotencyKey: `seed-xp-${i}`,
        createdAt: new Date(Date.now() - e.days * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ XP entries: ${allXp.length}`);

  // ─── Streaks ──────────────────────────────────────────────────────────────
  const streakDefs = [
    { userId: amina.id, current: 7, longest: 12 },
    { userId: fatima.id, current: 3, longest: 5 },
    { userId: samuel.id, current: 5, longest: 8 },
    { userId: grace.id, current: 4, longest: 6 },
    { userId: ibrahim.id, current: 2, longest: 4 },
  ];
  for (const s of streakDefs) {
    await prisma.streak.create({
      data: { userId: s.userId, currentStreak: s.current, longestStreak: s.longest, lastActivityDate: new Date(), streakFreezes: 2 },
    });
  }
  console.log("✅ Streaks: 5 users");

  // ─── Badge Definitions & Earned ─────────────────────────────────────────
  const badgeDefs = [
    { slug: "first-lesson", cat: "COMPLETION" as const, name: "First Step", desc: "Complete your first lesson", icon: badgeIcon("🎯"), xp: 10 },
    { slug: "five-streak", cat: "STREAK" as const, name: "On Fire", desc: "5-day learning streak", icon: badgeIcon("🔥"), xp: 25 },
    { slug: "quiz-master", cat: "MASTERY" as const, name: "Quiz Master", desc: "Score 90%+ on 3 quizzes", icon: badgeIcon("🧠"), xp: 30 },
    { slug: "ten-lessons", cat: "COMPLETION" as const, name: "Knowledge Seeker", desc: "Complete 10 lessons", icon: badgeIcon("📚"), xp: 20 },
    { slug: "team-player", cat: "SOCIAL" as const, name: "Team Player", desc: "Help a peer with a task", icon: badgeIcon("🤝"), xp: 15 },
  ];

  const badgeIds: Record<string, string> = {};
  for (const b of badgeDefs) {
    const badge = await prisma.badgeDefinition.create({
      data: { slug: b.slug, category: b.cat, name: b.name, description: b.desc, iconUrl: b.icon, xpReward: b.xp, criteria: {} },
    });
    badgeIds[b.slug] = badge.id;
  }

  // Distribute badges across users
  const earnedBadges = [
    { userId: amina.id, badge: "first-lesson", days: 9 },
    { userId: amina.id, badge: "five-streak", days: 5 },
    { userId: amina.id, badge: "quiz-master", days: 3 },
    { userId: amina.id, badge: "ten-lessons", days: 1 },
    { userId: fatima.id, badge: "first-lesson", days: 5 },
    { userId: samuel.id, badge: "first-lesson", days: 7 },
    { userId: samuel.id, badge: "five-streak", days: 3 },
    { userId: grace.id, badge: "first-lesson", days: 6 },
    { userId: ibrahim.id, badge: "first-lesson", days: 4 },
  ];
  for (const eb of earnedBadges) {
    await prisma.earnedBadge.create({
      data: {
        userId: eb.userId,
        badgeId: badgeIds[eb.badge],
        earnedAt: new Date(Date.now() - eb.days * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Badges: ${badgeDefs.length} defined, ${earnedBadges.length} earned`);

  // ─── Tasks + Evidence ─────────────────────────────────────────────────────
  const task1 = await prisma.task.create({
    data: {
      lessonId: c1Lessons[7].id,
      assigneeId: amina.id,
      creatorId: supervisor.id,
      source: "SUPERVISOR_ASSIGNED",
      status: "IN_PROGRESS",
      title: "치과 방사선 판독 실습 보고",
      description: "실제 환자의 치근단/교익 방사선 사진 3장을 판독하고, 소견과 함께 보고서 제출",
      checklist: [
        { text: "치근단 방사선 판독", done: true },
        { text: "교익 방사선 판독", done: true },
        { text: "파노라마 방사선 판독", done: false },
        { text: "판독 소견 요약", done: false },
        { text: "사진 증빙 첨부", done: false },
      ],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      lessonId: c1Lessons[5].id,
      assigneeId: amina.id,
      creatorId: supervisor.id,
      source: "SUPERVISOR_ASSIGNED",
      status: "PENDING",
      title: "교익 방사선 촬영 실습",
      description: "3명의 환자에 대해 교익 방사선 촬영을 실시하고, 촬영 품질 평가 보고서 제출",
      checklist: [
        { text: "환자 1 교익 촬영", done: false },
        { text: "환자 2 교익 촬영", done: false },
        { text: "환자 3 교익 촬영", done: false },
        { text: "촬영 품질 자가평가", done: false },
      ],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      lessonId: c1Lessons[8].id,
      assigneeId: amina.id,
      creatorId: supervisor.id,
      source: "SUPERVISOR_ASSIGNED",
      status: "PENDING",
      title: "우식 분류 리포트",
      description: "실제 환자 3명의 우식 상태를 ICDAS 기준으로 분류하고 리포트 작성",
      checklist: [
        { text: "환자 1 ICDAS 분류", done: false },
        { text: "환자 2 ICDAS 분류", done: false },
        { text: "환자 3 ICDAS 분류", done: false },
        { text: "치료 필요도 서술", done: false },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Task Evidence
  await prisma.taskEvidence.createMany({
    data: [
      { taskId: task1.id, fileUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Periapical radiograph interpretation notes" } },
      { taskId: task1.id, fileUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Bitewing radiograph analysis" } },
      { taskId: task2.id, fileUrl: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Bitewing radiograph positioning documentation" } },
    ],
  });
  console.log("✅ Tasks: 3 with 3 evidence files");

  // ─── Verification Records ─────────────────────────────────────────────────
  await prisma.verificationRecord.createMany({
    data: [
      { userId: amina.id, type: "AI_L1", result: "PASS", entityType: "LessonProgress", entityId: c1Lessons[0].id, aiConfidence: 0.92, notes: "Automated verification passed" },
      { userId: amina.id, type: "AI_L1", result: "PASS", entityType: "QuizAttempt", entityId: c1Lessons[3].id, aiConfidence: 0.88, notes: "Quiz score meets threshold" },
      { userId: amina.id, type: "SUPERVISOR_L2", result: "PASS", entityType: "Task", entityId: task1.id, verifierId: supervisor.id, notes: "Good radiograph interpretation skills demonstrated" },
    ],
  });
  console.log("✅ Verification records: 3");

  // ─── Certificate Template + Issued ────────────────────────────────────────
  const certTemplate = await prisma.certificateTemplate.create({
    data: {
      name: "Course Completion Certificate",
      htmlTemplate: `<div style="text-align:center;padding:40px;border:3px solid #1a5632;font-family:serif"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>{{userName}}</h2><p>has successfully completed</p><h3>{{courseName}}</h3><p>Date: {{issueDate}}</p><p>Issue #: {{issueNumber}}</p></div>`,
    },
  });

  await prisma.issuedCertificate.create({
    data: {
      userId: amina.id,
      templateId: certTemplate.id,
      issueNumber: "CERT-2026-001",
      courseId: course1.id,
      verificationHash: "sha256-demo-hash-" + Date.now().toString(36),
      issuedAt: new Date(),
    },
  });
  console.log("✅ Certificate: 1 template, 1 issued");

  // ─── Dental Glossary (20 terms x 2 locales = 40 entries) ─────────────────
  const glossaryTerms = [
    { termKo: "치아우식증", termEn: "Dental Caries", defKo: "세균에 의한 산 생성으로 치아 경조직이 탈회되어 파괴되는 질환", defEn: "Disease in which bacterial acid production causes demineralization and destruction of tooth hard tissue", abbr: null },
    { termKo: "치주염", termEn: "Periodontitis", defKo: "치주인대와 치조골이 파괴되는 염증성 질환으로 치아 동요 및 상실 유발", defEn: "Inflammatory disease destroying periodontal ligament and alveolar bone, causing tooth mobility and loss", abbr: null },
    { termKo: "치은염", termEn: "Gingivitis", defKo: "치은(잇몸)에 국한된 염증으로 치주인대 파괴 없이 발적, 부종, 출혈이 나타남", defEn: "Inflammation limited to gingiva with redness, swelling, and bleeding without attachment loss", abbr: null },
    { termKo: "근관치료", termEn: "Root Canal Treatment", defKo: "감염되거나 괴사된 치수를 제거하고 근관을 세척, 성형, 충전하는 치료", defEn: "Treatment removing infected or necrotic pulp followed by canal cleaning, shaping, and obturation", abbr: "RCT" },
    { termKo: "교익 방사선", termEn: "Bitewing Radiograph", defKo: "상하악 치관부를 동시에 촬영하여 인접면 우식과 치조골 수준을 평가하는 방사선 사진", defEn: "Radiograph showing crowns of upper and lower teeth to evaluate proximal caries and alveolar bone levels", abbr: "BW" },
    { termKo: "치근단 방사선", termEn: "Periapical Radiograph", defKo: "치아 전체와 치근단 주위 조직을 보여주는 구내 방사선 사진", defEn: "Intraoral radiograph showing the entire tooth and periapical tissues", abbr: "PA" },
    { termKo: "치주낭", termEn: "Periodontal Pocket", defKo: "치은열구가 병적으로 깊어진 상태로 부착 소실을 동반", defEn: "Pathologically deepened gingival sulcus with clinical attachment loss", abbr: null },
    { termKo: "스케일링", termEn: "Scaling", defKo: "치석과 치태를 치아 표면에서 제거하는 시술", defEn: "Procedure removing calculus and plaque from tooth surfaces", abbr: null },
    { termKo: "치근활택술", termEn: "Root Planing", defKo: "치근면의 오염된 백악질과 치석을 제거하여 매끄러운 표면을 만드는 시술", defEn: "Procedure removing contaminated cementum and calculus from root surfaces to create smooth surface", abbr: "SRP" },
    { termKo: "치수", termEn: "Dental Pulp", defKo: "치아 내부의 혈관, 신경, 결합조직을 포함하는 연조직", defEn: "Soft tissue inside the tooth containing blood vessels, nerves, and connective tissue", abbr: null },
    { termKo: "상아질", termEn: "Dentin", defKo: "법랑질 아래에 있는 치아의 주요 경조직으로 치수를 둘러쌈", defEn: "Main hard tissue of the tooth beneath enamel that surrounds the pulp", abbr: null },
    { termKo: "법랑질", termEn: "Enamel", defKo: "치관 외표면을 덮는 인체에서 가장 단단한 조직", defEn: "Hardest tissue in the human body covering the outer surface of the tooth crown", abbr: null },
    { termKo: "치조골", termEn: "Alveolar Bone", defKo: "치아를 지지하는 상악과 하악의 골 조직", defEn: "Bone tissue of the maxilla and mandible that supports the teeth", abbr: null },
    { termKo: "불소도포", termEn: "Fluoride Varnish", defKo: "치아 표면에 고농도 불소를 도포하여 재광화를 촉진하고 우식을 예방하는 처치", defEn: "Application of concentrated fluoride to tooth surfaces to promote remineralization and prevent caries", abbr: null },
    { termKo: "실란트", termEn: "Dental Sealant", defKo: "구치 교합면의 열구와 소와를 레진으로 밀봉하여 우식을 예방하는 처치", defEn: "Resin coating applied to pits and fissures of posterior teeth to prevent caries", abbr: null },
    { termKo: "치수절단술", termEn: "Pulpotomy", defKo: "치관부 치수만 제거하고 치근부 치수를 보존하는 치료법 (주로 유치)", defEn: "Removal of coronal pulp while preserving radicular pulp vitality (mainly for primary teeth)", abbr: null },
    { termKo: "발치", termEn: "Extraction", defKo: "치아를 치조와에서 완전히 제거하는 외과적 시술", defEn: "Surgical procedure to completely remove a tooth from its alveolar socket", abbr: "Ext" },
    { termKo: "임플란트", termEn: "Dental Implant", defKo: "치조골에 식립하는 인공 치근으로 상부에 보철물을 장착하여 결손치를 대체", defEn: "Artificial root placed in alveolar bone to support prosthetic crown replacing missing tooth", abbr: null },
    { termKo: "파노라마 방사선", termEn: "Panoramic Radiograph", defKo: "상하악 전체를 한 장의 영상으로 촬영하는 구외 방사선 사진", defEn: "Extraoral radiograph capturing the entire maxilla and mandible in a single image", abbr: "OPG" },
    { termKo: "교합", termEn: "Occlusion", defKo: "상악과 하악 치아가 접촉하는 관계 및 기능적 움직임", defEn: "The relationship and functional movements when upper and lower teeth come into contact", abbr: null },
  ];

  for (const g of glossaryTerms) {
    await prisma.medicalGlossary.create({
      data: { term: g.termKo, locale: "ko", definition: g.defKo, abbreviation: g.abbr, isVerified: true, verifiedBy: admin.id },
    });
    await prisma.medicalGlossary.create({
      data: { term: g.termEn, locale: "en", definition: g.defEn, abbreviation: g.abbr, isVerified: true, verifiedBy: admin.id },
    });
  }
  console.log(`✅ Dental Glossary: ${glossaryTerms.length * 2} entries (${glossaryTerms.length} terms x 2 locales)`);

  // ─── Notifications ────────────────────────────────────────────────────────
  const notifDefs = [
    { title: "Welcome to MEDICHIPS-LINK!", body: "Start your dental learning journey with Dental Examination Fundamentals.", days: 10, status: "READ" as const },
    { title: "New badge earned: First Step", body: "Congratulations! You completed your first lesson.", days: 9, status: "READ" as const },
    { title: "5-day streak! Keep it up!", body: "You've been learning for 5 consecutive days. Great discipline!", days: 5, status: "READ" as const },
    { title: "Task assigned: Radiograph Interpretation", body: "Dr. Park Jihoon assigned you a new practical task.", days: 4, status: "DELIVERED" as const },
    { title: "Quiz Master badge earned!", body: "You scored 90%+ on 3 quizzes. Outstanding!", days: 3, status: "DELIVERED" as const },
    { title: "New course available: Periodontal Disease", body: "A new course on periodontal disease diagnosis and treatment is now available.", days: 1, status: "SENT" as const },
  ];

  for (const n of notifDefs) {
    await prisma.notification.create({
      data: {
        userId: amina.id,
        organizationId: org.id,
        channel: "IN_APP",
        status: n.status,
        title: n.title,
        body: n.body,
        sentAt: new Date(Date.now() - n.days * 24 * 60 * 60 * 1000),
        readAt: n.status === "READ" ? new Date(Date.now() - (n.days - 1) * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - n.days * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Notifications: ${notifDefs.length}`);

  // ─── Invite Code ──────────────────────────────────────────────────────────
  await prisma.inviteCode.create({
    data: {
      code: "SNUDENT2026",
      organizationId: org.id,
      role: "LEARNER",
      maxUses: 100,
      useCount: 1,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
    },
  });
  console.log("✅ Invite code: SNUDENT2026");

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete!\n");
  console.log("📋 Demo accounts:");
  console.log("   Admin:      james.ahn@medichips.ai / admin1234");
  console.log("   Learner:    amina@demo.medichips.ai / learner1234");
  console.log("   Supervisor: jihoon.park@demo.medichips.ai / super1234");
  console.log("   Learner 2:  fatima@demo.medichips.ai / learner1234");
  console.log("   Learner 3:  samuel@demo.medichips.ai / learner1234");
  console.log("   Learner 4:  grace@demo.medichips.ai / learner1234");
  console.log("   Learner 5:  ibrahim@demo.medichips.ai / learner1234");
  console.log("   Instructor: chen.wei@demo.medichips.ai / learner1234");
  console.log("   Invite:     SNUDENT2026");
  console.log(`\n📊 Data summary:`);
  console.log(`   Users: ${Object.keys(users).length}`);
  console.log(`   Courses: 3 (${c1Lessons.length + c2Lessons.length + c3Lessons.length} lessons)`);
  console.log(`   Content versions: ${c1Lessons.length + c2Lessons.length + c3Lessons.length}`);
  console.log(`   Enrollments: ${enrollments.length}`);
  console.log(`   XP entries: ${allXp.length}`);
  console.log(`   Badges: ${badgeDefs.length} defined, ${earnedBadges.length} earned`);
  console.log(`   Glossary terms: ${glossaryTerms.length * 2}`);
  console.log(`   Notifications: ${notifDefs.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
