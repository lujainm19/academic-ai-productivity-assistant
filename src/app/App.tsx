import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { LandingPage } from "./components/landing-page";
import { DashboardPage } from "./components/dashboard-page";
import { TaskPlannerPage } from "./components/task-planner-page";
import { FocusSessionPage } from "./components/focus-session-page";
import { ProgressPage } from "./components/progress-page";
import { CustomizationPage } from "./components/customization-page";
import { AIPanelPage } from "./components/ai-panel-page";
import { AppLayout } from "./components/app-layout";
import { AIEngineProvider } from "./components/ai-engine-context";
import { LocalDataProvider } from "./components/local-data-context";
import { CustomizationProvider } from "./components/customization-context";

export default function App() {
  return (
    <div className="size-full dark">
      <BrowserRouter>
        <LocalDataProvider>
          <CustomizationProvider>
            <AIEngineProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/focus" element={<FocusSessionPage />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/tasks" element={<TaskPlannerPage />} />
                  <Route path="/ai" element={<AIPanelPage />} />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route path="/customize" element={<CustomizationPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AIEngineProvider>
          </CustomizationProvider>
        </LocalDataProvider>
      </BrowserRouter>
    </div>
  );
}