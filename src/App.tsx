import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import StudentsPage from "./pages/students/StudentsPage";
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
          {/* TODO: Add remaining routes */}
          <Route path="/students/admissions" element={<div>Admissions Page - TODO</div>} />
          <Route path="/attendance" element={<div>Attendance Page - TODO</div>} />
          <Route path="/academic/classes" element={<div>Classes Page - TODO</div>} />
          <Route path="/exams/*" element={<div>Exams Pages - TODO</div>} />
          <Route path="/finance/*" element={<div>Finance Pages - TODO</div>} />
          <Route path="/staff" element={<div>Staff Page - TODO</div>} />
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
