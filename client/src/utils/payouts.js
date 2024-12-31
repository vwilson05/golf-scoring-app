// client/src/utils/payouts.js

/**
 * Calculate payouts based on the game type, teams, scores, and bet amount.
 * @param {string} gameType - The type of game (e.g., 'strokePlay', 'matchPlay', etc.)
 * @param {object} teams - The teams object from sessionStorage
 * @param {object} scoresData - The tournamentScores from sessionStorage
 * @param {number} betAmount - The bet amount per player
 * @param {number} closestToPinAmount - Total amount for "Closest to Pin" (deducted from total pot)
 * @param {number} individualChampionPayout - Total amount for "Individual Champion"
 * @returns {object} - Contains payouts and detailed results
 */
export function calculatePayouts(gameType, teams, scoresData, betAmount, closestToPinAmount = 0, individualChampionPayout = 0) {
    // 1. Calculate total pot
    // Assuming each player contributes betAmount
    const totalPlayers = Object.values(teams).reduce((acc, team) => acc + team.players.length, 0);
    const initialTotalPot = totalPlayers * betAmount;
  
    // 2. Adjust total pot by subtracting Closest to Pin and Individual Champion Payout
    const adjustedTotalPot = initialTotalPot - closestToPinAmount - individualChampionPayout;
  
    // 3. Calculate team-based payouts
    const teamPayoutResult = getTeamPayout(gameType, teams, scoresData, adjustedTotalPot);
  
    // 4. Calculate Individual Champion payouts
    const individualChampionResult = individualChampionPayouts(teams, scoresData, individualChampionPayout);
  
    // 5. Combine all payouts (excluding Closest to Pin)
    const payouts = {
      ...teamPayoutResult.payouts,
      ...individualChampionResult.payouts
    };
  
    const details = {
      teamPayouts: teamPayoutResult.details,
      individualChampion: individualChampionResult.details
    };
  
    return { payouts, details };
  }
  
  /** 
   * Helper Functions
   */
  
  /** 
   * strokesForHole
   * @param {number} holeHandicap 
   * @param {number} playerHandicap 
   * @returns {number} 
   */
  export function strokesForHole(holeHandicap, playerHandicap) {
    if (playerHandicap <= 0) return 0;
    if (playerHandicap <= 18) {
      return holeHandicap <= playerHandicap ? 1 : 0;
    } else {
      const leftover = playerHandicap - 18;
      let strokes = 1;
      if (holeHandicap <= leftover) {
        strokes += 1;
      }
      return strokes;
    }
  }
  
  /**
   * getHoleHandicap
   * @param {string} teamName 
   * @param {number} holeNumber 
   * @returns {number} 
   */
  function getHoleHandicap(teamName, holeNumber, selectedCourse) {
    if (!selectedCourse || !selectedCourse.scorecard) {
      throw new Error('Selected course or scorecard is undefined.');
    }
    const hole = selectedCourse.scorecard.find(h => h.Hole === holeNumber);
    return hole ? hole.Handicap : 0;
  }
  
  
  
  /** 
   * Team Payout Calculation based on Game Type
   */
  function getTeamPayout(gameType, teams, scoresData, totalPot) {
    switch (gameType) {
      case 'strokePlay':
        return calcStrokePlayPayouts(teams, scoresData, totalPot);
      case 'matchPlay':
        return calcMatchPlayPayouts(teams, scoresData, totalPot);
      case 'highLow':
        return calcHighLowPayouts(teams, scoresData, totalPot);
      case 'skins':
        return calcSkinsPayouts(teams, scoresData, totalPot);
      case 'bestBall':
        return calcBestBallPayouts(teams, scoresData, totalPot);
      case 'scramble':
        return calcScramblePayouts(teams, scoresData, totalPot);
      default:
        return { payouts: {}, details: 'Unknown game type.' };
    }
  }
  
  /** 
   * Individual Champion Payouts
   */
  function individualChampionPayouts(teams, scoresData, totalAmount) {
    // Identify all individual net scores
    let individualNets = []; // Array of { teamName, playerName, net }
  
    for (const [teamName, team] of Object.entries(teams)) {
      for (const player of team.players) {
        const playerScores = scoresData[teamName]?.[player.name];
        if (!playerScores) continue;
        let netTotal = 0;
        for (let hole = 1; hole <= 18; hole++) {
          const holeData = playerScores[hole];
          if (!holeData || !holeData.score) continue; // Only consider logged scores
          const gross = holeData.score;
          const hcp = parseFloat(player.handicap) || 0;
          const holeHandicap = getHoleHandicap(teamName, hole, selectedCourse);
          const strokes = strokesForHole(holeHandicap, hcp);
          netTotal += gross - strokes;
        }
        individualNets.push({ teamName, playerName: player.name, net: netTotal });
      }
    }
  
    // Sort individuals by net score ascending
    individualNets.sort((a, b) => a.net - b.net);
  
    // Assign first place and second place
    const firstPlace = individualNets[0] || null;
    const secondPlace = individualNets[1] || null;
  
    const payouts = {};
  
    if (firstPlace) {
      payouts[`Individual Champion - ${firstPlace.playerName} (${firstPlace.teamName})`] = totalAmount * 0.75;
    }
  
    if (secondPlace) {
      payouts[`Individual Runner-Up - ${secondPlace.playerName} (${secondPlace.teamName})`] = totalAmount * 0.25;
    }
  
    return {
      payouts,
      details: {
        firstPlace,
        secondPlace
      }
    };
  }
  
  /** 
   * Team Payout Calculations for Different Game Types
   */
  
  /**
   * Stroke Play Payout Calculation
   */
  function calcStrokePlayPayouts(teams, scoresData, totalPot, selectedCourse) {
    const results = [];
  
    for (const teamName of Object.keys(teams)) {
      const team = teams[teamName];
      let teamTotalNet = 0;
  
      for (const player of team.players) {
        const playerScores = scoresData[teamName]?.[player.name];
        if (!playerScores) continue;
        
        for (let hole = 1; hole <= 18; hole++) {
          const holeData = playerScores[hole];
          if (!holeData || !holeData.score) continue;
          const gross = holeData.score;
          const hcp = parseFloat(player.handicap) || 0;
          const holeHandicap = getHoleHandicap(teamName, hole, selectedCourse);
          const strokes = strokesForHole(holeHandicap, hcp);
          teamTotalNet += gross - strokes;
        }
      }
  
      results.push({ teamName, net: teamTotalNet });
    }
  
    // Sort teams by net score ascending (lowest score wins)
    results.sort((a, b) => a.net - b.net);
  
    // DEBUG: Log the sorted results
    console.log('Sorted Team Results:', results);
  
    // Reset payouts before distribution
    const payouts = {};
    for (const tName of Object.keys(teams)) {
      payouts[tName] = 0;
    }
  
    // Award the total pot to the lowest net score team
    if (totalPot > 0 && results.length > 0) {
      const winningTeam = results[0];  // Team with lowest net score
      payouts[winningTeam.teamName] = totalPot;
      console.log('Winning Team:', winningTeam);
    }
  
    return {
      payouts,
      details: results
    };
  }
  
  
  /**
   * Match Play Payout Calculation
   */
  function calcMatchPlayPayouts(teams, scoresData, totalPot) {
    const teamNames = Object.keys(teams);
    if (teamNames.length < 2) {
      return { payouts: {}, details: 'Match Play requires at least 2 teams.' };
    }
  
    const [teamA, teamB] = teamNames;
    const playersA = teams[teamA].players;
    const playersB = teams[teamB].players;
  
    let aPoints = 0;
    let bPoints = 0;
    let carryOver = 0;
  
    for (let hole = 1; hole <= 18; hole++) {
      let pointsA = 0;
      let pointsB = 0;
      let holeCarry = 0;
  
      // Compare each player's net score on the hole
      playersA.forEach(playerA => {
        const playerAScore = getIndividualNet(playerA, teamA, hole, scoresData, teams);
        playersB.forEach(playerB => {
          const playerBScore = getIndividualNet(playerB, teamB, hole, scoresData, teams);
          if (playerAScore < playerBScore) {
            pointsA += 1;
          } else if (playerBScore < playerAScore) {
            pointsB += 1;
          } else {
            holeCarry += 1; // Tie on this comparison
          }
        });
      });
  
      // Assign points with carryOver
      aPoints += pointsA + carryOver;
      bPoints += pointsB + carryOver;
      carryOver = holeCarry;
    }
  
    // Determine winner
    const payouts = {};
    for (const tName of teamNames) {
      payouts[tName] = 0;
    }
  
    if (aPoints > bPoints) {
      payouts[teamA] = totalPot;
    } else if (bPoints > aPoints) {
      payouts[teamB] = totalPot;
    } else {
      payouts['Tie'] = totalPot;
    }
  
    return {
      payouts,
      details: { aPoints, bPoints }
    };
  }
  
  /**
   * High/Low Payout Calculation
   */
  function calcHighLowPayouts(teams, scoresData, totalPot) {
    const teamNames = Object.keys(teams);
    if (teamNames.length !== 2) {
      return { payouts: {}, details: 'High/Low requires exactly 2 teams.' };
    }
  
    const [teamA, teamB] = teamNames;
    const playersA = teams[teamA].players;
    const playersB = teams[teamB].players;
  
    let aPoints = 0;
    let bPoints = 0;
    let carryOver = 0;
  
    for (let hole = 1; hole <= 18; hole++) {
      const aNets = playersA.map(p => getIndividualNet(p, teamA, hole, scoresData, teams)).filter(n => n !== null);
      const bNets = playersB.map(p => getIndividualNet(p, teamB, hole, scoresData, teams)).filter(n => n !== null);
  
      if (aNets.length === 0 || bNets.length === 0) {
        carryOver += 2; // Not enough data to compare
        continue;
      }
  
      // Sort ascending for lows and descending for highs
      const sortedALows = [...aNets].sort((a, b) => a - b).slice(0, 2);
      const sortedAHighs = [...aNets].sort((a, b) => b - a).slice(0, 2);
  
      const sortedBLows = [...bNets].sort((a, b) => a - b).slice(0, 2);
      const sortedBHighs = [...bNets].sort((a, b) => b - a).slice(0, 2);
  
      // Compare lows
      if (sortedALows[0] < sortedBLows[0]) {
        aPoints += 1;
      } else if (sortedBLows[0] < sortedALows[0]) {
        bPoints += 1;
      } else {
        carryOver += 1; // Tie on lowest
      }
  
      if (sortedALows[1] < sortedBLows[1]) {
        aPoints += 1;
      } else if (sortedBLows[1] < sortedALows[1]) {
        bPoints += 1;
      } else {
        carryOver += 1; // Tie on second lowest
      }
  
      // Compare highs
      if (sortedAHighs[0] > sortedBHighs[0]) {
        aPoints += 1;
      } else if (sortedBHighs[0] > sortedAHighs[0]) {
        bPoints += 1;
      } else {
        carryOver += 1; // Tie on highest
      }
  
      if (sortedAHighs[1] > sortedBHighs[1]) {
        aPoints += 1;
      } else if (sortedBHighs[1] > sortedAHighs[1]) {
        bPoints += 1;
      } else {
        carryOver += 1; // Tie on second highest
      }
  
      // Assign points with carryOver
      aPoints += carryOver;
      bPoints += carryOver;
      carryOver = 0;
    }
  
    // Determine winner
    const payouts = {};
    for (const tName of teamNames) {
      payouts[tName] = 0;
    }
  
    if (aPoints > bPoints) {
      payouts[teamA] = totalPot;
    } else if (bPoints > aPoints) {
      payouts[teamB] = totalPot;
    } else {
      payouts['Tie'] = totalPot;
    }
  
    return {
      payouts,
      details: { aPoints, bPoints }
    };
  }
  
  /** 
   * Skins Payout Calculation
   */
  function calcSkinsPayouts(teams, scoresData, totalPot) {
    const teamNames = Object.keys(teams);
    const numTeams = teamNames.length;
  
    // Define dollar per hole
    const dollarPerHole = totalPot / 18;
    let carryOver = 0;
    const payouts = {};
    for (const tName of teamNames) {
      payouts[tName] = 0;
    }
  
    for (let hole = 1; hole <= 18; hole++) {
      let bestNet = Infinity;
      let winners = [];
  
      for (const tName of teamNames) {
        const team = teams[tName];
        let teamBestNet = Infinity;
  
        for (const player of team.players) {
          const net = getIndividualNet(player, tName, hole, scoresData, teams);
          if (net !== null && net < teamBestNet) {
            teamBestNet = net;
          }
        }
  
        if (teamBestNet < bestNet) {
          bestNet = teamBestNet;
          winners = [tName];
        } else if (teamBestNet === bestNet) {
          winners.push(tName);
        }
      }
  
      if (winners.length === 1) {
        payouts[winners[0]] += dollarPerHole + carryOver;
        carryOver = 0;
      } else {
        carryOver += dollarPerHole;
      }
    }
  
    return {
      payouts,
      details: 'Skins calculation complete.'
    };
  }
  
  /** 
   * Best Ball Payout Calculation
   */
  function calcBestBallPayouts(teams, scoresData, totalPot) {
    const teamNames = Object.keys(teams);
    const results = [];
  
    for (const tName of teamNames) {
      const team = teams[tName];
      let teamTotal = 0;
  
      for (let hole = 1; hole <= 18; hole++) {
        let bestNet = Infinity;
        for (const player of team.players) {
          const net = getIndividualNet(player, tName, hole, scoresData, teams);
          if (net !== null && net < bestNet) {
            bestNet = net;
          }
        }
        teamTotal += bestNet;
      }
  
      results.push({ teamName: tName, net: teamTotal });
    }
  
    // Sort teams by total net ascending
    results.sort((a, b) => a.net - b.net);
  
    const payouts = {};
    for (const tName of teamNames) {
      payouts[tName] = 0;
    }
  
    if (results.length >= 1) {
      payouts[results[0].teamName] += totalPot * 0.75;
    }
    if (results.length >= 2) {
      payouts[results[1].teamName] += totalPot * 0.25;
    }
  
    return {
      payouts,
      details: results
    };
  }
  
  /** 
   * Scramble Payout Calculation
   * Similar to Best Ball
   */
  function calcScramblePayouts(teams, scoresData, totalPot) {
    return calcBestBallPayouts(teams, scoresData, totalPot);
  }
  
  /**
   * Helper function to get individual net score
   */
  function getIndividualNet(player, teamName, holeNumber, scoresData, teams) {
    const gross = scoresData[teamName]?.[player.name]?.[holeNumber]?.score || 0;
    if (gross === 0) return null; // Unlogged
  
    const hcp = parseFloat(player.handicap) || 0;
    const holeHandicap = getHoleHandicap(teamName, holeNumber);
    const strokes = strokesForHole(holeHandicap, hcp);
    return gross - strokes;
  }
  