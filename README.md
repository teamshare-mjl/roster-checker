# Roster Checker

A Chrome extension that checks CBS Sports fantasy baseball rosters for illegal lineup placements.

## What It Checks

- **Injured section**: Flags players sitting in an Injured roster slot who are not actually on the Injured List (IL).
- **Minors section**: Flags players in a Minors roster slot whose career stats exceed configurable thresholds (default: 130 AB for hitters, 50 IP for pitchers).

Both checks can be independently toggled on or off, and the AB/IP thresholds are configurable.

## How To Use

1. Navigate to any page on your CBS Sports fantasy baseball league.
2. Click the Roster Checker extension icon.
3. Configure which checks to run and adjust thresholds if needed.
4. Click **Run Check**.
5. A new tab opens with a report of all violations grouped by team.

## Installation

### From Source

1. Clone this repository or download the ZIP.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the project folder.

## Privacy

See [PRIVACY.md](PRIVACY.md). This extension does not collect or share any data. All processing happens locally in your browser.
