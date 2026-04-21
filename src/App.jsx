import { BrowserRouter, Routes, Route } from "react-router-dom";

import TimerPage from "./pages/TimerPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<TimerPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;