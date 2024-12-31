require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Tournament = require('./models/Tournament');  // Import the Tournament model

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost') || origin.includes('ngrok')) {
      callback(null, true);  // Allow localhost and ngrok origins
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());  // Call express.json() after app initialization

// Grab RapidAPI key from .env
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });

// ----- Search Courses -----
app.get('/api/search-courses', async (req, res) => {
  try {
    const { name } = req.query;
    const response = await axios.get('https://golf-course-api.p.rapidapi.com/search', {
      params: { name },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'golf-course-api.p.rapidapi.com',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error searching courses:', error.message);
    res.status(500).json({ error: 'Unable to search for golf courses' });
  }
});

// ----- Fetch Course Data -----
app.get('/api/course-data', async (req, res) => {
  try {
    const { id } = req.query;
    const response = await axios.get(`https://golf-course-api.p.rapidapi.com/course/${id}`, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'golf-course-api.p.rapidapi.com',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching course data:', error.message);
    res.status(500).json({ error: 'Unable to fetch course data' });
  }
});

// ----- Create Tournament -----
app.post('/api/tournaments', async (req, res) => {
  console.log('Received Request Body:', req.body);  // Log the incoming data for debugging
  
  const { selectedCourse, game, betAmount, closestToPinAmount, individualChampionPayout, teams } = req.body;

  // Step 1: Validate Basic Fields
  if (!selectedCourse) {
    console.error('Error: No course selected.');
    return res.status(400).json({ error: 'Course is required.' });
  }
  if (!selectedCourse.scorecard || selectedCourse.scorecard.length === 0) {
    console.error('Error: Selected course is missing a scorecard.');
    return res.status(400).json({ error: 'Course scorecard is missing or incomplete.' });
  }
  if (!game) {
    console.error('Error: No game mode selected.');
    return res.status(400).json({ error: 'Game mode is required.' });
  }
  if (!betAmount || betAmount <= 0) {
    console.error('Error: Invalid bet amount.');
    return res.status(400).json({ error: 'Bet amount must be greater than 0.' });
  }
  if (!teams || Object.keys(teams).length === 0) {
    console.error('Error: No teams provided.');
    return res.status(400).json({ error: 'At least one team is required.' });
  }

  try {
    // Step 2: Save Tournament to MongoDB
    const newTournament = new Tournament({
      selectedCourse,
      game,
      betAmount,
      closestToPinAmount,
      individualChampionPayout,
      teams
    });

    const savedTournament = await newTournament.save();

    console.log(`Tournament ${savedTournament.id} created successfully.`);
    res.json({ tournamentId: savedTournament.id });
  } catch (err) {
    console.error('Error creating tournament:', err);
    res.status(500).json({ error: 'Internal Server Error - Failed to create tournament.' });
  }
});

// ----- Add Score -----
app.post('/api/tournaments/:id/teams/:teamName/scores', async (req, res) => {
  const { id, teamName } = req.params;
  const { playerName, holeNumber, score } = req.body;

  if (!playerName || holeNumber === undefined || score === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const team = tournament.teams[teamName];
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const player = team.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ error: `Player "${playerName}" not found in team "${teamName}"` });
    }

    const hole = tournament.selectedCourse.scorecard.find(h => h.Hole === holeNumber);
    if (!hole) {
      return res.status(400).json({ error: `Hole number ${holeNumber} does not exist in the course` });
    }

    const existingScore = team.scores.find(s => s.playerName === playerName && s.holeNumber === holeNumber);

    if (existingScore) {
      existingScore.score = score;  // Update the score
      existingScore.timestamp = new Date();
    } else {
      team.scores.push({ playerName, holeNumber, score, timestamp: new Date() });
    }

    await tournament.save();
    res.json({ message: 'Score added successfully' });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// ----- Get Tournament Details -----
app.get('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (err) {
    console.error('Error fetching tournament details:', err);
    res.status(500).json({ error: 'Error fetching tournament details' });
  }
});

// ----- Get Leaderboard -----
app.get('/api/tournaments/:id/leaderboard', async (req, res) => {
  const { id } = req.params;
  try {
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const leaderboard = [];
    Object.entries(tournament.teams).forEach(([teamName, teamData]) => {
      const teamScoresByHole = {};
      tournament.selectedCourse.scorecard.forEach(hole => {
        teamScoresByHole[hole.Hole] = null;  // For Best Ball, we will keep track of the lowest score
      });

      teamData.scores.forEach(scoreEntry => {
        const { playerName, holeNumber, score } = scoreEntry;
        const player = teamData.players.find(p => p.name === playerName);

        if (player) {
          const playerHandicap = parseInt(player.handicap, 10);
          const hole = tournament.selectedCourse.scorecard.find(h => h.Hole === holeNumber);
          const netScore = calculateNetScore(score, playerHandicap, hole.Handicap);

          if (teamScoresByHole[holeNumber] === null || netScore < teamScoresByHole[holeNumber]) {
            teamScoresByHole[holeNumber] = netScore;  // Store the lowest net score for this hole
          }
        }
      });

      const totalNet = Object.values(teamScoresByHole).reduce((acc, val) => acc + (val || 0), 0);

      leaderboard.push({
        teamName,
        teamScoresByHole,
        totalNet,
      });
    });

    leaderboard.sort((a, b) => a.totalNet - b.totalNet);

    res.json({ leaderboard });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

function calculateNetScore(gross, playerHandicap, holeHandicap) {
  const strokesPerHole = Math.floor(playerHandicap / 18);
  const remainder = playerHandicap % 18;
  const additionalStroke = holeHandicap <= remainder ? 1 : 0;
  return gross - (strokesPerHole + additionalStroke);
}

// ----- Serve React App -----
app.use(express.static(path.join(__dirname, 'client', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// ----- Start Server -----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
