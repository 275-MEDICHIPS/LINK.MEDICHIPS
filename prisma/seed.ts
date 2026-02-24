import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];
let vi = 0;
const nextVid = () => VIDEOS[vi++ % VIDEOS.length];

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
        markdownContent: `## ${l.en}\n\nKey learning objectives for this video lesson.\n\n- Understand core concepts\n- Apply clinical reasoning\n- Practice hands-on skills`,
        notes: "Review this material before proceeding to the next lesson.",
      };
    } else if (l.t === "TEXT") {
      body = {
        markdownContent: `## ${l.en}\n\n### Overview\n\nThis lesson covers essential knowledge for clinical practice.\n\n### Key Points\n\n1. **Systematic approach** — Follow established protocols\n2. **Clinical correlation** — Always correlate with patient presentation\n3. **Documentation** — Record findings accurately\n\n### Summary\n\nApply these principles consistently in your clinical practice.`,
      };
    } else if (l.t === "QUIZ") {
      body = quizBodies[i] || {
        questions: [
          { id: "q1", type: "multiple_choice", question: `What is the primary focus of ${l.en.toLowerCase()}?`, options: ["Correct answer", "Distractor A", "Distractor B", "Distractor C"], correctIndex: 0, explanation: "This is the correct approach based on clinical guidelines." },
          { id: "q2", type: "multiple_choice", question: "Which finding requires immediate attention?", options: ["Critical finding", "Normal variant", "Benign finding", "Expected result"], correctIndex: 0, explanation: "Critical findings require immediate clinical action." },
          { id: "q3", type: "multiple_choice", question: "What is the recommended next step?", options: ["Follow protocol", "Wait and observe", "Repeat test", "Discharge"], correctIndex: 0, explanation: "Following established protocol ensures patient safety." },
        ],
        passingScore: 70,
        timeLimit: 300,
      };
    } else {
      body = {
        markdownContent: `## Mission: ${l.en}\n\nComplete the following practical tasks to demonstrate competency.\n\n### Instructions\n\n1. Follow the checklist below\n2. Document each step with evidence\n3. Submit for supervisor review`,
        checklist: [
          { text: "Complete initial assessment", required: true },
          { text: "Document findings", required: true },
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
  console.log("🌱 Seeding comprehensive demo data...\n");

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
      name: "서울대학교병원 국제진료센터",
      slug: "snuh-global",
      description: "Seoul National University Hospital - Global Medical Education",
      logoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&h=200&fit=crop",
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

  // ─── Medical Specialties ──────────────────────────────────────────────────
  const specDefs = [
    { name: "Internal Medicine", desc: "General internal medicine and diagnostics", icon: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=64&h=64&fit=crop" },
    { name: "Cardiology", desc: "Heart and cardiovascular system", icon: "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=64&h=64&fit=crop" },
    { name: "Endocrinology", desc: "Hormones and metabolic disorders", icon: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=64&h=64&fit=crop" },
    { name: "Nephrology", desc: "Kidney diseases and renal function", icon: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=64&h=64&fit=crop" },
    { name: "Pulmonology", desc: "Respiratory system disorders", icon: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=64&h=64&fit=crop" },
  ];
  const specialties: Record<string, { id: string }> = {};
  for (const s of specDefs) {
    specialties[s.name] = await prisma.medicalSpecialty.create({
      data: { name: s.name, description: s.desc, iconUrl: s.icon },
    });
  }
  console.log("✅ Medical Specialties: 5 created");

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 1: Internal Medicine Fundamentals
  // ═══════════════════════════════════════════════════════════════════════════
  const course1 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "internal-medicine-basics",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=450&fit=crop",
      estimatedHours: 8,
      translations: {
        create: [
          { locale: "ko", title: "내과 기본 진료", description: "내과 의사를 위한 기본 진료 프로토콜. 환자 병력 청취, 신체검사, 기본 검사 오더 및 해석." },
          { locale: "en", title: "Internal Medicine Fundamentals", description: "Essential clinical protocols for internal medicine. Patient history, physical examination, basic lab orders and interpretation." },
        ],
      },
    },
  });

  const c1ModDefs = [
    { ko: "환자 병력 청취", en: "Patient History Taking" },
    { ko: "신체 검사 기본", en: "Physical Examination Basics" },
    { ko: "기본 검사 오더 및 해석", en: "Basic Lab Orders & Interpretation" },
    { ko: "초기 치료 계획 수립", en: "Initial Treatment Planning" },
  ];
  const c1Mods: { id: string }[] = [];
  for (let i = 0; i < c1ModDefs.length; i++) {
    c1Mods.push(await prisma.module.create({
      data: { courseId: course1.id, orderIndex: i, translations: { create: [{ locale: "ko", title: c1ModDefs[i].ko }, { locale: "en", title: c1ModDefs[i].en }] } },
    }));
  }

  const c1QuizBodies: Record<number, object> = {
    3: { // History Taking Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What does 'OPQRST' stand for in pain assessment?", options: ["Onset, Provocation, Quality, Region, Severity, Timing", "Origin, Pain, Quantity, Relief, Symptoms, Treatment", "Observation, Palpation, Quality, Range, Scale, Type", "Onset, Position, Quantity, Radiation, Signs, Timing"], correctIndex: 0, explanation: "OPQRST is a standard mnemonic for comprehensive pain assessment." },
        { id: "q2", type: "multiple_choice", question: "Which question is best for eliciting the chief complaint?", options: ["What brought you in today?", "Do you have chest pain?", "Are you taking medications?", "Have you been hospitalized before?"], correctIndex: 0, explanation: "Open-ended questions allow patients to describe their main concern." },
        { id: "q3", type: "multiple_choice", question: "When documenting HPI, which element is essential?", options: ["Duration of symptoms", "Patient's occupation", "Insurance information", "Next of kin"], correctIndex: 0, explanation: "Duration helps establish acuity and guides differential diagnosis." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    11: { // Lab Interpretation Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What does an elevated MCV (>100 fL) in CBC suggest?", options: ["Macrocytic anemia (B12/folate deficiency)", "Iron deficiency anemia", "Thalassemia", "Anemia of chronic disease"], correctIndex: 0, explanation: "Elevated MCV indicates macrocytosis, commonly from B12 or folate deficiency." },
        { id: "q2", type: "multiple_choice", question: "Which ALT level pattern suggests hepatocellular injury?", options: ["ALT > 10x upper normal limit", "ALT slightly elevated with high ALP", "Normal ALT with elevated bilirubin", "Isolated GGT elevation"], correctIndex: 0, explanation: "ALT >10x ULN indicates significant hepatocellular damage." },
        { id: "q3", type: "multiple_choice", question: "A BUN/Creatinine ratio >20:1 suggests?", options: ["Pre-renal azotemia", "Intrinsic renal disease", "Post-renal obstruction", "Normal kidney function"], correctIndex: 0, explanation: "High BUN/Cr ratio indicates pre-renal cause like dehydration or heart failure." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    14: { // Treatment Planning Quiz
      questions: [
        { id: "q1", type: "multiple_choice", question: "What is the first step in creating a treatment plan?", options: ["Establish the diagnosis", "Order medications", "Schedule follow-up", "Write discharge summary"], correctIndex: 0, explanation: "An accurate diagnosis is the foundation of any treatment plan." },
        { id: "q2", type: "multiple_choice", question: "When prescribing a new medication, which check is most important?", options: ["Drug allergies and interactions", "Brand vs generic", "Pill color preference", "Pharmacy location"], correctIndex: 0, explanation: "Allergy and interaction checks prevent adverse drug events." },
        { id: "q3", type: "multiple_choice", question: "What should a discharge plan always include?", options: ["Follow-up appointment and warning signs", "Hospital cafeteria menu", "Nurse contact info only", "Insurance billing codes"], correctIndex: 0, explanation: "Patients must know when to follow up and what symptoms require urgent care." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c1Lessons = await createLessonsWithContent(c1Mods, [
    { mi: 0, o: 0, ko: "주요 증상(CC) 파악하기", en: "Identifying Chief Complaint", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "현병력(HPI) 수집 기법", en: "History of Present Illness Technique", t: "VIDEO", d: 5 },
    { mi: 0, o: 2, ko: "과거력 및 사회력 청취", en: "Past & Social History", t: "TEXT", d: 4 },
    { mi: 0, o: 3, ko: "병력 청취 퀴즈", en: "History Taking Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "활력징후 측정 및 해석", en: "Vital Signs Assessment", t: "VIDEO", d: 5 },
    { mi: 1, o: 1, ko: "흉부 청진 기법", en: "Chest Auscultation Technique", t: "VIDEO", d: 7 },
    { mi: 1, o: 2, ko: "복부 진찰 순서", en: "Abdominal Examination Steps", t: "VIDEO", d: 6 },
    { mi: 1, o: 3, ko: "신체 검사 실습 과제", en: "Physical Exam Practice Task", t: "MISSION", d: 5 },
    { mi: 2, o: 0, ko: "CBC 해석 기본", en: "CBC Interpretation Basics", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "간기능 검사(LFT) 해석", en: "Liver Function Test Interpretation", t: "TEXT", d: 5 },
    { mi: 2, o: 2, ko: "신기능 검사 및 전해질", en: "Renal Function & Electrolytes", t: "TEXT", d: 5 },
    { mi: 2, o: 3, ko: "검사 해석 퀴즈", en: "Lab Interpretation Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "약물 처방 기본 원칙", en: "Medication Prescribing Principles", t: "VIDEO", d: 5 },
    { mi: 3, o: 1, ko: "환자 교육 및 퇴원 계획", en: "Patient Education & Discharge Plan", t: "TEXT", d: 4 },
    { mi: 3, o: 2, ko: "치료 계획 종합 퀴즈", en: "Treatment Planning Quiz", t: "QUIZ", d: 5 },
  ], c1QuizBodies);

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 2: Diabetes Diagnosis & Management
  // ═══════════════════════════════════════════════════════════════════════════
  const course2 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "diabetes-management",
      riskLevel: "L2",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800&h=450&fit=crop",
      estimatedHours: 6,
      translations: {
        create: [
          { locale: "ko", title: "당뇨병 진단과 관리", description: "2형 당뇨병의 진단 기준, 혈당 조절 목표, 경구 약제 선택, 인슐린 요법 및 합병증 선별검사." },
          { locale: "en", title: "Diabetes Diagnosis & Management", description: "Type 2 diabetes diagnostic criteria, glycemic targets, oral agents, insulin therapy, and complication screening." },
        ],
      },
    },
  });

  const c2ModDefs = [
    { ko: "당뇨병 진단 기준", en: "Diabetes Diagnostic Criteria" },
    { ko: "경구 혈당 강하제", en: "Oral Hypoglycemic Agents" },
    { ko: "인슐린 요법", en: "Insulin Therapy" },
    { ko: "합병증 선별 및 관리", en: "Complication Screening & Management" },
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
        { id: "q1", type: "multiple_choice", question: "What fasting plasma glucose level confirms diabetes?", options: ["≥ 126 mg/dL on two occasions", "≥ 100 mg/dL", "≥ 140 mg/dL", "≥ 200 mg/dL"], correctIndex: 0, explanation: "FPG ≥126 mg/dL on two separate tests confirms diabetes diagnosis." },
        { id: "q2", type: "multiple_choice", question: "What HbA1c level is diagnostic for diabetes?", options: ["≥ 6.5%", "≥ 5.7%", "≥ 7.0%", "≥ 8.0%"], correctIndex: 0, explanation: "HbA1c ≥6.5% is diagnostic per ADA guidelines." },
        { id: "q3", type: "multiple_choice", question: "The 2-hour OGTT threshold for diabetes is?", options: ["≥ 200 mg/dL", "≥ 140 mg/dL", "≥ 180 mg/dL", "≥ 250 mg/dL"], correctIndex: 0, explanation: "2-hour plasma glucose ≥200 mg/dL during 75g OGTT confirms diabetes." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    8: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "When should basal insulin be initiated in T2DM?", options: ["When HbA1c remains above target despite dual oral therapy", "At initial diagnosis for all patients", "Only when fasting glucose > 300", "After complications develop"], correctIndex: 0, explanation: "Basal insulin is added when oral agents fail to achieve glycemic targets." },
        { id: "q2", type: "multiple_choice", question: "What is the typical starting dose for basal insulin?", options: ["10 units or 0.1-0.2 U/kg/day", "1 unit/kg/day", "50 units daily", "5 units with each meal"], correctIndex: 0, explanation: "Starting low and titrating up reduces hypoglycemia risk." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    11: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "How often should diabetic retinopathy screening occur?", options: ["Annually after diagnosis for T2DM", "Every 5 years", "Only if symptoms occur", "Monthly"], correctIndex: 0, explanation: "Annual dilated eye exams are recommended for all T2DM patients." },
        { id: "q2", type: "multiple_choice", question: "What is the preferred test for diabetic nephropathy screening?", options: ["Urine albumin-to-creatinine ratio (UACR)", "Serum creatinine only", "24-hour urine collection", "Renal ultrasound"], correctIndex: 0, explanation: "UACR detects microalbuminuria early in diabetic kidney disease." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c2Lessons = await createLessonsWithContent(c2Mods, [
    { mi: 0, o: 0, ko: "당뇨병 분류와 역학", en: "Diabetes Classification & Epidemiology", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "진단 검사: FPG, OGTT, HbA1c", en: "Diagnostic Tests: FPG, OGTT, HbA1c", t: "TEXT", d: 5 },
    { mi: 0, o: 2, ko: "진단 기준 퀴즈", en: "Diagnostic Criteria Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "메트포르민 1차 치료", en: "Metformin as First-Line Therapy", t: "VIDEO", d: 6 },
    { mi: 1, o: 1, ko: "설포닐유레아와 DPP-4 억제제", en: "Sulfonylureas & DPP-4 Inhibitors", t: "TEXT", d: 5 },
    { mi: 1, o: 2, ko: "SGLT2 억제제와 GLP-1 수용체 작용제", en: "SGLT2 Inhibitors & GLP-1 Receptor Agonists", t: "VIDEO", d: 6 },
    { mi: 2, o: 0, ko: "기저 인슐린 시작하기", en: "Initiating Basal Insulin", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "인슐린 용량 조절", en: "Insulin Dose Titration", t: "TEXT", d: 5 },
    { mi: 2, o: 2, ko: "인슐린 요법 퀴즈", en: "Insulin Therapy Quiz", t: "QUIZ", d: 4 },
    { mi: 3, o: 0, ko: "당뇨병성 망막병증 선별", en: "Diabetic Retinopathy Screening", t: "VIDEO", d: 5 },
    { mi: 3, o: 1, ko: "당뇨병성 신증 및 신경병증", en: "Diabetic Nephropathy & Neuropathy", t: "TEXT", d: 5 },
    { mi: 3, o: 2, ko: "합병증 관리 퀴즈", en: "Complication Management Quiz", t: "QUIZ", d: 4 },
  ], c2QuizBodies);

  // ═══════════════════════════════════════════════════════════════════════════
  // COURSE 3: Hypertension Diagnosis & Drug Therapy
  // ═══════════════════════════════════════════════════════════════════════════
  const course3 = await prisma.course.create({
    data: {
      organizationId: org.id,
      slug: "hypertension-management",
      riskLevel: "L1",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
      thumbnailUrl: "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&h=450&fit=crop",
      estimatedHours: 5,
      translations: {
        create: [
          { locale: "ko", title: "고혈압 진단과 약물 치료", description: "고혈압 단계별 분류, 생활습관 교정, 1차 약제 선택 알고리즘, 저항성 고혈압 접근." },
          { locale: "en", title: "Hypertension Diagnosis & Drug Therapy", description: "BP staging, lifestyle modification, first-line medication algorithm, resistant hypertension approach." },
        ],
      },
    },
  });

  const c3ModDefs = [
    { ko: "고혈압 분류 및 진단", en: "HTN Classification & Diagnosis" },
    { ko: "항고혈압제 선택", en: "Antihypertensive Selection" },
    { ko: "저항성 고혈압 접근", en: "Resistant Hypertension" },
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
        { id: "q1", type: "multiple_choice", question: "Stage 1 hypertension is defined as BP of?", options: ["130-139/80-89 mmHg", "120-129/<80 mmHg", "140-159/90-99 mmHg", "≥160/≥100 mmHg"], correctIndex: 0, explanation: "Per ACC/AHA 2017 guidelines, stage 1 HTN is 130-139/80-89." },
        { id: "q2", type: "multiple_choice", question: "How many BP readings are needed to confirm hypertension?", options: ["At least 2 readings on 2+ separate occasions", "One elevated reading", "3 readings in one visit", "Weekly readings for a month"], correctIndex: 0, explanation: "Diagnosis requires multiple elevated readings on separate occasions." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    5: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "Which is a first-line antihypertensive class?", options: ["ACE inhibitors", "Alpha blockers", "Centrally-acting agents", "Direct vasodilators"], correctIndex: 0, explanation: "ACE inhibitors, ARBs, CCBs, and thiazides are first-line agents." },
        { id: "q2", type: "multiple_choice", question: "Which antihypertensive is preferred in a diabetic patient with proteinuria?", options: ["ACE inhibitor or ARB", "Beta blocker", "Calcium channel blocker", "Thiazide diuretic"], correctIndex: 0, explanation: "ACEi/ARBs provide renal protection through reduction of glomerular pressure." },
      ],
      passingScore: 70, timeLimit: 300,
    },
    8: {
      questions: [
        { id: "q1", type: "multiple_choice", question: "Resistant hypertension is defined as BP above goal despite?", options: ["3 drugs including a diuretic at optimal doses", "1 drug at maximum dose", "2 drugs of different classes", "Any 3 drugs"], correctIndex: 0, explanation: "Must include a diuretic in the 3-drug regimen to qualify as resistant HTN." },
        { id: "q2", type: "multiple_choice", question: "What should be ruled out first in resistant hypertension?", options: ["Medication non-adherence and white-coat effect", "Renal artery stenosis", "Pheochromocytoma", "Primary aldosteronism"], correctIndex: 0, explanation: "Pseudo-resistance from non-adherence or white-coat effect is most common." },
      ],
      passingScore: 70, timeLimit: 300,
    },
  };

  const c3Lessons = await createLessonsWithContent(c3Mods, [
    { mi: 0, o: 0, ko: "혈압 측정 표준 방법", en: "Standard BP Measurement Method", t: "VIDEO", d: 5 },
    { mi: 0, o: 1, ko: "고혈압 단계 분류 (ACC/AHA)", en: "HTN Staging (ACC/AHA Guidelines)", t: "TEXT", d: 4 },
    { mi: 0, o: 2, ko: "고혈압 진단 퀴즈", en: "HTN Diagnosis Quiz", t: "QUIZ", d: 3 },
    { mi: 1, o: 0, ko: "1차 약제: ACEi, ARB, CCB, 이뇨제", en: "First-Line: ACEi, ARB, CCB, Thiazides", t: "VIDEO", d: 6 },
    { mi: 1, o: 1, ko: "동반 질환별 약제 선택", en: "Drug Selection by Comorbidity", t: "TEXT", d: 5 },
    { mi: 1, o: 2, ko: "항고혈압제 퀴즈", en: "Antihypertensive Quiz", t: "QUIZ", d: 4 },
    { mi: 2, o: 0, ko: "저항성 고혈압 정의 및 원인", en: "Resistant HTN Definition & Causes", t: "VIDEO", d: 5 },
    { mi: 2, o: 1, ko: "2차성 고혈압 감별", en: "Secondary Hypertension Workup", t: "TEXT", d: 5 },
    { mi: 2, o: 2, ko: "저항성 고혈압 퀴즈", en: "Resistant HTN Quiz", t: "QUIZ", d: 4 },
  ], c3QuizBodies);

  console.log(`✅ Courses: 3 (${c1Lessons.length + c2Lessons.length + c3Lessons.length} lessons, all with content)`);

  // ─── Course Specialty Tags ────────────────────────────────────────────────
  await prisma.courseSpecialtyTag.createMany({
    data: [
      { courseId: course1.id, specialtyId: specialties["Internal Medicine"].id },
      { courseId: course1.id, specialtyId: specialties["Pulmonology"].id },
      { courseId: course2.id, specialtyId: specialties["Endocrinology"].id },
      { courseId: course2.id, specialtyId: specialties["Internal Medicine"].id },
      { courseId: course2.id, specialtyId: specialties["Nephrology"].id },
      { courseId: course3.id, specialtyId: specialties["Cardiology"].id },
      { courseId: course3.id, specialtyId: specialties["Internal Medicine"].id },
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
      title: "활력징후 측정 실습 보고",
      description: "실제 환자의 활력징후(혈압, 맥박, 체온, 호흡수)를 측정하고 사진과 함께 기록 제출",
      checklist: [
        { text: "혈압 측정 (양팔)", done: true },
        { text: "맥박 측정 (60초)", done: true },
        { text: "체온 측정", done: false },
        { text: "호흡수 측정", done: false },
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
      title: "흉부 청진 소견 기록",
      description: "3명의 환자에 대해 흉부 청진을 실시하고, 정상/비정상 소견을 구분하여 기록 제출",
      checklist: [
        { text: "환자 1 청진 소견", done: false },
        { text: "환자 2 청진 소견", done: false },
        { text: "환자 3 청진 소견", done: false },
        { text: "비정상 소견 감별 기록", done: false },
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
      title: "CBC 결과 해석 리포트",
      description: "실제 환자 CBC 결과 3건을 해석하고, 임상적 의의를 서술",
      checklist: [
        { text: "CBC 결과 1 해석", done: false },
        { text: "CBC 결과 2 해석", done: false },
        { text: "CBC 결과 3 해석", done: false },
        { text: "임상 연관성 서술", done: false },
      ],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Task Evidence
  await prisma.taskEvidence.createMany({
    data: [
      { taskId: task1.id, fileUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Blood pressure measurement - right arm" } },
      { taskId: task1.id, fileUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Pulse rate measurement" } },
      { taskId: task2.id, fileUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&h=400&fit=crop", fileType: "image/jpeg", metadata: { description: "Chest auscultation documentation" } },
    ],
  });
  console.log("✅ Tasks: 3 with 3 evidence files");

  // ─── Verification Records ─────────────────────────────────────────────────
  await prisma.verificationRecord.createMany({
    data: [
      { userId: amina.id, type: "AI_L1", result: "PASS", entityType: "LessonProgress", entityId: c1Lessons[0].id, aiConfidence: 0.92, notes: "Automated verification passed" },
      { userId: amina.id, type: "AI_L1", result: "PASS", entityType: "QuizAttempt", entityId: c1Lessons[3].id, aiConfidence: 0.88, notes: "Quiz score meets threshold" },
      { userId: amina.id, type: "SUPERVISOR_L2", result: "PASS", entityType: "Task", entityId: task1.id, verifierId: supervisor.id, notes: "Good technique demonstrated in vital signs measurement" },
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

  // ─── Medical Glossary (20 terms x 2 locales = 40 entries) ─────────────────
  const glossaryTerms = [
    { termKo: "혈압", termEn: "Blood Pressure", defKo: "심장이 수축할 때(수축기)와 이완할 때(이완기) 혈관 벽에 가해지는 압력", defEn: "The force of blood pushing against artery walls during systole and diastole", abbr: "BP" },
    { termKo: "맥박", termEn: "Pulse", defKo: "심장 박동에 따른 동맥의 규칙적인 확장과 수축", defEn: "The rhythmic expansion and contraction of an artery with each heartbeat", abbr: null },
    { termKo: "청진", termEn: "Auscultation", defKo: "청진기를 사용하여 체내 소리를 듣는 진찰 방법", defEn: "Listening to sounds within the body using a stethoscope", abbr: null },
    { termKo: "전혈구검사", termEn: "Complete Blood Count", defKo: "백혈구, 적혈구, 혈소판의 수와 형태를 측정하는 기본 혈액 검사", defEn: "Basic blood test measuring counts and morphology of white cells, red cells, and platelets", abbr: "CBC" },
    { termKo: "간기능검사", termEn: "Liver Function Test", defKo: "AST, ALT, ALP, 빌리루빈 등 간의 기능 상태를 평가하는 검사", defEn: "Tests evaluating liver function including AST, ALT, ALP, and bilirubin levels", abbr: "LFT" },
    { termKo: "크레아티닌", termEn: "Creatinine", defKo: "근육 대사의 부산물로 신장 기능 평가에 사용되는 지표", defEn: "A waste product of muscle metabolism used to evaluate kidney function", abbr: "Cr" },
    { termKo: "당화혈색소", termEn: "Glycated Hemoglobin", defKo: "최근 2-3개월간의 평균 혈당을 반영하는 검사 수치", defEn: "A measure reflecting average blood glucose levels over the past 2-3 months", abbr: "HbA1c" },
    { termKo: "공복혈당", termEn: "Fasting Plasma Glucose", defKo: "최소 8시간 금식 후 측정한 혈중 포도당 농도", defEn: "Blood glucose concentration measured after at least 8 hours of fasting", abbr: "FPG" },
    { termKo: "경구포도당부하검사", termEn: "Oral Glucose Tolerance Test", defKo: "75g 포도당 섭취 후 2시간 뒤 혈당을 측정하는 당뇨병 진단 검사", defEn: "Diabetes diagnostic test measuring blood glucose 2 hours after ingesting 75g glucose", abbr: "OGTT" },
    { termKo: "메트포르민", termEn: "Metformin", defKo: "2형 당뇨병의 1차 치료제로 간의 포도당 생성을 억제하는 약물", defEn: "First-line T2DM medication that reduces hepatic glucose production", abbr: null },
    { termKo: "인슐린", termEn: "Insulin", defKo: "췌장 베타세포에서 분비되는 혈당 조절 호르몬", defEn: "Blood glucose-regulating hormone secreted by pancreatic beta cells", abbr: null },
    { termKo: "고혈압", termEn: "Hypertension", defKo: "지속적으로 혈압이 130/80 mmHg 이상인 상태", defEn: "Persistently elevated blood pressure at or above 130/80 mmHg", abbr: "HTN" },
    { termKo: "ACE 억제제", termEn: "ACE Inhibitor", defKo: "안지오텐신 전환 효소를 억제하여 혈압을 낮추는 약물 계열", defEn: "Drug class that lowers blood pressure by inhibiting angiotensin-converting enzyme", abbr: "ACEi" },
    { termKo: "ARB", termEn: "Angiotensin Receptor Blocker", defKo: "안지오텐신 II 수용체를 차단하여 혈관을 확장시키는 항고혈압제", defEn: "Antihypertensive that blocks angiotensin II receptors to dilate blood vessels", abbr: "ARB" },
    { termKo: "이뇨제", termEn: "Diuretic", defKo: "신장에서 나트륨과 수분 배출을 증가시켜 혈압을 낮추는 약물", defEn: "Drug that increases sodium and water excretion from kidneys to lower blood pressure", abbr: null },
    { termKo: "저혈당", termEn: "Hypoglycemia", defKo: "혈중 포도당 농도가 70 mg/dL 미만으로 감소한 상태", defEn: "Blood glucose level below 70 mg/dL requiring treatment", abbr: null },
    { termKo: "당뇨병성 망막병증", termEn: "Diabetic Retinopathy", defKo: "당뇨병에 의한 망막 혈관 손상으로 시력 저하를 유발하는 합병증", defEn: "Diabetes-related retinal vascular damage that can cause vision loss", abbr: "DR" },
    { termKo: "신증", termEn: "Nephropathy", defKo: "신장 기능 장애를 일으키는 질환의 총칭", defEn: "A general term for diseases that cause kidney damage and dysfunction", abbr: null },
    { termKo: "심전도", termEn: "Electrocardiogram", defKo: "심장의 전기적 활동을 기록하는 비침습적 검사", defEn: "Non-invasive test recording the electrical activity of the heart", abbr: "ECG/EKG" },
    { termKo: "활력징후", termEn: "Vital Signs", defKo: "체온, 맥박, 호흡수, 혈압 등 신체의 기본 기능을 나타내는 측정값", defEn: "Measurements of basic body functions: temperature, pulse, respiratory rate, blood pressure", abbr: "V/S" },
  ];

  for (const g of glossaryTerms) {
    await prisma.medicalGlossary.create({
      data: { term: g.termKo, locale: "ko", definition: g.defKo, abbreviation: g.abbr, isVerified: true, verifiedBy: admin.id },
    });
    await prisma.medicalGlossary.create({
      data: { term: g.termEn, locale: "en", definition: g.defEn, abbreviation: g.abbr, isVerified: true, verifiedBy: admin.id },
    });
  }
  console.log(`✅ Medical Glossary: ${glossaryTerms.length * 2} entries (${glossaryTerms.length} terms x 2 locales)`);

  // ─── Notifications ────────────────────────────────────────────────────────
  const notifDefs = [
    { title: "Welcome to MEDICHIPS-LINK!", body: "Start your learning journey with Internal Medicine Fundamentals.", days: 10, status: "READ" as const },
    { title: "New badge earned: First Step", body: "Congratulations! You completed your first lesson.", days: 9, status: "READ" as const },
    { title: "5-day streak! Keep it up!", body: "You've been learning for 5 consecutive days. Great discipline!", days: 5, status: "READ" as const },
    { title: "Task assigned: Vital Signs Practice", body: "Dr. Park Jihoon assigned you a new practical task.", days: 4, status: "DELIVERED" as const },
    { title: "Quiz Master badge earned!", body: "You scored 90%+ on 3 quizzes. Outstanding!", days: 3, status: "DELIVERED" as const },
    { title: "New course available: Diabetes Management", body: "A new course on diabetes diagnosis and management is now available.", days: 1, status: "SENT" as const },
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
      code: "SNUH2026",
      organizationId: org.id,
      role: "LEARNER",
      maxUses: 100,
      useCount: 1,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdBy: admin.id,
    },
  });
  console.log("✅ Invite code: SNUH2026");

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
  console.log("   Invite:     SNUH2026");
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
