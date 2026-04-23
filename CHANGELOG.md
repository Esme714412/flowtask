# Changelog

## [Unreleased]
### Fixed
- 行動裝置底部導航列移除番茄鐘選項
- DatePicker 傳入無效日期字串時 `year`/`month` 變 NaN 導致白屏
- Dashboard / TaskList 新增任務按鈕直接傳 MouseEvent 給 `onNewTask`，導致 `due_date` 被設為事件物件

---

## [v0.5.0] - 2026-04-22
### Added
- 日曆視圖（CalendarView）：月曆顯示任務、點擊空白日自動帶入日期、今天圓點標示
- 白色模式改為預設主題

### Fixed
- DatePicker 快速選日期按鈕（今天／明天／後天）UTC 偏移問題，改用本地時間計算

### Removed
- 番茄鐘從側邊欄導航移除（PomodoroView 檔案保留但不對外開放）

---

## [v0.4.0] - 2026-04-21
### Changed
- 白色模式全面改用純白 + Zinc 色階，提升閱讀舒適度
- 側邊欄切換主題圖示改為 SVG 線稿（太陽／月亮）
- 所有主要動作按鈕統一改用 `.btn-primary` CSS class，解決白色模式下文字色衝突

### Fixed
- 白色模式下重要度滑桿背景色為黑色

---

## [v0.3.0] - 2026-04-19
### Added
- 艾森豪矩陣視圖（MatrixView）：依重要度 × 緊急度四象限顯示任務

---

## [v0.2.0] - 2026-04-19
### Fixed
- GitHub Pages OAuth 改用 Implicit Flow
- 依部署環境自動切換 Redirect URL

---

## [v0.1.0] - 2026-04-18
### Added
- 初始版本：任務清單、Dashboard、獎勵系統、Supabase 整合、GitHub Pages 部署
