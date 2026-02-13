const CBS_URL_PATTERN = /^(https:\/\/[a-z0-9]+\.baseball\.cbssports\.com)/;

let leagueBaseUrl = null;

document.addEventListener("DOMContentLoaded", async () => {
  const leagueUrlEl = document.getElementById("league-url");
  const leagueInfoEl = document.getElementById("league-info");
  const runBtn = document.getElementById("run-check");

  // Detect league URL from active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const match = tab?.url?.match(CBS_URL_PATTERN);

  if (match) {
    leagueBaseUrl = match[1];
    leagueUrlEl.textContent = leagueBaseUrl.replace("https://", "");
    runBtn.disabled = false;
  } else {
    leagueUrlEl.textContent = "Not on a CBS fantasy baseball page";
    leagueInfoEl.classList.add("error");
  }

  // Load saved config
  const config = await chrome.storage.sync.get({
    checkInjured: true,
    checkMinors: true,
    abThreshold: 130,
    ipThreshold: 50
  });

  document.getElementById("check-injured").checked = config.checkInjured;
  document.getElementById("check-minors").checked = config.checkMinors;
  document.getElementById("ab-threshold").value = config.abThreshold;
  document.getElementById("ip-threshold").value = config.ipThreshold;

  // Run check
  runBtn.addEventListener("click", async () => {
    const cfg = {
      checkInjured: document.getElementById("check-injured").checked,
      checkMinors: document.getElementById("check-minors").checked,
      abThreshold: parseInt(document.getElementById("ab-threshold").value, 10) || 130,
      ipThreshold: parseInt(document.getElementById("ip-threshold").value, 10) || 50
    };

    // Save config
    await chrome.storage.sync.set(cfg);

    // Disable button
    runBtn.disabled = true;
    setStatus("Starting check...");

    // Send to background
    chrome.runtime.sendMessage({
      action: "runCheck",
      baseUrl: leagueBaseUrl,
      config: cfg
    });
  });

  // Listen for progress updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progress") {
      setStatus(message.text);
    }
  });
});

function setStatus(text) {
  document.getElementById("status").textContent = text;
}
