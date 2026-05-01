import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AdminStatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: "emerald" | "sky" | "amber" | "rose" | "slate";
};

const toneClasses = {
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
};

export function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "emerald",
}: AdminStatCardProps) {
  return (
    <Card className="bg-white/90">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
          <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
