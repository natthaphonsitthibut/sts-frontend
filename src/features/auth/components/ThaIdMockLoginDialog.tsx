import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "../../../components/base";
import {
  thaidMockLoginSchema,
  type ThaIdMockLoginFormValues,
} from "../schemas/login.schema";
import {
  getThaIdMutationErrorMessage,
  useThaIdMockLogin,
} from "../hooks/useThaIdMockLogin";

interface ThaIdMockLoginDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ThaIdMockLoginDialog({
  onOpenChange,
  open,
}: ThaIdMockLoginDialogProps) {
  const thaidMutation = useThaIdMockLogin();
  const form = useForm<ThaIdMockLoginFormValues>({
    defaultValues: {
      personId: "",
    },
    resolver: zodResolver(thaidMockLoginSchema),
  });

  // Depend on the stable reset() references, not the whole form/mutation
  // objects — those get a fresh identity every render, which would re-fire
  // this effect on each render and trigger an infinite update loop.
  const { reset: resetForm } = form;
  const { reset: resetMutation } = thaidMutation;

  useEffect(() => {
    if (!open) {
      resetForm();
      resetMutation();
    }
  }, [open, resetForm, resetMutation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(92vw,420px)]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>ThaID Mock Login</DialogTitle>
          <DialogDescription>
            โหมดทดสอบ: กรอกเลขบัตรประชาชน 13 หลักเพื่อจำลองการเข้าสู่ระบบนักเรียน
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Form
            form={form}
            onSubmit={(values) => thaidMutation.mutate(values)}
          >
            <div className="space-y-4">
              <div className="min-h-[58px]">
                {thaidMutation.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {getThaIdMutationErrorMessage(thaidMutation.error)}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <FormItem>
                <FormLabel htmlFor="personId">เลขบัตรประชาชน</FormLabel>
                <Input
                  id="personId"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="กรอก PersonID_Onec 13 หลัก"
                  {...form.register("personId")}
                />
                <FormMessage<ThaIdMockLoginFormValues> name="personId" />
              </FormItem>

              <DialogFooter>
                <Button
                  disabled={thaidMutation.isPending}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="ghost"
                >
                  ยกเลิก
                </Button>
                <Button
                  isLoading={thaidMutation.isPending}
                  loadingText="กำลังเข้าสู่ระบบ"
                  type="submit"
                >
                  เข้าสู่ระบบ
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
