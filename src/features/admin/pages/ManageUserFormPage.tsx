import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import {
  Button,
  Card,
  EMPTY_PHOTO_PICKER_VALUE,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  NumericInput,
  PasswordInput,
  PhotoPicker,
  registerField,
  type PhotoPickerValue,
} from "../../../components/base";
import {
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import { NavButton } from "../../../components/layout/nav-button";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { getApiErrorMessage } from "../../../lib/api-error";
import { resolveApiMediaUrl } from "../../../lib/media-url";
import { usePermissionCatalog } from "../../auth/hooks/usePermissionCatalog";
import { RoleGroupSelector } from "../components/RoleGroupSelector";
import { useRolesCatalog, useSaveUser, useUser } from "../hooks/useUsers";
import {
  EMPTY_USER_FORM,
  userFormSchema,
  type UserFormValues,
} from "../schemas/user.schema";
import type {
  ManagedUser,
  RoleDefinition,
  UserSavePayload,
} from "../types/admin.types";

const MANAGE_USERS_PATH = "/manage-users";

function toDefaults(user: ManagedUser | null): UserFormValues {
  if (!user) return EMPTY_USER_FORM;
  return {
    username: user.username,
    password: "",
    FirstName: user.FirstName ?? "",
    LastName: user.LastName ?? "",
    phone: user.phone ?? "",
    email: user.email ?? "",
    affiliation: user.affiliation ?? "",
    role: user.role || user.roles?.[0] || "",
  };
}

function UserForm({
  user,
  rolesCatalog,
}: {
  user: ManagedUser | null;
  rolesCatalog: RoleDefinition[];
}) {
  const navigate = useNavigate();
  const saveUser = useSaveUser();
  const isEdit = Boolean(user?.id);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [photo, setPhoto] = useState<PhotoPickerValue>(EMPTY_PHOTO_PICKER_VALUE);
  const { labelOf } = usePermissionCatalog();
  const form = useForm<UserFormValues>({
    defaultValues: toDefaults(user),
    resolver: zodResolver(userFormSchema),
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  const assignableRoleGroups = rolesCatalog.filter((role) => role.is_assignable);

  function goBack(): void {
    void navigate(MANAGE_USERS_PATH);
  }

  function handleSubmit(values: UserFormValues): void {
    const role = values.role.trim();
    const password = values.password.trim();
    const payload: UserSavePayload = {
      id: user?.id ?? null,
      username: values.username.trim(),
      FirstName: values.FirstName.trim(),
      LastName: values.LastName.trim(),
      // Kept from the stored record — the ref form does not collect it, and
      // sending an empty value would wipe an existing national id.
      PersonID_Onec: user?.PersonID_Onec ?? "",
      role,
      roles: [role],
      // Empty means "use the role group's standard permission set".
      permissions: [],
      status: user?.status || "ACTIVE",
      data_scope: user?.data_scope ?? {},
      phone: values.phone.trim(),
      email: values.email.trim(),
      affiliation: values.affiliation.trim(),
      ...(password ? { password } : {}),
    };

    saveUser.mutate(
      { id: user?.id ?? null, payload, photo: photo.file, removePhoto: photo.removed },
      {
        onSuccess: (response) => {
          if (!isEdit && response?.tempPassword) {
            setGeneratedPassword(response.tempPassword);
            return;
          }
          goBack();
        },
        onError: (error) => {
          const message = getApiErrorMessage(
            error,
            "บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล",
          );
          if (message.startsWith("ชื่อผู้ใช้งานนี้ถูกใช้แล้ว")) {
            form.setError("username", { type: "server", message });
          }
        },
      },
    );
  }

  return (
    <>
      <Form form={form} onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <UserRound className="size-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">ข้อมูลทั่วไป</h2>
          </div>

          <FormErrorAlert
            className="mb-4"
            error={saveUser.error}
            fallback="บันทึกผู้ใช้งานไม่สำเร็จ กรุณาตรวจสอบข้อมูล"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
            <PhotoPicker
              disabled={saveUser.isPending}
              label="รูปประจำตัวผู้ใช้งาน"
              onChange={setPhoto}
              storedUrl={resolveApiMediaUrl(user?.photo_url ?? null)}
              value={photo}
            />

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="FirstName" required>
                  ชื่อ
                </FormLabel>
                <Input
                  id="FirstName"
                  placeholder="ระบุชื่อผู้ใช้งาน"
                  {...registerField(form, "FirstName")}
                />
                <FormMessage<UserFormValues> name="FirstName" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="LastName" required>
                  นามสกุล
                </FormLabel>
                <Input
                  id="LastName"
                  placeholder="ระบุนามสกุลผู้ใช้งาน"
                  {...registerField(form, "LastName")}
                />
                <FormMessage<UserFormValues> name="LastName" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="email" required>
                  อีเมล
                </FormLabel>
                <Input
                  id="email"
                  placeholder="example@gmail.com"
                  type="email"
                  {...registerField(form, "email")}
                />
                <FormMessage<UserFormValues> name="email" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="phone" required>
                  เบอร์โทรศัพท์
                </FormLabel>
                <NumericInput
                  id="phone"
                  maxLength={10}
                  placeholder="XXXXXXXXXX"
                  {...registerField(form, "phone")}
                />
                <FormMessage<UserFormValues> name="phone" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="password" required={!isEdit}>
                  {isEdit ? "รหัสผ่าน (เว้นว่างเพื่อคงเดิม)" : "รหัสผ่าน"}
                </FormLabel>
                <PasswordInput
                  id="password"
                  placeholder="**********"
                  {...registerField(form, "password")}
                />
                <FormMessage<UserFormValues> name="password" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="affiliation" required>
                  สังกัด
                </FormLabel>
                <Input
                  id="affiliation"
                  placeholder="สังกัดหน่วยงาน"
                  {...registerField(form, "affiliation")}
                />
                <FormMessage<UserFormValues> name="affiliation" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="username" required>
                  ชื่อผู้ใช้งาน
                </FormLabel>
                <Input
                  id="username"
                  placeholder="ใช้สำหรับเข้าสู่ระบบ"
                  {...registerField(form, "username")}
                />
                <FormMessage<UserFormValues> name="username" />
              </FormItem>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="size-5 text-slate-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800">
              กำหนดสิทธิ์การเข้าถึง
            </h2>
          </div>
          <RoleGroupSelector
            disabled={saveUser.isPending}
            labelOf={labelOf}
            onChange={(role) =>
              form.setValue("role", role, {
                shouldValidate: form.formState.isSubmitted,
              })
            }
            roleGroups={assignableRoleGroups}
            value={selectedRole}
          />
          <FormMessage<UserFormValues> name="role" />
        </Card>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={goBack} size="lg" type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button
            isLoading={saveUser.isPending}
            loadingText="กำลังบันทึก"
            size="lg"
            type="submit"
          >
            บันทึก
          </Button>
        </div>
      </Form>

      <CredentialDialog
        onClose={() => {
          setGeneratedPassword("");
          goBack();
        }}
        open={Boolean(generatedPassword)}
        value={generatedPassword}
      />
    </>
  );
}

export function ManageUserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : null;
  const {
    data: user = null,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useUser(Number.isInteger(userId) ? userId : null);
  const {
    rolesCatalog,
    isLoading: isRolesLoading,
    isError: isRolesError,
    refetch: refetchRoles,
  } = useRolesCatalog();

  return (
    <PageShell>
      <PageToolbar
        description="กรอกข้อมูลผู้ใช้งานและกำหนดสิทธิ์การเข้าถึง"
        actions={
          <NavButton icon={ArrowLeft} to={MANAGE_USERS_PATH} variant="outline">
            ย้อนกลับ
          </NavButton>
        }
        title={isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
      />

      {isRolesLoading || (isEdit && isUserLoading && !user) ? (
        <Card className="p-6">
          <SkeletonStack lines={6} />
        </Card>
      ) : isRolesError ? (
        <ErrorState
          description="เกิดข้อผิดพลาดระหว่างโหลดกลุ่มสิทธิ์การเข้าถึง"
          onRetry={refetchRoles}
          title="ไม่สามารถโหลดข้อมูลบทบาทได้"
        />
      ) : isEdit && (isUserError || !user) ? (
        <ErrorState
          description="ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข"
          onRetry={() => void navigate(MANAGE_USERS_PATH)}
          retryLabel="กลับไปรายการผู้ใช้งาน"
          title="ไม่พบผู้ใช้งาน"
        />
      ) : (
        <UserForm rolesCatalog={rolesCatalog} user={user} />
      )}
    </PageShell>
  );
}
