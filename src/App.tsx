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
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/academic/classes" element={<ClassesPage />} />
          <Route path="/exams/*" element={<ExamsPage />} />
          <Route path="/finance/*" element={<FinancePage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/hostel/*" element={<div>Hostel Pages - TODO</div>} />
          <Route path="/library" element={<div>Library Page - TODO</div>} />
          <Route path="/assets" element={<div>Assets Page - TODO</div>} />
          <Route path="/communication/*" element={<div>Communication Pages - TODO</div>} />
          <Route path="/reports" element={<div>Reports Page - TODO</div>} />
          <Route path="/settings" element={<div>Settings Page - TODO</div>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
