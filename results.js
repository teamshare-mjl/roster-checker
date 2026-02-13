document.addEventListener("DOMContentLoaded", async () => {
  const { lastResults: results } = await chrome.storage.local.get("lastResults");

  if (!results) {
    document.getElementById("fatal-error").textContent = "No results found. Please run a check first.";
    document.getElementById("fatal-error").style.display = "block";
    return;
  }

  // Header info
  const headerEl = document.getElementById("header-info");
  const leagueName = results.leagueUrl.replace("https://", "");
  const timestamp = new Date(results.timestamp).toLocaleString();
  const checks = [];
  if (results.config.checkInjured) checks.push("Injured");
  if (results.config.checkMinors) checks.push(`Minors (AB >= ${results.config.abThreshold}, IP >= ${results.config.ipThreshold})`);
  headerEl.innerHTML =
    `<span><strong>League:</strong> ${esc(leagueName)}</span>` +
    `<span><strong>Checked:</strong> ${esc(timestamp)}</span>` +
    `<span><strong>Teams:</strong> ${results.teamsChecked}</span>` +
    `<span><strong>Checks:</strong> ${esc(checks.join(", "))}</span>`;

  // Fatal error
  if (results.fatalError) {
    const fatalEl = document.getElementById("fatal-error");
    fatalEl.textContent = "Fatal error: " + results.fatalError;
    fatalEl.style.display = "block";
    return;
  }

  // Injured violations
  if (results.config.checkInjured) {
    renderViolationSection(
      document.getElementById("injured-section"),
      "Injured Section Violations",
      results.injuredViolations
    );
  }

  // Minors violations
  if (results.config.checkMinors) {
    renderViolationSection(
      document.getElementById("minors-section"),
      "Minors Section Violations",
      results.minorsViolations
    );
  }

  // Errors
  if (results.errors && results.errors.length > 0) {
    const section = document.getElementById("errors-section");
    const header = document.createElement("h2");
    header.className = "section-header";
    header.textContent = `Errors (${results.errors.length})`;
    section.appendChild(header);

    for (const err of results.errors) {
      const div = document.createElement("div");
      div.className = "error-item";
      div.textContent = `${err.team} - ${err.name}: ${err.reason}`;
      section.appendChild(div);
    }
  }

  // Summary
  const summaryEl = document.getElementById("summary");
  summaryEl.innerHTML =
    `<h2>Summary</h2>` +
    `<div class="stat">Teams checked: ${results.teamsChecked}</div>` +
    (results.config.checkInjured ? `<div class="stat">Injured violations: ${results.injuredViolations.length}</div>` : "") +
    (results.config.checkMinors ? `<div class="stat">Minors violations: ${results.minorsViolations.length}</div>` : "") +
    (results.errors.length > 0 ? `<div class="stat">Errors: ${results.errors.length}</div>` : "");
});

function renderViolationSection(container, title, violations) {
  const header = document.createElement("h2");
  header.className = "section-header";
  header.textContent = `${title} (${violations.length})`;
  container.appendChild(header);

  if (violations.length === 0) {
    const noViolations = document.createElement("div");
    noViolations.className = "no-violations";
    noViolations.textContent = "No violations found.";
    container.appendChild(noViolations);
    return;
  }

  // Group by team
  const byTeam = {};
  for (const v of violations) {
    if (!byTeam[v.team]) byTeam[v.team] = [];
    byTeam[v.team].push(v);
  }

  for (const [teamName, teamViolations] of Object.entries(byTeam)) {
    const group = document.createElement("div");
    group.className = "team-group";

    const name = document.createElement("div");
    name.className = "team-name";
    name.textContent = teamName;
    group.appendChild(name);

    const list = document.createElement("ul");
    list.className = "violation-list";

    for (const v of teamViolations) {
      const item = document.createElement("li");
      item.className = "violation-item";

      const link = document.createElement("a");
      link.href = v.playerUrl;
      link.target = "_blank";
      link.textContent = v.name;

      const info = document.createTextNode(` (${v.position}, ${v.mlbTeam})`);

      const reason = document.createElement("div");
      reason.className = "violation-reason";
      reason.textContent = v.reason;

      item.appendChild(link);
      item.appendChild(info);
      item.appendChild(reason);
      list.appendChild(item);
    }

    group.appendChild(list);
    container.appendChild(group);
  }
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
