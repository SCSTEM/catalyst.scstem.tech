import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function DetailView({
  onBack,
  icon,
  title,
  loading,
  error,
  emptyMessage,
  isEmpty,
  children,
}: {
  onBack: () => void;
  icon: ReactNode;
  title: string;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="neutral" size="sm" onClick={onBack}>
          <ArrowLeft />
        </Button>
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {loading && (
        <p className="text-center text-muted-foreground">Loading...</p>
      )}
      {error && <p className="text-center text-red-400">{error}</p>}
      {isEmpty && (
        <p className="text-center text-muted-foreground">{emptyMessage}</p>
      )}

      {!loading && !isEmpty && children}
    </div>
  );
}
