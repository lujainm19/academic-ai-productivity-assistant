import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { LandingPage } from "./components/landing-page";
import { TaskPlannerPage } from "./components/task-planner-page";
import { FocusSessionPage } from "./components/focus-session-page";
import { SettingsPage } from "./components/settings-page";
import { AIPanelPage } from "./components/ai-panel-page";
import { AppLayout } from "./components/app-layout";
import { AIEngineProvider } from "./components/ai-engine-context";
import { LocalDataProvider } from "./components/local-data-context";
import { CustomizationProvider } from "./components/customization-context";
import { FocusCanvasProvider } from "./components/focus-canvas-context";
import { AppAuthProvider } from "./components/app-auth-context";

export default function App() {
  return (
    <div className="size-full dark">
      <BrowserRouter>
        <LocalDataProvider>
          <CustomizationProvider>
            <AIEngineProvider>
              <AppAuthProvider>
                <FocusCanvasProvider>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/focus" element={<FocusSessionPage />} />
                    <Route element={<AppLayout />}>
                      <Route path="/tasks" element={<TaskPlannerPage />} />
                      <Route path="/ai" element={<AIPanelPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </FocusCanvasProvider>
              </AppAuthProvider>
            </AIEngineProvider>
          </CustomizationProvider>
        </LocalDataProvider>
      </BrowserRouter>
    </div>
  );
}
