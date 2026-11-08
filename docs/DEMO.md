# Web Summit demo — 90-second script

Demo build: the shared simulator runs in the browser (no API needed), so it works on bad conference Wi-Fi.
If map tiles cannot load, the app switches to an offline schematic of Parque das Nações automatically.

## Before you go on

1. Open the demo link once on the presenting phone, so it is cached. Check the theme (light/dark follows the phone).
2. On the missions screen, tap **Reset demo data** twice to start clean.
3. Keep the QR code (`aerotrace-qr.png`) on a second screen or printed, and the backup screen recording ready.

## Script (≈ 90 s)

| Time | Do                                                | Say                                                                                                                                                 |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Missions list                                     | "AeroTrace plans and simulates drone missions. Everything you'll see is a simulation, here over Parque das Nações, where we're standing."           |
| 0:10 | Open **Riverfront survey**                        | "A mission is waypoints on a map. Home is H."                                                                                                       |
| 0:15 | Tap the map to add a waypoint; press ↑ to reorder | "Every edit re-runs the estimate: distance, flight time and the battery left at landing, against a 25% reserve."                                    |
| 0:30 | **Start simulated flight**                        | "The simulator is deterministic: same mission and seed, same flight. That makes it testable."                                                       |
| 0:40 | Point at instruments and timeline                 | "Battery, altitude, speed and progress update five times a simulated second, here at 10× speed."                                                    |
| 0:50 | **🔋 Low battery**                                | "Let's inject a failure. Below 20%, the failsafe takes over and the drone returns home on its own; commands that are no longer valid are disabled." |
| 1:05 | Switch to **20×**                                 | "It lands; the mission is marked aborted because not every waypoint was reached."                                                                   |
| 1:15 | **Open flight report**                            | "The report: planned route dashed, flown path solid, battery over time with the thresholds, and the full event timeline."                           |
| 1:25 | Close                                             | "React Native and Node.js, one shared TypeScript package for the rules, tested. Not flight-control software — a portfolio simulator."               |

## If something goes wrong

- Page will not load: play the backup recording.
- Flight stuck or wrong state: go back to Missions → Reset demo data.
- Need a second run: on the report, **Fly this route again**.
