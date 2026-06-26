# MK-Erebus-Mythos

Compact Foundry VTT module for Erebus Mythos Stain and Evil Eye tracking on Shadowdark actor sheets.

## Features

- Adds an **Erebus Mythos** Stain tracker to Shadowdark player actor sheets.
- Places the tracker on the **Abilities** tab after **Special Abilities**.
- Tracks Stain from **1** to **6**.
- Prevents Stain from dropping below **1**.
- Posts chat messages when the Stain track is changed manually.
- Rolls Evil Eye from the eye button using `Stain d6`; any `1` triggers Evil Eye.
- Sets Stain to the actor's maximum when Evil Eye triggers.
- Shows active Stain **6** in black.
- Supports Devout characters with a maximum Stain of **4**.
- Greys out Stain **5** and **6** for Devout characters.

## Requirements

- Foundry VTT 12 or 13.
- Shadowdark system 3.5.0 or newer.

## Install

Use this manifest URL in Foundry:

```text
https://github.com/fchrysoulas/MK-Erebus-Mythos/releases/latest/download/module.json
```

Or place the `mk-erebus-mythos` folder in Foundry's `Data/modules` folder and enable **MK-Erebus-Mythos**.

## Usage

- Click a Stain number to set the actor's Stain to that value.
- Click the currently selected Stain number to reduce Stain by one.
- Click the eye button to roll Evil Eye.
- For Devout characters, Stain is capped at **4** and values **5** and **6** are unavailable.

## Data

The module stores actor flags under `mk-erebus-mythos`.

It also reads old `mk-erebus-stains` flag data for compatibility with earlier versions.
