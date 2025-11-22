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

//SCORING NEEDS FIXING - DOESNT SEEM TO BE UPDATING TIMERS CORRECTLY ON OCCASION - DEBUG WITH CONSOLE
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
let capturePointUIUpdateInterval = 0.2; // Update capture point UI every 0.2 seconds (5 times per second)
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
// RUN TIME SPAWN FOR AUDIO MODULES NEEDED - NO NEED TO ADD TO GODOT THEN
// =================================================================


//Module contains all voice overs for flags and possibly other things?
let VOModule = mod.RuntimeSpawn_Common.SFX_VOModule_OneShot2D;
let VOSounds: any;

// =================================================================
// UI SETUP - CONTAINER AND TEXT ELEMENTS
// =================================================================

// Interface to store all UI widgets for a team
interface TeamUIWidgets {
    scoreWidgetContainer: any;
    friendlyScoreBarOuter: any;
    friendlyScoreBar: any;
    enemyScoreBarOuter: any;
    enemyScoreBar: any;
    targetScoreDisplay: any;
    friendlyScore: any;
    friendlyScoreBracketLeftVertical: any;
    friendlyScoreBracketLeftTop: any;
    friendlyScoreBracketLeftBottom: any;
    friendlyScoreBracketRightVertical: any;
    friendlyScoreBracketRightTop: any;
    friendlyScoreBracketRightBottom: any;
    enemyScore: any;
    enemyScoreBracketLeftVertical: any;
    enemyScoreBracketLeftTop: any;
    enemyScoreBracketLeftBottom: any;
    enemyScoreBracketRightVertical: any;
    enemyScoreBracketRightTop: any;
    enemyScoreBracketRightBottom: any;
    centreIcon: any;
    objAContainer: any;
    objAText: any;
    objBContainer: any;
    objbText: any;
    objCContainer: any;
    objcText: any;
}

// Interface to store per-player UI widgets (like capturing indicator)
interface PlayerUIWidgets {
    capturingIndicatorContainer: any;
    capturingStatusText: any;
    capturingPlayerCountText: any;
    capturingBarBackground: any;
    capturingFriendlyBar: any;
    capturingEnemyBar: any;
    capturingFriendlyCountText: any;
    capturingEnemyCountText: any;
}

// Dictionary to store UI widgets for each team (key is team ID: 1 or 2)
let teamUIWidgets: { [teamId: number]: TeamUIWidgets } = {};

// Dictionary to store per-player UI widgets (key is player object ID)
let playerUIWidgets: { [playerId: number]: PlayerUIWidgets } = {};

// Track which players are currently on capture points
let playersOnCapturePoints: { [playerId: number]: any } = {}; // key: player ID, value: capture point

// Track which players have completed their first HQ spawn
let playerHasSpawnedFromHQ: { [playerId: number]: boolean } = {};

// Track players being redeployed by our system (to prevent infinite loop)
let playerIsBeingRedeployed: { [playerId: number]: boolean } = {};

// Track safe spawn attempts
let playerSpawnAttempts: { [playerId: number]: number } = {};

// Track capture progress state for each player (for tick sounds)
let playerCaptureProgress: { [playerId: number]: number } = {};
let playerCaptureTick: { [playerId: number]: number } = {};

// Sound objects for capture point feedback
let tickSoundTaking: any = null;  // Sound when capturing for your team
let tickSoundLosing: any = null;  // Sound when losing to enemy team
let capturedSound: any = null;    // Sound when point is captured
let voiceOverSound: any = null;    // Sound object for voice-over announcements

// Spawer IDs for safe spawn system (used after first spawn)
const TEAM1_SPAWNER = 5000;
const TEAM2_SPAWNER = 5001;

// Safe spawn configuration
const MAX_SPAWN_ATTEMPTS = 5;          // Maximum number of spawn attempts before giving up
const INITIAL_SAFE_DISTANCE = 50;      // Starting safe distance in meters
const MIN_SAFE_DISTANCE = 10;          // Minimum safe distance in meters
const DISTANCE_REDUCTION_PER_ATTEMPT = 10; // How much to reduce safe distance each attempt
const SQUAD_SPAWN_DISTANCE = 2;        // Distance in meters to detect squad spawn (adjust as needed)

let gameInitialised = false;


//******************************************************/
//EVENT HOOKS
//******************************************************/


/**
 * Called when the game mode starts - Initialises all game systems
 */
export async function OnGameModeStarted() {
    // Initialize teams first before anything else
    teams = [
        mod.GetTeam(0),
        mod.GetTeam(1),
        mod.GetTeam(2)
    ];
    
    // Spawn sound objects for capture point ticking
    tickSoundTaking = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gamemode_Shared_CaptureObjectives_CapturingTickFriendly_OneShot2D,
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0)
    );
    
    tickSoundLosing = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gamemode_Shared_CaptureObjectives_CapturingTickEnemy_OneShot2D,
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0)
    );

    capturedSound = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_UI_Gamemode_Shared_CaptureObjectives_OnCapturedByFriendly_OneShot2D,
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0)
    );
    
    // Spawn voice-over sound object for announcements
    voiceOverSound = mod.SpawnObject(
        mod.RuntimeSpawn_Common.SFX_VOModule_OneShot2D,
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0),
        mod.CreateVector(0, 0, 0)
    );
    
    initialiseGameMode(); // See below for function details - sets up capture points, scoreboard, and player stats
    initialiseUIDisplay(1); // Sets up the in-game UI display for both teams
    initialiseUIDisplay(2); // Sets up the in-game UI display for both teams
    
    // Start the capture point UI update loop in the background
    capturePointUIUpdateLoop();
    
    //enter game loop for scroing
    while(mod.GetMatchTimeRemaining() > 0) {
      await mod.Wait(scoreUpdateInterval);
      updateTeamScores(); // See below for function details - calculates and updates team scores based on capture points held
      updateScoreBoardTotal(); // Updates the scoreboard header with current team scores
      updateAllPlayerScoreboards(); // Refresh all player scoreboards
  }


}

/**
 * Global loop that continuously updates capture point UI for all players on capture points
 * This runs in the background throughout the match
 */
async function capturePointUIUpdateLoop() {
    console.log("Starting capture point UI update loop");
    
    while(mod.GetMatchTimeRemaining() > 0) {
        await mod.Wait(capturePointUIUpdateInterval);
        
        // Update UI for all players currently on capture points
        for (const playerIdStr in playersOnCapturePoints) {
            const playerId = parseInt(playerIdStr);
            const capturePoint = playersOnCapturePoints[playerId];
            
            // Find the player object and update their UI
            const allPlayers = mod.AllPlayers();
            const playerCount = mod.CountOf(allPlayers);
            
            for (let i = 0; i < playerCount; i++) {
                const player = mod.ValueInArray(allPlayers, i);
                if (mod.GetObjId(player) === playerId) {
                    updatePlayerCapturingIndicator(player, capturePoint);
                    break;
                }
            }
        }
    }
    
    console.log("Capture point UI update loop ended");
}

export async function OnPlayerDeployed(
    eventPlayer: mod.Player
) {
    const playerId = mod.GetObjId(eventPlayer);
    const playerTeam = mod.GetTeam(eventPlayer);
    let spawnerID;
    
    console.log("OnPlayerDeployed: Player " + playerId + " deployed");
    
    // Check if this is the player's first spawn
    if (!playerHasSpawnedFromHQ[playerId]) {
        // Mark that they have now spawned from HQ
        playerHasSpawnedFromHQ[playerId] = true;
        console.log("OnPlayerDeployed: First spawn for player " + playerId + " - allowing direct spawn");
        
        // Trigger intro if within first 20 seconds of game
        const gameTime = mod.GetMatchTimeElapsed();
        if (gameTime < 20) {
            console.log("OnPlayerDeployed: Triggering full intro for player " + playerId);
            triggerPlayerIntro(eventPlayer);
        } else {
            // Late joiner - just play the audio without the visual intro
            console.log("OnPlayerDeployed: Playing intro audio for late joiner " + playerId);
            if (voiceOverSound) {
                mod.PlayVO(voiceOverSound, mod.VoiceOverEvents2D.RoundStartGeneric, mod.VoiceOverFlags.Alpha, eventPlayer);
            }
        }
        
        // Let the first spawn happen naturally, don't interfere
    } else {
        // Check if this spawn is from our redeploy system
        if (playerIsBeingRedeployed[playerId]) {
            console.log("OnPlayerDeployed: Player " + playerId + " spawned from our redeploy - checking safety");
            // This is our controlled redeploy, check if spawn is safe
            await checkSafeSpawn(eventPlayer);
        } else {
            // This is a player-initiated spawn after first spawn - check if on squadmate
            console.log("OnPlayerDeployed: Player " + playerId + " initiated spawn - checking if on squadmate");
            
            // Check if spawned on squadmate
            const spawnedOnSquadmate = checkIfSpawnedOnSquadmate(eventPlayer);
            
            if (spawnedOnSquadmate) {
                console.log("OnPlayerDeployed: Player " + playerId + " spawned on squadmate - allowing");
                // Allow squadmate spawn
            } else {
                console.log("OnPlayerDeployed: Player " + playerId + " did not spawn on squadmate - redirecting to spawner");
                
                // Initialize spawn attempts
                if (!playerSpawnAttempts[playerId]) {
                    playerSpawnAttempts[playerId] = 0;
                }
                
                // Set flag to indicate we're doing a controlled redeploy
                playerIsBeingRedeployed[playerId] = true;
                
                mod.UndeployPlayer(eventPlayer);
                await mod.Wait(0.1);
                if (mod.Equals(playerTeam, teams[1])) {
                    spawnerID = TEAM1_SPAWNER;
                    console.log("OnPlayerDeployed: Spawning on Team 1 spawner (" + TEAM1_SPAWNER + ")");
                } else {
                    spawnerID = TEAM2_SPAWNER;
                    console.log("OnPlayerDeployed: Spawning on Team 2 spawner (" + TEAM2_SPAWNER + ")");
                }
                
                mod.SpawnPlayerFromSpawnPoint(eventPlayer, spawnerID);
            }
        }
    }
    
    // Set random target for AI on spawn and set them to sprint
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        mod.AISetMoveSpeed(eventPlayer, mod.MoveSpeed.Sprint);
        reassignAIToNewObjective(eventPlayer);
    }
}

/**
 * Check if spawn location is safe and retry if needed
 */
async function checkSafeSpawn(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    const playerTeam = mod.GetTeam(player);
    let spawnerID;
    
    // Calculate safe distance based on attempt number
    const currentAttempt = playerSpawnAttempts[playerId];
    let calculatedDistance = INITIAL_SAFE_DISTANCE - (currentAttempt * DISTANCE_REDUCTION_PER_ATTEMPT);
    let safeDistance = calculatedDistance;
    if (calculatedDistance < MIN_SAFE_DISTANCE) {
        safeDistance = MIN_SAFE_DISTANCE;
    }
    
    console.log("checkSafeSpawn: Attempt " + (currentAttempt + 1) + "/" + MAX_SPAWN_ATTEMPTS + ", checking " + safeDistance + "m radius for player " + playerId);
    
    // Check if there are enemies nearby
    const hasNearbyEnemies = checkForNearbyEnemies(player, safeDistance);
    
    // If unsafe and haven't exceeded max attempts, retry
    if (hasNearbyEnemies && currentAttempt < MAX_SPAWN_ATTEMPTS - 1) {
        console.log("checkSafeSpawn: Enemies within " + safeDistance + "m! Retrying...");
        playerSpawnAttempts[playerId]++;
        
        // Undeploy and respawn
        mod.UndeployPlayer(player);
        await mod.Wait(0.1); // Wait 0.1 seconds between attempts
        
        if (mod.Equals(playerTeam, teams[1])) {
            spawnerID = TEAM1_SPAWNER;
        } else {
            spawnerID = TEAM2_SPAWNER;
        }
        
        mod.SpawnPlayerFromSpawnPoint(player, spawnerID);
    } else {
        // Safe spawn found OR max attempts reached - finalize
        if (hasNearbyEnemies) {
            console.log("checkSafeSpawn: Max attempts reached, spawning anyway for player " + playerId);
        } else {
            console.log("checkSafeSpawn: Safe spawn found for player " + playerId);
        }
        
        // Reset counter and clear flag
        playerSpawnAttempts[playerId] = 0;
        playerIsBeingRedeployed[playerId] = false;
    }
}

/**
 * Check if there are enemy players within the specified safe distance
 */
function checkForNearbyEnemies(player: mod.Player, safeDistance: number): boolean {
    const playerTeam = mod.GetTeam(player);
    const playerPosition = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
    const allPlayers = mod.AllPlayers();
    let foundNearbyEnemy = false;
    let closestEnemyDistance = 999;
    let enemyCount = 0;
    
    // Check distance to all enemy players
    for (let i = 0; i < mod.CountOf(allPlayers); i++) {
        const otherPlayer = mod.ValueInArray(allPlayers, i);
        
        // Check if not self and other player is alive
        if (!mod.Equals(player, otherPlayer)) {
            if (mod.GetSoldierState(otherPlayer, mod.SoldierStateBool.IsAlive)) {
                // Check if enemy team
                if (!mod.Equals(mod.GetTeam(otherPlayer), playerTeam)) {
                    const otherPosition = mod.GetSoldierState(otherPlayer, mod.SoldierStateVector.GetPosition);
                    const distance = mod.DistanceBetween(playerPosition, otherPosition);
                    
                    if (distance < closestEnemyDistance) {
                        closestEnemyDistance = distance;
                    }
                    
                    // If enemy within safe distance, spawn is unsafe
                    if (distance < safeDistance) {
                        foundNearbyEnemy = true;
                        enemyCount++;
                    }
                }
            }
        }
    }
    
    if (enemyCount > 0) {
        console.log("checkForNearbyEnemies: Found " + enemyCount + " enemies within " + safeDistance + "m, closest: " + closestEnemyDistance + "m");
    }
    
    return foundNearbyEnemy;
}

/**
 * Check if player spawned on a squad mate by measuring distance to nearest squad member
 */
function checkIfSpawnedOnSquadmate(player: mod.Player): boolean {
    const playerSquad = mod.GetSquad(player);
    const allPlayers = mod.AllPlayers();
    const playerPosition = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);
    let foundCloseSquadmate = false;
    let closestSquadmateDistance = 999;
    
    // Check distance to all squad members
    for (let i = 0; i < mod.CountOf(allPlayers); i++) {
        const otherPlayer = mod.ValueInArray(allPlayers, i);
        
        // Check if not self and other player is alive
        if (!mod.Equals(player, otherPlayer)) {
            if (mod.GetSoldierState(otherPlayer, mod.SoldierStateBool.IsAlive)) {
                // Check if same squad
                if (mod.Equals(mod.GetSquad(otherPlayer), playerSquad)) {
                    const otherPosition = mod.GetSoldierState(otherPlayer, mod.SoldierStateVector.GetPosition);
                    const distance = mod.DistanceBetween(playerPosition, otherPosition);
                    
                    if (distance < closestSquadmateDistance) {
                        closestSquadmateDistance = distance;
                    }
                    
                    // If very close to squad member (within configured distance), likely spawned on them
                    if (distance < SQUAD_SPAWN_DISTANCE) {
                        foundCloseSquadmate = true;
                    }
                }
            }
        }
    }
    
    console.log("checkIfSpawnedOnSquadmate: Closest squadmate distance: " + closestSquadmateDistance + "m, spawned on squadmate: " + foundCloseSquadmate);
    
    return foundCloseSquadmate;
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
    
    // If AI got the kill, reassign them to a new objective (prevents camping)
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        reassignAIToNewObjective(eventPlayer);
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
    
    // If AI got the assist, reassign them to a new objective (prevents camping)
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        reassignAIToNewObjective(eventPlayer);
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

    //spawn additional objects needed - maybe move to separate function if needed
    VOSounds =  mod.SpawnObject(VOModule,mod.CreateVector(0,0,0),mod.CreateVector(0,0,0),mod.CreateVector(0,0,0))

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
    
    // Configure each capture point with validation
   capturePoints.forEach((capPoint, index) => {
        if (!capPoint) {
            return;
        }
        
        //Enable the capture point first
        //CURRENTLY TIMERS ARE BROKEN - AWAITING A FIX!
        mod.EnableGameModeObjective(capPoint, false);
        mod.SetCapturePointNeutralizationTime(capPoint, neutralisationTime);
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
  const playerId = mod.GetObjId(eventPlayer);
  
  initialisePlayerStats(eventPlayer);
  initialisePlayerUI(eventPlayer);
  
  // Initialize first spawn tracking
  playerHasSpawnedFromHQ[playerId] = false;
  
  // Recreate UI for the player's team so they can see it
  // Determine which team the player is on (check if teams array is initialized first)
  if (teams[1] && teams[2]) {
    if (mod.Equals(mod.GetTeam(eventPlayer), teams[1])) {
      recreateTeamUI(1);
    } else if (mod.Equals(mod.GetTeam(eventPlayer), teams[2])) {
      recreateTeamUI(2);
    }
  }
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
 * Initialize per-player UI widgets (like capturing indicator)
 */
function initialisePlayerUI(player: any) {
    const playerId = mod.GetObjId(player);
    if (playerUIWidgets[playerId]) {
        return; // Already initialized
    }
    
    const playerPrefix = `player${playerId}_`;
    
    // Initialize the player's UI widgets object
    playerUIWidgets[playerId] = {} as PlayerUIWidgets;
    
    // Capturing Indicator Container - positioned below the main widget
    mod.AddUIContainer(
        playerPrefix + "capturing_indicator", // name
        mod.CreateVector(0, 155, 0), // position (below team widgets)
        mod.CreateVector(200, 60, 0), // size
        mod.UIAnchor.TopCenter, // anchor
        mod.GetUIRoot(), // parent - root so all players can have their own
        false, // visible (hidden by default, shown when on capture point)
        5, // padding
        mod.CreateVector(0.2, 0.2, 0.2), // background color - dark gray
        0.9, // background alpha
        mod.UIBgFill.Solid, // background fill
        mod.UIDepth.AboveGameUI, // UI Depth
        player // THIS IS THE KEY - player-specific visibility
    );
    
    playerUIWidgets[playerId].capturingIndicatorContainer = mod.FindUIWidgetWithName(playerPrefix + "capturing_indicator");
    
    // Capturing Status Text (CAPTURING / LOSING / CONTESTED)
    mod.AddUIText(
        playerPrefix + "capturing_status", // name
        mod.CreateVector(0, 5, 0), // position
        mod.CreateVector(190, 25, 0), // size
        mod.UIAnchor.TopCenter, // anchor for position
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0, 0, 0), // background color
        0, // background alpha
        mod.UIBgFill.None, // background fill
        mod.Message(mod.stringkeys.capturing), // text message
        20, // text size
        mod.CreateVector(0.6, 0.9, 0.9), // text color - cyan
        1, // text alpha
        mod.UIAnchor.Center, // text anchor
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingStatusText = mod.FindUIWidgetWithName(playerPrefix + "capturing_status");
    
    // Bar Background Container (gray outline)
    mod.AddUIContainer(
        playerPrefix + "capturing_bar_bg", // name
        mod.CreateVector(0, 32, 0), // position
        mod.CreateVector(150, 10, 0), // size (bar width)
        mod.UIAnchor.TopCenter, // anchor
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0.3, 0.3, 0.3), // background color - dark gray
        0.8, // background alpha
        mod.UIBgFill.Solid, // background fill
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingBarBackground = mod.FindUIWidgetWithName(playerPrefix + "capturing_bar_bg");
    
    // Friendly Team Bar (cyan, grows from left)
    mod.AddUIContainer(
        playerPrefix + "capturing_friendly_bar", // name
        mod.CreateVector(0, 32, 0), // position
        mod.CreateVector(75, 10, 0), // size (50% width initially)
        mod.UIAnchor.TopCenter, // anchor
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0.6, 0.9, 0.9), // background color - cyan
        0.9, // background alpha
        mod.UIBgFill.Solid, // background fill
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingFriendlyBar = mod.FindUIWidgetWithName(playerPrefix + "capturing_friendly_bar");
    
    // Enemy Team Bar (red, grows from right)
    mod.AddUIContainer(
        playerPrefix + "capturing_enemy_bar", // name
        mod.CreateVector(0, 32, 0), // position
        mod.CreateVector(75, 10, 0), // size (50% width initially)
        mod.UIAnchor.TopCenter, // anchor
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0.9, 0.3, 0.3), // background color - red
        0.9, // background alpha
        mod.UIBgFill.Solid, // background fill
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingEnemyBar = mod.FindUIWidgetWithName(playerPrefix + "capturing_enemy_bar");
    
    // Friendly Count Text (left side)
    mod.AddUIText(
        playerPrefix + "capturing_friendly_count", // name
        mod.CreateVector(-85, 28, 0), // position (left of bar)
        mod.CreateVector(20, 20, 0), // size
        mod.UIAnchor.TopCenter, // anchor for position
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0, 0, 0), // background color
        0, // background alpha
        mod.UIBgFill.None, // background fill
        mod.Message(mod.stringkeys.zero), // text message
        18, // text size
        mod.CreateVector(0.6, 0.9, 0.9), // text color - cyan
        1, // text alpha
        mod.UIAnchor.Center, // text anchor
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingFriendlyCountText = mod.FindUIWidgetWithName(playerPrefix + "capturing_friendly_count");
    
    // Enemy Count Text (right side)
    mod.AddUIText(
        playerPrefix + "capturing_enemy_count", // name
        mod.CreateVector(85, 28, 0), // position (right of bar)
        mod.CreateVector(20, 20, 0), // size
        mod.UIAnchor.TopCenter, // anchor for position
        playerUIWidgets[playerId].capturingIndicatorContainer, // parent
        true, // visible
        0, // padding
        mod.CreateVector(0, 0, 0), // background color
        0, // background alpha
        mod.UIBgFill.None, // background fill
        mod.Message(mod.stringkeys.zero), // text message
        18, // text size
        mod.CreateVector(0.9, 0.3, 0.3), // text color - red
        1, // text alpha
        mod.UIAnchor.Center, // text anchor
        mod.UIDepth.AboveGameUI, // UI Depth
        player // player-specific
    );
    
    playerUIWidgets[playerId].capturingEnemyCountText = mod.FindUIWidgetWithName(playerPrefix + "capturing_enemy_count");
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
    
    // Check for ownership change - not actually need ATM but may be useful
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

  if (teamScoreTimers[0] >= team1Rate && team1Rate > 0) {
    teamScoreTimers[0] = 0; // Reset timer
    const currentScore = mod.GetGameModeScore(teams[1]);
    const newScore = currentScore + 1;
    mod.SetGameModeScore(teams[1], newScore);

    let sizeOfBar = (newScore / targetScore) * containerWidth;
    
    // Update Team 1's UI - they see their score as "friendly" (left side)
    mod.SetUIWidgetSize(
      teamUIWidgets[1].friendlyScoreBar,
      mod.CreateVector(sizeOfBar, 15, 0)
    );
    
    // Update Team 2's UI - they see Team 1's score as "enemy" (right side)
    mod.SetUIWidgetSize(
      teamUIWidgets[2].enemyScoreBar,
      mod.CreateVector(sizeOfBar, 15, 0)
    );
  }

  if (teamScoreTimers[1] >= team2Rate && team2Rate > 0) {
    teamScoreTimers[1] = 0; // Reset timer
    const currentScore = mod.GetGameModeScore(teams[2]);
    const newScore = currentScore + 1;
    mod.SetGameModeScore(teams[2], newScore);

    let sizeOfBar = (newScore / targetScore) * containerWidth;
    
    // Update Team 2's UI - they see their score as "friendly" (left side)
    mod.SetUIWidgetSize(
      teamUIWidgets[2].friendlyScoreBar,
      mod.CreateVector(sizeOfBar, 15, 0)
    );
    
    // Update Team 1's UI - they see Team 2's score as "enemy" (right side)
    mod.SetUIWidgetSize(
      teamUIWidgets[1].enemyScoreBar,
      mod.CreateVector(sizeOfBar, 15, 0)
    );
  }

  // Step 5: Update UI displays
  upDateScoreDisplay(team1PointsHeld, team2PointsHeld);

  // Update crown icon and brackets to reflect team in lead
  const team1Score = mod.GetGameModeScore(teams[1]);
  const team2Score = mod.GetGameModeScore(teams[2]);
  
  if (team1Score > team2Score) {
    // Team 1 winning - show cyan crown for Team 1, red for Team 2
    mod.SetUIImageColor(teamUIWidgets[1].centreIcon, mod.CreateVector(0.6,0.9,0.9));
    mod.SetUIImageColor(teamUIWidgets[2].centreIcon, mod.CreateVector(0.9,0.3,0.3));
    
    // Show brackets around winning score (friendly for Team 1, enemy for Team 2)
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftBottom, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightBottom, true);
    
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftBottom, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightBottom, true);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightBottom, false);
    
  } else if (team2Score > team1Score) {
    // Team 2 winning - show red crown for Team 1, cyan for Team 2
    mod.SetUIImageColor(teamUIWidgets[1].centreIcon, mod.CreateVector(0.9,0.3,0.3));
    mod.SetUIImageColor(teamUIWidgets[2].centreIcon, mod.CreateVector(0.6,0.9,0.9));
    
    // Show brackets around winning score (enemy for Team 1, friendly for Team 2)
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftBottom, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightBottom, true);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftBottom, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightVertical, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightTop, true);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightBottom, true);
    
  } else {
    // Tied - show white crown and no brackets for both teams
    mod.SetUIImageColor(teamUIWidgets[1].centreIcon, mod.CreateVector(1, 1, 1));
    mod.SetUIImageColor(teamUIWidgets[2].centreIcon, mod.CreateVector(1, 1, 1));
    
    // Hide all brackets when tied
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].friendlyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[1].enemyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].friendlyScoreBracketRightBottom, false);
    
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketLeftBottom, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightVertical, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightTop, false);
    mod.SetUIWidgetVisible(teamUIWidgets[2].enemyScoreBracketRightBottom, false);
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
    
    // Update Team 1's UI - they see their own score as "friendly" and Team 2's as "enemy"
    mod.SetUITextLabel(teamUIWidgets[1].friendlyScore, formattedTeam1Score);
    mod.SetUITextLabel(teamUIWidgets[1].enemyScore, formattedTeam2Score);
    
    // Update Team 2's UI - they see their own score as "friendly" and Team 1's as "enemy"
    mod.SetUITextLabel(teamUIWidgets[2].friendlyScore, formattedTeam2Score);
    mod.SetUITextLabel(teamUIWidgets[2].enemyScore, formattedTeam1Score);
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

/**
 * Update the capturing indicator for a specific player on a capture point
 * @param player - The player whose UI should be updated
 * @param capturePoint - The capture point being captured
 */
function updatePlayerCapturingIndicator(player: any, capturePoint: any) {
    const playerId = mod.GetObjId(player);
    const widgets = playerUIWidgets[playerId];

    if (!widgets) return;
    
    // Get current capture progress and check if it changed (for tick sounds)
    const currentProgress = mod.GetCaptureProgress(capturePoint);
    const playerTeamObj = mod.GetTeam(player);
    const previousProgress = playerCaptureProgress[playerId] || 0;
    
    // Check if progress has changed (for tick sound)
    if (currentProgress !== previousProgress) {
        playerCaptureTick[playerId] = (playerCaptureTick[playerId] || 0) + 1;
        
        // Play tick sound every 2 ticks for faster feedback
        if (playerCaptureTick[playerId] % 2 === 0) {
            const progressTeam = mod.GetOwnerProgressTeam(capturePoint);
            const isCapturing = currentProgress > previousProgress;
            
            if (isCapturing) {
                // Progress is increasing
                if (mod.Equals(playerTeamObj, progressTeam)) {
                    // Your team is capturing - play friendly tick
                    if (tickSoundTaking) {
                        mod.PlaySound(tickSoundTaking, 0.5, player);
                    }
                } else {
                    // Enemy team is capturing - play enemy tick
                    if (tickSoundLosing) {
                        mod.PlaySound(tickSoundLosing, 0.5, player);
                    }
                }
            } else {
                // Progress is decreasing
                if (mod.Equals(playerTeamObj, progressTeam)) {
                    // Enemy is taking your point - play losing tick
                    if (tickSoundLosing) {
                        mod.PlaySound(tickSoundLosing, 0.5, player);
                    }
                } else {
                    // You're taking enemy point - play capturing tick
                    if (tickSoundTaking) {
                        mod.PlaySound(tickSoundTaking, 0.5, player);
                    }
                }
            }
        }
    } else {
        // Reset tick counter if progress hasn't changed
        playerCaptureTick[playerId] = 0;
    }
    
    // Store current progress for next comparison
    playerCaptureProgress[playerId] = currentProgress;
    
    const playersOnPoint = mod.GetPlayersOnPoint(capturePoint);
    const totalPlayers = mod.CountOf(playersOnPoint);
    
    // Count players per team
    let team1Count = 0;
    let team2Count = 0;
    
    for (let i = 0; i < totalPlayers; i++) {
        const pointPlayer = mod.ValueInArray(playersOnPoint, i);
        if (mod.Equals(mod.GetTeam(pointPlayer), teams[1])) {
            team1Count++;
        } else if (mod.Equals(mod.GetTeam(pointPlayer), teams[2])) {
            team2Count++;
        }
    }
    
    const currentOwner = mod.GetCurrentOwnerTeam(capturePoint);
    const isNeutral = mod.Equals(currentOwner, teams[0]);
    
    // Determine this player's team
    const playerTeam = mod.Equals(playerTeamObj, teams[1]) ? 1 : 2;
    const friendlyCount = playerTeam === 1 ? team1Count : team2Count;
    const enemyCount = playerTeam === 1 ? team2Count : team1Count;
    
    // Check if we own the point and there are no enemies - if so, hide the indicator
    const weOwnPoint = mod.Equals(currentOwner, teams[playerTeam]);
    if (weOwnPoint && enemyCount === 0) {
        // We own it and no contest - hide the indicator
        mod.SetUIWidgetVisible(widgets.capturingIndicatorContainer, false);
        return;
    }
    
    // There's a contest happening - show the indicator
    mod.SetUIWidgetVisible(widgets.capturingIndicatorContainer, true);
    
    // Map numbers to string keys for display
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
    
    // Update player count numbers at the ends
    const friendlyKey = digitMap[friendlyCount.toString()];
    const enemyKey = digitMap[enemyCount.toString()];
    mod.SetUITextLabel(widgets.capturingFriendlyCountText, mod.Message(friendlyKey));
    mod.SetUITextLabel(widgets.capturingEnemyCountText, mod.Message(enemyKey));
    
    // Calculate bar widths based on player percentages
    const totalPlayersOnBothTeams = friendlyCount + enemyCount;
    const barMaxWidth = 150; // Total bar width
    let friendlyBarWidth = 0;
    let enemyBarWidth = 0;
    
    if (totalPlayersOnBothTeams > 0) {
        const friendlyPercentage = friendlyCount / totalPlayersOnBothTeams;
        const enemyPercentage = enemyCount / totalPlayersOnBothTeams;
        friendlyBarWidth = friendlyPercentage * barMaxWidth;
        enemyBarWidth = enemyPercentage * barMaxWidth;
    }
    
    // Update bar sizes
    mod.SetUIWidgetSize(widgets.capturingFriendlyBar, mod.CreateVector(friendlyBarWidth, 10, 0));
    mod.SetUIWidgetSize(widgets.capturingEnemyBar, mod.CreateVector(enemyBarWidth, 10, 0));
    
    // Position bars so they meet in the middle
    // Friendly bar anchored to left, enemy bar anchored to right
    const friendlyBarOffset = -(barMaxWidth / 2) + (friendlyBarWidth / 2);
    const enemyBarOffset = (barMaxWidth / 2) - (enemyBarWidth / 2);
    
    mod.SetUIWidgetPosition(widgets.capturingFriendlyBar, mod.CreateVector(friendlyBarOffset, 32, 0));
    mod.SetUIWidgetPosition(widgets.capturingEnemyBar, mod.CreateVector(enemyBarOffset, 32, 0));
    
    // Determine status and color based on player's perspective
    if (friendlyCount > enemyCount) {
        // Player's team is capturing/holding
        if (isNeutral || !weOwnPoint) {
            mod.SetUITextLabel(widgets.capturingStatusText, mod.Message(mod.stringkeys.capturing));
            mod.SetUITextColor(widgets.capturingStatusText, mod.CreateVector(0.6, 0.9, 0.9)); // Cyan
        } else {
            mod.SetUITextLabel(widgets.capturingStatusText, mod.Message(mod.stringkeys.defending));
            mod.SetUITextColor(widgets.capturingStatusText, mod.CreateVector(0.6, 0.9, 0.9)); // Cyan
        }
    } else if (enemyCount > friendlyCount) {
        // Enemy team is capturing
        mod.SetUITextLabel(widgets.capturingStatusText, mod.Message(mod.stringkeys.losing));
        mod.SetUITextColor(widgets.capturingStatusText, mod.CreateVector(0.9, 0.3, 0.3)); // Red
    } else {
        // Equal numbers - contested
        mod.SetUITextLabel(widgets.capturingStatusText, mod.Message(mod.stringkeys.contested));
        mod.SetUITextColor(widgets.capturingStatusText, mod.CreateVector(1, 0.6, 0.2)); // Orange
    }
}

/**
 * Update capturing indicators for all players currently on a capture point
 * @param capturePoint - The capture point being updated
 */
function updateAllPlayersOnPoint(capturePoint: any) {
    // Loop through all players tracked as being on capture points
    for (const playerIdStr in playersOnCapturePoints) {
        const playerId = parseInt(playerIdStr);
        const playerCapturePoint = playersOnCapturePoints[playerId];
        
        // Only update if this player is on THIS capture point
        if (mod.Equals(playerCapturePoint, capturePoint)) {
            // Find the player object
            const allPlayers = mod.AllPlayers();
            const playerCount = mod.CountOf(allPlayers);
            
            for (let i = 0; i < playerCount; i++) {
                const player = mod.ValueInArray(allPlayers, i);
                if (mod.GetObjId(player) === playerId) {
                    updatePlayerCapturingIndicator(player, capturePoint);
                    break;
                }
            }
        }
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

    //Timer Flip Flop to fix issue with broken timer settings
    mod.SetCapturePointNeutralizationTime(eventCapturePoint, captureTime);

    const capturingTeam = mod.GetCurrentOwnerTeam(eventCapturePoint);
    const cyanColor = mod.CreateVector(0.6235294117647059, 0.8705882352941177, 0.9215686274509803);
    const redColor = mod.CreateVector(0.9411764705882353, 0.33725490196078434, 0.33725490196078434);

    if (capPointID === 100) {
        if (mod.Equals(capturingTeam, teams[1])) {
            // Team 1 captured A - show cyan for Team 1, red for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objAContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objAText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objAText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objAText, cyanColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objAContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objAText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objAText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objAText, redColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Alpha, teams[1]);
        } else if (mod.Equals(capturingTeam, teams[2])) {
            // Team 2 captured A - show red for Team 1, cyan for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objAContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objAText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objAText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objAText, redColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objAContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objAText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objAText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objAText, cyanColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Alpha, teams[2]);
        }
    }

    if (capPointID === 101) {
        if (mod.Equals(capturingTeam, teams[1])) {
            // Team 1 captured B - show cyan for Team 1, red for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objBContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objbText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objbText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objbText, cyanColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objBContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objbText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objbText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objbText, redColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Bravo, teams[1]);
        } else if (mod.Equals(capturingTeam, teams[2])) {
            // Team 2 captured B - show red for Team 1, cyan for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objBContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objbText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objbText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objbText, redColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objBContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objbText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objbText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objbText, cyanColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Bravo, teams[2]);
        }
    }

    if (capPointID === 102) {
        if (mod.Equals(capturingTeam, teams[1])) {
            // Team 1 captured C - show cyan for Team 1, red for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objCContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objcText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objcText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objcText, cyanColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objCContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objcText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objcText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objcText, redColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Charlie, teams[1]);
        } else if (mod.Equals(capturingTeam, teams[2])) {
            // Team 2 captured C - show red for Team 1, cyan for Team 2
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objCContainer, redColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[1].objcText, redColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objcText, 0.4);
            mod.SetUITextColor(teamUIWidgets[1].objcText, redColor);
            
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objCContainer, cyanColor);
            mod.SetUIWidgetBgColor(teamUIWidgets[2].objcText, cyanColor);
            mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objcText, 0.4);
            mod.SetUITextColor(teamUIWidgets[2].objcText, cyanColor);
            
            mod.PlayVO(VOSounds,mod.VoiceOverEvents2D.CheckPointFriendly,mod.VoiceOverFlags.Charlie, teams[2]);
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
            
            // Show CAPTURED flash for players on the capturing team (not AI)
            if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
                showCapturedFlash(player, eventCapturePoint);
            }

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
    const neutralBgColor = mod.CreateVector(0.2784313725490196, 0.2784313725490196, 0.2784313725490196);
    const neutralTextColor = mod.CreateVector(0.8784313725490196, 0.8784313725490196, 0.8784313725490196);

    if (capPointID === 100) {
        // Update objective A to neutral for both teams
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objAContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objAText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objAText, 0.4);
        mod.SetUITextColor(teamUIWidgets[1].objAText, neutralTextColor);
        
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objAContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objAText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objAText, 0.4);
        mod.SetUITextColor(teamUIWidgets[2].objAText, neutralTextColor);
    }

    if (capPointID === 101) {
        // Update objective B to neutral for both teams
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objBContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objbText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objbText, 0.4);
        mod.SetUITextColor(teamUIWidgets[1].objbText, neutralTextColor);
        
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objBContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objbText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objbText, 0.4);
        mod.SetUITextColor(teamUIWidgets[2].objbText, neutralTextColor);
    }

    if (capPointID === 102) {
        // Update objective C to neutral for both teams
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objCContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[1].objcText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[1].objcText, 0.4);
        mod.SetUITextColor(teamUIWidgets[1].objcText, neutralTextColor);
        
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objCContainer, neutralBgColor);
        mod.SetUIWidgetBgColor(teamUIWidgets[2].objcText, neutralBgColor);
        mod.SetUIWidgetBgAlpha(teamUIWidgets[2].objcText, 0.4);
        mod.SetUITextColor(teamUIWidgets[2].objcText, neutralTextColor);
    }
}

//added temporarily to try to speed up cap time
//FIXES CAP TIME BUT BREAKS NEUTRALISATION TIME
export async function OnCapturePointCapturing(
    eventCapturePoint: mod.CapturePoint
) {
    // Only set capture time if the point is actually neutral (progress = 0)
    // This prevents resetting neutralization time while a point is being neutralized
    const captureProgress = mod.GetCaptureProgress(eventCapturePoint);
    
    if (captureProgress < 0.02) {
        // Point is neutral, safe to set capture time
        mod.SetCapturePointCapturingTime(eventCapturePoint, captureTime);
    }
    // If progress > 0, the point is either being neutralized or captured
    // Don't touch the timers in this case
    
    // Update the capturing indicator for all players currently on this point
    updateAllPlayersOnPoint(eventCapturePoint);
}

/**
 * Called when a player enters a capture point area
 */
export async function OnPlayerEnterCapturePoint(
    eventPlayer: mod.Player,
    eventCapturePoint: mod.CapturePoint
) {
    const playerId = mod.GetObjId(eventPlayer);
    
    // Track that this player is on this capture point
    playersOnCapturePoints[playerId] = eventCapturePoint;
    
    // Show the capturing indicator for this specific player
    if (playerUIWidgets[playerId]) {
        mod.SetUIWidgetVisible(playerUIWidgets[playerId].capturingIndicatorContainer, true);
        // Update the indicator with current capture status
        updatePlayerCapturingIndicator(eventPlayer, eventCapturePoint);
    }
    
    // AI BEHAVIOR: If AI enters a capture point, decide what to do next
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        const playerTeam = mod.GetTeam(eventPlayer);
        const pointOwner = mod.GetCurrentOwnerTeam(eventCapturePoint);
        
        // If this is an enemy or neutral point, stay and capture/defend
        if (!mod.Equals(playerTeam, pointOwner)) {
            await mod.Wait(1.5); // Brief delay
            
            if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAlive)) {
                // Stay at this point and defend for 15 seconds
                mod.AIDefendPositionBehavior(
                    eventPlayer, 
                    mod.GetObjectPosition(eventPlayer), 
                    0, 
                    15
                );
            }
        } else {
            // This point is already ours - find a new objective
            reassignAIToNewObjective(eventPlayer);
        }
    }
}

/**
 * Reassigns AI to a new objective (enemy or neutral capture point)
 */
function reassignAIToNewObjective(aiPlayer: mod.Player) {
    if (!mod.GetSoldierState(aiPlayer, mod.SoldierStateBool.IsAlive)) {
        return; // Don't assign objectives to dead AI
    }
    
    const aiTeam = mod.GetTeam(aiPlayer);
    const isInVehicle = mod.GetSoldierState(aiPlayer, mod.SoldierStateBool.IsInVehicle);
    
    // Find capture points that are NOT owned by this AI's team
    const enemyOrNeutralPoints: number[] = [];
    
    for (const capturePoint of capturePoints) {
        const owner = mod.GetCurrentOwnerTeam(capturePoint);
        if (!mod.Equals(owner, aiTeam)) {
            enemyOrNeutralPoints.push(mod.GetObjId(capturePoint));
        }
    }
    
    // If there are enemy/neutral points, go to one
    if (enemyOrNeutralPoints.length > 0) {
        const randomIndex = mod.RoundToInteger(mod.RandomReal(0, enemyOrNeutralPoints.length - 1));
        const targetPointID = enemyOrNeutralPoints[randomIndex];
        
        console.log("AI reassigned to capture point " + targetPointID);
        
        // If in vehicle, use defend behavior with longer duration
        if (isInVehicle) {
            mod.AIDefendPositionBehavior(
                aiPlayer, 
                mod.GetObjectPosition(mod.GetSpatialObject(targetPointID)), 
                15, 
                90
            );
        } else {
            mod.AIMoveToBehavior(aiPlayer, mod.GetObjectPosition(mod.GetSpatialObject(targetPointID)));
        }
    } else {
        // All points are ours - defend a random one
        const randomIndex = mod.RoundToInteger(mod.RandomReal(0, capturePoints.length - 1));
        const targetPointID = mod.GetObjId(capturePoints[randomIndex]);
        
        console.log("AI defending friendly point " + targetPointID);
        mod.AIDefendPositionBehavior(
            aiPlayer, 
            mod.GetObjectPosition(mod.GetSpatialObject(targetPointID)), 
            0, 
            30
        );
    }
    
    // Adjust speed based on proximity to enemies (like the example does)
    adjustAISpeed(aiPlayer);
}

/**
 * Adjusts AI movement speed based on proximity to enemies
 * Sprint when far from enemies, slow down when close for better combat
 */
function adjustAISpeed(aiPlayer: mod.Player) {
    if (!mod.GetSoldierState(aiPlayer, mod.SoldierStateBool.IsAlive)) {
        return;
    }
    
    const aiTeam = mod.GetTeam(aiPlayer);
    const aiPosition = mod.GetObjectPosition(aiPlayer);
    
    // Find closest enemy
    let closestEnemyDistance = 9999;
    const allPlayers = mod.AllPlayers();
    
    for (let i = 0; i < mod.CountOf(allPlayers); i++) {
        const otherPlayer = mod.ValueInArray(allPlayers, i);
        
        if (!mod.Equals(mod.GetTeam(otherPlayer), aiTeam)) {
            if (mod.GetSoldierState(otherPlayer, mod.SoldierStateBool.IsAlive)) {
                const distance = mod.DistanceBetween(aiPosition, mod.GetObjectPosition(otherPlayer));
                if (distance < closestEnemyDistance) {
                    closestEnemyDistance = distance;
                }
            }
        }
    }
    
    // Sprint when far, slow down when close
    if (closestEnemyDistance > 30) {
        mod.AISetMoveSpeed(aiPlayer, mod.MoveSpeed.Sprint);
    } else {
        mod.AISetMoveSpeed(aiPlayer, mod.MoveSpeed.InvestigateRun);
    }
}

/**
 * Triggers the intro sequence for a player - fade from black, show DOMINATION flash text, play voice-over
 */
async function triggerPlayerIntro(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    
    // Create fade and flash UIs (fade UI starts at black)
    playerFadeUIs[playerId] = new BlackScreenFadeUI(player);
    playerFlashUIs[playerId] = new FlashTextUI(player, "domination_title", "intro_flash", 80, 600, 100, [1, 0.85, 0.3], [1, 0.5, 0.2]);
    
    // Play battle start voice-over sound
    if (voiceOverSound) {
        mod.PlayVO(voiceOverSound, mod.VoiceOverEvents2D.RoundStartGeneric, mod.VoiceOverFlags.Alpha, player);
    }
    
    // Small wait to ensure widget is created, then fade out from black to reveal the game
    await mod.Wait(0.1);
    await playerFadeUIs[playerId].FadeOut();
    
    await mod.Wait(0.3);
    
    // Show DOMINATION flash text
    if (playerFlashUIs[playerId]) {
        playerFlashUIs[playerId].Trigger();
    }
}

/**
 * Shows CAPTURED flash text and plays capture sounds/voice-overs for a player when they capture a point
 */
function showCapturedFlash(player: mod.Player, capturePoint: mod.CapturePoint) {
    const playerId = mod.GetObjId(player);
    const capPointID = mod.GetObjId(capturePoint);
    
    // Determine which flag was captured and play the appropriate voice-over
    let flagVoiceOver = mod.VoiceOverFlags.Alpha; // Default to Alpha
    
    if (capPointID === 100) {
        flagVoiceOver = mod.VoiceOverFlags.Alpha;
    } else if (capPointID === 101) {
        flagVoiceOver = mod.VoiceOverFlags.Bravo;
    } else if (capPointID === 102) {
        flagVoiceOver = mod.VoiceOverFlags.Charlie;
    }
    
    //Currently disabled as audio not working for cap points
    // Play flag-specific capture voice-over ("Alpha captured!", "Bravo captured!", etc.)
   // if (voiceOverSound) {
   //     mod.PlayVO(voiceOverSound, mod.VoiceOverEvents2D.ObjectiveCaptured, flagVoiceOver, player);
   // }
    
    // Play capture sound effect
    if (capturedSound) {
        mod.PlaySound(capturedSound, 1, player);
    }
    
    // Create a temporary flash UI for CAPTURED message - smaller and blue tones
    // textSize: 60 (smaller than 80), width: 450, height: 80, textColor: cyan-blue, lineColor: light blue
    const capturedFlash = new FlashTextUI(player, "captured_title", "captured_flash", 60, 450, 80, [0.3, 0.7, 1.0], [0.5, 0.8, 1.0]);
    capturedFlash.Trigger();
    
    // Clean up after 6 seconds
    setTimeout(() => {
        capturedFlash.Delete();
    }, 6000);
}

/**
 * Called when a player leaves a capture point area
 */
export async function OnPlayerExitCapturePoint(
    eventPlayer: mod.Player,
    eventCapturePoint: mod.CapturePoint
) {
    const playerId = mod.GetObjId(eventPlayer);
    
    // Remove this player from the tracking
    delete playersOnCapturePoints[playerId];
    
    // Hide the capturing indicator for this specific player
    if (playerUIWidgets[playerId]) {
        mod.SetUIWidgetVisible(playerUIWidgets[playerId].capturingIndicatorContainer, false);
    }
    
    // Update indicators for remaining players on the point (player counts changed)
    updateAllPlayersOnPoint(eventCapturePoint);
}

/**
 * Delete all UI widgets for a specific team
 * @param teamId - The team ID (1 or 2) whose widgets should be deleted
 */
function deleteTeamUIWidgets(teamId: number) {
    const teamPrefix = `team${teamId}_`;
    
    // Only need to delete the main container - it will delete all children automatically
    const mainContainer = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.scorewidgetcontainer_name);
    if (mainContainer) {
        mod.DeleteUIWidget(mainContainer);
    }
}

/**
 * Delete and recreate all UI widgets for a specific team
 * Useful for refreshing the UI or resetting it to default state
 * @param teamId - The team ID (1 or 2) whose widgets should be recreated
 */
function recreateTeamUI(teamId: number) {
    deleteTeamUIWidgets(teamId);
    initialiseUIDisplay(teamId);
}


function initialiseUIDisplay(teamId: number) {
    // Creates UI for a specific team (1 or 2)
    // Team 1 sees their score on left as "friendly" (cyan)
    // Team 2 sees their score on left as "friendly" (cyan) but it displays team 2's actual score
    // This means each team sees themselves on the left and enemy on the right
    
    const teamPrefix = `team${teamId}_`;
    
    
    // Initialize the widgets object for this team
    teamUIWidgets[teamId] = {} as TeamUIWidgets;
    
//OUTER CONTAINER HOLDS ALL ELEMENTS AT TOP.
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.scorewidgetcontainer_name, //name
    mod.CreateVector(0,50,0), //position
    mod.CreateVector(810,50,0), //size
    mod.UIAnchor.TopCenter, //anchor
    mod.GetUIRoot(), //parent
    true, //visible
    0, //padding
    mod.CreateVector(1,1,1), //background color
    0, //background alpha
    mod.UIBgFill.None, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].scoreWidgetContainer = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.scorewidgetcontainer_name)


//LEFT OUTER SCORE BAR - GREY CONTAINER OUTLINE
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.friendlyscorebarouter_name, //name
    mod.CreateVector(70,25,0), //position
    mod.CreateVector(300,15,0), //size
    mod.UIAnchor.TopLeft, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.2, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBarOuter = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.friendlyscorebarouter_name)

//LEFT SCORE BAR THAT REPRESENTS THE CURRENT SCORE FOR FRIENDLY TEAM
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.friendlyscorebar_name, //name
    mod.CreateVector(70,25,0), //position
    mod.CreateVector(0,15,0), //size
    mod.UIAnchor.TopLeft, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.6,0.9,0.9), //background color (cyan for friendly)
    0.8, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBar = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.friendlyscorebar_name)

//RIGHT OUTER SCORE BAR - GREY CONTAINER OUTLINE
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.enemyscorebarouter_name, //name
    mod.CreateVector(70,25,0), //position
    mod.CreateVector(300,15,0), //size
    mod.UIAnchor.TopRight, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.2, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBarOuter = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.enemyscorebarouter_name)


//RIGHT SCORE BAR THAT REPRESENTS THE CURRENT SCORE FOR ENEMY TEAM
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.enemyscorebar_name, //name
    mod.CreateVector(70,25,0), //position
    mod.CreateVector(0,15,0), //size
    mod.UIAnchor.TopRight, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.9,0.3,0.3), //background color (red for enemy)
    0.8, //background alpha
    mod.UIBgFill.Solid, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBar = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.enemyscorebar_name)

// Target score display in the centre
mod.AddUIText(
    teamPrefix + mod.stringkeys.targetscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(50,35,0), //size
    mod.UIAnchor.TopCenter, // anchor for position
    teamUIWidgets[teamId].scoreWidgetContainer, // parent
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
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)


teamUIWidgets[teamId].targetScoreDisplay = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.targetscore_name);

// displays friendly score on left
mod.AddUIText(
    teamPrefix + mod.stringkeys.friendlyscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(60,35,0), //size
    mod.UIAnchor.TopLeft, // anchor for position
    teamUIWidgets[teamId].scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.text0), // text message
    25, // text size
    mod.CreateVector(0.6,0.9,0.9), // text color (cyan for friendly)
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScore = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.friendlyscore_name);

// Create visual left bracket [ for friendly score using containers
// Vertical line of the left bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_leftbracket_vertical", 
    mod.CreateVector(-3,15,0), 
    mod.CreateVector(3,35,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI, 
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketLeftVertical = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_leftbracket_vertical");

// Top horizontal line of the left bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_leftbracket_top", 
    mod.CreateVector(0,15,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketLeftTop = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_leftbracket_top");


// Bottom horizontal line of the left bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_leftbracket_bottom", 
    mod.CreateVector(0,47,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketLeftBottom = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_leftbracket_bottom");


// Create visual right bracket ] for friendly score using containers
// Vertical line of the right bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_rightbracket_vertical", 
    mod.CreateVector(60,15,0), 
    mod.CreateVector(3,35,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketRightVertical = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_rightbracket_vertical");


// Top horizontal line of the right bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_rightbracket_top", 
    mod.CreateVector(55,15,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketRightTop = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_rightbracket_top");


// Bottom horizontal line of the right bracket
mod.AddUIContainer(
    teamPrefix + "friendlyscore_rightbracket_bottom", 
    mod.CreateVector(55,47,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopLeft, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.6,0.9,0.9), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].friendlyScoreBracketRightBottom = mod.FindUIWidgetWithName(teamPrefix + "friendlyscore_rightbracket_bottom");


//displays enemy score on right
mod.AddUIText(
    teamPrefix + mod.stringkeys.enemyscore_name, // name
    mod.CreateVector(0,15,0), // position
    mod.CreateVector(60,35,0), //size
    mod.UIAnchor.TopRight, // anchor for position
    teamUIWidgets[teamId].scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.Message(mod.stringkeys.text0), // text message
    25, // text size
    mod.CreateVector(0.9,0.3,0.3), // text color (red for enemy)
    1, // text alpha
    mod.UIAnchor.Center, // text anchor
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScore = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.enemyscore_name);

// Create visual left bracket [ for enemy score using containers
// Vertical line of the left bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_leftbracket_vertical", 
    mod.CreateVector(60,15,0), 
    mod.CreateVector(3,35,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketLeftVertical = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_leftbracket_vertical");

// Top horizontal line of the left bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_leftbracket_top", 
    mod.CreateVector(52,15,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketLeftTop = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_leftbracket_top");

// Bottom horizontal line of the left bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_leftbracket_bottom", 
    mod.CreateVector(52,47,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketLeftBottom = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_leftbracket_bottom");

// Create visual right bracket ] for enemy score using containers
// Vertical line of the right bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_rightbracket_vertical", 
    mod.CreateVector(0,15,0), 
    mod.CreateVector(3,35,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketRightVertical = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_rightbracket_vertical");

// Top horizontal line of the right bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_rightbracket_top", 
    mod.CreateVector(0,15,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketRightTop = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_rightbracket_top");

// Bottom horizontal line of the right bracket
mod.AddUIContainer(
    teamPrefix + "enemyscore_rightbracket_bottom", 
    mod.CreateVector(0,47,0), 
    mod.CreateVector(8,3,0), 
    mod.UIAnchor.TopRight, 
    teamUIWidgets[teamId].scoreWidgetContainer, 
    true, 
    0, 
    mod.CreateVector(0.9,0.3,0.3), 
    1, 
    mod.UIBgFill.Solid, 
    mod.UIDepth.AboveGameUI,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].enemyScoreBracketRightBottom = mod.FindUIWidgetWithName(teamPrefix + "enemyscore_rightbracket_bottom");

//displays crown in centre
mod.AddUIImage(
    teamPrefix + mod.stringkeys.centre_icon, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(30,14,0), //size
    mod.UIAnchor.TopCenter, // anchor for position
    teamUIWidgets[teamId].scoreWidgetContainer, // parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), // background color
    0.6, // background alpha
    mod.UIBgFill.Solid, // background fill
    mod.UIImageType.CrownSolid,
    mod.CreateVector(1,1,1),
    1,
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].centreIcon = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.centre_icon)

//Objective A Outer Container
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.obja_name, // name
    mod.CreateVector(-46, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objAContainer = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.obja_name)

//displays A in obj A container
mod.AddUIText(
    teamPrefix + mod.stringkeys.objatext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    teamUIWidgets[teamId].objAContainer, // parent
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
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objAText = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.objatext_name);


//Objective B Outer Container
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.objb_name, // name
    mod.CreateVector(0, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objBContainer = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.objb_name)

//displays B in objective B container
mod.AddUIText(
    teamPrefix + mod.stringkeys.objbtext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    teamUIWidgets[teamId].objBContainer, // parent
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
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objbText = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.objbtext_name);


//Objective C Outer Container
mod.AddUIContainer(
    teamPrefix + mod.stringkeys.objc_name, // name
    mod.CreateVector(46, 55, 0), //position
    mod.CreateVector(36, 36, 0), //size
    mod.UIAnchor.TopCenter, //anchor
    teamUIWidgets[teamId].scoreWidgetContainer, //parent
    true, //visible
    0, //padding
    mod.CreateVector(0.3,0.3,0.3), //background color
    0.6, //background alpha
    mod.UIBgFill.OutlineThin, //background fill
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objCContainer = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.objc_name)

//displays C in objective C container
mod.AddUIText(
    teamPrefix + mod.stringkeys.objctext_name, // name
    mod.CreateVector(0,0,0), // position
    mod.CreateVector(36,36,0), //size
    mod.UIAnchor.Center, // anchor for position
    teamUIWidgets[teamId].objCContainer, // parent
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
    mod.UIDepth.AboveGameUI, // UI Depth
    mod.GetTeam(teamId)
)

teamUIWidgets[teamId].objcText = mod.FindUIWidgetWithName(teamPrefix + mod.stringkeys.objctext_name);

    // Set the target score display
    mod.SetUITextLabel(
        teamUIWidgets[teamId].targetScoreDisplay, 
        mod.Message(targetScore)
    );
}

// =================================================================
// UI CLASSES FOR FADE AND FLASH EFFECTS
// =================================================================

/**
 * Fullscreen black fade UI - used for intro fade from black
 */
class BlackScreenFadeUI {
    private player: mod.Player;
    private widget: any;
    private fadeinTime: number = 1;
    private fadeOutTime: number = 1;

    constructor(player: mod.Player) {
        this.player = player;
        
        // Create fullscreen black overlay starting at full opacity
        mod.AddUIContainer(
            "fadeScreen_" + mod.GetObjId(player),
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(2500, 2500, 0),
            mod.UIAnchor.Center,
            mod.GetUIRoot(),
            true,
            0,
            mod.CreateVector(0, 0, 0),
            1.0,
            mod.UIBgFill.Solid,
            mod.UIDepth.AboveGameUI,
            player
        );
        
        this.widget = mod.FindUIWidgetWithName("fadeScreen_" + mod.GetObjId(player));
    }

    async FadeIn() {
        if (this.widget) {
            mod.SetUIWidgetVisible(this.widget, true);
            mod.SetUIWidgetBgAlpha(this.widget, 0);

            let time = 0;
            while (time < 1) {
                time += 0.1;
                if (time > 1) time = 1;
                mod.SetUIWidgetBgAlpha(this.widget, time);
                await mod.Wait(0.1);
            }
            mod.SetUIWidgetBgAlpha(this.widget, 1);
        }
    }

    async FadeOut() {
        if (this.widget) {
            // Ensure widget is visible at start
            mod.SetUIWidgetVisible(this.widget, true);
            mod.SetUIWidgetBgAlpha(this.widget, 1);

            let time = 1;
            while (time > 0) {
                time -= 0.05;
                if (time < 0) time = 0;
                mod.SetUIWidgetBgAlpha(this.widget, time);
                await mod.Wait(0.1);
            }

            mod.SetUIWidgetBgAlpha(this.widget, 0);
            mod.SetUIWidgetVisible(this.widget, false);
        }
    }

    Delete() {
        if (this.widget) {
            mod.DeleteUIWidget(this.widget);
        }
    }
}

/**
 * Flash text UI for game intro and capture notifications
 */
class FlashTextUI {
    private player: mod.Player;
    private rootWidgets: any[] = [];
    private feedbackBeingShown: boolean = false;

    constructor(player: mod.Player, stringKey: string, name: string, textSize: number = 80, containerWidth: number = 600, containerHeight: number = 100, textColor: number[] = [1, 0.85, 0.3], lineColor: number[] = [1, 0.5, 0.2]) {
        this.player = player;
        this.CreateUI(stringKey, name, textSize, containerWidth, containerHeight, textColor, lineColor);
    }

    private CreateUI(stringKey: string, name: string, textSize: number, containerWidth: number, containerHeight: number, textColor: number[], lineColor: number[]) {
        const playerId = mod.GetObjId(this.player);
        
        // Main text widget - positioned below top container (y: 200 instead of 100)
        mod.AddUIText(
            name + "_" + playerId,
            mod.CreateVector(0, 200, 0),
            mod.CreateVector(containerWidth, containerHeight, 0),
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            false,
            -100,
            mod.CreateVector(0.1, 0.1, 0.15),
            0.95,
            mod.UIBgFill.Solid,
            mod.Message(mod.stringkeys[stringKey]),
            textSize,
            mod.CreateVector(textColor[0], textColor[1], textColor[2]),
            1,
            mod.UIAnchor.Center,
            mod.UIDepth.AboveGameUI,
            this.player
        );
        
        const textWidget = mod.FindUIWidgetWithName(name + "_" + playerId);
        this.rootWidgets.push(textWidget);
        
        // Left fade line
        this.rootWidgets.push(this.CreateFadeLine(true, name + "_line_left_" + playerId, containerWidth, containerHeight, lineColor));
        
        // Right fade line
        this.rootWidgets.push(this.CreateFadeLine(false, name + "_line_right_" + playerId, containerWidth, containerHeight, lineColor));
    }

    private CreateFadeLine(right: boolean, name: string, containerWidth: number, containerHeight: number, lineColor: number[]): any {
        const horizontalOffset = right ? (containerWidth / 2 + 50) : -(containerWidth / 2 + 50);
        
        mod.AddUIContainer(
            name,
            mod.CreateVector(horizontalOffset, 200, 0),
            mod.CreateVector(300, containerHeight, 0),
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            false,
            1,
            mod.CreateVector(lineColor[0], lineColor[1], lineColor[2]),
            0.9,
            right ? mod.UIBgFill.GradientLeft : mod.UIBgFill.GradientRight,
            mod.UIDepth.AboveGameUI,
            this.player
        );
        
        return mod.FindUIWidgetWithName(name);
    }

    async Trigger() {
        if (this.feedbackBeingShown) return;
        this.feedbackBeingShown = true;

        // Show all widgets
        mod.SetUIWidgetVisible(this.rootWidgets[0], true);
        mod.SetUIWidgetBgAlpha(this.rootWidgets[0], 1);
        mod.SetUITextAlpha(this.rootWidgets[0], 1);

        mod.SetUIWidgetVisible(this.rootWidgets[1], true);
        mod.SetUIWidgetVisible(this.rootWidgets[2], true);
        mod.SetUIWidgetBgAlpha(this.rootWidgets[1], 1);
        mod.SetUIWidgetBgAlpha(this.rootWidgets[2], 1);

        await mod.Wait(2.0);
        await this.FadeOutEffect();
        await mod.Wait(3.0);

        this.feedbackBeingShown = false;
        mod.SetUIWidgetVisible(this.rootWidgets[0], false);
        mod.SetUIWidgetVisible(this.rootWidgets[1], false);
        mod.SetUIWidgetVisible(this.rootWidgets[2], false);
    }

    private async FadeOutEffect() {
        let currentLerpValue = 0;
        let lerpIncrement = 0;
        
        while (currentLerpValue < 1.0) {
            if (!this.feedbackBeingShown) break;
            lerpIncrement = lerpIncrement + 0.1;
            currentLerpValue = this.Lerp(currentLerpValue, 1, lerpIncrement);
            
            mod.SetUIWidgetBgAlpha(this.rootWidgets[0], 1 - currentLerpValue);
            mod.SetUITextAlpha(this.rootWidgets[0], 1 - currentLerpValue);
            mod.SetUIWidgetBgAlpha(this.rootWidgets[1], 1 - currentLerpValue);
            mod.SetUIWidgetBgAlpha(this.rootWidgets[2], 1 - currentLerpValue);
            
            await mod.Wait(0.1);
        }
    }

    private Lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    Delete() {
        this.rootWidgets.forEach(widget => {
            if (widget) mod.DeleteUIWidget(widget);
        });
    }
}

// Track fade and flash UIs per player
let playerFadeUIs: { [playerId: number]: BlackScreenFadeUI } = {};
let playerFlashUIs: { [playerId: number]: FlashTextUI } = {};
