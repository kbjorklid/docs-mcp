# Max Headers Algorithm Refinement

## Problem Statement

The original `max_headers` feature could produce unusable tables of contents in edge cases. For example:
- A document with 1 level-1 header and 50 level-2 subheaders
- With `max_headers: 25`, the result would be: 1 level-1 header + 24 level-2 headers
- This violates the "all-or-nothing per parent" constraint—showing only 24 of 50 subheaders

## Solution: Two-Phase Algorithm

### Phase 1: Minimum Viability Check

After applying the base greedy algorithm (always include all level-1 headers, then include complete parent groups of deeper levels until approaching the limit):

1. If the result has **< 3 headers total** AND the document has **≥ 3 headers total**:
   - Include the next sublevel completely, **even if it exceeds `max_headers`**
2. If the document has **< 3 headers total**:
   - Include all headers (already returned by base algorithm)
3. Otherwise:
   - Proceed to Phase 2

**Rationale**: A TOC with < 3 items is not useful. If we have more content available, showing the next level is worth exceeding the limit slightly.

### Phase 2: Greedy Filling (if below limit)

After Phase 1, if we haven't reached `max_headers`:

1. Identify the deepest header level currently included
2. Look at all parent sections at that level
3. Sort sections by **total character count (largest first)**, where the count includes all content within each section at the current deepest level.
4. For each section in sorted order:
   - If adding all direct subheaders from the next level would keep the total ≤ `max_headers`:
     - Add all direct subheaders from the next level (maintain all-or-nothing constraint)
     - Continue to next section
   - Else:
     - Stop (cannot add this section's direct subheaders without exceeding limit)

**Rationale**: Use remaining budget efficiently while respecting the all-or-nothing constraint. Prioritize sections with more substantial content (by character count) for better representation.

## Examples

### Example 1: Single Section (Triggers Phase 1)
- Document: 1 level-1 header, 50 level-2 subheaders
- `max_headers: 25`

**Phase 1:**
- Base algorithm: 1 header (level-1 only)
- 1 < 3 and file has ≥ 3 headers → include all level-2 subheaders
- **Result: 1 + 50 = 51 headers** (exceeds limit but ensures usability)

### Example 2: Normal Multi-Section (Phase 1 OK, Phase 2 Fills)
- Document: 3 level-1 headers
  - Section A: 10 level-2 subheaders
  - Section B: 8 level-2 subheaders
  - Section C: 7 level-2 subheaders
- `max_headers: 25`

**Phase 1:**
- Base algorithm: 3 level-1 (3 total) + all of Section A (13 total) + all of Section B (21 total)
- Section C's 7 subheaders would push to 28 > 25, so excluded by base algorithm
- Result: 21 headers (≥ 3, so no Phase 1 override)

**Phase 2:**
- Current: 21 headers, limit: 25, remaining: 4 slots
- Remaining sections at level-2: Section C with 7 subheaders
- 21 + 7 = 28 > 25, cannot fit Section C
- **Result: 21 headers** (no change)

### Example 3: Smaller Sections (Phase 2 Active)
- Document: 3 level-1 headers
  - Section A: 12 level-2 subheaders
  - Section B: 8 level-2 subheaders
  - Section C: 3 level-2 subheaders
- `max_headers: 25`

**Phase 1:**
- Base algorithm: 3 level-1 (3 total) + Section A (15 total) + Section B (23 total)
- Section C would make 26 > 25, so excluded
- Result: 23 headers (≥ 3, so no Phase 1 override)

**Phase 2:**
- Current: 23 headers, remaining: 2 slots
- Remaining sections: Section C with 3 subheaders
- 23 + 3 = 26 > 25, cannot fit
- **Result: 23 headers** (no change)

### Example 4: Phase 2 Successfully Adds
- Document: 3 level-1 headers
  - Section A: 8 level-2 subheaders
  - Section B: 5 level-2 subheaders
  - Section C: 2 level-2 subheaders
- `max_headers: 25`

**Phase 1:**
- Base algorithm: 3 level-1 (3 total) + Section A (11 total) + Section B (16 total)
- Section C would make 18 ≤ 25, so included
- Result: 18 headers (≥ 3, no Phase 1 override needed)

**Phase 2:**
- Current: 18 headers, remaining: 7 slots
- No more sections at level-2
- **Result: 18 headers** (all sections represented)

## Implementation Details

- Modify `TableOfContents.ts` to implement the two-phase algorithm
- Maintain existing all-or-nothing per parent constraint
- Update e2e tests to verify both phases work correctly
- Add test cases for the minimum viability edge case

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| File has 1 header total | Return 1 header (≥ 1, but < 3, file has < 3, so return all) |
| File has 2 headers total | Return 2 headers (≥ 2, but < 3, file has < 3, so return all) |
| File has 3+ headers, Phase 1 gives < 3 | Include next level entirely, even if exceeds limit |
| Phase 1 gives ≥ 3 and = `max_headers` | Stop, do not run Phase 2 (already at limit) |
| Phase 1 gives ≥ 3 and < `max_headers` | Run Phase 2 to fill remaining slots |
