# Extra features per role

The extras from the original group guide (`SkyWatch_Dashboard_Project_Guide.pdf`, the CLI project),
carried over to this web build. Each one says what it is, who owns it, and which files change.

**Status 20 October: every extra on this page is built, tested, and committed on
`develop`.** Backend: 106 tests pass. Frontend: 47 tests pass, lint and build clean.

The guide's roles map almost one to one onto our tags in `docs/PROJECT_TREE.md`:

| Guide role | Tag | Area |
|---|---|---|
| 1 Location Handler | R1 | City search |
| 2 Weather Fetcher | R2 | Weather |
| 3 Air Quality | R3 | Air quality |
| 4 ISS Live Tracker | **R4** | ISS position, map, stage, frontend |
| 5 ISS Pass Predictor | R5 | ISS passes |
| 6 NASA Photo Fetcher | R6 | APOD |
| 7 History / Log Manager | R7 | History and storage |
| 8 Statistician | R8 | Statistics |
| 9 CLI Integrator | R9 | App core and HTTP layer |

Ground rules, same as before: one owner per file, extras do not change the API shape without
telling R4 (the frontend types come from `backend/openapi.json`), and every extra ships with its own
test.

---

## R4 — ISS Live Tracker (mine)

Five extras, all from the guide's Role 4 bonus list, rebuilt for the web app.

### 1. The globe (built 20 October, replacing the flat map)

A real, rotating earth: a NASA blue-marble photograph on a three-globe WebGL sphere. Drag to turn
it; it never spins on its own (the motion rules allow only state-driven movement). The flat map
stays as the fallback where WebGL is unavailable.

- Library: `three-globe` + `three` (lazy-loaded: the globe is its own 1.7 MB chunk, so no other
  page pays for it).
- Texture: `frontend/public/earth-clouds-8k.jpg` (8192×4096) on capable devices, with `earth-clouds-4k.jpg` as a 4096×2048 fallback for lower texture limits or memory. Both are bundled NASA/GSFC Scientific Visualization Studio Earth-and-cloud imagery.
- Files: `frontend/src/features/iss/GlobeMap.tsx` (new), `IssMapCard.tsx`, `IssMap.tsx` (now the
  fallback), `GlobeMap.test.tsx` (new).
- The day/night shading extra was dropped by decision: the globe itself carries the realism.

### 2. Ground track (where it has been, where it is going)

- Data: `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=...` returns a list of
  positions for given timestamps.
- The endpoint answers at most **45 timestamps** per request, so a wide window is sampled evenly
  instead of failing (`MAX_TRACK_POINTS` in `backend/app/services/iss_position.py`).
- Drawn as a path on the globe: flown part solid and bright, the part to come dimmer and dashed.
- Files: `backend/app/services/iss_position.py` (new function), `backend/app/routes/iss.py` (new
  endpoint), `frontend/src/features/iss/GlobeMap.tsx`.

### 3. Who is in space right now

The guide's own bonus, and the cheapest win on this list.

- Data: `http://api.open-notify.org/astros.json` — no key, returns names and craft. HTTP only, so the
  app's "https first" rule does not apply here; cache it for an hour.
- One straight line of people on the ISS page, each with a drawn astronaut helmet and initial (the
  roster API carries no photos, and crews change, so a drawn helmet is the honest picture).
- Files: `backend/app/services/iss_position.py` (new function), `backend/app/routes/iss.py` (new
  endpoint), `frontend/src/features/iss/AstrosCard.tsx` (new).

### 4. Countdown to the next visible pass

- Data: already there. A ticking line under the pass time, with seconds inside the last hour
  ("in 12 min 40 s"), refreshing every second.
- Frontend only, no API change: `frontend/src/features/iss/NextPassCard.tsx`,
  `IssPassesCard.tsx`, `iss-format.ts`.
- Respect the motion rules: text update, no pulsing.

### 5. Into the user's own calendar

The guide had a download; the web does better. Each pass offers two buttons: **Google Calendar**
opens the event pre-filled in Google, and **Apple Calendar** opens an .ics held as a data URI, so
nothing is saved to disk first. True silent-write needs the native app, which can use EventKit and
the Android calendar intents later.

- Files: `frontend/src/features/iss/pass-calendar.ts` (new), `IssPassesCard.tsx`.

---

## R1 — City search

- **Use my location.** A button that calls the browser's geolocation and reverse-geocodes the
  coordinates with OpenWeatherMap's `/geo/1.0/reverse`. Files: `frontend/src/features/location/`,
  `backend/app/services/geocoding.py`, `backend/app/routes/geocode.py`.
- **Recent searches.** The last five chosen places in `localStorage`, shown under the search box.
  Frontend only.
- Already done from the guide's list: multiple matches for a name (the search returns up to 5) and
  remembering the last place.

## R2 — Weather

- **Sunrise and sunset.** OpenWeatherMap returns `sys.sunrise` and `sys.sunset` in the same free call
  we already make. Add both to the weather schema and show them as a small row.
- **"Take an umbrella."** A one-line suggestion from the condition and rain fields, like the guide's
  bonus. Frontend only, no new data.
- **3-hour forecast strip.** The guide's mini-forecast: OpenWeatherMap `/data/2.5/forecast` is free and
  returns 3-hour slots in one call. Five slots show, in a strip that scrolls, with arrow buttons.
  New card.

## R3 — Air quality

- **WHO guideline flags.** Compare each pollutant against the WHO limits (static numbers, no new API)
  and mark the ones over the line. The guide's bonus, and it is the most useful thing on this list.
- **24-hour trend.** OpenWeatherMap `/data/2.5/air_pollution/history` is free. One sparkline of AQI over
  the last day.

## R5 — ISS passes

- **Show all five passes.** The backend already returns up to five with `rise_azimuth_deg`; the card
  shows fewer. A small table is a frontend change only.
- **Add to calendar.** Offer a `.ics` download for the next pass. Frontend can build it, or the
  backend can serve it from `backend/app/routes/iss.py`.
- **Morning or evening.** Label each pass. Free from the existing data.

## R6 — NASA photo

- **Pick a date** ("my birthday"). The route already accepts `?date=`, so this is a date input on the
  Photo page.
- **Random photo.** NASA's API takes `count=1`. One new endpoint option.
- **Download.** A button linking the full-size asset, which the fix now returns.

## R7 — History and storage

- **Export CSV.** The guide's bonus. Either a frontend download from the fetched list, or a
  `format=csv` option on `GET /api/history`.
- **Clear history.** A button with a confirmation, then `DELETE /api/history` for this browser only.
- **Filter by city.** Already supported by the API (`?city=`); it just has no control in the UI yet.

## R8 — Statistics

- **Coldest and warmest.** Both extremes with their dates, like the guide's bonus.
- **Lookups per day.** The `trend` list is already in the response; draw it as bars instead of text.
- **Most common time of day.** One pass over the same records.

## R9 — App core

- **Auto-refresh toggle.** The guide's 60-second refresh, as an opt-in switch (off by default, since
  it costs upstream calls).
- **Health details.** Add the history backend in use (`json` or `postgres`) to `GET /api/health`, so a
  deployment can be checked from one URL.
- **Keep-alive.** Wire UptimeRobot to `/api/health` (already planned in M5, never done).

---

## Picking one up

```bash
cd /home/gamp/sky-watch-dashboard
git checkout develop && git pull
git checkout -b r4-iss-terminator
# build it, then:
cd backend && uv run ruff check app tests scripts && uv run pytest
cd ../frontend && npm run lint && npm test && npm run build
```

Then open a PR into `develop`. One owner per file, and if the extra changes an endpoint's shape, R4
regenerates `backend/openapi.json` and the frontend types before anyone builds against it.
