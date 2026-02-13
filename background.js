chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "runCheck") {
    runCheck(message.baseUrl, message.config);
    sendResponse({ status: "started" });
  }
  return false;
});

async function runCheck(baseUrl, config) {
  try {
    sendProgress("Fetching all teams page...");

    const allTeamsUrl = baseUrl + "/teams/all";
    const response = await fetch(allTeamsUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Failed to fetch all teams page: ${response.status}`);
    }
    const html = await response.text();

    // Ensure offscreen document exists
    await ensureOffscreen();

    sendProgress("Parsing teams...");
    const parsed = await chrome.runtime.sendMessage({
      action: "parseAllTeams",
      html
    });

    const teams = parsed.teams || [];
    const injuredViolations = [];
    const minorsViolations = [];
    const errors = [];

    // Check 1: Injured section
    if (config.checkInjured) {
      for (const team of teams) {
        for (const player of team.injuredPlayers) {
          if (!player.hasILStatus) {
            injuredViolations.push({
              team: team.teamName,
              name: player.name,
              position: player.position,
              mlbTeam: player.mlbTeam,
              playerUrl: player.playerUrl,
              reason: "In Injured slot but not on IL"
            });
          }
        }
      }
    }

    // Check 2: Minors section (concurrent with limit of 10)
    if (config.checkMinors) {
      const allMinorsPlayers = [];
      for (const team of teams) {
        for (const player of team.minorsPlayers) {
          allMinorsPlayers.push({ ...player, team: team.teamName });
        }
      }

      let completed = 0;
      const total = allMinorsPlayers.length;

      async function checkMinorsPlayer(player) {
        if (!player.playerId) {
          errors.push({ team: player.team, name: player.name, reason: "Could not extract player ID" });
          return;
        }

        try {
          const careerUrl = baseUrl + "/players/playerpage/career-stats/" + player.playerId + "/";
          const careerResponse = await fetch(careerUrl, { credentials: "include" });
          if (!careerResponse.ok) {
            errors.push({ team: player.team, name: player.name, reason: `Career stats fetch failed: ${careerResponse.status}` });
            return;
          }
          const careerHtml = await careerResponse.text();

          const stats = await chrome.runtime.sendMessage({
            action: "parseCareerStats",
            html: careerHtml,
            playerType: player.tableType
          });

          if (player.tableType === "Batters") {
            const ab = stats.careerAB || 0;
            if (ab >= config.abThreshold) {
              minorsViolations.push({
                team: player.team,
                name: player.name,
                position: player.position,
                mlbTeam: player.mlbTeam,
                playerUrl: player.playerUrl,
                reason: `${ab} career AB (threshold: ${config.abThreshold})`,
                careerStat: ab,
                threshold: config.abThreshold,
                statType: "AB"
              });
            }
          } else {
            const ip = stats.careerINNs || 0;
            if (ip >= config.ipThreshold) {
              minorsViolations.push({
                team: player.team,
                name: player.name,
                position: player.position,
                mlbTeam: player.mlbTeam,
                playerUrl: player.playerUrl,
                reason: `${ip} career IP (threshold: ${config.ipThreshold})`,
                careerStat: ip,
                threshold: config.ipThreshold,
                statType: "IP"
              });
            }
          }
        } catch (err) {
          errors.push({ team: player.team, name: player.name, reason: err.message });
        }

        completed++;
        if (completed % 10 === 0 || completed === total) {
          sendProgress(`Checked ${completed} of ${total} minors players...`);
        }
      }

      await runWithConcurrency(allMinorsPlayers, checkMinorsPlayer, 10);
    }

    // Compile and store results
    const results = {
      timestamp: new Date().toISOString(),
      leagueUrl: baseUrl,
      config,
      injuredViolations,
      minorsViolations,
      errors,
      teamsChecked: teams.length
    };

    await chrome.storage.local.set({ lastResults: results });

    // Open results tab
    await chrome.tabs.create({ url: chrome.runtime.getURL("results.html") });

    // Cleanup offscreen document
    try {
      await chrome.offscreen.closeDocument();
    } catch (_) { /* may already be closed */ }

    sendProgress("Done!");
  } catch (err) {
    // Store error result
    await chrome.storage.local.set({
      lastResults: {
        timestamp: new Date().toISOString(),
        leagueUrl: baseUrl,
        config,
        injuredViolations: [],
        minorsViolations: [],
        errors: [{ team: "N/A", name: "N/A", reason: err.message }],
        teamsChecked: 0,
        fatalError: err.message
      }
    });

    await chrome.tabs.create({ url: chrome.runtime.getURL("results.html") });
    sendProgress("Error: " + err.message);
  }
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_PARSER"],
      justification: "Parse CBS Sports HTML pages"
    });
  }
}

function sendProgress(text) {
  chrome.runtime.sendMessage({ action: "progress", text }).catch(() => {
    // popup may be closed, that's fine
  });
}

async function runWithConcurrency(items, fn, limit) {
  const executing = new Set();
  for (const item of items) {
    const p = fn(item).then(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}
