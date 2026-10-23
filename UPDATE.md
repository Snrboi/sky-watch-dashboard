# Sky Watch Dashboard update

## What changed

- Refined the ISS Tracker and overview, history, photo, and statistics pages.
- Replaced the rocket-shaped ISS map marker with a detailed station silhouette and gold, gridded solar arrays. Both the 3D globe and 2D fallback use the same SVG asset: `frontend/public/iss-marker.svg`.
- Marked the selected user location in red and added a black dotted line connecting it to the ISS.
- Added a 24-hour forecast timeline. Temperatures between the weather provider's 3-hour samples are estimates; conditions carry forward from the most recent sample.
- The Earth textures and map marker are static frontend assets; they are not stored in the history database.

## Apply this update

Download `sky-watch-dashboard-updates-2026-10-23-predeploy.zip` to `/home/gamp/Downloads`, then extract the changed and new files over the project:

```bash
unzip -o /home/gamp/Downloads/sky-watch-dashboard-updates-2026-10-23-predeploy.zip -d /home/gamp/sky-watch-dashboard
```

The archive contains only files that are new or changed relative to the supplied team ZIP. It does not include dependencies, generated build output, or user data. It does not commit or push anything.

## Install and check

```bash
cd /home/gamp/sky-watch-dashboard/frontend && npm ci
cd /home/gamp/sky-watch-dashboard/frontend && npm run lint && npm test && npm run build
```

The frontend checks passed when this update was prepared: lint clean, 51 tests passed, production build successful. The build may report the existing large 3D-globe chunk warning.
