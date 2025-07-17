import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import StudentsPage from "./pages/students/StudentsPage";
import AdmissionsPage from "./pages/students/AdmissionsPage";
import AttendancePage from "./pages/AttendancePage";
import ClassesPage from "./pages/academic/ClassesPage";
import ExamsPage from "./pages/exams/ExamsPage";
import FinancePage from "./pages/finance/FinancePage";
import StaffPage from "./pages/StaffPage";
import HostelPage from "./pages/hostel/HostelPage";
import LibraryPage from "./pages/library/LibraryPage";
import AssetsPage from "./pages/assets/AssetsPage";
import CommunicationPage from "./pages/communication/CommunicationPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import IdCardPage from "./pages/students/IdCardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/admissions" element={<AdmissionsPage />} />
          <Route path="/students/id-cards" element={<IdCardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/academic/classes" element={<ClassesPage />} />
          <Route path="/exams/*" element={<ExamsPage />} />
          <Route path="/finance/*" element={<FinancePage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/hostel/*" element={<HostelPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/communication/*" element={<CommunicationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
