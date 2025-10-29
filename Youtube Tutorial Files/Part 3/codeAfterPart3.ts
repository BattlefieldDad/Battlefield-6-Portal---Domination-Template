//Declare Game Mode Variables
const playerKills = 0;
const playerDeaths = 1;
const playerScore = 2;
const playerCaptures = 3;


let team1ScoreTimer = 0;
let team2ScoreTimer = 0;


//Initialise Game Mode when Started
export async function OnGameModeStarted() {
    
    //Initialise capture points
    let capturePointA = mod.GetCapturePoint(100);    // First capture point
    let capturePointB = mod.GetCapturePoint(101);    // First capture point   
    let capturePointC = mod.GetCapturePoint(102);    // First capture point

    mod.EnableCapturePointDeploying(capturePointA, true);        // Allow players to interact with it
    mod.EnableGameModeObjective(capturePointA, true);           // Make it count for game objectives
    mod.SetCapturePointCapturingTime(capturePointA, 10);        // 10 seconds to capture
    mod.SetCapturePointNeutralizationTime(capturePointA, 10);   // 10 seconds to neutralize
    mod.SetMaxCaptureMultiplier(capturePointA, 1);              // Standard capture rate

    mod.EnableCapturePointDeploying(capturePointB, true);        // Allow players to interact with it
    mod.EnableGameModeObjective(capturePointB, true);           // Make it count for game objectives
    mod.SetCapturePointCapturingTime(capturePointB, 10);        // 10 seconds to capture
    mod.SetCapturePointNeutralizationTime(capturePointB, 10);   // 10 seconds to neutralize
    mod.SetMaxCaptureMultiplier(capturePointB, 1);              // Standard capture rate

    mod.EnableCapturePointDeploying(capturePointC, true);        // Allow players to interact with it
    mod.EnableGameModeObjective(capturePointC, true);           // Make it count for game objectives
    mod.SetCapturePointCapturingTime(capturePointC, 10);        // 10 seconds to capture
    mod.SetCapturePointNeutralizationTime(capturePointC, 10);   // 10 seconds to neutralize
    mod.SetMaxCaptureMultiplier(capturePointC, 1);              // Standard capture rate

    //Initialise Team Scores
    mod.SetGameModeScore(mod.GetTeam(1), 0);
    mod.SetGameModeScore(mod.GetTeam(2), 0);


    //Initialise the scoreboard
    setUpScoreBoard();

    
    //Start game loop
    while(mod.GetMatchTimeRemaining() > 0) {
        await mod.Wait(1);
        updateTeamScores();
        updateScoreBoardTotal();
        //update players scores
    }
}


//Update scoreboard header with current scores for teams
function updateScoreBoardTotal() {
  const score1 = mod.GetGameModeScore(mod.GetTeam(1));
  const score2 = mod.GetGameModeScore(mod.GetTeam(2));
  mod.SetScoreboardHeader(mod.Message(mod.stringkeys.score, score1), mod.Message(mod.stringkeys.score, score2));
}

//initialise the scoreboard with the correct headings
function setUpScoreBoard() {
    //Initialise the scoreboard
    mod.SetScoreboardType(mod.ScoreboardType.CustomTwoTeams);
    mod.SetScoreboardHeader(mod.Message(mod.stringkeys.score, 0), mod.Message(mod.stringkeys.score, 0));
    mod.SetScoreboardColumnNames(
    mod.Message(mod.stringkeys.SBHead1), //Score
    mod.Message(mod.stringkeys.SBHead2), //Kills
    mod.Message(mod.stringkeys.SBHead3), //Deaths
    mod.Message(mod.stringkeys.SBHead4) //Captures
  )

  let columnWidth = 10

  mod.SetScoreboardColumnWidths(columnWidth, columnWidth, columnWidth, columnWidth);


}



//Create Scoring System
//Create helper function to get seconds per point
function getSecondsPerPoint(pointsHeld: number): number {
    if (pointsHeld === 3) {
        return 1;
    } else if (pointsHeld === 2) {
        return 5;
    } else if (pointsHeld == 1) {
        return 10;
    }
    return 0;
}


//MAIN EVENT! Update Team scores in the game loop
function updateTeamScores() {
    let team1PointsHeld = 0;
    let team2PointsHeld = 0;

    let capturePointOwnerA = mod.GetCurrentOwnerTeam(mod.GetCapturePoint(100))
    let capturePointOwnerB = mod.GetCurrentOwnerTeam(mod.GetCapturePoint(101))  
    let capturePointOwnerC = mod.GetCurrentOwnerTeam(mod.GetCapturePoint(102))

    if (mod.Equals(capturePointOwnerA, mod.GetTeam(1))) {
      team1PointsHeld++;
    } else if (mod.Equals(capturePointOwnerA, mod.GetTeam(2))) {
      team2PointsHeld++;
    }

    if (mod.Equals(capturePointOwnerB, mod.GetTeam(1))) {
      team1PointsHeld++;
    } else if (mod.Equals(capturePointOwnerB, mod.GetTeam(2))) {
      team2PointsHeld++;
    }

    if (mod.Equals(capturePointOwnerC, mod.GetTeam(1))) {
      team1PointsHeld++;
    } else if (mod.Equals(capturePointOwnerC, mod.GetTeam(2))) {
      team2PointsHeld++;
    }

    team1ScoreTimer++;
    team2ScoreTimer++;

    const team1Rate = getSecondsPerPoint(team1PointsHeld);
    const team2Rate = getSecondsPerPoint(team2PointsHeld);

    if (team1ScoreTimer >= team1Rate && team1Rate > 0) {
      team1ScoreTimer = 0;
      const currentScore = mod.GetGameModeScore(mod.GetTeam(1));
      const newScore = currentScore + 1;
      mod.SetGameModeScore(mod.GetTeam(1), newScore);
    }

    if (team2ScoreTimer >= team2Rate && team2Rate > 0) {
      team2ScoreTimer = 0;
      const currentScore = mod.GetGameModeScore(mod.GetTeam(2));
      const newScore = currentScore + 1;
      mod.SetGameModeScore(mod.GetTeam(2), newScore);
    }
}


//when the player joins the game, initialise all of the object variables that store the players stats
export function OnPlayerJoinGame(
  eventPlayer: mod.Player
) {
  //Initialise players variables
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerKills), 0);
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerDeaths), 0);
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerCaptures), 0);
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerScore),0);

  updatePlayerScoreBoard(eventPlayer);
}


//update the score board entry for the given player
function updatePlayerScoreBoard(player: mod.Player) {
  mod.SetScoreboardPlayerValues(
    player,
    mod.GetVariable(mod.ObjectVariable(player, playerScore)),
    mod.GetVariable(mod.ObjectVariable(player, playerKills)),
    mod.GetVariable(mod.ObjectVariable(player, playerDeaths)),
    mod.GetVariable(mod.ObjectVariable(player, playerCaptures)),
  )

}


//When the player earns a kill update their kill stats and score and update the scoreboard
export function OnPlayerEarnedKill(
  eventPlayer: mod.Player
) {
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerKills), mod.Add(mod.GetVariable(mod.ObjectVariable(eventPlayer, playerKills)), 1));
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerScore), mod.Add(mod.GetVariable(mod.ObjectVariable(eventPlayer, playerScore)), 20));

  updatePlayerScoreBoard(eventPlayer);

}

//when the player dies update their deaths stat and update the scoreboard
export function OnPlayerDied(
  eventPlayer: mod.Player
) {
  mod.SetVariable(mod.ObjectVariable(eventPlayer, playerDeaths), mod.Add(mod.GetVariable(mod.ObjectVariable(eventPlayer, playerDeaths)), 1));

  updatePlayerScoreBoard(eventPlayer);
}


//when a capture point is captured update all the stats for players on the point in the capturing team
//give points and update the scorboard entries for those players
export function OnCapturePointCaptured (
  eventCapturePoint: mod.CapturePoint
) {
    const playersOnPoint = mod.GetPlayersOnPoint(eventCapturePoint);

    const currentOwner = mod.GetCurrentOwnerTeam(eventCapturePoint);

    const totalPlayersOnPoint = mod.CountOf(playersOnPoint);

    for (let i = 0; i < totalPlayersOnPoint; i++) {
      const player = mod.ValueInArray(playersOnPoint, i);

      if (mod.Equals(mod.GetTeam(player), currentOwner)) {
            mod.SetVariable(mod.ObjectVariable(player, playerCaptures), mod.Add(mod.GetVariable(mod.ObjectVariable(player, playerCaptures)), 1));
            mod.SetVariable(mod.ObjectVariable(player, playerScore), mod.Add(mod.GetVariable(mod.ObjectVariable(player, playerScore)), 20));

            updatePlayerScoreBoard(player);


      }
    }
}








