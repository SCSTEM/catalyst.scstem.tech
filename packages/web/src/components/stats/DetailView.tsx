import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function DetailView({
  icon,
  title,
  loading,
  error,
  emptyMessage,
  isEmpty,
  children,
}: {
  icon: ReactNode;
  title: string;
  loading: boolean;
  error?: string;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {canGoBack ? (
          <Button
            variant="neutral"
            size="sm"
            onClick={() => router.history.back()}
          >
            <ArrowLeft />
          </Button>
        ) : null}
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-center text-red-400">{error}</p>
      ) : isEmpty ? (
        <p className="text-center text-muted-foreground">{emptyMessage}</p>
      ) : null}

      {!loading && !isEmpty ? children : null}
    </div>
  );
}
