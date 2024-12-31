/***********************************
 * App.js
 ***********************************/
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TournamentSetup from './pages/TournamentSetup';
import TeamPage from './pages/TeamPage';
import LeaderboardPage from './pages/LeaderboardPage';

function App() {
  return (
    <Routes>
      {/* Setup Page: fill out course info, players, game type */}
      <Route path="/" element={<TournamentSetup />} />

      {/* Team Page: dynamic route -> /tournament/:id/team/:teamName */}
      <Route path="/tournament/:id/team/:teamName" element={<TeamPage />} />

      {/* Leaderboard Page: dynamic route -> /tournament/:id/leaderboard */}
      <Route path="/tournament/:id/leaderboard" element={<LeaderboardPage />} />
    </Routes>
  );
}

export default App;
