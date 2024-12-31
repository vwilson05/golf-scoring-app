import React from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

function Scorecard({ course }) {
  if (!course) {
    return <Typography variant="body1">No course selected.</Typography>;
  }
  if (!course.scorecard || course.scorecard.length === 0) {
    return <Typography variant="body1">No scorecard data for {course.name}.</Typography>;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <Typography variant="h5" gutterBottom>
        Scorecard for {course.name}
      </Typography>
      <TableContainer component={Paper}>
        <Table aria-label="scorecard table">
          <TableHead>
            <TableRow>
              <TableCell><strong>Hole</strong></TableCell>
              <TableCell><strong>Par</strong></TableCell>
              <TableCell><strong>Handicap</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {course.scorecard.map((hole) => (
              <TableRow key={hole.Hole}>
                <TableCell>{hole.Hole}</TableCell>
                <TableCell>{hole.Par}</TableCell>
                <TableCell>{hole.Handicap}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default Scorecard;
