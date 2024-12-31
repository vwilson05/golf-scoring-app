import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Grid,
} from '@mui/material';
import { calculatePayouts } from '../utils/payouts';

function LeaderboardPage() {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const returnTeam = queryParams.get('team'); // Team that navigated to leaderboard

  const [leaderboard, setLeaderboard] = useState([]);
  const [scorecard, setScorecard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payouts, setPayouts] = useState([]);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/leaderboard`);
      setLeaderboard(res.data.leaderboard || []);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch leaderboard data.');
      setLoading(false);
    }
  };

  // Fetch tournament details to get the scorecard layout
  const fetchTournamentDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}`);
      setScorecard(res.data.selectedCourse.scorecard || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tournament details.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchLeaderboard();
      await fetchTournamentDetails();
    };

    fetchData();

    // Poll every 5 seconds for live updates
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5000);

    return () => clearInterval(interval);
  }, [tournamentId]);

  const handleReturnToScorecard = () => {
    if (returnTeam) {
      navigate(`/tournament/${tournamentId}/team/${encodeURIComponent(returnTeam)}`);
    } else {
      navigate('/');
    }
  };

  const handleCalculatePayout = async () => {
    try {
      if (leaderboard.length === 0) {
        setError('Leaderboard is empty. Cannot calculate payouts.');
        return;
      }
  
      // Fetch tournament details to get the game type and teams
      const res = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}`);
      const { game, teams, selectedCourse, betAmount, closestToPinAmount, individualChampionPayout } = res.data;
  
      if (!teams || Object.keys(teams).length === 0) {
        setError('No teams found. Cannot calculate payouts.');
        return;
      }
  
      if (!selectedCourse || !selectedCourse.scorecard) {
        setError('Selected course or scorecard is missing.');
        return;
      }
  
      // Calculate payouts
      const calculatedPayouts = calculatePayouts(
        game,
        teams,
        leaderboard,
        betAmount,
        closestToPinAmount,
        individualChampionPayout,
        selectedCourse
      );
      console.log('Calculated Payouts:', calculatedPayouts);
  
      setPayouts(calculatedPayouts);
      setError('');
    } catch (err) {
      console.error('Error calculating payouts:', err);
      setError('Failed to calculate payouts. Please try again.');
    }
  };
  

  const calculateRunningTotal = (team) => {
    let runningTotal = 0;
    scorecard.forEach((hole) => {
      const holeNumber = hole.Hole;
      const netScore = team.teamScoresByHole[holeNumber];
      if (netScore !== null && netScore !== undefined) {
        runningTotal += netScore;
      }
    });
    return runningTotal;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" style={{ marginTop: '1rem' }}>
          Loading leaderboard...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Button variant="contained" color="primary" onClick={handleReturnToScorecard}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        Leaderboard
      </Typography>

      <TableContainer component={Paper}>
        <Table aria-label="golf scorecard leaderboard">
          <TableHead>
            <TableRow>
              <TableCell><strong>Team</strong></TableCell>
              {scorecard.map((hole) => (
                <TableCell key={hole.Hole} align="center">
                  <div>Hole {hole.Hole}</div>
                  <div style={{ fontSize: '0.8rem' }}>Par: {hole.Par}</div>
                  <div style={{ fontSize: '0.8rem' }}>HCP: {hole.Handicap}</div>
                </TableCell>
              ))}
              <TableCell align="center"><strong>Total Net</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((team, idx) => (
              <TableRow key={idx}>
                <TableCell><strong>{team.teamName}</strong></TableCell>
                {scorecard.map((hole) => (
                  <TableCell align="center" key={hole.Hole}>
                    {team.teamScoresByHole && team.teamScoresByHole[hole.Hole] !== null
                      ? team.teamScoresByHole[hole.Hole]
                      : '-'}
                  </TableCell>
                ))}
                <TableCell align="center">
                  {calculateRunningTotal(team)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {payouts && payouts.details && (
        <TableContainer component={Paper} style={{ marginTop: '2rem' }}>
            <Typography variant="h6" style={{ margin: '1rem' }}>
            Payout Breakdown
            </Typography>
            <Table aria-label="payout table">
            <TableHead>
                <TableRow>
                <TableCell><strong>Team/Player</strong></TableCell>
                <TableCell align="right"><strong>Payout Amount ($)</strong></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {Object.entries(payouts.payouts).map(([name, amount], index) => (
                <TableRow key={index}>
                    <TableCell>{name}</TableCell>
                    <TableCell align="right">{amount.toFixed(2)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </TableContainer>
       )}


      {/* Buttons Section */}
      <Grid container spacing={2} style={{ marginTop: '1rem' }}>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCalculatePayout}
          >
            Calculate Payout
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleReturnToScorecard}
          >
            Return to Scorecard
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}

export default LeaderboardPage;
