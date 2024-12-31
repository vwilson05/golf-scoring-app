import React from 'react';

function ScoreEntry({ courseData, players, scores, setScores }) {
  if (!courseData || !courseData.scorecard) {
    return <p>Loading course data...</p>;
  }
  if (!players || players.length === 0) {
    return <p>No players in this team.</p>;
  }

  const handleScoreChange = (playerIndex, holeNumber, value) => {
    const intVal = parseInt(value, 10) || 0;
    // We'll store in "scores" as an object like:
    // { "player0": { "1": 4, "2": 5, ... }, "player1": {...} }
    setScores((prev) => {
      const newScores = { ...prev };
      const key = `player${playerIndex}`;
      newScores[key] = {
        ...newScores[key],
        [holeNumber]: intVal
      };
      return newScores;
    });
  };

  return (
    <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Hole</th>
          <th>Par</th>
          <th>Yardage</th>
          {players.map((p, idx) => (
            <th key={idx}>{p.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {courseData.scorecard.map((hole) => (
          <tr key={hole.Hole}>
            <td>{hole.Hole}</td>
            <td>{hole.Par}</td>
            <td>{hole.Yardage}</td>
            {players.map((p, idx) => {
              const key = `player${idx}`;
              const holeScore =
                scores[key]?.[hole.Hole] !== undefined
                  ? scores[key][hole.Hole]
                  : '';
              return (
                <td key={idx}>
                  <input
                    type="number"
                    style={{ width: '50px' }}
                    value={holeScore}
                    onChange={(e) =>
                      handleScoreChange(idx, hole.Hole, e.target.value)
                    }
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ScoreEntry;
