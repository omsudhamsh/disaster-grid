import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import CrisisIntelligence from "./pages/CrisisIntelligence";
import Imagery from "./pages/Imagery";
import Sensors from "./pages/Sensors";
import Resources from "./pages/Resources";
import Fusion from "./pages/Fusion";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/crisis" element={<CrisisIntelligence />} />
        <Route path="/imagery" element={<Imagery />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/fusion" element={<Fusion />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;