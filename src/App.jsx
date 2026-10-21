import { BrowserRouter, Routes, Route } from "react-router-dom";

import TournamentProvider from "./context/TournamentProvider";
import TimerPage from "./pages/TimerPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <TournamentProvider>
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
    </TournamentProvider>
  );
}

export default App;
