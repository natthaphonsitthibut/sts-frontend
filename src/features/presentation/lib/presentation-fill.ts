// Presentation shortcut — temporary. Sample answers for the case workflow
// forms so a presenter fills a whole form with one click. Every form tells
// the same story: a student keeps missing school because of untreated asthma,
// the teacher's visit finds it, the director refers the family to a children's
// hospital, the hospital reports the treatment, and the director closes. Remove the whole
// `features/presentation` folder (and each form's <PresentationFillBar />)
// once the presentation is over.
import type {
  AssistanceMeasureOption,
  CaseReviewAction,
  CaseTrackingOptions,
  ReferralAgencyOption,
} from "../../cases/types/cases.types";

interface PickOption {
  code: string;
  isExclusive?: boolean;
  requiresDetail?: boolean;
}

/** The given codes that exist in the catalog, else `fallback`. */
function pickCodes(
  options: readonly { code: string }[],
  wanted: readonly string[],
  fallback: string[],
): string[] {
  const found = wanted.filter((code) =>
    options.some((option) => option.code === code),
  );
  return found.length > 0 ? found : fallback;
}

/** Several answers for a multi-select: up to `count` ordinary ones plus the one that needs typing. */
function pickSeveral(options: readonly PickOption[], count: number): string[] {
  const pickable = options.filter((option) => !option.isExclusive);
  const ordinary = pickable
    .filter((option) => !option.requiresDetail)
    .slice(0, count);
  const withDetail = pickable.find((option) => option.requiresDetail);
  return [...ordinary, ...(withDetail ? [withDetail] : [])].map(
    (option) => option.code,
  );
}

function bangkokParts(date: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Bangkok",
      year: "numeric",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Chonburi city hall — used when the student's home has no saved pin.
const FALLBACK_COORDINATES = { lat: "13.3611", lng: "100.9847" };

export function homeVisitSample(
  options: CaseTrackingOptions | undefined,
  home: { lat?: number | null; lng?: number | null },
) {
  const now = bangkokParts(new Date(Date.now() - 60 * 60 * 1000));
  const absenceReason =
    options?.absenceReasons.find((reason) => reason.code === "MINOR_ILLNESS") ??
    options?.absenceReasons.find(
      (reason) => reason.categoryCode && reason.code !== "UNKNOWN",
    ) ??
    null;
  const contactChannel =
    options?.contactChannels.find((channel) => channel.code === "IN_PERSON") ??
    options?.contactChannels.find((channel) => !channel.requiresDetail) ??
    null;
  const guardianTypes = options?.guardianTypes ?? [];
  const guardianTypeCodes = pickCodes(
    guardianTypes,
    ["MOTHER", "MATERNAL_GRANDPARENT", "OTHER"],
    pickSeveral(guardianTypes, 2),
  );
  const residenceEnvironments = options?.residenceEnvironments ?? [];
  const residenceEnvironmentCodes = pickCodes(
    residenceEnvironments,
    ["NEAR_GATHERING_AREA", "OTHER"],
    pickSeveral(residenceEnvironments, 1),
  );
  return {
    values: {
      visitedDate: now.date,
      visitedTime: now.time,
      contactChannelCode: contactChannel?.code ?? "",
      contactChannelDetail: "",
      disadvantageTypeCodes: pickCodes(
        options?.disadvantageTypes ?? [],
        ["POVERTY", "ETHNIC_MINORITY"],
        [],
      ),
      disabilityTypeCodes: pickCodes(
        options?.disabilityTypes ?? [],
        ["PHYSICAL_HEALTH", "LEARNING"],
        [],
      ),
      problemCategoryCode: pickCodes(
        options?.followUpProblemCategories ?? [],
        ["HEALTH"],
        [""],
      )[0],
      absenceReasonCategoryCode: absenceReason?.categoryCode ?? "",
      absenceReasonCode: absenceReason?.code ?? "",
      parentalStatusCode: pickCodes(
        options?.parentalStatuses ?? [],
        ["LIVING_TOGETHER"],
        [options?.parentalStatuses[0]?.code ?? ""],
      )[0],
      guardianTypeCodes,
      guardianTypeDetail:
        "น้า (น้องสาวของแม่) อยู่บ้านเดียวกัน ช่วยพานักเรียนไปหาหมอเมื่อแม่ไปทำงาน",
      residenceEnvironmentCodes,
      residenceEnvironmentDetail:
        "บ้านไม้ชั้นเดียว อากาศถ่ายเทไม่ดี ใกล้บ้านมีการเผาขยะเป็นประจำ ฝุ่นควันทำให้อาการหอบหืดของนักเรียนกำเริบบ่อย",
      causeDetail:
        "พบนักเรียนและแม่ที่บ้าน นักเรียนเป็นโรคหอบหืด ช่วงนี้อาการกำเริบบ่อย หายใจลำบากตอนกลางคืนจนมาเรียนไม่ไหว ยาพ่นที่ได้จาก รพ.สต. หมดแล้วและไม่ได้ไปพบแพทย์ต่อเนื่องเพราะครอบครัวไม่มีค่าเดินทางเข้าโรงพยาบาลในเมือง ควรส่งต่อให้โรงพยาบาลตรวจรักษาและวางแผนการรักษาระยะยาว",
      homeVisitExceptionCode: "",
      updatedAddressLine: "",
      updatedAddressProvince: "",
      updatedAddressDistrict: "",
      updatedAddressSubDistrict: "",
      updatedPostalCode: "",
    },
    lat: home.lat != null ? String(home.lat) : FALLBACK_COORDINATES.lat,
    lng: home.lng != null ? String(home.lng) : FALLBACK_COORDINATES.lng,
  };
}

export const HOME_VISIT_EMPTY = {
  visitedDate: "",
  visitedTime: "",
  contactChannelCode: "",
  contactChannelDetail: "",
  disadvantageTypeCodes: [] as string[],
  disabilityTypeCodes: [] as string[],
  problemCategoryCode: "",
  absenceReasonCategoryCode: "",
  absenceReasonCode: "",
  parentalStatusCode: "",
  guardianTypeCodes: [] as string[],
  guardianTypeDetail: "",
  residenceEnvironmentCodes: [] as string[],
  residenceEnvironmentDetail: "",
  causeDetail: "",
  homeVisitExceptionCode: "",
  updatedAddressLine: "",
  updatedAddressProvince: "",
  updatedAddressDistrict: "",
  updatedAddressSubDistrict: "",
  updatedPostalCode: "",
};

export function assistanceSample() {
  const now = bangkokParts(new Date(Date.now() - 60 * 60 * 1000));
  return {
    assistedDate: now.date,
    assistedTime: now.time,
    executionOutcomeCode: "SUCCEEDED" as const,
    executionOutcomeDetail: "",
    assistanceDetail:
      "ประสานห้องพยาบาลให้เก็บยาพ่นสำรองของนักเรียนไว้ที่โรงเรียน จัดที่นั่งห่างจากจุดที่มีฝุ่น และให้ครูประจำวิชาส่งงานชดเชยวันที่ขาด นักเรียนมาเรียนสม่ำเสมอขึ้น",
  };
}

export const ASSISTANCE_EMPTY = {
  assistedDate: "",
  assistedTime: "",
  executionOutcomeCode: "" as "SUCCEEDED",
  executionOutcomeDetail: "",
  assistanceDetail: "",
};

export function assignmentSample(
  teacherId: string,
  measures: readonly AssistanceMeasureOption[],
) {
  const start = bangkokParts(new Date());
  const end = bangkokParts(new Date(Date.now() + 7 * DAY_MS));
  return {
    values: {
      startsOn: start.date,
      startsAt: start.time,
      endsOn: end.date,
      endsAt: "16:30",
      teacherId,
      note: "นักเรียนขาดเรียนครบ 3 วัน รบกวนครูประจำชั้นติดต่อผู้ปกครองและลงเยี่ยมบ้านเพื่อสอบถามสาเหตุและอาการเจ็บป่วย พร้อมบันทึกผลภายในสัปดาห์นี้",
    },
    measureCodes: pickSeveral(measures, 2),
    measureDetail:
      "เก็บยาพ่นสำรองไว้ที่ห้องพยาบาล และจัดสอนเสริมชดเชยวันที่ขาด",
  };
}

export const ASSIGNMENT_EMPTY = {
  startsOn: "",
  startsAt: "",
  endsOn: "",
  endsAt: "",
  teacherId: "",
  note: "",
};

const REVIEW_NOTES: Record<CaseReviewAction, string> = {
  CLOSE:
    "ตรวจรายงานผลจากโรงพยาบาลแล้ว นักเรียนได้รับการรักษาและมียาควบคุมอาการ มีนัดติดตามกับแพทย์ต่อเนื่อง และกลับมาเรียนตามปกติ ปิดเคส ให้ครูประจำชั้นติดตามการมาเรียนและอาการต่อไป",
  REFER_AGENCY:
    "นักเรียนป่วยเป็นโรคหอบหืดที่ยังไม่ได้รับการรักษาต่อเนื่อง และครอบครัวไม่มีค่าเดินทางไปโรงพยาบาล เกินกำลังที่โรงเรียนช่วยได้ ส่งต่อโรงพยาบาลเพื่อตรวจรักษาและวางแผนการรักษา",
  ASSIST:
    "นักเรียนมีอาการหอบหืดเป็นระยะ ให้โรงเรียนจัดมาตรการดูแลด้านสุขภาพและการเรียนชดเชยตามรายการที่เสนอ",
};

export function reviewSample(
  action: CaseReviewAction | null,
  measures: readonly AssistanceMeasureOption[],
) {
  return {
    note: action ? REVIEW_NOTES[action] : REVIEW_NOTES.CLOSE,
    measureCodes: action === "ASSIST" ? pickSeveral(measures, 2) : [],
    measureDetail:
      action === "ASSIST" ? "เก็บยาพ่นสำรองไว้ที่ห้องพยาบาลโรงเรียน" : "",
  };
}

export function referralSample(agencies: readonly ReferralAgencyOption[]) {
  const start = bangkokParts(new Date());
  const end = bangkokParts(new Date(Date.now() + 14 * DAY_MS));
  return {
    startsOn: start.date,
    startsAt: start.time,
    endsOn: end.date,
    endsAt: "16:30",
    agencyId: String(
      (
        agencies.find(
          (agency) => agency.agencyKindCode === "PUBLIC_HOSPITAL",
        ) ?? agencies[0]
      )?.id ?? "",
    ),
    note: "นักเรียนเป็นโรคหอบหืด อาการกำเริบบ่อยจนขาดเรียนต่อเนื่อง ยังไม่ได้พบแพทย์เพราะครอบครัวไม่มีค่าเดินทาง ขอความอนุเคราะห์โรงพยาบาลตรวจรักษา วางแผนการรักษาต่อเนื่อง และแนะนำการดูแลที่บ้านให้ผู้ปกครอง",
  };
}

export const REFERRAL_EMPTY = {
  startsOn: "",
  startsAt: "",
  endsOn: "",
  endsAt: "",
  agencyId: "",
  note: "",
};

export function referralReportSample() {
  return {
    resultCode: "SUCCEEDED" as const,
    actionDate: bangkokParts(new Date()).date,
    note: "แพทย์ตรวจและวินิจฉัยโรคหอบหืดชนิดเรื้อรัง จ่ายยาพ่นควบคุมอาการและยาพ่นฉุกเฉิน ให้คำแนะนำผู้ปกครองเรื่องการหลีกเลี่ยงฝุ่นควัน และนัดติดตามทุก 1 เดือน โดยประสานรถรับส่งของโรงพยาบาลให้ อาการดีขึ้นและนักเรียนกลับไปเรียนได้ตามปกติ",
  };
}

export const REFERRAL_REPORT_EMPTY = {
  resultCode: "" as const,
  actionDate: "",
  note: "",
};
