import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  FormItem,
  FormLabel,
  Input,
  NumericInput,
  Select,
} from "../../../components/base";
import {
  useSaveCodedMasterData,
  useSaveReferralAgency,
} from "../hooks/useMasterData";
import type {
  CodedMasterDataItem,
  MasterDataCatalog,
  ReferralAgencyItem,
} from "../types/master-data.types";

interface MasterDataDialogProps {
  catalog: MasterDataCatalog;
  catalogLabel: string;
  categoryOptions: CodedMasterDataItem[];
  item: CodedMasterDataItem | ReferralAgencyItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  showCategory: boolean;
  showRequiresDetail: boolean;
  showSourceOnec: boolean;
}

export function MasterDataDialog({
  catalog,
  catalogLabel,
  categoryOptions,
  item,
  onOpenChange,
  open,
  showCategory,
  showRequiresDetail,
  showSourceOnec,
}: MasterDataDialogProps) {
  const coded = item && "code" in item ? item : null;
  const agency = item && "agencyName" in item ? item : null;
  const [code, setCode] = useState(coded?.code ?? "");
  const [labelTh, setLabelTh] = useState(coded?.labelTh ?? "");
  const [sortOrder, setSortOrder] = useState(String(coded?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(
    coded?.isActive ?? agency?.isActive ?? true,
  );
  const [categoryCode, setCategoryCode] = useState(coded?.categoryCode ?? "");
  const [sourceOnecCode, setSourceOnecCode] = useState(
    coded?.sourceOnecCode ? String(coded.sourceOnecCode) : "",
  );
  const [requiresDetail, setRequiresDetail] = useState(
    coded?.requiresDetail ?? false,
  );
  const [agencyName, setAgencyName] = useState(agency?.agencyName ?? "");
  const [agencyKindCode, setAgencyKindCode] = useState(
    agency?.agencyKindCode ?? categoryOptions[0]?.code ?? "",
  );
  const [contactPhone, setContactPhone] = useState(agency?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(agency?.contactEmail ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(agency?.websiteUrl ?? "");
  const [validationError, setValidationError] = useState("");
  const saveCoded = useSaveCodedMasterData();
  const saveAgency = useSaveReferralAgency();
  const isAgency = catalog === "referral-agencies";
  const initializedIdentity = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedIdentity.current = null;
      return;
    }
    const identity = `${catalog}:${agency?.id ?? coded?.code ?? "new"}`;
    if (initializedIdentity.current === identity) return;
    initializedIdentity.current = identity;
    setCode(coded?.code ?? "");
    setLabelTh(coded?.labelTh ?? "");
    setSortOrder(String(coded?.sortOrder ?? 0));
    setIsActive(coded?.isActive ?? agency?.isActive ?? true);
    setCategoryCode(coded?.categoryCode ?? "");
    setSourceOnecCode(
      coded?.sourceOnecCode ? String(coded.sourceOnecCode) : "",
    );
    setRequiresDetail(coded?.requiresDetail ?? false);
    setAgencyName(agency?.agencyName ?? "");
    setAgencyKindCode(agency?.agencyKindCode ?? categoryOptions[0]?.code ?? "");
    setContactPhone(agency?.contactPhone ?? "");
    setContactEmail(agency?.contactEmail ?? "");
    setWebsiteUrl(agency?.websiteUrl ?? "");
    setValidationError("");
  }, [agency, catalog, categoryOptions, coded, open]);

  function close(): void {
    saveCoded.reset();
    saveAgency.reset();
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) close();
    else onOpenChange(true);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setValidationError("");
    if (isAgency) {
      if (!agencyName.trim() || !agencyKindCode) {
        setValidationError("กรุณาระบุชื่อและประเภทหน่วยงาน");
        return;
      }
      saveAgency.mutate(
        {
          id: agency?.id ?? null,
          payload: {
            agencyName: agencyName.trim(),
            agencyKindCode,
            contactPhone: contactPhone.trim() || null,
            contactEmail: contactEmail.trim() || null,
            websiteUrl: websiteUrl.trim() || null,
            ...(agency ? { isActive } : {}),
          },
        },
        { onSuccess: close },
      );
      return;
    }
    const normalizedCode = code.trim().toUpperCase();
    const normalizedSort = Number(sortOrder);
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(normalizedCode)) {
      setValidationError("รหัสต้องเป็น A-Z, 0-9 หรือ _ และขึ้นต้นด้วยตัวอักษร");
      return;
    }
    if (
      !labelTh.trim() ||
      !Number.isInteger(normalizedSort) ||
      normalizedSort < 0
    ) {
      setValidationError("กรุณาระบุชื่อและลำดับแสดงผลให้ถูกต้อง");
      return;
    }
    saveCoded.mutate(
      {
        catalog: catalog as Exclude<MasterDataCatalog, "referral-agencies">,
        code: normalizedCode,
        isEdit: Boolean(coded),
        payload: {
          code: normalizedCode,
          labelTh: labelTh.trim(),
          sortOrder: normalizedSort,
          ...(coded ? { isActive } : {}),
          ...(showCategory ? { categoryCode: categoryCode || null } : {}),
          ...(showSourceOnec
            ? { sourceOnecCode: sourceOnecCode ? Number(sourceOnecCode) : null }
            : {}),
          ...(showRequiresDetail ? { requiresDetail } : {}),
        },
      },
      { onSuccess: close },
    );
  }

  const requestError = saveCoded.error ?? saveAgency.error;
  const pending = saveCoded.isPending || saveAgency.isPending;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onClose={close}
      >
        <DialogHeader>
          <DialogTitle>
            {item ? "แก้ไข" : "เพิ่ม"}
            {catalogLabel}
          </DialogTitle>
          <DialogDescription>
            รายการที่ถูกใช้งานแล้วจะปิดใช้งานแทนการลบ เพื่อรักษาประวัติอ้างอิง
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <DialogBody>
            {validationError ? (
              <p className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {validationError}
              </p>
            ) : null}
            <FormErrorAlert
              className="mb-4"
              error={requestError}
              fallback="บันทึกข้อมูลพื้นฐานไม่สำเร็จ"
            />
            {isAgency ? (
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormItem className="sm:col-span-2">
                  <FormLabel required htmlFor="agency-name">
                    ชื่อหน่วยงาน
                  </FormLabel>
                  <Input
                    id="agency-name"
                    maxLength={250}
                    onChange={(event) => setAgencyName(event.target.value)}
                    value={agencyName}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required htmlFor="agency-kind">
                    ประเภทหน่วยงาน
                  </FormLabel>
                  <Select
                    id="agency-kind"
                    onChange={(event) => setAgencyKindCode(event.target.value)}
                    value={agencyKindCode}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.labelTh}
                      </option>
                    ))}
                  </Select>
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="agency-phone">โทรศัพท์</FormLabel>
                  <Input
                    id="agency-phone"
                    maxLength={30}
                    onChange={(event) => setContactPhone(event.target.value)}
                    value={contactPhone}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="agency-email">อีเมล</FormLabel>
                  <Input
                    id="agency-email"
                    maxLength={254}
                    onChange={(event) => setContactEmail(event.target.value)}
                    type="email"
                    value={contactEmail}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="agency-website">เว็บไซต์</FormLabel>
                  <Input
                    id="agency-website"
                    maxLength={500}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://..."
                    type="url"
                    value={websiteUrl}
                  />
                </FormItem>
              </div>
            ) : (
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormItem>
                  <FormLabel required htmlFor="master-code">
                    รหัส
                  </FormLabel>
                  <Input
                    disabled={Boolean(coded)}
                    id="master-code"
                    maxLength={40}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                    placeholder="เช่น MINOR_ILLNESS"
                    value={code}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required htmlFor="master-label">
                    ชื่อภาษาไทย
                  </FormLabel>
                  <Input
                    id="master-label"
                    maxLength={200}
                    onChange={(event) => setLabelTh(event.target.value)}
                    value={labelTh}
                  />
                </FormItem>
                <FormItem>
                  <FormLabel required htmlFor="master-sort">
                    ลำดับแสดงผล
                  </FormLabel>
                  <NumericInput
                    id="master-sort"
                    min={0}
                    onChange={(event) => setSortOrder(event.target.value)}
                    value={sortOrder}
                  />
                </FormItem>
                {showCategory ? (
                  <FormItem>
                    <FormLabel
                      required={code !== "UNKNOWN"}
                      htmlFor="master-category"
                    >
                      ประเภทการขาด
                    </FormLabel>
                    <Select
                      id="master-category"
                      onChange={(event) => setCategoryCode(event.target.value)}
                      value={categoryCode}
                    >
                      <option value="">ไม่ระบุ</option>
                      {categoryOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.labelTh}
                        </option>
                      ))}
                    </Select>
                  </FormItem>
                ) : null}
                {showSourceOnec ? (
                  <FormItem>
                    <FormLabel htmlFor="master-source">
                      รหัสต้นทาง ONEC
                    </FormLabel>
                    <NumericInput
                      id="master-source"
                      min={1}
                      onChange={(event) =>
                        setSourceOnecCode(event.target.value)
                      }
                      value={sourceOnecCode}
                    />
                  </FormItem>
                ) : null}
                {showRequiresDetail ? (
                  <Checkbox
                    checked={requiresDetail}
                    label="ต้องระบุรายละเอียดเพิ่มเติม"
                    onChange={(event) =>
                      setRequiresDetail(event.target.checked)
                    }
                  />
                ) : null}
              </div>
            )}
            {item ? (
              <Checkbox
                className="mt-4"
                checked={isActive}
                label="เปิดใช้งาน"
                onChange={(event) => setIsActive(event.target.checked)}
              />
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button onClick={close} type="button" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={pending} loadingText="กำลังบันทึก" type="submit">
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
