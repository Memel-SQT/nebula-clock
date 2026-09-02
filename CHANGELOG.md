## 1.1.0 (2026-09-02)

* fix(web): stop the launch screen swallowing the first keypress ([bd9a710](https://github.com/Memel-SQT/nebula-clock/commit/bd9a710))
* feat(ui): give Nebula Clock a logo of its own ([615ed44](https://github.com/Memel-SQT/nebula-clock/commit/615ed44)), closes [#1A1A2E](https://github.com/Memel-SQT/nebula-clock/issues/1A1A2E)
* feat(web): animate the launch and smooth out the interface ([6765b1a](https://github.com/Memel-SQT/nebula-clock/commit/6765b1a))
* ci: gate the Pages deploy behind an opt-in repository variable ([cdc66f9](https://github.com/Memel-SQT/nebula-clock/commit/cdc66f9))

## <small>1.0.4 (2026-09-01)</small>

* fix(core): drop the boolean IndexedDB indexes that never held anything ([fee9c4a](https://github.com/Memel-SQT/nebula-clock/commit/fee9c4a))
* fix(desktop): stop the mini window running a second timer ([1ea8136](https://github.com/Memel-SQT/nebula-clock/commit/1ea8136))
* fix(ui): repair the number field, segmented control and reminder timers ([bff94ae](https://github.com/Memel-SQT/nebula-clock/commit/bff94ae))
* chore: tidy remaining audit leftovers ([02183bd](https://github.com/Memel-SQT/nebula-clock/commit/02183bd))

## <small>1.0.3 (2026-09-01)</small>

* fix(ci): trigger the Pages deploy from the Release workflow run ([ecc3201](https://github.com/Memel-SQT/nebula-clock/commit/ecc3201))
* test(web): make the end-to-end suite match the real DOM ([61e5f85](https://github.com/Memel-SQT/nebula-clock/commit/61e5f85))
* docs: note that auto-update needs a public repository ([7ffdd7b](https://github.com/Memel-SQT/nebula-clock/commit/7ffdd7b))

## <small>1.0.2 (2026-09-01)</small>

* fix(stats): stop Intl.DateTimeFormat crashing the statistics view ([e92ed0d](https://github.com/Memel-SQT/nebula-clock/commit/e92ed0d))

## <small>1.0.1 (2026-09-01)</small>

* fix(ci): stamp the release version before building the installers ([e4cddce](https://github.com/Memel-SQT/nebula-clock/commit/e4cddce))
* fix(ui): rename the canvas colour token so text-base keeps its size ([ffbd85a](https://github.com/Memel-SQT/nebula-clock/commit/ffbd85a))

## 1.0.0 (2026-09-01)

* build(desktop): fix the Linux and macOS packaging targets ([80e81bc](https://github.com/Memel-SQT/nebula-clock/commit/80e81bc))
* fix(web): restore the Nebula tokens and stop the timer render loop ([25f3948](https://github.com/Memel-SQT/nebula-clock/commit/25f3948)), closes [#185](https://github.com/Memel-SQT/nebula-clock/issues/185)
* ci: add build matrix, semantic-release and Pages workflows ([5cf6e1a](https://github.com/Memel-SQT/nebula-clock/commit/5cf6e1a))
* ci: allow dependency build scripts to run on the runners ([ba2d5e8](https://github.com/Memel-SQT/nebula-clock/commit/ba2d5e8))
* ci: classify every dependency build script for pnpm ([96113c5](https://github.com/Memel-SQT/nebula-clock/commit/96113c5))
* ci: let pnpm/action-setup read the version from packageManager ([9894ba9](https://github.com/Memel-SQT/nebula-clock/commit/9894ba9))
* docs: add README, contributing guide and the Electron test plan ([bbd9898](https://github.com/Memel-SQT/nebula-clock/commit/bbd9898))
* feat(core): add IndexedDB storage with JSON and CSV portability ([451f292](https://github.com/Memel-SQT/nebula-clock/commit/451f292))
* feat(core): add statistics, streaks, badges and calendar aggregation ([5176383](https://github.com/Memel-SQT/nebula-clock/commit/5176383))
* feat(core): add the notification abstraction and two-bus sound engine ([0eb5732](https://github.com/Memel-SQT/nebula-clock/commit/0eb5732))
* feat(core): add the timestamp-based Pomodoro state machine ([13a1985](https://github.com/Memel-SQT/nebula-clock/commit/13a1985))
* feat(desktop): add the Electron shell with tray, shortcuts and updater ([1ec7f68](https://github.com/Memel-SQT/nebula-clock/commit/1ec7f68))
* feat(i18n): add French and English catalogues split by domain ([c028cc4](https://github.com/Memel-SQT/nebula-clock/commit/c028cc4))
* feat(ui): port the Nebula design tokens and shared components ([9e172de](https://github.com/Memel-SQT/nebula-clock/commit/9e172de))
* feat(web): add the PWA shell, stores and platform bridge ([94fc7e2](https://github.com/Memel-SQT/nebula-clock/commit/94fc7e2))
* feat(web): add timer, tasks, statistics, calendar and settings views ([a2dbfe5](https://github.com/Memel-SQT/nebula-clock/commit/a2dbfe5))
* test(core): cover the engine, storage and stats to 98% ([debcb43](https://github.com/Memel-SQT/nebula-clock/commit/debcb43))
* test(web): add store tests and the Playwright end-to-end suite ([fa50686](https://github.com/Memel-SQT/nebula-clock/commit/fa50686))
* chore: set up the pnpm monorepo with strict TypeScript tooling ([0ebae84](https://github.com/Memel-SQT/nebula-clock/commit/0ebae84))
