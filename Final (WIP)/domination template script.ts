// =================================================================
// DOMINATION GAME MODE - SCRIPT TEMPLATE (WIP)
// =================================================================
/* This mod implements a domination-style game mode with:
 - Capture point control mechanics
 - Real-time player statistics tracking
 - Custom scoreboard with kills, deaths, assists, and captures */
// =================================================================

// =================================================================
// CREDITS
// =================================================================

/* You are free to duplicate this code for your own modes but please credit BattlefieldDad for the original.
   You will be able to find a guide to editing this template on YouTube shortly but it has been designed to be easily customised
   by anyone regardless of experience */

// =================================================================
// NOTES
// =================================================================

/* Currently adding more comments and rearranging code for easier edits for players using the template
   Adding additional setting options to provide more flexibility for the template
   This implementation differs slightly from the guide version as we use some built in features of typescript for score tracking
   etc rather than built in object variables
   The choice of which way to do this depends on how comfortable you are with typescript and dictionaries
   I find the blocks a little unwieldy and the built in dictionary approach easier to handle in terms of commands
   But ultimately both approaches work.

// =================================================================
// KNOWN ISSUES
// =================================================================

//Capture point and neutralisation times are currently bugged in Portal. As soon as these are fixed or a solution
//to making them work properly, I will roll out a fix
//Working on spawn points also to make them more favourable
//AI is pretty rudimentary in this version and could be enhanced - but they work roughly as intended
//Issues with voice overs need to be fixed

// =================================================================
// TODO
// =================================================================

/* 1. Implement capture point enable/disable
   2. Check fix for cap timers
   3. Make capture points more easily extended to add more
   4. Make Cap point id's more flexible
   5. Implement voice overs more effectively
   6. Make sure correct voice overs and scores show to correct teams in main UI.
   */

// =================================================================
// PLAYER STATISTICS TRACKING
// =================================================================
/* Interface to track individual player statistics
   This can be expanded with more stats as needed
   Used to track and update player performance in the scoreboard
   */

interface PlayerStats {
    kills: number;
    deaths: number;
    assists: number;
    captures: number;
    score: number;  // Custom score separate from game mode score
}

// Dictionary to store player statistics - key is player object ID
let playerStatsMap: { [key: number]: PlayerStats } = {};

// Track previous capture point owners to detect changes
let previousCaptureOwners: any[] = [null, null, null]; // For 3 capture points


// =================================================================
// GAME OBJECTS SETUP
// =================================================================
// Game objects - will be initialized when game mode starts
let capturePoints: any[] = [];
let teams: any[] = [];

// =================================================================
// GAME CONFIGURATION VARIABLES
// =================================================================
//Use these variables to tweak game settings
let captureTime = 5;                    // Time in seconds to capture a point
let neutralisationTime = 2;              // Time in seconds to neutralize a point
let capPointMultiplier = 1;              // Multiplier for capture point scoring

let targetScore = 200;                   // Score needed to win the match
let gameModeTime = 600;                  // Match time limit in seconds (10 minutes)
let scoreUpdateInterval = 1;            // Interval in seconds to update team scores based on points held
let scoreBoardColumnWidth = 10;          // Width of scoreboard columns

let capturePointDeploymentEnabled = true //Enables or disables deployment from capture points

// =================================================================
// PLAYER SCORING CONFIGURATION
// =================================================================
// Points awarded for different player actions
const POINTS_PER_KILL = 100;            // Points awarded for each kill
const POINTS_PER_ASSIST = 50;           // Points awarded for each assist  
const POINTS_PER_CAPTURE = 200;         // Points awarded for each capture point captured


// =================================================================
// UI SETUP - CONTAINER AND TEXT ELEMENTS
// =================================================================

//OUTER CONTAINER HOLDS ALL ELEMENTS AT TOP.
mod.AddUIContainer(
    mod.stringkeys.scorewidgetcontainer_name, //ame
    mod.CreateVector(0,50,0), //position
    mod.CreateVector(790,50,0), //size
    mod.UIAnchor.TopCenter, //anchor
    mod.GetUIRoot(), //parent
    true, //visible
    0, //padding
    mod.CreateVector(1,1,1), //background color
    0, //background alpha
    mod.UIBgFill.None, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let scoreWidgetContainer = mod.FindUIWidgetWithName(mod.stringkeys.scorewidgetcontainer_name)


//LEFT OUTER SCORE BAR - GREY CONTAINER OUTLINE
mod.AddUIContainer(
    mod.stringkeys.friendlyscorebarouter_name, //ame
    mod.CreateVector(60,25,0), //position
    mod.CreateVector(300,15,0), //size
    mod.UIAnchor.TopLeft, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.2, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let friendlyScoreBarOuter = mod.FindUIWidgetWithName(mod.stringkeys.friendlyscorebarouter_name)

//LEFT SCORE BAR THAT REPRESENTS THE CURRENT SCORE FOR TEAM 1
mod.AddUIContainer(
    mod.stringkeys.friendlyscorebar_name, //ame
    mod.CreateVector(60,25,0), //position
    mod.CreateVector(0,15,0), //size
    mod.UIAnchor.TopLeft, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.6,0.9,0.9), //background color
    0.8, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let friendlyScoreBar = mod.FindUIWidgetWithName(mod.stringkeys.friendlyscorebar_name)

//RIGHT OUTER SCORE BAR - GREY CONTAINER OUTLINE
mod.AddUIContainer(
    mod.stringkeys.enemyscorebarouter_name, //ame
    mod.CreateVector(60,25,0), //position
    mod.CreateVector(300,15,0), //size
    mod.UIAnchor.TopRight, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.2, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let enemyScoreBarOuter = mod.FindUIWidgetWithName(mod.stringkeys.enemyscorebarouter_name)


//RIGHT SCORE BAR THAT REPRESENTS THE CURRENT SCORE FOR TEAM 2
mod.AddUIContainer(
    mod.stringkeys.enemyscorebar_name, //ame
    mod.CreateVector(60,25,0), //position
    mod.CreateVector(0,15,0), //size
    mod.UIAnchor.TopRight, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.9,0.3,0.3), //background color
    0.8, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let enemyScoreBar = mod.FindUIWidgetWithName(mod.stringkeys.enemyscorebar_name)

// Target score display in the centre
mod.AddUIText(
    mod.stringkeys.targetscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(50,35,0), //size
    mod.UIAnchor.TopCenter, // anchor for position
    scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.text0), // text message
    25, // text size
    mod.CreateVector(1,1,1), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)


let targetScoreDisplay = mod.FindUIWidgetWithName(mod.stringkeys.targetscore_name);

// displays friendly score on left
mod.AddUIText(
    mod.stringkeys.friendlyscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(50,35,0), //size
    mod.UIAnchor.TopLeft, // anchor for position
    scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.text0), // text message
    25, // text size
    mod.CreateVector(0.6,0.9,0.9), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)

let friendlyScore = mod.FindUIWidgetWithName(mod.stringkeys.friendlyscore_name);

//displays enemy score on right
mod.AddUIText(
    mod.stringkeys.enemyscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(50,35,0), //size
    mod.UIAnchor.TopRight, // anchor for position
    scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.text0), // text message
    25, // text size
    mod.CreateVector(0.9,0.3,0.3), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)

let enemyScore = mod.FindUIWidgetWithName(mod.stringkeys.enemyscore_name);

//displays crown in centre
mod.AddUIImage(
    mod.stringkeys.centre_icon, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(30,14,0), //size
    mod.UIAnchor.TopCenter, // anchor for position
    scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.UIImageType.CrownSolid,
    mod.CreateVector(1,1,1),
    1
)

let centreIcon = mod.FindUIWidgetWithName(mod.stringkeys.centre_icon)

//Objective A Outer Container
mod.AddUIContainer(
    mod.stringkeys.obja_name, // name
    mod.CreateVector(-46, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let objAContainer = mod.FindUIWidgetWithName(mod.stringkeys.obja_name)

//displays A in obj B container
mod.AddUIText(
    mod.stringkeys.objatext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    objAContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.a_text), // text message
    25, // text size
    mod.CreateVector(0.9,0.9,0.9), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)

let objAText = mod.FindUIWidgetWithName(mod.stringkeys.objatext_name);


//Objective B Outer Container
mod.AddUIContainer(
    mod.stringkeys.objb_name, // name
    mod.CreateVector(0, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let objBContainer = mod.FindUIWidgetWithName(mod.stringkeys.objb_name)

//displays B in objective B container
mod.AddUIText(
    mod.stringkeys.objbtext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    objBContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.b_text), // text message
    25, // text size
    mod.CreateVector(0.9,0.9,0.9), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)

let objbText = mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name);


//Objective C Outer Container
mod.AddUIContainer(
    mod.stringkeys.objc_name, // name
    mod.CreateVector(46, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI // UI Depth
)

let objCContainer = mod.FindUIWidgetWithName(mod.stringkeys.objc_name)

//displays C in objective C container
mod.AddUIText(
    mod.stringkeys.objctext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    objCContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.c_text), // text message
    25, // text size
    mod.CreateVector(0.9,0.9,0.9), // text color
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI // UI Depth
)

let objcText = mod.FindUIWidgetWithName(mod.stringkeys.objctext_name);


//******************************************************/
//EVENT HOOKS
//******************************************************/

/**
 * Called when the game mode starts - Initialises all game systems
 */
export async function OnGameModeStarted() {
    initialiseGameMode(); // See below for function details - sets up capture points, scoreboard, and player stats
    //enter game loop for scroing
    while(mod.GetMatchTimeRemaining() > 0) {
      await mod.Wait(scoreUpdateInterval);
      updateTeamScores(); // See below for function details - calculates and updates team scores based on capture points held
      updateScoreBoardTotal(); // Updates the scoreboard header with current team scores
      updateAllPlayerScoreboards(); // Refresh all player scoreboards
  }


}


//Attempt to fix cap point timers - this can be removed once issues are fixed
let gameOngoing = false;


export function OnPlayerDeployed(
    eventPlayer: mod.Player
) {
    //not really working though...
   if (gameOngoing == false) {
    capturePoints.forEach((capPoint, index) => {
        if (capPoint) {
            mod.SetCapturePointNeutralizationTime(capPoint, neutralisationTime);
        }
    });
    gameOngoing = true;
    }

    //set random target for AI
    let objectiveToTarget = mod.RandomReal(100,102);
    objectiveToTarget = mod.RoundToInteger(objectiveToTarget);
    mod.AIMoveToBehavior(eventPlayer, mod.GetObjectPosition(mod.GetSpatialObject(objectiveToTarget)));
}



/**
 * Force set capture point timing values after game mode initialization
 */

//removed for now as serves no purpose - still trying to fix cap point timers!
function setCapturePointTiming() {
    capturePoints.forEach((capPoint, index) => {
        if (capPoint) {
            mod.SetCapturePointNeutralizationTime(capPoint, neutralisationTime);
            mod.SetCapturePointCapturingTime(capPoint, captureTime);
            mod.SetMaxCaptureMultiplier(capPoint, capPointMultiplier);
        }
    });
}


// =================================================================
// PLAYER EVENT HANDLERS - STATISTICS TRACKING
// =================================================================

/**
 * Triggered when a player dies - updates death count and scoreboard
 * Payloads: EventPlayer (Victim), EventOtherPlayer (Killer), EventDeathType, EventWeapon
 */
export function OnPlayerDied(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDeathType: mod.DeathType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    // Increment death count
    const playerId = mod.GetObjId(eventPlayer);
    const victimStats = playerStatsMap[playerId];
    if (victimStats) {
        victimStats.deaths++;
        updatePlayerScoreboard(eventPlayer); //update scoreboard to reflect death of victim
    }
}

/**
 * Triggered when a player earns a kill - updates kill count and scoreboard
 * Payloads: EventPlayer (Killer), EventOtherPlayer (Victim), EventDeathType, EventWeapon
 */
export function OnPlayerEarnedKill(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDeathType: mod.DeathType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    // Increment kill count
    const playerId = mod.GetObjId(eventPlayer);
    const killerStats = playerStatsMap[playerId];
    if (killerStats) {
        killerStats.kills++;
        killerStats.score += POINTS_PER_KILL;
        
        updatePlayerScoreboard(eventPlayer);
    }
}

/**
 * Triggered when a player earns a kill assist - updates assist count and scoreboard
 * Payloads: EventPlayer (Assist Player), EventOtherPlayer (Victim)
 */
export function OnPlayerEarnedKillAssist(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player
): void {
    // Increment assist count
    const playerId = mod.GetObjId(eventPlayer);
    const assistStats = playerStatsMap[playerId];
    if (assistStats) {
        assistStats.assists++;
        assistStats.score += POINTS_PER_ASSIST;
        
        updatePlayerScoreboard(eventPlayer);
    }
}


//******************************************************/
//CALL TO and INTIALISATION AND GAME SET UP FUNCTIONS
//******************************************************/

/**
 * Main initialization function - sets up all game systems
 */
function initialiseGameMode() {
    // Call set up functions
    setUpCapturePoints();
    initialiseTeamScores();
    setUpScoreBoard();
    initialiseAllPlayerStats();

    // Set game parameters
    mod.SetGameModeTargetScore(targetScore);
    mod.SetGameModeTimeLimit(gameModeTime);
}

/**
 * Configure capture points with timing and multiplier settings
 */
function setUpCapturePoints() {
    // Initialize capture points when game starts, not at module load
    capturePoints = [
        mod.GetCapturePoint(100),
        mod.GetCapturePoint(101),
        mod.GetCapturePoint(102),
    ];
    
    // Initialize teams as well
    teams = [
        mod.GetTeam(0),
        mod.GetTeam(1),
        mod.GetTeam(2)
    ];
    
    // Configure each capture point with validation
   capturePoints.forEach((capPoint, index) => {
        if (!capPoint) {
            return;
        }
        
        // Enable the capture point first
        mod.EnableGameModeObjective(capPoint, false);
       // mod.SetCapturePointNeutralizationTime(capPoint, neutralisationTime);
        mod.SetCapturePointCapturingTime(capPoint, captureTime);
        mod.EnableCapturePointDeploying(capPoint, true);
        mod.SetMaxCaptureMultiplier(capPoint, capPointMultiplier);
    });
}

/**
 * Set up the custom scoreboard with appropriate columns and headers
 */
function setUpScoreBoard () {
    mod.SetScoreboardType(mod.ScoreboardType.CustomTwoTeams);
    mod.SetScoreboardColumnNames(
        MakeMessage(mod.stringkeys.SBHead1), // Score
        MakeMessage(mod.stringkeys.SBHead2), // Kills  
        MakeMessage(mod.stringkeys.SBHead3), // Deaths
        MakeMessage(mod.stringkeys.SBHead4)  // Captures
    );
    mod.SetScoreboardColumnWidths(scoreBoardColumnWidth, scoreBoardColumnWidth, scoreBoardColumnWidth, scoreBoardColumnWidth, 0);
    mod.SetScoreboardHeader(MakeMessage(mod.stringkeys.Placeholder, 0), MakeMessage(mod.stringkeys.Placeholder, 0));
}

/**
 * Initialise team scores to zero
 */
function initialiseTeamScores() {
    teams.forEach(team => {
        mod.SetGameModeScore(team, 0);
    });
}

/**
 * Update the scoreboard header with current team scores
 */
function updateScoreBoardTotal () {
    mod.SetScoreboardHeader(
        MakeMessage(mod.stringkeys.Placeholder, mod.GetGameModeScore(teams[1])), 
        MakeMessage(mod.stringkeys.Placeholder, mod.GetGameModeScore(teams[2]))
    );
}

// =================================================================
// PLAYER STATISTICS HELPER FUNCTIONS
// =================================================================

/**
 * Initialise statistics for all players at game start
 */
function initialiseAllPlayerStats() {
    // Clear existing stats
    playerStatsMap = {};
    
    // Initialize stats for all existing players
    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);
    
    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i);
        initialisePlayerStats(player);
    }
    
    // Initialise capture point ownership tracking
    capturePoints.forEach((capPoint, index) => {
        if (capPoint) {
            previousCaptureOwners[index] = mod.GetCurrentOwnerTeam(capPoint);
        }
    });
}


/**
 * Initialise statistics for a specific player if not already done
 */

export async function OnPlayerJoinGame(
    eventPlayer: mod.Player
) {
  initialisePlayerStats(eventPlayer);
}



function initialisePlayerStats(player: any) {
    const playerId = mod.GetObjId(player);
    if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
            kills: 0,
            deaths: 0,
            assists: 0,
            captures: 0,
            score: 0  // Custom score tracking
        };
    }
}

/**
 * Update the scoreboard display for a specific player
 */
function updatePlayerScoreboard(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    const stats = playerStatsMap[playerId];
    if (stats) {
        // Use our custom score tracking instead of game mode score
        
        // Update scoreboard with: Score, Kills, Deaths, Captures
        mod.SetScoreboardPlayerValues(
            player,
            stats.score,      // Column 1: Custom score
            stats.kills,      // Column 2: Kills
            stats.deaths,     // Column 3: Deaths
            stats.captures    // Column 4: Captures
        );
    }
}

/**
 * Update scoreboard for all players
 */
function updateAllPlayerScoreboards() {
    const allPlayers = mod.AllPlayers();
    const playerCount = mod.CountOf(allPlayers);
    
    for (let i = 0; i < playerCount; i++) {
        const player = mod.ValueInArray(allPlayers, i);
        const playerId = mod.GetObjId(player);
        
        // Only update if player has stats initialized
        if (playerStatsMap[playerId]) {
            updatePlayerScoreboard(player);
        }
    }
}

// =================================================================
// TEAM SCORING SYSTEM
// =================================================================

/**
 * Track timers per team for score accumulation
 * Index 0 = Team 1, Index 1 = Team 2
 */
let teamScoreTimers = [0, 0];

/**
 * Calculate seconds required per point based on number of capture points held
 * More points = faster scoring
 */
function getSecondsPerPoint(pointsHeld: number): number {
  if (pointsHeld === 3) return 1;  // All points: 1 point per second
  if (pointsHeld === 2) return 5;  // 2 points: 1 point per 5 seconds  
  if (pointsHeld === 1) return 10; // 1 point: 1 point per 10 seconds
  return 0; // No points held = no scoring
}


/**
 * Main scoring function - updates team scores based on capture points held
 * Also tracks capture point ownership changes for player statistics
 * Called each updateScore Interval periosd during the game loop
 */
function updateTeamScores() {
  let team1PointsHeld = 0;
  let team2PointsHeld = 0;

  // Step 1: Count how many points each team currently holds and detect ownership changes
  capturePoints.forEach((capPoint, index) => {
    const currentOwner = mod.GetCurrentOwnerTeam(capPoint);
    
    // Check for ownership change
    if (!mod.Equals(currentOwner, previousCaptureOwners[index])) {
      // Ownership changed - someone captured this point
      previousCaptureOwners[index] = currentOwner;
    }
    
    // Count points for scoring
    if (mod.Equals(currentOwner, teams[1])) {
      team1PointsHeld++;
    } else if (mod.Equals(currentOwner, teams[2])) {
      team2PointsHeld++;
    }
  });

  // Step 2: Increment timers for both teams
  teamScoreTimers[0] += 1;
  teamScoreTimers[1] += 1;

  // Step 3: Calculate scoring rates based on points held
  const team1Rate = getSecondsPerPoint(team1PointsHeld);
  const team2Rate = getSecondsPerPoint(team2PointsHeld);

  // Step 4: Award points if timer thresholds are met and update progress bars

  const containerWidth = 300;
  const targetScore = mod.GetTargetScore();
if (teamScoreTimers[0] >= team1Rate && team1Rate > 0) {
  teamScoreTimers[0] = 0; // Reset timer
  const currentScore = mod.GetGameModeScore(teams[1]);
  const newScore = currentScore + 1;
  mod.SetGameModeScore(teams[1], newScore);


  let sizeOfBar = (newScore / targetScore) * containerWidth;
  mod.SetUIWidgetSize(
    mod.FindUIWidgetWithName(mod.stringkeys.friendlyscorebar_name),
    mod.CreateVector(sizeOfBar, 15, 0)
  );
}

  if (teamScoreTimers[1] >= team2Rate && team2Rate > 0) {
    teamScoreTimers[1] = 0; // Reset timer
    const currentScore = mod.GetGameModeScore(teams[2]);
    const newScore = currentScore + 1;
    mod.SetGameModeScore(teams[2], newScore);

  let sizeOfBar = (newScore / targetScore) * containerWidth;
    mod.SetUIWidgetSize(mod.FindUIWidgetWithName(mod.stringkeys.enemyscorebar_name), 
    mod.CreateVector(sizeOfBar,15,0))
  }

  // Step 5: Update UI displays
  upDateScoreDisplay(team1PointsHeld, team2PointsHeld);


  if (mod.GetGameModeScore(teams[1]) > mod.GetGameModeScore(teams[2])) {
        mod.SetUIImageColor(mod.FindUIWidgetWithName(mod.stringkeys.centre_icon), mod.CreateVector(0.6,0.9,0.9))
  } else if (mod.GetGameModeScore(teams[2]) > mod.GetGameModeScore(teams[1])) {
            mod.SetUIImageColor(mod.FindUIWidgetWithName(mod.stringkeys.centre_icon), mod.CreateVector(0.9,0.3,0.3))
  } else {
        mod.SetUIImageColor(mod.FindUIWidgetWithName(mod.stringkeys.centre_icon), mod.CreateVector(1, 1, 1))

  }
  

}

function formatScoreDisplay(score: any) {
    let numericScore: number;

    if (typeof score === 'string') {
        numericScore = parseInt(score, 10) || 0;
    } else if (typeof score === 'number') {
        numericScore = score;
    } else {
        numericScore = parseInt(String(score), 10) || 0;
    }

    const clampedScore = Math.min(999, Math.max(0, numericScore));
    const padded = clampedScore.toString().padStart(3, '0');

    const digitMap: Record<string, any> = {
        '0': mod.stringkeys.zero,
        '1': mod.stringkeys.one,
        '2': mod.stringkeys.two,
        '3': mod.stringkeys.three,
        '4': mod.stringkeys.four,
        '5': mod.stringkeys.five,
        '6': mod.stringkeys.six,
        '7': mod.stringkeys.seven,
        '8': mod.stringkeys.eight,
        '9': mod.stringkeys.nine,
    };

    const mappedDigits = padded.split('').map(d => digitMap[d]);

    // Tell TypeScript that this array is a readonly tuple spread
    return mod.Message(mod.stringkeys.scoreformatted, ...(mappedDigits as [any, any, any]));
}



/**
 * Update the in-game UI with current scores and capture point counts
 */
function upDateScoreDisplay(team1PointsHeld: number, team2PointsHeld: number) {
    // Get current team scores and format them
    const team1RawScore = mod.GetGameModeScore(teams[1]);
    const team2RawScore = mod.GetGameModeScore(teams[2]);
    
    const formattedTeam1Score = formatScoreDisplay(team1RawScore);
    const formattedTeam2Score = formatScoreDisplay(team2RawScore);
    
    // DEBUG: Show what we're sending to the UI
    
    // Update Team 1 UI elements with formatted score (000-999)
    mod.SetUITextLabel(
        mod.FindUIWidgetWithName(mod.stringkeys.friendlyscore_name), 
        formattedTeam1Score
    );

    // Update Team 2 UI elements with formatted score (000-999)
    mod.SetUITextLabel(
        mod.FindUIWidgetWithName(mod.stringkeys.enemyscore_name), 
        formattedTeam2Score
    );
}


// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Helper function to create formatted messages with variable arguments
 * Supports up to 3 arguments for message formatting
 * Credit: Adapted from holdout custom mode
 */
function MakeMessage(message: string, ...args: any[]) {
  switch (args.length) {
    case 0:
      return mod.Message(message);
    case 1:
      return mod.Message(message, args[0]);
    case 2:
      return mod.Message(message, args[0], args[1]);
    default:
      return mod.Message(message, args[0], args[1], args[2]);
  }
}

// =================================================================
// CAPTURE POINT EVENT HANDLING
// =================================================================

/**
 * Called when a capture point is captured by a team
 * Updates all players on the capture point and tracks team point changes
 */
export async function OnCapturePointCaptured(
    eventCapturePoint: mod.CapturePoint
) {

    const capPointID = mod.GetObjId(eventCapturePoint);

    if (capPointID === 100) {
        if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[1])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.obja_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Alpha, teams[1]);
        } else if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[2])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.obja_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objatext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Alpha, teams[2]);
        }
    }

        if (capPointID === 101) {
        if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[1])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objb_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Bravo, teams[1]);
        } else if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[2])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objb_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objbtext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Bravo, teams[2]);
        }
    }

        if (capPointID === 102) {
        if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[1])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objc_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Charlie, teams[1]);
        } else if (mod.Equals(mod.GetCurrentOwnerTeam(eventCapturePoint), teams[2])) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objc_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objctext_name), mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434));
            mod.PlayVO(mod.GetVO(1),mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Charlie, teams[2]);
        }
    }

  
    // Get all players currently on the capture point
    const playersOnPoint = mod.GetPlayersOnPoint(eventCapturePoint);
    
    // Get team ownership information
    const currentOwner = mod.GetCurrentOwnerTeam(eventCapturePoint);
    
    // Give capture credit only to players on the team that captured the point
    const totalPlayersOnPoint = mod.CountOf(playersOnPoint);
    // Update capture stats for players on the winning team only
    for (let i = 0; i < totalPlayersOnPoint; i++) {
        const player = mod.ValueInArray(playersOnPoint, i);


        // Check if this player is on the team that captured the point
        if (mod.Equals(mod.GetTeam(player), currentOwner)) {
            // @ts-ignore - SDK function exists but not in TypeScript definitions
            const playerId = mod.GetObjId(player);
            
            // Increment capture count
            const stats = playerStatsMap[playerId];
            stats.captures++;
            stats.score += POINTS_PER_CAPTURE;      
            updatePlayerScoreboard(player);

            //REDIRECT AI PLAYERS
            let choice = mod.RandomReal(1,2);

            if (choice == 1) {
            //DEFEND POSITION
            mod.AIDefendPositionBehavior(player, mod.GetObjectPosition(mod.GetSpatialObject(capPointID)),0,10);
            
            } else {
                let objectiveToTarget = mod.RandomReal(100,102);
                objectiveToTarget = mod.RoundToInteger(objectiveToTarget);
                mod.AIMoveToBehavior(player, mod.GetObjectPosition(mod.GetSpatialObject(objectiveToTarget)));    
            }

        } 
    }
}



    export async function OnCapturePointLost(
          eventCapturePoint: mod.CapturePoint
) {

    const capPointID = mod.GetObjId(eventCapturePoint);

    if (capPointID === 100) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.obja_name), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objAText), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.8784313725490196, 0.8784313725490196, 0.8784313725490196));
    }

        if (capPointID === 101) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.obja_name), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objAText), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.8784313725490196, 0.8784313725490196, 0.8784313725490196));
        }
    

        if (capPointID === 102) {
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.obja_name), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196));
            mod.SetUIWidgetBgAlpha(mod.FindUIWidgetWithName(mod.stringkeys.objAText), 0.4);
            mod.SetUITextColor(mod.FindUIWidgetWithName(mod.stringkeys.objAText), mod.CreateVector(0.8784313725490196, 0.8784313725490196, 0.8784313725490196));
        }
    }

//added temporarily to try to speed up cap time
export async function OnCapturePointCapturing(
    eventCapturePoint: mod.CapturePoint
) {
    mod.SetCapturePointCapturingTime(eventCapturePoint, captureTime);
}
