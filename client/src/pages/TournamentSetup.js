/**************************************************
 * File: client/src/pages/TournamentSetup.js
 **************************************************/
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseSearch from '../components/CourseSearch';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import axios from 'axios';
import mongoose from 'mongoose';  // Import mongoose for generating ObjectId

function TournamentSetup() {
  const navigate = useNavigate();

  // ----- Course Data -----
  const [selectedCourse, setSelectedCourse] = useState(null);

  // ----- Game Mode -----
  const [game, setGame] = useState('');

  // ----- Bet Amount -----
  const [betAmount, setBetAmount] = useState(50); // Default $50

  // ----- Additional Payouts -----
  const [closestToPinAmount, setClosestToPinAmount] = useState(0);
  const [individualChampionPayout, setIndividualChampionPayout] = useState(0);

  // ----- Number of Teams -----
  const [numTeams, setNumTeams] = useState(1);
  const [teamsData, setTeamsData] = useState([
    {
      teamName: '',
      numPlayers: 1,
      players: [{ name: '', handicap: '', _id: new mongoose.Types.ObjectId() }], // Use new for ObjectId
    },
  ]);

  // -----------------------------
  // 1. Handling Course Selection
  // -----------------------------
  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
  };

  // -----------------------------
  // 2. Handling Number of Teams
  // -----------------------------
  const handleNumTeamsChange = (value) => {
    const nt = parseInt(value, 10) || 1;
    setNumTeams(nt);

    // Rebuild teamsData to have nt entries
    const arr = [];
    for (let i = 0; i < nt; i++) {
      arr.push({
        teamName: '',
        numPlayers: 1,
        players: [{ name: '', handicap: '', _id: new mongoose.Types.ObjectId() }], // Use new for ObjectId
      });
    }
    setTeamsData(arr);
  };

  const handleTeamFieldChange = (teamIndex, field, value) => {
    const updated = [...teamsData];
    if (field === 'teamName') {
      updated[teamIndex].teamName = value.trim(); // Trim to avoid leading/trailing spaces
    } else if (field === 'numPlayers') {
      const np = parseInt(value, 10) || 1;
      updated[teamIndex].numPlayers = np;

      // If players[] is too short/long, adjust
      const arr = updated[teamIndex].players;
      while (arr.length < np) {
        arr.push({ name: '', handicap: '', _id: new mongoose.Types.ObjectId() }); // Use new for ObjectId
      }
      while (arr.length > np) {
        arr.pop();
      }
      updated[teamIndex].players = arr;
    }
    setTeamsData(updated);
  };

  const handlePlayerChange = (teamIndex, playerIndex, field, value) => {
    const updated = [...teamsData];
    updated[teamIndex].players[playerIndex][field] = value;
    setTeamsData(updated);
  };

  // -----------------------------
  // 3. Start Tournament
  // -----------------------------
  const handleStartTournament = async (e) => {
    e.preventDefault();
  
    // Basic validations
    if (!selectedCourse) {
      alert('Please select a course first!');
      return;
    }
  
    // Log the selectedCourse
    console.log('Selected Course:', selectedCourse);
  
    if (!game) {
      alert('Please select a game mode!');
      return;
    }
    if (betAmount <= 0) {
      alert('Bet amount must be greater than $0!');
      return;
    }
    if (closestToPinAmount < 0) {
      alert('"Closest to Pin" amount cannot be negative!');
      return;
    }
    if (individualChampionPayout < 0) {
      alert('"Individual Champion Payout" cannot be negative!');
      return;
    }
  
    // 3.1. Validate Teams
    const teamsObj = {};
    for (let i = 0; i < teamsData.length; i++) {
      const t = teamsData[i];
      if (!t.teamName) {
        alert(`Team #${i + 1} is missing a name!`);
        return;
      }
      if (teamsObj[t.teamName]) {
        alert(`Duplicate team name detected: "${t.teamName}". Please ensure all team names are unique.`);
        return;
      }
      // Validate players
      for (let j = 0; j < t.players.length; j++) {
        const player = t.players[j];
        if (!player.name) {
          alert(`Player #${j + 1} in team "${t.teamName}" is missing a name!`);
          return;
        }
        if (player.handicap === '') {
          alert(`Player "${player.name}" in team "${t.teamName}" is missing a handicap!`);
          return;
        }
        // Ensure each player has a unique _id
        if (!player._id) {
          player._id = new mongoose.Types.ObjectId();  // Generate a valid MongoDB ObjectId for each player
        }
      }
  
      // Ensure teamName is included in each team
      teamsObj[t.teamName] = {
        teamName: t.teamName,  // Ensure teamName is included
        players: t.players.map((p) => ({
          name: p.name.trim(),
          handicap: p.handicap.trim(),
          _id: p._id,  // Include _id for each player
        })),
      };
    }
  
    // Prepare Payload
    const payload = {
      selectedCourse,
      game,
      betAmount,
      closestToPinAmount,
      individualChampionPayout,
      teams: teamsObj,
    };
  
    // Log the payload
    console.log('Sending Payload:', payload);  // Log before sending
  
    // 3.2. Send POST request to create tournament
    try {
      const res = await axios.post('http://localhost:3001/api/tournaments', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const { tournamentId } = res.data;
  
      // 3.3. Navigate to the first team's page using the new route structure
      const firstTeamName = teamsData[0].teamName;
      navigate(`/tournament/${tournamentId}/team/${encodeURIComponent(firstTeamName)}`);
    } catch (error) {
      console.error('Error creating tournament:', error.response ? error.response.data : error.message);
      alert('Failed to create tournament. Please try again.');
    }
  };
  
  return (
    <Container maxWidth="md" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        Set Up Tournament
      </Typography>

      {/* 1) Course Search */}
      <Paper style={{ padding: '1rem', marginBottom: '1rem' }}>
        <CourseSearch onSelectCourse={handleSelectCourse} />
        {selectedCourse && (
          <div style={{ marginTop: '1rem' }}>
            <Typography variant="h6">Selected Course:</Typography>
            <Typography>
              <strong>{selectedCourse.name}</strong> <br />
              {selectedCourse.city}, {selectedCourse.state}
            </Typography>
          </div>
        )}
      </Paper>

      <form onSubmit={handleStartTournament}>
        {/* 2) Number of Teams */}
        <Paper style={{ padding: '1rem', marginBottom: '1rem' }}>
          <Typography variant="h6">Tournament Details</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                label="Number of Teams"
                type="number"
                inputProps={{ min: 1 }}
                value={numTeams}
                onChange={(e) => handleNumTeamsChange(e.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bet Amount per Player ($)"
                type="number"
                inputProps={{ min: 1, step: '0.01' }}
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                required
                fullWidth
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 3) Additional Payouts */}
        <Paper style={{ padding: '1rem', marginBottom: '1rem' }}>
          <Typography variant="h6">Additional Payouts</Typography>
          <Grid container spacing={2}>
            {/* Closest to Pin */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Closest to Pin Total ($)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={closestToPinAmount}
                onChange={(e) => setClosestToPinAmount(parseFloat(e.target.value) || 0)}
                fullWidth
              />
            </Grid>

            {/* Individual Champion Payout */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Individual Champion Payout ($)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={individualChampionPayout}
                onChange={(e) => setIndividualChampionPayout(parseFloat(e.target.value) || 0)}
                fullWidth
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 4) For Each Team */}
        {teamsData.map((team, idx) => (
          <Paper key={idx} style={{ padding: '1rem', marginBottom: '1rem' }}>
            <Typography variant="h6">Team #{idx + 1}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Team Name"
                  type="text"
                  value={team.teamName}
                  onChange={(e) => handleTeamFieldChange(idx, 'teamName', e.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Number of Players"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={team.numPlayers}
                  onChange={(e) => handleTeamFieldChange(idx, 'numPlayers', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Player Info for each team */}
            {team.players.map((p, pIdx) => (
              <Paper key={pIdx} style={{ padding: '0.5rem', marginTop: '1rem' }} variant="outlined">
                <Typography variant="subtitle1">Player #{pIdx + 1}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Name"
                      type="text"
                      value={p.name}
                      onChange={(e) =>
                        handlePlayerChange(idx, pIdx, 'name', e.target.value)
                      }
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Handicap"
                      type="number"
                      inputProps={{ min: 0, step: '0.1' }}
                      value={p.handicap}
                      onChange={(e) =>
                        handlePlayerChange(idx, pIdx, 'handicap', e.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Paper>
        ))}

        {/* 5) Game Mode */}
        <Paper style={{ padding: '1rem', marginBottom: '1rem' }}>
          <FormControl fullWidth required>
            <InputLabel>Game Mode</InputLabel>
            <Select
              value={game}
              label="Game Mode"
              onChange={(e) => setGame(e.target.value)}
            >
              <MenuItem value="">--Select--</MenuItem>
              <MenuItem value="strokePlay">Stroke Play</MenuItem>
              <MenuItem value="matchPlay">Match Play</MenuItem>
              <MenuItem value="highLow">High/Low</MenuItem>
              <MenuItem value="skins">Skins</MenuItem>
              <MenuItem value="bestBall">Best Ball</MenuItem>
              <MenuItem value="scramble">Scramble</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        <Button variant="contained" color="primary" type="submit">
          Start Tournament
        </Button>
      </form>
    </Container>
  );
}

export default TournamentSetup;
