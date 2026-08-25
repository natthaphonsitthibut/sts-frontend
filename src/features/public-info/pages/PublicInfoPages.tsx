import { CheckCircle2, LockKeyhole, School, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "../../../components/base";
import { AppBrand } from "../../../components/layout/AppFrame";
import { cn } from "../../../lib/utils";

type PublicInfoPage = "about" | "privacy";

const POLICY_UPDATED_AT = "24 สิงหาคม 2569";

function PublicInfoLayout({
  activePage,
  children,
}: {
  activePage: PublicInfoPage;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-page text-slate-900">
      <a
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-primary"
        href="#main-content"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <AppBrand label="STS ระบบติดตามผู้เรียน" to="/about" />
          <div className="flex items-center gap-1 sm:gap-2">
            <nav
              aria-label="ข้อมูลเกี่ยวกับระบบ"
              className="flex items-center gap-1"
            >
              <Link
                aria-current={activePage === "about" ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  activePage === "about"
                    ? "bg-brand-soft text-primary-dark"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                to="/about"
              >
                เกี่ยวกับ STS
              </Link>
              <Link
                aria-current={activePage === "privacy" ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  activePage === "privacy"
                    ? "bg-brand-soft text-primary-dark"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                to="/privacy"
              >
                ความเป็นส่วนตัว
              </Link>
            </nav>
            <Link
              className={buttonVariants({ size: "sm", variant: "default" })}
              to="/login"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>STS ระบบติดตามช่วยเหลือนักเรียน (Zero Dropout)</p>
          <nav aria-label="ลิงก์ท้ายหน้า" className="flex items-center gap-4">
            <Link
              className="font-semibold text-primary hover:underline"
              to="/about"
            >
              เกี่ยวกับระบบ
            </Link>
            <Link
              className="font-semibold text-primary hover:underline"
              to="/privacy"
            >
              นโยบายความเป็นส่วนตัว
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: typeof School;
  title: string;
}) {
  return (
    <div className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary-dark">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-[70ch] text-sm leading-7 text-slate-600">
          {children}
        </p>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <PublicInfoLayout activePage="about">
      <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-3xl" aria-labelledby="about-heading">
          <p className="font-semibold text-primary">
            ระบบติดตามช่วยเหลือนักเรียน
          </p>
          <h1
            className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl"
            id="about-heading"
          >
            STS เชื่อมการเช็กชื่อเข้ากับการช่วยเหลือนักเรียนอย่างต่อเนื่อง
          </h1>
          <p className="mt-5 max-w-[70ch] text-base leading-8 text-slate-600">
            ระบบช่วยให้ครูและผู้บริหารมองเห็นการขาดเรียน ติดตามความเสี่ยง
            เปิดกรณีช่วยเหลือ ประสานการเยี่ยมบ้านหรือส่งต่อ
            และติดตามผลจนจบกระบวนการ
            เพื่อไม่ให้นักเรียนหลุดจากการดูแลโดยไม่มีใครทราบ
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className={buttonVariants({ size: "lg" })} to="/login">
              เข้าสู่ระบบ STS
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              to="/privacy"
            >
              อ่านนโยบายความเป็นส่วนตัว
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="system-purpose-heading"
          className="mt-12 rounded-lg border border-slate-200 bg-white p-6 sm:p-8"
        >
          <h2
            className="text-xl font-bold text-slate-950"
            id="system-purpose-heading"
          >
            ระบบนี้ทำอะไร
          </h2>
          <div className="mt-6 divide-y divide-slate-200">
            <FeatureRow
              icon={School}
              title="เชื่อมข้อมูลระดับโรงเรียนและห้องเรียน"
            >
              ครูทำงานตามโรงเรียน ชั้นเรียน และสิทธิ์ที่ได้รับ
              โดยระบบตรวจขอบเขตการเข้าถึงจากฝั่งเซิร์ฟเวอร์ทุกครั้ง
            </FeatureRow>
            <FeatureRow
              icon={CheckCircle2}
              title="ติดตามตั้งแต่การมาเรียนถึงการช่วยเหลือ"
            >
              ข้อมูลการเช็กชื่อเชื่อมต่อกับงานติดตาม กรณีช่วยเหลือ การเยี่ยมบ้าน
              และการทบทวนผล เพื่อให้การส่งต่องานมีความต่อเนื่อง
            </FeatureRow>
            <FeatureRow
              icon={ShieldCheck}
              title="ออกแบบสำหรับข้อมูลที่ต้องดูแลอย่างระมัดระวัง"
            >
              ผู้ใช้เห็นข้อมูลเท่าที่บทบาทและขอบเขตของตนอนุญาต
              พร้อมบันทึกเหตุการณ์สำคัญเพื่อรองรับการตรวจสอบ
            </FeatureRow>
          </div>
        </section>

        <section
          aria-labelledby="google-login-heading"
          className="mt-8 rounded-lg bg-brand-soft p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <LockKeyhole
              aria-hidden="true"
              className="mt-1 size-6 shrink-0 text-primary-dark"
            />
            <div>
              <h2
                className="text-xl font-bold text-slate-950"
                id="google-login-heading"
              >
                การเข้าสู่ระบบด้วย Google
              </h2>
              <p className="mt-3 max-w-[70ch] text-sm leading-7 text-slate-700">
                STS ขอเพียงข้อมูลระบุตัวตนพื้นฐาน ได้แก่รหัสบัญชี Google
                และอีเมลที่ผ่านการยืนยัน
                เพื่อเทียบกับข้อมูลครูและตรวจสิทธิ์ในโรงเรียน
                ระบบไม่ขอสิทธิ์อ่านหรือส่ง Gmail และไม่เข้าถึง Google Drive
                รายชื่อติดต่อ หรือปฏิทิน
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicInfoLayout>
  );
}

function PolicySection({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section
      className="scroll-mt-6 border-t border-slate-200 py-7 first:border-t-0 first:pt-0"
      id={id}
    >
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
        {children}
      </div>
    </section>
  );
}

export function PrivacyPolicyPage() {
  return (
    <PublicInfoLayout activePage="privacy">
      <div className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-3xl">
          <p className="font-semibold text-primary">STS</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
            นโยบายความเป็นส่วนตัว
          </h1>
          <p className="mt-4 max-w-[70ch] text-base leading-8 text-slate-600">
            เอกสารนี้อธิบายข้อมูลที่ระบบใช้ เหตุผลในการใช้ข้อมูล
            และทางเลือกของผู้ใช้เมื่อเข้าใช้งาน STS รวมถึงการเข้าสู่ระบบด้วย
            Google
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-600">
            ปรับปรุงล่าสุด: {POLICY_UPDATED_AT}
          </p>
        </header>

        <div className="mt-10 gap-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="สารบัญนโยบาย" className="mb-8 lg:mb-0">
            <div className="rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
              <p className="font-bold text-slate-900">สารบัญ</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  ["scope", "ขอบเขตของนโยบาย"],
                  ["data", "ข้อมูลที่ระบบใช้"],
                  ["purpose", "วัตถุประสงค์"],
                  ["google-data", "ข้อมูลจาก Google"],
                  ["sharing", "การเปิดเผยข้อมูล"],
                  ["retention", "ระยะเวลาการเก็บ"],
                  ["security", "การรักษาความมั่นคงปลอดภัย"],
                  ["rights", "สิทธิและการติดต่อ"],
                ].map(([id, label]) => (
                  <li key={id}>
                    <a
                      className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      href={`#${id}`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
            <PolicySection id="scope" title="1. ขอบเขตของนโยบาย">
              <p>
                นโยบายนี้ใช้กับระบบ STS
                และหน้าสาธารณะที่เกี่ยวข้องกับการเข้าสู่ระบบ การรับมอบหมายงาน
                การยืนยันตัวตนครู
                และการใช้งานตามสิทธิ์ของโรงเรียนหรือหน่วยงานต้นสังกัด
              </p>
            </PolicySection>

            <PolicySection id="data" title="2. ข้อมูลที่ระบบใช้">
              <ul className="list-disc space-y-2 pl-6 marker:text-slate-400">
                <li>
                  ข้อมูลบัญชีและสิทธิ์ เช่น ชื่อ อีเมล โรงเรียน บทบาท
                  และขอบเขตที่ได้รับอนุญาต
                </li>
                <li>
                  ข้อมูลการยืนยันตัวตน เช่น ผู้ให้บริการ รหัสอ้างอิงบัญชี
                  อีเมลที่ผ่านการยืนยัน และเวลาที่มีการยืนยันตัวตน
                </li>
                <li>
                  ข้อมูลการปฏิบัติงานในระบบตามหน้าที่ เช่น การเช็กชื่อ งานติดตาม
                  กรณีช่วยเหลือ รายงาน และประวัติการดำเนินการ
                </li>
                <li>
                  ข้อมูลทางเทคนิคและข้อมูลเซสชันเท่าที่จำเป็นต่อความปลอดภัยและการทำงานของระบบ
                </li>
              </ul>
            </PolicySection>

            <PolicySection id="purpose" title="3. วัตถุประสงค์ในการใช้ข้อมูล">
              <ul className="list-disc space-y-2 pl-6 marker:text-slate-400">
                <li>ยืนยันตัวตนและเทียบบัญชีกับข้อมูลครูที่ได้รับอนุญาต</li>
                <li>
                  บังคับใช้สิทธิ์ตามโรงเรียน ห้องเรียน บทบาท
                  และงานที่ได้รับมอบหมาย
                </li>
                <li>
                  สนับสนุนการติดตามการมาเรียนและกระบวนการช่วยเหลือนักเรียน
                </li>
                <li>
                  รักษาความปลอดภัย ป้องกันการใช้ลิงก์โดยมิชอบ
                  และรองรับการตรวจสอบเหตุการณ์สำคัญ
                </li>
                <li>ปรับปรุงความถูกต้องและความต่อเนื่องของบริการ</li>
              </ul>
            </PolicySection>

            <PolicySection id="google-data" title="4. การใช้ข้อมูลจาก Google">
              <p>
                เมื่อผู้ใช้เลือกเข้าสู่ระบบด้วย Google ระบบขอขอบเขตข้อมูลเพียง
                <span className="font-semibold text-slate-900"> openid </span>
                และ
                <span className="font-semibold text-slate-900"> email</span>
                เพื่อรับรหัสประจำบัญชี อีเมล
                และสถานะว่าอีเมลดังกล่าวผ่านการยืนยันแล้ว
              </p>
              <p>
                ข้อมูลนี้ใช้เพื่อจับคู่กับบัญชีครู ตรวจสถานะการเป็นครูในโรงเรียน
                และออกเซสชันสำหรับงานหรือลิงก์ที่ผู้ใช้มีสิทธิ์เท่านั้น STS
                ไม่ขอสิทธิ์อ่านหรือส่ง Gmail และไม่เข้าถึง Google Drive
                รายชื่อติดต่อ หรือปฏิทิน
              </p>
              <p>
                STS ไม่ขายข้อมูลจาก Google ไม่ใช้เพื่อโฆษณา
                และไม่ใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากที่ระบุไว้ในนโยบายนี้
              </p>
            </PolicySection>

            <PolicySection
              id="sharing"
              title="5. การเปิดเผยและผู้ประมวลผลข้อมูล"
            >
              <p>
                ข้อมูลจะแสดงแก่บุคลากรหรือผู้รับมอบหมายที่มีสิทธิ์ตามขอบเขตของโรงเรียนและหน้าที่เท่านั้น
                ระบบอาจใช้ผู้ให้บริการโครงสร้างพื้นฐานที่จำเป็นต่อการโฮสต์
                ฐานข้อมูล การสื่อสาร และการยืนยันตัวตน
                ภายใต้การควบคุมการเข้าถึงที่เหมาะสม
              </p>
              <p>
                อาจมีการเปิดเผยข้อมูลเมื่อกฎหมายกำหนด
                หรือเมื่อจำเป็นเพื่อปกป้องความปลอดภัย สิทธิ
                และความถูกต้องของบริการ
              </p>
            </PolicySection>

            <PolicySection id="retention" title="6. ระยะเวลาการเก็บรักษา">
              <p>
                ข้อมูลการเชื่อมโยงตัวตนจะเก็บเท่าที่บัญชียังได้รับอนุญาต
                หรือเท่าที่จำเป็นต่อความปลอดภัยและการตรวจสอบ
                เซสชันเข้าสู่ระบบมีอายุจำกัดตามการตั้งค่าระบบ
                ส่วนข้อมูลการปฏิบัติงานจะเก็บตามนโยบายของโรงเรียนหรือหน่วยงานต้นสังกัด
                และข้อกำหนดทางกฎหมายที่เกี่ยวข้อง
              </p>
            </PolicySection>

            <PolicySection id="security" title="7. การรักษาความมั่นคงปลอดภัย">
              <p>
                ระบบใช้การควบคุมสิทธิ์ตามบทบาทและขอบเขตโรงเรียน
                ตรวจสอบสิทธิ์จากเซิร์ฟเวอร์
                และจำกัดการใช้ลิงก์หรือเซสชันตามอายุและบริบทของงาน อย่างไรก็ตาม
                ไม่มีระบบอิเล็กทรอนิกส์ใดที่สามารถรับประกันความปลอดภัยได้ทั้งหมด
              </p>
            </PolicySection>

            <PolicySection
              id="rights"
              title="8. สิทธิของผู้ใช้และช่องทางติดต่อ"
            >
              <p>
                ผู้ใช้สามารถขอเข้าถึง แก้ไข ลบ จำกัด
                หรือคัดค้านการใช้ข้อมูลตามสิทธิที่กฎหมายกำหนด
                โดยติดต่อผู้ดูแลระบบหรือผู้ควบคุมข้อมูลส่วนบุคคลของโรงเรียนหรือหน่วยงานต้นสังกัด
                สำหรับปัญหาการเข้าสู่ระบบ
                สามารถติดต่ออีเมลสนับสนุนผู้ใช้ที่แสดงในหน้าขออนุญาต Google ของ
                STS
              </p>
              <p>
                นโยบายนี้อาจปรับปรุงเมื่อบริการหรือข้อกำหนดเปลี่ยนแปลง
                โดยจะแสดงวันที่ปรับปรุงล่าสุดไว้ที่ส่วนต้นของหน้า
              </p>
            </PolicySection>
          </article>
        </div>
      </div>
    </PublicInfoLayout>
  );
}
