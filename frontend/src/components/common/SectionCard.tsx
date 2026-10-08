import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** A frosted-glass card with a title row. Every dashboard panel uses this. */
export function SectionCard({
  title,
  icon: Icon,
  description,
  action,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        "bg-card/60 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150",
        className,
      )}
    >
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
          <span>{title}</span>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={bodyClassName}>{children}</CardContent>
    </Card>
  );
}
