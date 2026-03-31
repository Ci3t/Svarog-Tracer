# Svarog Challenge System Plan

This file describes how Challenge Mode should scale after the first 5 handcrafted contracts.

The goal is:

- handcrafted contracts first
- seed pools by skill tier
- 2-click challenge start
- later admin-authored contracts
- later event / PvP challenge support

## Core Idea

Challenge Mode should have **two layers**:

1. **Handcrafted Contracts**
- fixed static contracts
- used for onboarding and quality control
- this is what we have started already

2. **Generated Contracts**
- built from curated seed pools
- assembled from:
  - session seed
  - target relic template
  - setup relic template
  - success rule
  - hint pack

So the product flow becomes:

- first clear the ladder
- then unlock generated challenge reps

## Tier Structure

We should define seed pools by skill tier:

1. `new_player`
2. `beginner`
3. `intermediate`
4. `veteran`
5. `expert`

Important:
- each tier should have **multiple seeds**
- not just one
- and not just one family

That means each tier should be a pool of:
- easier / cleaner seeds
- trickier / split-read seeds
- late-noise seeds

within the limits of that tier

## What a Seed Means

A `seed` here should not just mean one number.

A challenge seed should really mean:

- static seed label
- starter history
- engine mood/family bias
- region / patch context
- optional expected pressure style

So a seed object should look more like:

```js
{
  id: "beginner-clean-01",
  tier: "beginner",
  seedLabel: "beginner-clean-01",
  mood: "stable",
  region: "America",
  patch: "4.1",
  starterRolls: ["42", "43", "42", "43", "44", "42"],
  tags: ["clean-pair", "simple-detour", "low-noise"],
  expectedStyle: "clean_detour",
}
```

## What a Generated Contract Needs

A generated contract should be built from 4 things:

1. **Seed**
- defines the session state

2. **Target Relic Template**
- fixed substat layout
- fixed order
- fixed main stat

3. **Success Archetype**
- dual crit
- dual crit combined
- mono line
- avoid junk
- split-read finish

4. **Hint Pack**
- tied to the archetype and seed style

So the generator flow is:

```text
choose tier
-> choose seed from pool
-> choose relic template allowed for that tier
-> choose success archetype allowed for that tier
-> choose matching hint pack
-> build scenario object
```

## Recommended Tier Behavior

### New Player
- clean commons
- clear setup usage
- low noise
- simple detour
- mostly 3-line target relics with clear reward

### Beginner
- still readable
- one trap side
- low to medium noise
- dual-crit finishes
- simple force-line use

### Intermediate
- split reads
- 4-line targets appear
- repeated detours
- medium noise
- mixed pair trust

### Veteran
- discipline contracts
- repeat force usage
- less forgiving relic shape
- higher noise pressure
- stale commons problems

### Expert
- hard late-noise finish
- punishes lazy reads
- strong drift
- low forgiveness
- challenge should feel fair, not scripted

## Data Model

We should split challenge data into these files:

### 1. `challengeContracts.js`
- handcrafted contracts
- fixed first ladder

### 2. `challengeSeedPools.js`
- seed pools per tier
- static curated seeds

### 3. `challengeRelicTemplates.js`
- target relic templates
- setup relic templates

### 4. `challengeHintPacks.js`
- hint text grouped by:
  - dual-crit
  - mono-line
  - split-read
  - late-noise

### 5. `challengeScenarioFactory.js`
- generator that assembles a contract from:
  - tier
  - selected seed
  - relic template
  - success archetype

## Best UX

The user should not feel like they are configuring 12 things.

For normal players, Challenge Mode should be:

### Button 1
- choose tier

### Button 2
- `Generate Challenge`

That’s it.

Optional:
- `Next Challenge`

So the UI should feel like:

- pick skill tier
- generate contract
- solve
- next

## Best Admin Flow

Later, admin should be able to do this from the site:

1. choose seed
2. choose target relic template
3. choose setup relic template
4. choose success archetype
5. write custom goal text
6. save contract

That means the site can later support:

- hand-made official contracts
- seasonal/event contracts
- featured weekly contracts

## Admin Contract Schema

The admin-created challenge should still save into the same contract shape.

That way:

- handcrafted ladder
- generated contracts
- admin contracts
- event contracts

all use the same scenario engine

## Event System Later

When event support comes later, the best path is:

- an `eventContracts` layer on top of the same contract schema

Event extras can include:

- start date
- end date
- leaderboard flag
- max tries
- PvP race flag
- featured badge

So later PvP/events do **not** need a different challenge engine.

They just need:

- same contract schema
- extra event metadata

## PvP Later

PvP should not invent new logic.

Use the same challenge contract:

- all players get the same seed
- same target relic
- same setup relic
- same win condition

Then PvP score can be based on:

- time
- tries
- mistakes
- hints used

So PvP later is just:

- `contract + leaderboard + timing`

not a brand new system

## What We Should Build Next

### Step 1
Keep the first 5 handcrafted contracts.

### Step 2
Create:
- `challengeSeedPools.js`
- `challengeRelicTemplates.js`
- `challengeHintPacks.js`

### Step 3
Add `challengeScenarioFactory.js`

### Step 4
Add simple UI:
- tier buttons
- generate challenge
- next challenge

### Step 5
Later:
- admin create challenge page
- event challenge layer
- PvP layer

## Practical Recommendation

Do **not** fully randomize challenges yet.

Instead:

1. finish the 5 handcrafted ladder
2. build **curated generated pools**
3. only then let the generator mix templates

That gives us:

- quality control
- fair difficulty
- enough variety
- future admin/event support

## Final Product Philosophy

Challenge Mode should feel like:

- a LeetCode ladder first
- a smart generator second
- an admin/event platform later

That order matters.
