"use client";
import { useSyncExternalStore } from "react";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// chisle: useSyncExternalStore is the hydration-safe "am I on the client" read;
// a never-changing subscription means server snapshot false, client snapshot true.
const subscribe = () => () => {};

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hasMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
