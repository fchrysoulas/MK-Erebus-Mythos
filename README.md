# MK-Erebus-Mythos

Compact Foundry VTT module for Erebus Mythos Stain and Evil Eye tracking on Shadowdark actor sheets.

## v0.1.4

- Stain cannot go below **1**.
- Improves Devout class detection for class names such as **The Devout**.
- Devout characters have a maximum Stain of **4**.
- Stain values **5** and **6** are disabled on Devout character trackers.

## v0.1.3

- Devout characters have a maximum Stain of **4**.
- Stain values **5** and **6** are disabled on Devout character trackers.

## v0.1.2

- Adds an **Erebus Mythos** box to the player actor **Abilities** tab.
- Places it after the Shadowdark **Special Abilities** section.
- Provides a Stain track from **1 to 6**.
- Click a number to set Stain to that value.
- Click the currently selected number to reduce by one; clicking 1 when Stain is 1 clears the track.
- Uses the eye image button to roll Evil Eye.
- Evil Eye roll: roll `Stain d6`; any `1` triggers Evil Eye.
- Stores actor flags under `mk-erebus-mythos`.
- Safely reads old `mk-erebus-stains` data without calling Foundry `getFlag()` on the inactive scope.

## Install

Place the `mk-erebus-mythos` folder in Foundry's `Data/modules` folder and enable **MK-Erebus-Mythos**.
