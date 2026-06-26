# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-06-27

### Added

- Devout characters now have a maximum Stain of 4, with Stain 5 and 6 disabled on their tracker.

## [0.1.2] - 2026-06-27

### Added

- Added an Erebus Mythos box to the player actor Abilities tab.
- Added a Stain track from 1 to 6.
- Added Evil Eye rolling from the eye image button.

### Changed

- Places the Erebus Mythos box after the Shadowdark Special Abilities section.
- Clicking a Stain number sets Stain to that value.
- Clicking the currently selected Stain number reduces Stain by one, and clicking 1 when Stain is 1 clears the track.
- Evil Eye now rolls `Stain d6`; any `1` triggers Evil Eye.
- Stores actor flags under `mk-erebus-mythos`.

### Fixed

- Safely reads old `mk-erebus-stains` data without calling Foundry `getFlag()` on the inactive scope.
