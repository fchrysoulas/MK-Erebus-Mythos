# Changelog

All notable changes to this project will be documented in this file.

## [0.1.7]

### Fixed

- Manual Stain track changes now create chat messages for all users, including GMs.

## [0.1.6]

### Added

- Player changes to the Stain track now create chat messages.

### Changed

- Active Stain 6 now appears black.

## [0.1.5]

### Fixed

- Devout class detection now also reads visible Shadowdark sheet class blocks so Stain 5 and 6 are greyed out when the sheet shows Class Devout.

## [0.1.4]

### Fixed

- Stain now clamps to a minimum of 1.
- Devout class detection now supports broader class-name formats such as "The Devout" and class data stored in actor system fields.

## [0.1.3]

### Added

- Devout characters now have a maximum Stain of 4, with Stain 5 and 6 disabled on their tracker.

## [0.1.2]

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
