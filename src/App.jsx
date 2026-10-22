import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import TournamentProvider from "./context/TournamentProvider";
import SessionProvider from "./context/SessionProvider";
import LivePublisher from "./live/LivePublisher";
import TimerPage from "./pages/TimerPage";
import MenuPage from "./pages/MenuPage";
import SessionPage from "./pages/SessionPage";
import LivePage from "./pages/LivePage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <TournamentProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>

            <Route
              path="/"
              element={<TimerPage />}
            />

            <Route
              path="/menu"
              element={<MenuPage />}
            />

            <Route
              path="/session"
              element={<SessionPage />}
            />

            <Route
              path="/live/:id"
              element={<LivePage />}
            />

            <Route
              path="/settings"
              element={<SettingsPage />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>

        <LivePublisher />
      </SessionProvider>
    </TournamentProvider>
  );
}

export default App;
