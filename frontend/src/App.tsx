import { lazy } from "react";
import { Route, Routes } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import NotFoundPage from "@/pages/NotFoundPage";
import OverviewPage from "@/pages/OverviewPage";

// Secondary pages load on demand. The map and the charts are the heaviest code.
const IssPage = lazy(() => import("@/pages/IssPage"));
const PhotoPage = lazy(() => import("@/pages/PhotoPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="iss" element={<IssPage />} />
        <Route path="photo" element={<PhotoPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
