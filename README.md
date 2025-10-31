NOTE - This is a work in progress project. You may use the code here in your own projects but please credit Battlefield Dad in your project. Thanks!

# Battlefield 6 Domination Game Mode Template

A comprehensive domination-style game mode for Portal SDK with real-time scoring, player statistics tracking, and custom UI elements.

## Overview

This template implements a classic domination game mode where two teams compete to control three capture points (A, B, and C) on the map. Teams earn points over time based on how many capture points they control, with the first team to reach the target score winning the match.

For those following along with the tutorial video, the script at the end of each stage is provided along with the strings.json (not part 1 though)

There is also here my final WIP experience. This deviates from the tutorial quite a bit as it uses some more advanced techniques and has some other additional features that would be too much to put in the first guide. I will be adding to this WIP all of the spatial data for each map I edit once completedso you can just slot it into your own mode as well as any tscn files so you can edit them yourselves (move hq's spawn and cap points).

## Key Features

### Core Gameplay
- **Three Capture Points**: Control points A, B, and C with visual indicators
- **Dynamic Scoring**: Teams earn points faster when controlling more capture points
- **Configurable Timing**: Customizable capture and neutralization times
- **AI Behavior**: Intelligent AI that attacks objectives and defends captured points

### Player Statistics
- **Kill Tracking**: Individual kill counts with point rewards
- **Death Tracking**: Death statistics for performance analysis  
- **Assist System**: Assist tracking with point rewards
- **Capture Credit**: Points awarded for successfully capturing objectives
- **Custom Scoreboard**: Real-time display of player performance

### Custom UI Elements
- **Team Score Bars**: Visual progress bars showing each team's score
- **Objective Indicators**: Color-coded capture point status (A, B, C)
- **Crown Icon**: Dynamic center icon that changes color based on leading team
- **Real-time Updates**: Live updating of all UI elements during gameplay

## Game Configuration

### Scoring Settings
```typescript
let targetScore = 200;                   // Points needed to win
let gameModeTime = 600;                  // Match time (10 minutes)
let scoreUpdateInterval = 1;             // Score update frequency (seconds)
```

### Capture Point Settings
```typescript
let captureTime = 5;                     // Time to capture a point (seconds)
let neutralisationTime = 2;              // Time to neutralize a point (seconds)
let capPointMultiplier = 1;              // Capture point scoring multiplier
```

### Player Scoring
```typescript
const POINTS_PER_KILL = 100;            // Points for kills
const POINTS_PER_ASSIST = 50;           // Points for assists  
const POINTS_PER_CAPTURE = 200;         // Points for captures
```

## Scoring System

### Team Scoring
Teams earn points based on capture points controlled:
- **3 Points Held**: 1 point per second
- **2 Points Held**: 1 point per 5 seconds
- **1 Point Held**: 1 point per 10 seconds
- **0 Points Held**: No scoring

### Individual Player Scoring
Players earn personal score through:
- Eliminating enemies (100 points)
- Assisting in eliminations (50 points)
- Capturing objectives (200 points)

## Map Requirements

Your map should include:
- **Capture Point A**: Spatial object ID 100
- **Capture Point B**: Spatial object ID 101  
- **Capture Point C**: Spatial object ID 102
- **Team 1**: Team ID 1
- **Team 2**: Team ID 2

## Files Structure

```
Domination Template/
├── domination.ts          # Main game mode logic
├── strings.json          # UI text and localization
└── README.md            # This documentation
```

## Installation & Setup

1. **Copy Template**: Copy the entire `Domination Template` folder to your custom mods directory
2. **Configure Map**: Ensure your map has the required capture points (IDs 100, 101, 102) and boundaries are set
3. **Customize Settings**: Modify the configuration variables at the top of `domination.ts`
4. **Test & Deploy**: Load the spatial edits and script into your experience and test

## Customization Options

### Easy Modifications
- **Target Score**: Change `targetScore` to adjust match length
- **Capture Timing**: Modify `captureTime` and `neutralisationTime` for different pacing
- **Point Values**: Adjust `POINTS_PER_KILL`, `POINTS_PER_ASSIST`, `POINTS_PER_CAPTURE`
- **UI Colors**: Modify the color vectors in the UI setup section

### Advanced Modifications
- **Additional Capture Points**: Add more spatial objects and extend the arrays
- **New Statistics**: Add tracking for new player actions (headshots, streak bonuses, etc.)
- **Custom Scoring**: Implement different scoring algorithms
- **Enhanced AI**: Modify AI behavior patterns for different difficulty levels

## Key Functions

### Event Handlers
- `OnGameModeStarted()`: Initializes all game systems
- `OnPlayerDied()`: Tracks player deaths
- `OnPlayerEarnedKill()`: Awards kill points
- `OnCapturePointCaptured()`: Handles point captures and UI updates

### Core Systems
- `updateTeamScores()`: Main scoring loop
- `updatePlayerScoreboard()`: Updates individual player displays
- `initialisePlayerStats()`: Sets up player statistics tracking

## UI Components

The template includes a comprehensive UI system:
- **Score Display**: Shows current team scores in 000-999 format
- **Progress Bars**: Visual representation of team scoring progress
- **Objective Status**: Color-coded indicators for each capture point
- **Scoreboard**: Custom columns for Score, Kills, Deaths, and Captures

## Voice Over Integration (WIP)

The mod includes voice over callouts for:
- Friendly capture notifications
- Objective-specific audio cues (Alpha, Bravo, Charlie)
- Team-based audio feedback

## Performance Considerations

- Statistics are stored in memory and updated in real-time
- UI updates occur every second during the scoring loop
- Player statistics are initialized when players join the game
- Capture point status is tracked for ownership changes

## Troubleshooting

### Common Issues
- **Capture points not working**: Verify spatial object IDs (100, 101, 102)
- **UI not displaying**: Check that string keys are properly defined
- **Scoring not updating**: Ensure teams are properly initialized (IDs 1, 2)

### Debug Tips
- Monitor the console for any initialization errors
- Verify capture point ownership with debug logging
- Check that player statistics are being properly initialized

## Credits

This template provides a solid foundation for domination-style game modes and can be extended with additional features as needed. The modular design allows for easy customization and expansion. 

## License

This template is provided as-is for educational and development purposes within the Portal ecosystem. Please credit Battlefield Dad if you use it in your projects.
