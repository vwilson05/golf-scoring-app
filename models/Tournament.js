const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for the players in a team
const playerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  handicap: {
    type: String,
    required: true,
  },
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  }
});

// Define the schema for the score for each hole
const scoreSchema = new Schema({
  playerName: {
    type: String,
    required: true,
  },
  holeNumber: {
    type: Number,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

// Define the schema for each hole on the course
const holeSchema = new Schema({
  Hole: {
    type: Number,
    required: true,
  },
  Par: {
    type: Number,
    required: true,
  },
  Handicap: {
    type: Number,
    required: true,
  },
  tees: {
    type: Map,
    of: Object,
  }
});

// Define the schema for the tournament itself
const tournamentSchema = new Schema({
  selectedCourse: {
    type: Object,
    required: true,
  },
  game: {
    type: String,
    required: true,
  },
  betAmount: {
    type: Number,
    required: true,
  },
  closestToPinAmount: {
    type: Number,
    default: 0,
  },
  individualChampionPayout: {
    type: Number,
    default: 0,
  },
  teams: {
    type: Map,
    of: {
      teamName: {
        type: String,
        required: true,
      },
      players: [playerSchema],
      scores: [scoreSchema],
    },
  },
  scorecard: [holeSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
