//Declare Game Mode Variables


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
    mod.SetScoreboardType(mod.ScoreboardType.CustomTwoTeams);
    mod.SetScoreboardHeader(mod.Message(mod.stringkeys.score, 0), mod.Message(mod.stringkeys.score, 0));

    
    //Start game loop
    while(mod.GetMatchTimeRemaining() > 0) {
        await mod.Wait(1);
        updateTeamScores();
        updateScoreBoardTotal();
        //update players scores
    }
}


function updateScoreBoardTotal() {
  const score1 = mod.GetGameModeScore(mod.GetTeam(1));
  const score2 = mod.GetGameModeScore(mod.GetTeam(2));
  mod.SetScoreboardHeader(mod.Message(mod.stringkeys.score, score1), mod.Message(mod.stringkeys.score, score2));
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
