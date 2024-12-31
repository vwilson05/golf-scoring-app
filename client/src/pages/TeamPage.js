import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import debounce from 'lodash.debounce';

function TeamPage() {
  const navigate = useNavigate();
  const { id: tournamentId, teamName: encodedTeamName } = useParams();
  const teamName = decodeURIComponent(encodedTeamName);

  const [team, setTeam] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerScores, setPlayerScores] = useState({});
  const [error, setError] = useState('');

  // Fetch the team and course data on load
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}`);
        const tournament = res.data;
        const currentTeam = tournament.teams[teamName];
        if (!currentTeam) {
          alert(`Team "${teamName}" not found!`);
          navigate('/');
          return;
        }
        setTeam(currentTeam);
        setCourse(tournament.selectedCourse);
        populateExistingScores(currentTeam.scores);  // Populate existing scores
        setLoading(false);
      } catch (err) {
        console.error(err);
        alert('Error fetching tournament data.');
        navigate('/');
      }
    };

    fetchTournament();
  }, [tournamentId, teamName, navigate]);

  // Populate scores from backend into local state
  const populateExistingScores = (scores) => {
    const newScores = {};
    scores.forEach(({ playerName, holeNumber, score }) => {
      if (!newScores[playerName]) newScores[playerName] = {};
      newScores[playerName][holeNumber] = score;
    });
    setPlayerScores(newScores);
  };

  // Calculate net score
  const calculateNetScore = (gross, playerHandicap, holeHandicap) => {
    const strokesPerHole = Math.floor(playerHandicap / 18);
    const remainder = playerHandicap % 18;
    const additionalStroke = holeHandicap <= remainder ? 1 : 0;
    const totalStrokes = strokesPerHole + additionalStroke;
    return gross - totalStrokes;
  };

  // Debounced function to submit score automatically
  const submitScore = useCallback(
    debounce(async (playerName, holeNumber, gross) => {
      try {
        const res = await axios.post(
          `http://localhost:3001/api/tournaments/${tournamentId}/teams/${encodeURIComponent(
            teamName
          )}/scores`,
          {
            playerName,
            holeNumber: parseInt(holeNumber, 10),
            score: parseInt(gross, 10),
          }
        );
        if (res.data.message === 'Score added successfully') {
          console.log('Score added successfully');
        }
      } catch (error) {
        console.error('Error submitting score:', error);
        setError(`Failed to submit score for ${playerName} on hole ${holeNumber}.`);
      }
    }, 500),
    [tournamentId, teamName]
  );

  // Handle gross score input change
  const handleScoreChange = (playerName, holeNumber, value) => {
    const intValue = value === '' ? '' : parseInt(value, 10);
    if (value !== '' && isNaN(intValue)) return;

    setPlayerScores((prev) => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [holeNumber]: intValue,
      },
    }));

    if (intValue !== '') {
      submitScore(playerName, holeNumber, intValue);
    }
  };

  // Navigate to leaderboard with team name as query param
  const handleViewLeaderboard = () => {
    navigate(`/tournament/${tournamentId}/leaderboard?team=${encodeURIComponent(teamName)}`);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" style={{ marginTop: '1rem' }}>
          Loading team data...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        Enter Scores for {teamName}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Game:</strong> {course.game}
        <br />
        <strong>Course:</strong> {course.name}
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table aria-label="score entry table">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Hole</strong></TableCell>
                  <TableCell><strong>Par</strong></TableCell>
                  <TableCell><strong>Handicap</strong></TableCell>
                  {team.players.map((player, idx) => (
                    <React.Fragment key={idx}>
                      <TableCell align="center">
                        <strong>{player.name} Gross</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>{player.name} Net</strong>
                      </TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {course.scorecard.map((hole) => (
                  <TableRow key={hole.Hole}>
                    <TableCell>{hole.Hole}</TableCell>
                    <TableCell>{hole.Par}</TableCell>
                    <TableCell>{hole.Handicap}</TableCell>
                    {team.players.map((player, idx) => (
                      <React.Fragment key={idx}>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            inputProps={{ min: 0, step: '1' }}
                            value={
                              playerScores[player.name]?.[hole.Hole] ?? ''
                            }
                            onChange={(e) =>
                              handleScoreChange(player.name, hole.Hole, e.target.value)
                            }
                            required
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {playerScores[player.name]?.[hole.Hole] !== undefined
                              ? calculateNetScore(
                                  playerScores[player.name][hole.Hole],
                                  player.handicap,
                                  hole.Handicap
                                )
                              : '-'}
                          </Typography>
                        </TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {error && (
            <Typography color="error" gutterBottom style={{ marginTop: '1rem' }}>
              {error}
            </Typography>
          )}

          <Grid container spacing={2} style={{ marginTop: '1rem' }}>
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleViewLeaderboard}
              >
                View Leaderboard
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

export default TeamPage;
