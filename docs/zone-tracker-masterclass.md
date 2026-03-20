# Zone Tracker Master Class

This guide explains how Zone Tracker works as a system, not just where buttons are.

It is written for both:
- normal users who want better zone results
- admins or power users who need to understand what the data means

## What Zone Tracker Is

Zone Tracker is a community reporting and team-analysis tool for Honkai: Star Rail runs.

It has 3 workspaces:
- `Relic Log`
- `Zones`
- `Build Team`

These are meant to work together:
- `Relic Log` creates reports from real runs
- `Zones` shows the community map built from those reports
- `Build Team` helps simulate or search for teams that land in the right zone/slot pattern

Think of it like this:
- `Relic Log` = submit data
- `Zones` = read the map
- `Build Team` = test and search teams

## Core Terms

### Zone

In the app UI, `Zone` is the main pattern bucket for a team.

It is derived from the team composition and order, and is shown as a number like `431`.

You do not need to manually calculate it. The app calculates it for you from the selected team.

### Slot

`Slot` represents the slot-order signature of the team.

This is why the exact order of the 4 characters matters. The same 4 characters in a different position can produce a different slot value.

### Team Sum

`Team` or `Team Sum` is an additional numeric signature for the current team.

It helps narrow matching teams more tightly, but it is usually more restrictive than Zone + Slot alone.

### Report

A `report` is one submitted run from a user.

A report contains:
- the 4-character team
- the slot order
- the zone hash values
- the relic drop information
- optional notes
- run metadata like region and clear time

When enough users report similar runs, the system can identify stronger community patterns.

## The Header

At the top of Zone Tracker, the header shows:
- who is logged in
- the active cycle
- which map you are viewing
- the workspace switcher
- `Current` and `Previous`

### Current vs Previous

This is important.

`Current` means:
- show the live, active cycle data
- use the active week bucket

`Previous` means:
- show the last completed cycle
- useful for comparing stable older data against the current live data

Zone Tracker now rolls this automatically:
- every Monday at 5:00 AM, the current epoch becomes previous
- a fresh current epoch starts for new reports
- anything older than previous is deleted

So the system keeps only:
- `Current`
- `Previous`

Use `Current` when:
- you want the freshest live patterns
- you are actively playing the current cycle

Use `Previous` when:
- you want to compare against the last cycle
- the current cycle has low report volume
- you want a cleaner, more settled reference

In short:
- `Current` = this week after the rollover point
- `Previous` = last completed week

## Relic Log

`Relic Log` is where users submit real run data into the system.

### Team Assembly

At the top of Relic Log, you build the 4-character team.

You can:
- click a character to place them
- remove a character from a slot
- drag and reorder team members

The order matters.

If the team order changes, the Slot value can change too.

### Team vs Owned

Above the search bar there is a switch:
- `Team`
- `Owned`

`Team` mode:
- adds characters to the current report team

`Owned` mode:
- lets the user mark which characters they own
- saves that roster to their own account
- can be reused later in `Zones` and `Build Team`

In `Owned` mode:
- owned characters are highlighted
- non-owned characters are greyed out
- users can search characters the same way
- users can save or reload their roster

### Reliquary Import

There is also an import option for a Reliquary archive JSON.

This gives users a second way to populate their owned roster.

Current behavior:
- the app reads the export JSON
- it looks for the top-level `characters` array
- it maps each character `id`
- matching characters are saved as that user’s owned roster

This is useful because users do not have to click every character manually.

### Relic Drops

The next section records the relic information from the run.

Users can:
- set how many relics dropped
- choose the relic piece
- choose main stat
- choose substats

The app also infers a suggested outcome based on the selected relic information.

Examples:
- SPD + double crit
- one crit
- flat junk
- mixed

### Configuration

Users can also set:
- cavern
- region
- clear time
- notes

These fields help contextualize the report.

### Why Reporting Matters

One report is useful.

Many reports are where the map becomes powerful.

Zone Tracker is designed around aggregated community observations. The more users report real runs, the better the zone patterns become.

## Zones

`Zones` is the community map view.

This is where users inspect reported patterns and decide what is worth chasing.

### Grid vs List

Users can switch between:
- `Grid`
- `List`

Both show the same underlying zone data, just in different layouts.

### What a Zone Card Represents

A zone card is a grouped community result for a team signature.

A card can include:
- Zone
- Slot
- Team Sum
- sample squad
- number of reports
- crit potential or target metric
- observed relic information

It is not just one user’s run. It is a grouped view of matching reported data.

### Filters

The Zones view supports several filters.

#### Region Filter

Lets users narrow results by:
- all
- Asia
- EU
- NA

#### Drop Target

Lets users rank by what they care about.

Examples:
- crit potential
- SPD
- crit substats
- SPD + crit
- custom stat matching

This changes how the zone list is prioritized.

#### Owned Team Filter

This uses the saved owned roster from Relic Log.

Options:
- `Ignore Owned`
- `Use Owned Roster`

When `Use Owned Roster` is enabled, users can also choose:
- `Min 3`
- `Min 4`

How to think about it:
- `Min 4` = I fully own the whole team
- `Min 3` = I can borrow 1 support from a friend

This is one of the most practical filters in the whole system.

### Reporting from Zones

Users can also act from the zone cards, depending on available actions.

Examples may include:
- report
- load team
- inspect variants or tuned results

The point of Zones is not only browsing. It is also a workflow hub between community data and your own team decisions.

## Build Team

`Build Team` is the simulation and search workspace.

This is not primarily for logging. It is for testing and generating team matches.

### What It Does

Build Team lets users:
- assemble a team manually
- adjust Zone / Slot / Team target values
- generate matching teams
- compare how close results are to the selected target

### Why It Exists

Sometimes a user knows:
- the kind of zone they want
- the slot behavior they want
- or the original team they are trying to mimic

Build Team helps answer:
- what other teams can land here?
- which teams are closest?
- can I find a version using characters I own?

### Owned Filtering in Build Team

Build Team also supports owned roster filtering.

This uses the same saved roster as Relic Log and Zones.

That means the user can:
- maintain owned characters once
- reuse that roster everywhere

### Exact vs Broad Matching

In practice:
- Zone + Slot is usually the most useful search basis
- Team Sum is more strict

If results are too narrow, the user should usually relax the search instead of assuming the generator is broken.

## Recommended User Workflow

For most users, the best workflow is:

1. Save your owned roster in `Relic Log`
2. Submit real runs through `Relic Log`
3. Browse `Zones` with `Use Owned Roster`
4. Use `Min 3` if one borrowed support is acceptable
5. Open `Build Team` when you want to simulate alternatives

That keeps the system practical instead of purely theoretical.

## How To Read the Data Correctly

A few important mindset rules:

### 1. Zone Tracker is community-driven

It gets better with more reports.

Low-volume patterns may be real, but they are less trustworthy than heavily reported ones.

### 2. Order matters

The same 4 characters in a different slot order can behave differently in the system.

Do not assume “same team, different order” is identical.

### 3. Owned filters are for practicality

A strong zone is not useful if the user cannot actually run the team.

This is why saved owned rosters matter.

### 4. Current and Previous serve different purposes

Do not treat them as duplicates.

Use:
- `Current` for live relevance
- `Previous` for comparison and stability

## Admin Notes

Admin actions exist for moderation and maintenance, not normal gameplay use.

Examples:
- deleting bad records
- editing grouped entries
- wiping data when needed

Admin actions should be tied to authenticated user permissions, not shared passwords.

## Common Questions

### Why do I get no results in Build Team?

Usually because the search is too strict.

Common causes:
- exact Zone + Slot + Team Sum is too narrow
- the current character pool cannot produce another valid team there
- owned filtering is enabled and the user roster is too small

### Why save owned characters per user?

Because every user has a different account.

Owned filtering only makes sense if it is personal and persistent.

### Why allow Reliquary import?

Because manual clicking is slow, and many users already have character/account exports from external tools.

## Final Take

Zone Tracker works best when users understand that it is a loop:

`Report real runs -> build better community map -> filter to what you can actually play -> test alternatives`

That is the real master flow.
