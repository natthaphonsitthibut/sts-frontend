import { getStudentAvatarGradient } from "../lib/student-presentation";

interface StudentAvatarProps {
  name: string;
}

export function StudentAvatar({ name }: StudentAvatarProps) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      style={getStudentAvatarGradient(name)}
    >
      {name?.[0] || "?"}
    </div>
  );
}
