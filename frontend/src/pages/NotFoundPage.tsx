import { Link } from "react-router";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">This page drifted out of orbit.</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The link may be old, or the address may be mistyped.
      </p>
      <Button asChild>
        <Link to="/">Back to the Overview</Link>
      </Button>
    </div>
  );
}
