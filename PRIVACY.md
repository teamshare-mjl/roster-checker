# Privacy Policy - Roster Checker

**Last updated:** February 12, 2026

## Overview

Roster Checker is a Chrome extension that checks CBS Sports fantasy baseball rosters for illegal lineup placements. This policy describes how the extension handles user data.

## Data Collection

Roster Checker does **not** collect, transmit, or share any personal data. The extension does not use analytics, telemetry, or tracking of any kind.

## Data Access

The extension accesses the following data, all of which stays on your device:

- **CBS Sports fantasy league pages**: The extension reads HTML from your CBS Sports fantasy baseball league pages (specifically the all-teams roster page and individual player career stats pages) to identify lineup violations. This data is fetched directly from CBS Sports using your existing browser session and is not sent anywhere else.
- **Extension settings**: Your configuration preferences (which checks to run, stat thresholds) are stored locally in Chrome's extension storage (`chrome.storage.sync`) so they persist across sessions and sync across your Chrome browsers.
- **Check results**: The results of each roster check are stored temporarily in local extension storage (`chrome.storage.local`) so they can be displayed in the results tab. Results are overwritten each time you run a new check.

## Data Sharing

No data is shared with the extension developer, any third parties, or any servers. All processing happens locally in your browser.

## Permissions

- **`activeTab`**: Used to read the URL of your current tab to detect which CBS Sports fantasy league you are on.
- **`storage`**: Used to save your configuration preferences and temporarily store check results.
- **`tabs`**: Used to open a new tab to display check results.
- **`offscreen`**: Used to create a hidden document for parsing HTML content from CBS Sports pages.
- **Host permission (`*.cbssports.com`)**: Used to fetch roster and player stats pages from your CBS Sports fantasy league.

## Changes

If this privacy policy changes, the updated version will be posted to this repository.

## Contact

For questions about this policy, please open an issue on the [GitHub repository](https://github.com/teamshare-mjl/roster-checker).
