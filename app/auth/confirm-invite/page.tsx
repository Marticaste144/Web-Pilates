import { Suspense } from "react";
import { Spinner } from "@/components/ui/skeleton";
import { ConfirmInviteClient } from "./confirm-invite-client";

export default function ConfirmInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-50 p-8">
          <Spinner />
        </main>
      }
    >
      <ConfirmInviteClient />
    </Suspense>
  );
}
