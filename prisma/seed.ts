import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GCS = "https://storage.googleapis.com/medichips-link-assets/videos";
const VIDEOS = [
  `${GCS}/dental-resin-treatment.mp4`,       // 치과 레진 치료 교육
  `${GCS}/dental-production-workflow.mp4`,    // 영상 제작 요청 및 완료
  `${GCS}/dental-advanced-procedure.mp4`,     // 이어지는 영상 제작
];
let vi = 0;
const nextVid = () => VIDEOS[vi++ % VIDEOS.length];

const badgeIcon = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" x="50" text-anchor="middle" font-size="70">${emoji}</text></svg>`)}`;

type CT = "VIDEO" | "TEXT" | "QUIZ" | "MISSION";
interface LDef { mi: number; o: number; ko: string; en: string; t: CT; d: number; notes?: string; }

async function createLessonsWithContent(
  modules: { id: string }[],
  defs: LDef[],
  quizBodies: Record<number, object>,
  missionBodies: Record<number, object>,
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
        markdownContent: l.notes || `## ${l.en}\n\nKey learning objectives for this video lesson.`,
        notes: "Review this material before proceeding to the next lesson.",
      };
    } else if (l.t === "QUIZ") {
      body = quizBodies[i] || {
        questions: [
          { id: "q1", type: "multiple_choice", question: `What is the primary focus of ${l.en.toLowerCase()}?`, options: ["Correct answer", "Distractor A", "Distractor B", "Distractor C"], correctIndex: 0, explanation: "This is the correct approach based on dental clinical guidelines." },
        ],
        passingScore: 70, timeLimit: 300,
      };
    } else {
      // MISSION
      body = missionBodies[i] || {
        markdownContent: `## Mission: ${l.en}\n\nComplete the following practical tasks to demonstrate dental competency.`,
        checklist: [
          { text: "Complete assessment", required: true },
          { text: "Document findings", required: true },
          { text: "Submit evidence", required: true },
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

  const c1MissionBodies: Record<number, object> = {
    7: {
      markdownContent: "## Mission: 방사선 판독 실습\n\n실제 임상 환경에서 촬영된 방사선 사진 3장을 판독하고, 각각의 소견을 기록하세요.\n\n### 평가 기준\n- 해부학적 구조물 정확히 식별\n- 병변 위치 및 크기 기술\n- 감별 진단 2개 이상 제시\n- 추천 추가 검사 명시",
      checklist: [
        { text: "치근단 방사선 사진 판독 및 소견서 작성", required: true },
        { text: "교익 방사선 사진에서 인접면 우식 표시", required: true },
        { text: "파노라마 사진에서 비정상 소견 3개 이상 식별", required: true },
        { text: "판독 보고서를 지도교수에게 제출", required: true },
      ],
    },
  };

  const c1Lessons = await createLessonsWithContent(c1Mods, [
    { mi: 0, o: 0, ko: "구외 검사 및 TMJ 평가", en: "Extraoral Exam & TMJ Assessment", t: "VIDEO", d: 5,
      notes: "## 구외 검사 및 TMJ 평가\n\n### 학습 목표\n- 체계적인 구외 검사 순서를 수행할 수 있다\n- 측두하악관절(TMJ)의 촉진 및 청진법을 익힌다\n- 림프절 촉진을 통한 이상 소견을 감별한다\n\n### 핵심 포인트\n1. **대칭성 평가**: 안면 좌우 대칭, 부종, 변색 확인\n2. **TMJ 평가**: 개구 범위(정상 40-50mm), 편위, 관절잡음\n3. **림프절**: 이하선, 악하선, 경부 림프절 순서로 촉진" },
    { mi: 0, o: 1, ko: "구내 연조직 검사", en: "Intraoral Soft Tissue Examination", t: "VIDEO", d: 5,
      notes: "## 구내 연조직 검사\n\n### 학습 목표\n- 구강 내 연조직의 정상 해부학적 구조를 숙지한다\n- 이상 소견(궤양, 백반증, 홍반)을 식별한다\n- 구강암 조기 발견을 위한 선별검사를 수행한다\n\n### 검사 순서\n1. **구순 및 구순점막** → 2. **협점막** → 3. **경구개/연구개**\n4. **구인두** → 5. **혀(설배면/설측면/설하면)** → 6. **구저**" },
    { mi: 0, o: 2, ko: "치주 검사 및 치아 차트 작성", en: "Periodontal Exam & Dental Charting", t: "VIDEO", d: 4,
      notes: "## 치주 검사 및 치아 차트 작성\n\n### 학습 목표\n- 6점법 치주낭 측정을 정확히 수행한다\n- FDI 표기법으로 치아 차트를 작성한다\n- 치은퇴축, 동요도, 분지부 병변을 기록한다\n\n### 기록 항목\n- **치주낭 깊이**: 6점법 (MB, B, DB, ML, L, DL)\n- **치은퇴축**: 백악법랑경계(CEJ)부터 치은연까지\n- **동요도**: Miller 분류 (I, II, III도)\n- **BOP**: 탐침 시 출혈 유무" },
    { mi: 0, o: 3, ko: "구강 검진 퀴즈", en: "Oral Examination Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "치근단 방사선 촬영법", en: "Periapical Radiograph Technique", t: "VIDEO", d: 5,
      notes: "## 치근단 방사선 촬영법\n\n### 학습 목표\n- 평행촬영법과 등각촬영법의 원리를 이해한다\n- 부위별 최적 촬영 각도를 설정한다\n- 촬영 오류의 원인을 분석하고 교정한다\n\n### 평행촬영법 vs 등각촬영법\n| 항목 | 평행촬영법 | 등각촬영법 |\n|---|---|---|\n| 정확도 | 높음 | 보통 |\n| 왜곡 | 최소 | 신장/단축 가능 |\n| 기구 | 필름 홀더 필요 | 손가락 고정 가능 |" },
    { mi: 1, o: 1, ko: "교익 방사선 촬영 및 판독", en: "Bitewing Radiograph & Interpretation", t: "VIDEO", d: 7,
      notes: "## 교익 방사선 촬영 및 판독\n\n### 학습 목표\n- 교익 방사선의 적응증과 촬영 기법을 익힌다\n- 인접면 우식의 방사선학적 소견을 판독한다\n- 치조골 높이를 평가한다\n\n### 판독 체크리스트\n1. **인접면 우식**: 법랑질 내 / DEJ 통과 / 상아질 침범 구분\n2. **치조골 수준**: CEJ로부터 거리 측정\n3. **치석**: 치은연하 치석의 방사선 불투과상\n4. **수복물 하방**: 2차 우식 여부 확인" },
    { mi: 1, o: 2, ko: "파노라마 방사선 판독", en: "Panoramic Radiograph Interpretation", t: "VIDEO", d: 6,
      notes: "## 파노라마 방사선 판독\n\n### 학습 목표\n- 파노라마 영상의 정상 해부학적 구조를 식별한다\n- 체계적 판독 순서를 수행한다\n- 주요 병변(낭종, 종양, 골절)을 감별한다\n\n### 체계적 판독 순서\n1. **하악과두/TMJ** → 2. **상악동** → 3. **비강**\n4. **상악 치아** → 5. **하악 치아** → 6. **하악관**\n7. **설골** → 8. **경추**" },
    { mi: 1, o: 3, ko: "방사선 판독 실습 과제", en: "Radiograph Interpretation Practice Task", t: "MISSION", d: 5 },
    { mi: 2, o: 0, ko: "치아우식 분류 (ICDAS)", en: "Caries Classification (ICDAS)", t: "VIDEO", d: 5,
      notes: "## 치아우식 분류 (ICDAS)\n\n### 학습 목표\n- ICDAS 코드 0~6을 정확히 구분한다\n- 임상 사진에서 ICDAS 코드를 적용한다\n- 치료 결정에 ICDAS를 활용한다\n\n### ICDAS 분류\n| 코드 | 설명 |\n|---|---|\n| 0 | 건전한 치면 |\n| 1 | 건조 후 첫 시각적 변화 (white spot) |\n| 2 | 습윤 상태에서 시각적 변화 |\n| 3 | 국소적 법랑질 파괴 (상아질 노출 없음) |\n| 4 | 상아질 그림자 비침 |\n| 5 | 상아질 노출된 뚜렷한 와동 |\n| 6 | 광범위한 와동 (치수 근접) |" },
    { mi: 2, o: 1, ko: "우식 위험도 평가 (CRA)", en: "Caries Risk Assessment (CRA)", t: "VIDEO", d: 5,
      notes: "## 우식 위험도 평가 (CRA)\n\n### 학습 목표\n- 우식 발생의 위험 인자와 보호 인자를 분석한다\n- CAMBRA 프로토콜을 적용한다\n- 위험도에 따른 예방 전략을 수립한다\n\n### 위험 인자\n- **생물학적**: S. mutans 수, 타액 분비량 감소, 산성 pH\n- **행동적**: 당류 섭취 빈도, 불량한 구강위생, 불규칙한 치과 방문\n- **임상적**: 활성 우식 병소, 수복물 다수, 교정장치\n\n### 보호 인자\n- 불소 노출 (치약, 수돗물, 바니쉬)\n- 정상 타액 분비 및 완충능\n- 실란트 적용" },
    { mi: 2, o: 2, ko: "예방적 우식 관리", en: "Preventive Caries Management", t: "VIDEO", d: 5,
      notes: "## 예방적 우식 관리\n\n### 학습 목표\n- 초기 우식의 재광화 전략을 수립한다\n- 불소 도포의 종류와 적응증을 숙지한다\n- 실란트 시술 과정을 이해한다\n\n### 예방 전략 단계\n1. **저위험**: 불소 치약(1000ppm+), 6개월 정기검진\n2. **중위험**: 불소 바니시(22,600ppm) 3~6개월 간격, 자일리톨 껌\n3. **고위험**: 처방 불소(5000ppm 치약), 0.05% NaF 양치액, 3개월 정기검진, 치면열구전색" },
    { mi: 2, o: 3, ko: "우식 진단 퀴즈", en: "Caries Diagnosis Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "수복 재료 선택 원칙", en: "Restorative Material Selection Principles", t: "VIDEO", d: 5,
      notes: "## 수복 재료 선택 원칙\n\n### 학습 목표\n- 각 수복 재료의 물리적 특성과 적응증을 비교한다\n- 부위별 최적 재료를 선택한다\n- 환자 상황에 맞는 재료를 추천한다\n\n### 주요 수복 재료 비교\n| 재료 | 장점 | 단점 | 적응증 |\n|---|---|---|---|\n| 복합레진 | 심미적, 보존적 | 수축, 감수성 | 전치/소구치 |\n| GIC | 불소 방출, 접착 | 취약, 심미↓ | 유치, 5급 와동 |\n| 아말감 | 내구성, 경제적 | 비심미 | 구치부 대형 와동 |\n| 세라믹 | 심미, 내마모 | 고비용 | 인레이/크라운 |" },
    { mi: 3, o: 1, ko: "단계별 치료 계획 수립", en: "Phased Treatment Plan Development", t: "VIDEO", d: 4,
      notes: "## 단계별 치료 계획 수립\n\n### 학습 목표\n- 응급/질환조절/확정/유지 단계를 구분한다\n- 치료 우선순위를 결정한다\n- 환자별 맞춤 치료 계획서를 작성한다\n\n### 치료 단계\n1. **응급 단계**: 통증 해소, 감염 조절, 외상 처치\n2. **질환 조절**: 우식 제거, 스케일링/SRP, 잠정 수복\n3. **재평가**: 치주 상태 재검사, 치료 반응 평가\n4. **확정 수복**: 최종 수복물, 보철, 임플란트\n5. **유지관리**: 정기 검진, 예방 처치" },
    { mi: 3, o: 2, ko: "치료 계획 종합 퀴즈", en: "Treatment Planning Quiz", t: "QUIZ", d: 5 },
  ], c1QuizBodies, c1MissionBodies);

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
    { mi: 0, o: 0, ko: "치주질환 역학 및 위험 요인", en: "Periodontal Disease Epidemiology & Risk Factors", t: "VIDEO", d: 5,
      notes: "## 치주질환 역학 및 위험 요인\n\n### 학습 목표\n- 전 세계 치주질환 유병률과 공중보건 영향을 이해한다\n- 수정 가능/불가능 위험 인자를 구분한다\n- 전신질환과 치주질환의 관계를 설명한다\n\n### 주요 위험 인자\n- **흡연**: 치주질환 위험 5~7배 증가, 치료 반응 저하\n- **당뇨병**: HbA1c >7%일 때 치주 파괴 가속\n- **유전적 소인**: IL-1 유전자 다형성\n- **스트레스**: 코르티솔 증가 → 면역 반응 저하\n- **불량한 구강위생**: 치태 축적 → 치은염 → 치주염 진행" },
    { mi: 0, o: 1, ko: "치주 탐침 검사 기법", en: "Periodontal Probing Technique", t: "VIDEO", d: 5,
      notes: "## 치주 탐침 검사 기법\n\n### 학습 목표\n- WHO/UNC-15 탐침의 눈금을 활용한다\n- 6점법 탐침 기록을 정확히 수행한다\n- 탐침 오차를 최소화하는 기법을 습득한다\n\n### 탐침 기법\n1. **삽입 각도**: 치아 장축에 평행, 20~25g 압력\n2. **6점 측정**: MB, B, DB, ML, L, DL\n3. **기록**: 치주낭 깊이(PD), 치은퇴축(GR), 임상부착수준(CAL = PD + GR)\n4. **출혈(BOP)**: 탐침 후 30초 이내 출혈 유무\n\n### 주의사항\n- 과도한 힘 → 위양성 결과\n- 치석 하방 → 탐침 정지점 오류\n- 염증성 치은 → PD 과대평가 가능" },
    { mi: 0, o: 2, ko: "치주질환 분류 퀴즈", en: "Periodontal Classification Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "스케일링 및 치근활택술 (SRP)", en: "Scaling & Root Planing (SRP)", t: "VIDEO", d: 6,
      notes: "## 스케일링 및 치근활택술 (SRP)\n\n### 학습 목표\n- SRP의 목적과 적응증을 설명한다\n- Gracey 큐렛의 부위별 선택과 사용법을 익힌다\n- 시술 후 환자 교육 사항을 전달한다\n\n### Gracey 큐렛 선택\n| 부위 | 큐렛 번호 |\n|---|---|\n| 전치부 | Gracey 1/2, 3/4 |\n| 소구치 | Gracey 5/6 |\n| 구치부 협설면 | Gracey 7/8, 9/10 |\n| 구치부 근원심면 | Gracey 11/12, 13/14 |\n\n### 시술 프로토콜\n1. 국소마취 → 2. 치은연상 스케일링 → 3. 치은연하 SRP\n4. 치근면 활택 확인 → 5. 세척 → 6. 4~6주 재평가" },
    { mi: 1, o: 1, ko: "초음파 스케일러 vs 수동 스케일러", en: "Ultrasonic vs Hand Scalers", t: "VIDEO", d: 5,
      notes: "## 초음파 스케일러 vs 수동 스케일러\n\n### 학습 목표\n- 초음파/음파 스케일러의 작동 원리를 이해한다\n- 수동 기구와의 장단점을 비교한다\n- 임상 상황에 따른 최적 기구를 선택한다\n\n### 비교표\n| 항목 | 초음파 스케일러 | 수동 스케일러 |\n|---|---|---|\n| 효율성 | 빠름, 넓은 범위 | 느림, 정밀 |\n| 촉각 감각 | 제한적 | 우수 |\n| 환자 편의 | 소음, 수류 | 조용 |\n| 치근면 손상 | 주의 필요 | 최소 |\n| 에어로졸 | 많음 | 없음 |\n\n### 금기증 (초음파)\n- 심박조율기 환자(자력식), 전염성 질환, 미맹출치 주위" },
    { mi: 1, o: 2, ko: "국소 항균제 적용", en: "Local Antimicrobial Delivery", t: "VIDEO", d: 6,
      notes: "## 국소 항균제 적용\n\n### 학습 목표\n- SRP 보조요법으로서 국소 항균제의 역할을 이해한다\n- 주요 국소 항균제의 종류와 작용기전을 학습한다\n- 적용 기법과 환자 주의사항을 숙지한다\n\n### 주요 약제\n- **Minocycline microspheres (Arestin)**: 서방형, SRP 후 잔존 포켓\n- **Chlorhexidine chip (PerioChip)**: 2.5mg, 7~10일 약물 방출\n- **Doxycycline gel (Atridox)**: 10%, 7일간 서방출\n\n### 적응증\n- SRP 후 재평가 시 잔존 포켓 ≥5mm\n- 국소적으로 진행하는 부위\n- 전신 항생제가 부적절한 경우" },
    { mi: 2, o: 0, ko: "치주 판막 수술", en: "Periodontal Flap Surgery", t: "VIDEO", d: 5,
      notes: "## 치주 판막 수술\n\n### 학습 목표\n- 치주 판막 수술의 적응증과 금기증을 판단한다\n- Modified Widman Flap 술식을 이해한다\n- 술후 관리와 합병증 예방을 학습한다\n\n### 수술 순서\n1. **마취** → 2. **절개** (내사절개 + 열구절개)\n3. **판막 거상** (전층/부분층) → 4. **치근면 debridement**\n5. **골형태 수정** (필요시) → 6. **봉합** (단순/수평매트리스)\n\n### 술후 관리\n- 48시간 냉찜질, 부드러운 음식\n- 0.12% CHX 양치 2주간\n- 7~14일 후 발사\n- 4~6주 후 재평가" },
    { mi: 2, o: 1, ko: "골유도재생술 (GTR/GBR)", en: "Guided Tissue/Bone Regeneration", t: "VIDEO", d: 5,
      notes: "## 골유도재생술 (GTR/GBR)\n\n### 학습 목표\n- GTR/GBR의 생물학적 원리를 설명한다\n- 차폐막의 종류와 선택 기준을 이해한다\n- 골이식재의 분류와 적응증을 학습한다\n\n### 차폐막 분류\n| 유형 | 예시 | 장점 | 단점 |\n|---|---|---|---|\n| 비흡수성 | e-PTFE, Ti mesh | 공간 유지 | 2차 수술 필요 |\n| 흡수성 | 콜라겐막, PLA | 2차 수술 불필요 | 조기 흡수 우려 |\n\n### 골이식재\n- **자가골**: Gold standard, 골유도/골전도/골형성\n- **동종골 (DFDBA)**: BMP 함유, 면역 반응 낮음\n- **이종골 (Bio-Oss)**: 느린 흡수, 공간 유지\n- **합성골 (β-TCP, HA)**: 생체적합성, 무한 공급" },
    { mi: 2, o: 2, ko: "치주 수술 퀴즈", en: "Periodontal Surgery Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "치주 유지관리 프로토콜", en: "Periodontal Maintenance Protocol", t: "VIDEO", d: 5,
      notes: "## 치주 유지관리 프로토콜\n\n### 학습 목표\n- 치주 유지관리의 구성요소를 열거한다\n- 재발 위험에 따른 리콜 주기를 설정한다\n- 유지관리 실패 시 재치료 기준을 판단한다\n\n### 유지관리 방문 구성 (30~60분)\n1. **병력 업데이트**: 전신건강, 투약, 생활습관\n2. **치주 재검사**: PD, CAL, BOP 측정\n3. **방사선 평가**: 연 1회 또는 필요시\n4. **치은연상/연하 debridement**\n5. **불소 도포 및 구강위생 재교육\n\n### 리콜 주기\n- 안정기: 3개월 → 6개월으로 연장 가능\n- 불안정/위험 높음: 2~3개월 유지" },
    { mi: 3, o: 1, ko: "환자 구강위생 교육", en: "Patient Oral Hygiene Instruction", t: "VIDEO", d: 5,
      notes: "## 환자 구강위생 교육\n\n### 학습 목표\n- Modified Bass 칫솔질법을 교육한다\n- 치간 관리 도구(치실, 치간솔)를 추천한다\n- 환자 동기부여 기법(MI)을 적용한다\n\n### Modified Bass 칫솔질법\n1. 칫솔모를 치은연 45도로 위치\n2. 짧은 진동 운동 10~15초 (2~3개 치아)\n3. 교합면 방향으로 회전 이동\n4. 전치부 설면: 칫솔을 세워서 상하 운동\n\n### 치간 관리\n- **치실**: 건강한 치간유두, 좁은 치간 공간\n- **치간솔**: 치간유두 퇴축, 넓은 치간 공간 (사이즈 적합도 확인)\n- **워터플로서**: 보조적, 교정장치/임플란트 주위" },
    { mi: 3, o: 2, ko: "유지관리 퀴즈", en: "Maintenance Therapy Quiz", t: "QUIZ", d: 4 },
  ], c2QuizBodies, {});

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
    { mi: 0, o: 0, ko: "치수 생활력 검사", en: "Pulp Vitality Testing", t: "VIDEO", d: 5,
      notes: "## 치수 생활력 검사\n\n### 학습 목표\n- 온도 검사(냉자극/열자극)의 방법과 해석을 익힌다\n- EPT(전기 치수 검사)의 원리와 한계를 이해한다\n- 감별 진단 알고리즘을 수행한다\n\n### 검사 방법\n| 검사 | 방법 | 정상 반응 | 비정상 |\n|---|---|---|---|\n| 냉자극 | Endo-Ice 면구 | 짧은 통증 후 소실 | 지속통(>10초) 또는 무반응 |\n| 열자극 | 가열 GP, 온수 | 경미한 불편감 | 심한 통증 |\n| EPT | 점진적 전류 증가 | 수치 응답 | 무반응 = 괴사 의심 |\n| 타진 | 미러 핸들 수직/수평 | 불편감 없음 | 통증 = 치근단 염증 |" },
    { mi: 0, o: 1, ko: "치수 질환 분류", en: "Pulp Disease Classification", t: "VIDEO", d: 4,
      notes: "## 치수 질환 분류\n\n### 학습 목표\n- AAE 진단 분류 체계를 적용한다\n- 가역적/비가역적 치수염을 감별한다\n- 치근단 병변의 분류와 예후를 판단한다\n\n### 치수 진단 분류 (AAE 2009)\n1. **정상 치수**: 검사에 정상 반응\n2. **가역적 치수염**: 자극 제거 시 통증 소실, 보존적 치료\n3. **비가역적 치수염 (증상성)**: 자발통, 지속통, 열에 악화 → RCT\n4. **비가역적 치수염 (무증상성)**: 우식 깊지만 증상 없음 → RCT\n5. **치수 괴사**: EPT 무반응, 변색 → RCT\n6. **기 치료치**: 근관치료 이력\n\n### 치근단 진단\n- 정상 치근단 / 증상성 치근단염 / 무증상성 치근단염\n- 급성 치근단 농양 / 만성 치근단 농양 / 응축성 골염" },
    { mi: 0, o: 2, ko: "치수 진단 퀴즈", en: "Pulp Diagnosis Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "근관 접근 및 형성", en: "Access Cavity & Canal Shaping", t: "VIDEO", d: 6,
      notes: "## 근관 접근 및 형성\n\n### 학습 목표\n- 치아 유형별 접근 와동 형태를 설계한다\n- NiTi 회전 파일 시스템의 사용법을 익힌다\n- Working length 결정법을 수행한다\n\n### 접근 와동 형태\n| 치아 | 형태 | 근관 수 |\n|---|---|---|\n| 상악 전치 | 삼각형 (설면) | 1 |\n| 상악 소구치 | 타원형 | 1~2 |\n| 상악 대구치 | 삼각형 (교합면) | 3~4 (MB2!) |\n| 하악 대구치 | 사각형 | 3~4 |\n\n### NiTi 파일 사용 원칙\n1. **Glide path 확보** (K-file #10~#15)\n2. **Crown-down 접근법**\n3. **매 파일 교체 시 세척**\n4. **토크/속도 제조사 지침 준수**\n5. **일회용 사용 권장**" },
    { mi: 1, o: 1, ko: "근관 세척 프로토콜", en: "Irrigation Protocol", t: "VIDEO", d: 5,
      notes: "## 근관 세척 프로토콜\n\n### 학습 목표\n- NaOCl의 작용기전과 최적 농도를 이해한다\n- EDTA의 역할과 사용 순서를 학습한다\n- 안전한 세척 기법을 수행한다\n\n### 세척 프로토콜\n1. **NaOCl 2.5~5.25%**: 매 파일 교체 시, 2~3ml\n2. **17% EDTA**: 최종 세척, 도말층(smear layer) 제거, 1분\n3. **최종 NaOCl**: EDTA 후 잔류 세척\n4. **생리식염수**: 최종 린스\n\n### 세척 강화법\n- **수동 활성화**: K-file로 상하 운동\n- **초음파 활성화 (PUI)**: 세척 효과 극대화\n- **음압 세척 (EndoVac)**: 치근단 밖 압출 최소화\n\n### 안전 수칙\n- 근관 내 바늘 고착 금지 (passive insertion)\n- 측방 천공 바늘 사용\n- NaOCl 치근단 밖 압출 주의 (NaOCl accident)" },
    { mi: 1, o: 2, ko: "근관 형성 퀴즈", en: "Canal Shaping Quiz", t: "QUIZ", d: 4 },
    { mi: 2, o: 0, ko: "근관 충전 기법", en: "Obturation Techniques", t: "VIDEO", d: 5,
      notes: "## 근관 충전 기법\n\n### 학습 목표\n- 측방가압 충전법의 술식을 수행한다\n- 연속파 충전법(continuous wave)을 이해한다\n- 충전 후 방사선 평가 기준을 적용한다\n\n### 측방가압 충전법\n1. **Master cone 적합**: Working length에서 tug-back 확인\n2. **근관 건조**: Paper point로 흡습\n3. **실러 도포**: 근관벽에 얇게 도포\n4. **Master cone 삽입**\n5. **Spreader 삽입**: Master cone 옆 1~2mm 깊이까지\n6. **Accessory cone 추가**: 저항 느껴질 때까지 반복\n7. **치관부 절단**: 가열 기구로 근관 입구 수준에서 절단\n\n### 충전 품질 평가 (방사선)\n- 근첨 0.5~1mm 이내 충전\n- 치근관벽과 GP 사이 간극 없음\n- 근관 전체 균일한 충전" },
    { mi: 2, o: 1, ko: "근관치료 후 수복", en: "Post-Endodontic Restoration", t: "VIDEO", d: 5,
      notes: "## 근관치료 후 수복\n\n### 학습 목표\n- 잔존 치질량에 따른 수복 방법을 결정한다\n- 포스트(post) 사용의 적응증과 종류를 이해한다\n- 크라운 수복의 적응증과 시기를 판단한다\n\n### 수복 결정 알고리즘\n```\n잔존 치질 평가\n├─ 4벽 건전 → 직접 수복 (복합레진)\n├─ 2~3벽 건전 → 커스프 커버 (온레이/크라운)\n├─ 1벽 이하 → 포스트 + 코어 + 크라운\n└─ 수복 불가 → 발치 고려\n```\n\n### 포스트 종류\n| 유형 | 장점 | 단점 |\n|---|---|---|\n| Fiber post | 탄성계수 유사, 치근파절↓ | 유지력 보통 |\n| 주조 포스트 | 정밀 적합 | 응력 집중, 치근파절 위험 |\n\n### 타이밍\n- 근관치료 직후 코어 빌드업 (세균 침투 방지)\n- 크라운 인상: 증상 소실 확인 후 2~4주" },
    { mi: 2, o: 2, ko: "충전 및 수복 퀴즈", en: "Obturation & Restoration Quiz", t: "QUIZ", d: 4 },
  ], c3QuizBodies, {});

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
