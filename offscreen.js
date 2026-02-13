chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseAllTeams") {
    sendResponse(parseAllTeamsPage(message.html));
    return false;
  }
  if (message.action === "parseCareerStats") {
    sendResponse(parseCareerStatsPage(message.html, message.playerType));
    return false;
  }
});

function parseAllTeamsPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const teams = {};
  let currentTeam = null;
  let currentTableType = null;
  let currentSection = "Active";

  const rows = doc.querySelectorAll("tr");

  for (const row of rows) {
    // Title row: identifies team and table type (Batters/Pitchers)
    if (row.classList.contains("title")) {
      const titleText = row.querySelector("td")?.textContent?.trim() || "";
      if (titleText.endsWith(" Batters")) {
        currentTeam = titleText.replace(" Batters", "");
        currentTableType = "Batters";
      } else if (titleText.endsWith(" Pitchers")) {
        currentTeam = titleText.replace(" Pitchers", "");
        currentTableType = "Pitchers";
      }
      currentSection = "Active";

      if (currentTeam && !teams[currentTeam]) {
        teams[currentTeam] = { injuredPlayers: [], minorsPlayers: [] };
      }
      continue;
    }

    // Subtitle row: section divider (Reserves, Injured, Minors)
    if (row.classList.contains("subtitle")) {
      const sectionText = row.querySelector("td")?.textContent?.trim() || "";
      if (sectionText === "Reserves" || sectionText === "Injured" || sectionText === "Minors") {
        currentSection = sectionText;
      }
      continue;
    }

    // Player row
    if (!row.classList.contains("playerRow") || !currentTeam) continue;
    if (currentSection !== "Injured" && currentSection !== "Minors") continue;

    const playerLink = row.querySelector("a.playerLink");
    if (!playerLink) continue;

    const playerName = playerLink.textContent.trim();
    const playerUrl = playerLink.getAttribute("href") || "";
    const playerIdMatch = playerUrl.match(/playerpage\/(\d+)/);
    const playerId = playerIdMatch ? playerIdMatch[1] : null;

    const posTeamSpan = row.querySelector("span.playerPositionAndTeam");
    const posTeamText = posTeamSpan?.textContent?.trim() || "";
    // Format: "3B \u2022 CIN" or "3B,1B \u2022 MIL" (bullet is &#149; / \u2022)
    const posTeamParts = posTeamText.split(/\s*[\u2022\u2219\u00b7•]\s*/);
    const position = posTeamParts[0]?.trim() || "";
    const mlbTeam = posTeamParts[1]?.trim() || "";

    const teamData = teams[currentTeam];

    if (currentSection === "Injured") {
      const hasILStatus = row.querySelector("span.icon-player-status-dl") !== null;
      teamData.injuredPlayers.push({
        name: playerName,
        position,
        mlbTeam,
        playerUrl,
        hasILStatus
      });
    } else if (currentSection === "Minors") {
      teamData.minorsPlayers.push({
        name: playerName,
        position,
        mlbTeam,
        playerUrl,
        playerId,
        tableType: currentTableType
      });
    }
  }

  // Convert to array
  const result = [];
  for (const [teamName, data] of Object.entries(teams)) {
    result.push({ teamName, ...data });
  }
  return { teams: result };
}

function parseCareerStatsPage(html, playerType) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Find the stat column we need
  const targetHeader = playerType === "Batters" ? "AB" : "INNs";
  const tables = doc.querySelectorAll("table");

  for (const table of tables) {
    const headerRow = table.querySelector("tr.label, thead tr.label");
    if (!headerRow) continue;

    const headers = headerRow.querySelectorAll("th");
    let colIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].textContent.trim() === targetHeader) {
        colIndex = i;
        break;
      }
    }
    if (colIndex === -1) continue;

    // Find the Career row
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      const firstCell = row.querySelector("td");
      if (!firstCell) continue;
      const cellText = firstCell.textContent.trim();
      if (cellText.startsWith("Career")) {
        const cells = row.querySelectorAll("td");
        if (colIndex < cells.length) {
          const rawValue = cells[colIndex].textContent.trim();
          const numValue = parseFloat(rawValue) || 0;
          if (playerType === "Batters") {
            return { careerAB: numValue };
          } else {
            return { careerINNs: numValue };
          }
        }
      }
    }
  }

  // No career row found — treat as 0
  if (playerType === "Batters") {
    return { careerAB: 0 };
  }
  return { careerINNs: 0 };
}
