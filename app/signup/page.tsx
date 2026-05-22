"use client";

import { Suspense } from "react";
import { AuthV2Experience } from "@/app/v2/auth/page";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F5EE] text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <AuthV2Experience initialMode="signup" />
    </Suspense>
  );
}
