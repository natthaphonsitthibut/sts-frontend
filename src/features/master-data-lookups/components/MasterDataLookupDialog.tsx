import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  Textarea,
  registerField,
} from "../../../components/base";
import { useSaveMasterDataLookup } from "../hooks/useMasterDataLookups";
import {
  masterDataLookupFormSchema,
  type MasterDataLookupFormValues,
} from "../schemas/master-data-lookup.schema";
import type {
  MasterDataLookup,
  MasterDataLookupConfig,
} from "../types/master-data-lookup.types";

const EMPTY_FORM: MasterDataLookupFormValues = {
  code: "",
  name: "",
  note: "",
  isActive: true,
  legalCategory: "",
  categoryId: "",
};

interface MasterDataLookupDialogProps {
  categories: MasterDataLookup[];
  config: MasterDataLookupConfig;
  lookup: MasterDataLookup | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function MasterDataLookupDialog({
  categories,
  config,
  lookup,
  onOpenChange,
  open,
}: MasterDataLookupDialogProps) {
  const saveLookup = useSaveMasterDataLookup();
  const schema = useMemo(() => masterDataLookupFormSchema(config), [config]);
  const form = useForm<MasterDataLookupFormValues>({
    defaultValues: EMPTY_FORM,
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      lookup
        ? {
            code: lookup.code,
            name: lookup.name,
            note: lookup.note ?? "",
            isActive: lookup.is_active ?? true,
            legalCategory: lookup.legal_category ?? "",
            categoryId: lookup.category_id == null ? "" : String(lookup.category_id),
          }
        : EMPTY_FORM,
    );
  }, [form, lookup, open]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) saveLookup.reset();
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: MasterDataLookupFormValues): void {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      note: values.note?.trim() || null,
      is_active: values.isActive,
      ...(config.hasLegalCategory
        ? { legal_category: values.legalCategory?.trim() || null }
        : {}),
      ...(config.hasCategory ? { category_id: Number(values.categoryId) } : {}),
    };

    saveLookup.mutate(
      {
        id: lookup?.id,
        table: config.table,
        payload,
        isEdit: Boolean(lookup),
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{lookup ? `แก้ไข${config.unitLabel}` : `เพิ่ม${config.unitLabel}`}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-4"
              error={saveLookup.error}
              fallback={`บันทึก${config.unitLabel}ไม่สำเร็จ`}
            />
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="lookup-code" required>รหัส</FormLabel>
                <Input id="lookup-code" {...registerField(form, "code")} />
                <FormMessage<MasterDataLookupFormValues> name="code" />
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="lookup-name" required>ชื่อ</FormLabel>
                <Input id="lookup-name" {...registerField(form, "name")} />
                <FormMessage<MasterDataLookupFormValues> name="name" />
              </FormItem>
              {config.hasLegalCategory ? (
                <FormItem>
                  <FormLabel htmlFor="lookup-legal-category">หมวดตามกฎหมาย</FormLabel>
                  <Input id="lookup-legal-category" {...registerField(form, "legalCategory")} />
                  <FormMessage<MasterDataLookupFormValues> name="legalCategory" />
                </FormItem>
              ) : null}
              {config.hasCategory ? (
                <FormItem>
                  <FormLabel htmlFor="lookup-category" required>หมวดเหตุผล</FormLabel>
                  <Select id="lookup-category" {...registerField(form, "categoryId")}>
                    <option value="">เลือกหมวดเหตุผล</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                  <FormMessage<MasterDataLookupFormValues> name="categoryId" />
                </FormItem>
              ) : null}
            </div>
            <FormItem>
              <FormLabel htmlFor="lookup-note">หมายเหตุ</FormLabel>
              <Textarea id="lookup-note" {...registerField(form, "note")} />
              <FormMessage<MasterDataLookupFormValues> name="note" />
            </FormItem>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Checkbox label="เปิดใช้งาน" {...registerField(form, "isActive")} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">
              ยกเลิก
            </Button>
            <Button isLoading={saveLookup.isPending} loadingText="กำลังบันทึก" type="submit">
              บันทึก
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
