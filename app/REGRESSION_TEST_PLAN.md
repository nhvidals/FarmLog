# Mobile App Regression Test Plan

Date: 2026-06-23
Scope: Validation for the four fixes applied in app/App.tsx.

## Environment

- API running at http://localhost:4000 (or reachable LAN URL for physical device)
- Mobile app running with Expo
- At least 2 farms available for delete/reselect tests
- At least 1 animal, 1 incubation batch, and 1 medication entry available for date-render checks

## Case 1: Active Farm Reselection After Deleting Current Farm

Goal: Deleting the active farm must automatically select another existing farm (if any).

Steps:
1. Create Farm A and Farm B.
2. Select Farm A (active farm shown in header).
3. Delete Farm A from the farm pill list.
4. Observe selected farm state immediately after refresh.

Expected:
- Farm B becomes selected automatically.
- Header shows Farm B name.
- Animals/incubation/medication data load for Farm B.
- No empty farm selection state unless zero farms remain.

Negative check:
- If Farm A was not active and deleted, active farm remains unchanged.

## Case 2: Import Requires Selected Farm

Goal: Import action must be blocked when no farm is selected.

Steps:
1. Ensure no farm is selected (for example, delete last farm).
2. Open Data tab.
3. Press Import JSON.

Expected:
- Validation alert appears requesting farm selection.
- Document picker does not open.
- No API call is attempted.

Positive check:
1. Create/select a farm.
2. Press Import JSON and choose a valid exported JSON.

Expected:
- Import succeeds.
- Success alert appears.
- Lists refresh with imported records.

## Case 3: Export Requires Selected Farm

Goal: Export action must be blocked when no farm is selected.

Steps:
1. Ensure no farm is selected.
2. Open Data tab.
3. Press Export JSON.

Expected:
- Validation alert appears requesting farm selection.
- No file is generated/shared.
- No API call is attempted.

Positive check:
1. Select a farm.
2. Press Export JSON.

Expected:
- JSON is generated in cache.
- Share sheet opens on supported platforms.

## Case 4: Safe Date Rendering With Invalid Values

Goal: UI must not crash when invalid date values are returned by API.

Setup option A (preferred):
- Seed one record (animal/incubation/medication) with malformed date string via DB or API mock.

Setup option B:
- Temporarily patch backend response for one endpoint to return an invalid date value.

Steps:
1. Load Animals, Incubation, and Medication tabs.
2. Navigate through list cards containing malformed date values.
3. Open edit form for affected animal if applicable.

Expected:
- App does not crash.
- Date field renders fallback text (original value or empty string) instead of throwing runtime error.
- Remaining UI remains interactive.

## Case 5: Share Availability Guard

Goal: Export should fail gracefully on environments that do not support sharing.

Steps:
1. Run app in a target where sharing is unavailable (commonly web).
2. Select a farm.
3. Press Export JSON.

Expected:
- No crash.
- Error alert appears for export failure path.
- App remains usable.

## Smoke Retest

After running all cases above, run this smoke pass:
1. Create farm.
2. Create animal.
3. Create incubation entry.
4. Create medication entry.
5. Load genealogy tree for one animal.
6. Export and import data.

Expected:
- Core CRUD flows continue to work with no regressions.

## Execution Log Template

Use this template for each case:

- Case ID:
- Build/Platform:
- Preconditions:
- Steps executed:
- Actual result:
- Pass/Fail:
- Notes/screenshots:
