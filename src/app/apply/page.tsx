"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect legacy /apply route to /get-started */
export default function ApplyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/get-started");
  }, [router]);
  return null;
}
