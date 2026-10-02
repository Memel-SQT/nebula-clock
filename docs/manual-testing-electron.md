# Electron manual test plan

The renderer is covered by Vitest and Playwright. The main process is not:
driving a tray icon, OS-level accelerators and an auto-updater from an
automated test needs a real desktop session, and the harnesses that fake one
tend to test the fake rather than the app. This checklist is what gets run by
hand before a release instead.

Run it against a **packaged** build (`pnpm build:desktop`), not `pnpm
dev:desktop` — several of these behave differently when the app is unpackaged.

## 1. Launch and window behaviour

| #   | Step                                                | Expected                                                         |
| --- | --------------------------------------------------- | ---------------------------------------------------------------- |
| 1.1 | Install and launch                                  | Window opens with no white flash; background is Nebula `#0A0A0F` |
| 1.2 | Close the window (X) with "keep running in tray" on | Window hides, tray icon stays, timer keeps running               |
| 1.3 | Click the tray icon                                 | Window returns, countdown matches the tray tooltip               |
| 1.4 | Turn "keep running in tray" off, close the window   | App quits                                                        |
| 1.5 | Launch a second instance                            | No second window or tray icon; the existing window is focused    |
| 1.6 | Quit from the tray menu                             | Process exits, tray icon disappears                              |

## 2. Tray

| #   | Step                                 | Expected                                                                    |
| --- | ------------------------------------ | --------------------------------------------------------------------------- |
| 2.1 | Start the timer, hover the tray icon | Tooltip shows `Nebula Clock · Focus — mm:ss`, updating every second         |
| 2.2 | Open the tray menu while running     | First item is the live countdown; the action reads **Pause**                |
| 2.3 | Open the tray menu while paused      | Action reads **Resume**                                                     |
| 2.4 | Tray → Skip phase                    | App moves to the break; the menu label follows                              |
| 2.5 | Tray → Reset phase                   | Countdown returns to the full duration                                      |
| 2.6 | macOS only                           | The countdown appears in the menu bar while running, and clears when paused |
| 2.7 | Complete a pomodoro                  | The dock/taskbar badge (macOS, Linux) shows today's count                   |

## 3. Global shortcuts

Give focus to **another** application for each of these.

| #   | Step                                                  | Expected                                                          |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| 3.1 | `Ctrl/Cmd+Shift+Space`                                | Timer starts or pauses                                            |
| 3.2 | `Ctrl/Cmd+Shift+N`                                    | Phase is skipped                                                  |
| 3.3 | `Ctrl/Cmd+Shift+R`                                    | Phase is reset                                                    |
| 3.4 | `Ctrl/Cmd+Shift+M`                                    | Mini window opens; pressing it again closes it                    |
| 3.5 | Turn global shortcuts off in Settings, retry 3.1      | Nothing happens                                                   |
| 3.6 | Bind the same chord in another app first, then launch | App still starts; a warning is logged, other shortcuts still work |

## 4. Mini mode

| #   | Step                                       | Expected                                              |
| --- | ------------------------------------------ | ----------------------------------------------------- |
| 4.1 | Timer → **Mini mode**                      | Small frameless window appears, main window hides     |
| 4.2 | Drag the mini window by its background     | It moves                                              |
| 4.3 | Click a mini-window button                 | It acts on the timer and does **not** drag the window |
| 4.4 | With "always on top" on, focus another app | Mini window stays visible above it                    |
| 4.5 | Turn "always on top" off                   | Mini window can be covered                            |
| 4.6 | Start the timer in the mini window         | Countdown advances in both windows in step            |
| 4.7 | Close the mini window                      | Main window returns to the foreground                 |

## 5. Notifications and Do Not Disturb

| #   | Step                                              | Expected                                                     |
| --- | ------------------------------------------------- | ------------------------------------------------------------ |
| 5.1 | Let a focus phase end                             | OS notification appears with the app's own name and icon     |
| 5.2 | Turn system notifications off, repeat             | No OS notification; the in-app chime still plays if enabled  |
| 5.3 | Enable "Do Not Disturb during focus", start focus | The app's own notifications stop; the display does not sleep |
| 5.4 | End the focus phase                               | Notifications resume, display sleep is allowed again         |

> **Known limitation.** Electron exposes no cross-platform API for the _system_
> Do Not Disturb switch, and toggling it would mean writing to OS preferences
> behind the user's back. What this setting actually does — and all the UI
> claims it does — is suppress Nebula Clock's own notifications and hold the
> display awake for the length of the focus phase.

## 6. Launch at login

| #   | Step                              | Expected                                                     |
| --- | --------------------------------- | ------------------------------------------------------------ |
| 6.1 | Enable, then sign out and back in | App starts hidden, tray icon present                         |
| 6.2 | Disable, sign out and back in     | App does not start                                           |
| 6.3 | Windows                           | The entry appears under Task Manager → Startup               |
| 6.4 | macOS                             | The entry appears in System Settings → General → Login Items |

## 7. Distraction blocker

The website half edits the system hosts file and therefore needs elevation.

| #   | Step                                                      | Expected                                                                        |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 7.1 | Add a site, enable, start focus, **without** admin rights | Settings surfaces a permission error; nothing is written                        |
| 7.2 | Same, running the app elevated                            | Site stops resolving; the hosts file gains a `>>> nebula-clock begin >>>` block |
| 7.3 | End the focus phase                                       | The block is removed and the site resolves again                                |
| 7.4 | Kill the app mid-focus, relaunch                          | The leftover block is cleared on the next teardown                              |
| 7.5 | Add an app (e.g. `Discord.exe`), start focus, launch it   | A notification says it is on the block list; the app is **not** killed          |
| 7.6 | Switch to allow-list mode                                 | Sites are not blocked; the UI says so rather than pretending                    |

## 8. Auto-update

Needs two builds and a published GitHub Release.

| #   | Step                                                              | Expected                                                        |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| 8.1 | Install version N, publish N+1, open Settings → Check for updates | "Version N+1 is available", then a download progress percentage |
| 8.2 | Wait for the download                                             | A banner offers **Restart now**                                 |
| 8.3 | Click restart                                                     | App relaunches on N+1                                           |
| 8.4 | Check for updates when already current                            | "You are up to date"                                            |
| 8.5 | Unplug the network, check for updates                             | An error is reported; the app keeps working                     |

## 9. Data and persistence

| #   | Step                                                | Expected                                                              |
| --- | --------------------------------------------------- | --------------------------------------------------------------------- |
| 9.1 | Run a pomodoro, quit, relaunch                      | It appears in the statistics and the calendar                         |
| 9.2 | Start the timer, quit mid-phase, relaunch           | The countdown resumes at the correct remaining time, not from the top |
| 9.3 | Sleep the machine mid-phase for 10 minutes, wake it | The countdown is correct; exactly one phase has advanced              |
| 9.4 | Export JSON, delete all data, re-import             | Tasks, tags, sessions and settings all return                         |

## 10. Appearance and accessibility

| #     | Step                                             | Expected                                                            |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------- |
| 10.1  | Switch through the four themes                   | Whole window repaints, window controls (top right) follow the theme |
| 10.2  | Set theme to "System", change the OS theme       | App follows without a restart                                       |
| 10.3  | Pick each accent, then "Custom" with two colours | Ring, buttons, sidebar and background all follow                    |
| 10.4  | Pick each animated background                    | One layer behind everything; it stops while the window is hidden    |
| 10.5  | Set the motion level to "Off"                    | Nothing animates and nothing stays invisible                        |
| 10.6  | Set text size to 150%                            | Nothing clips or overlaps; the window is still usable               |
| 10.7  | Resize to 1050 x 700, then 700 x 700             | Icon rail below 1100 px, navigation bar at the top below 720 px     |
| 10.8  | Tab through the whole window                     | Every control is reachable and its focus ring is visible            |
| 10.9  | Switch to French                                 | Every string changes, including the whole tray menu                 |
| 10.10 | Drag the window by its top strip                 | It moves; the strip never covers a control                          |

## 11. Nebula Hub (optional)

Run against Nebula Hub's Link server in test mode (repository Nebula-Hub,
`tests/link-harness/e2e-app.ts`) with this app's `apps/desktop/nebula.app.json`, then
launch the shell with `NEBULA_LINK_SESSION_FILE=<the driver's session file>` and a
throwaway `--user-data-dir`.

| #    | Step                                           | Expected                                                               |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 11.1 | Start the app with no Hub running              | Starts and behaves exactly as before                                   |
| 11.2 | Query the widget `clock.focus.today`           | Today's count, the goal and the streak, in the app's language          |
| 11.3 | Let a phase end                                | The notification also reaches the Hub's activity centre                |
| 11.4 | Send the Hub mode with bounds                  | Frameless window exactly at those bounds, off the taskbar              |
| 11.5 | Click "Détacher", or stop the Hub while docked | The normal window comes back where it was                              |
| 11.6 | Settings → Nebula Hub                          | State, "Follow the Nebula appearance", "Updates handled by Nebula Hub" |
| 11.7 | Click the "Nebula apps" button                 | Opens the Hub, or its download page when it is not installed           |
| 11.8 | Change the appearance in the Hub               | Theme, accents, background, motion and sounds follow 1 for 1           |
