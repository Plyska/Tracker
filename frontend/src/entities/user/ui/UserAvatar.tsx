import { cn } from "@/shared/lib/cn";
import type { User } from "../model/types";

type AvatarUser = Pick<User, "name" | "email" | "avatarUrl">;

function initial(user: AvatarUser): string {
  const src = user.name?.trim() || user.email;
  return src.charAt(0).toUpperCase();
}

export function UserAvatar({
  user,
  className,
}: {
  user: AvatarUser;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 select-none items-center justify-center overflow-hidden",
        "rounded-full bg-primary text-sm font-medium text-primary-foreground",
        className,
      )}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        initial(user)
      )}
    </span>
  );
}
