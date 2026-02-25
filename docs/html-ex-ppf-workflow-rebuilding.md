<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RPMA v2 — /tasks/[id]/workflow/ppf — Preview</title>
<style>
/* ============================================================
   DESIGN TOKENS
   ============================================================ */
:root {
  --teal:        #0d9488;
  --teal-dark:   #0f766e;
  --teal-light:  #ccfbf1;
  --teal-mid:    #5eead4;
  --bg:          #f8fafc;
  --surface:     #ffffff;
  --border:      #e2e8f0;
  --text:        #0f172a;
  --muted:       #64748b;
  --muted-bg:    #f1f5f9;
  --blue:        #3b82f6;
  --blue-bg:     #eff6ff;
  --green:       #22c55e;
  --green-bg:    #f0fdf4;
  --orange:      #f97316;
  --orange-bg:   #fff7ed;
  --red:         #ef4444;
  --red-bg:      #fef2f2;
  --purple:      #a855f7;
  --purple-bg:   #faf5ff;
  --yellow:      #eab308;
  --yellow-bg:   #fefce8;
  --shadow:      0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
  --shadow-md:   0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
  --shadow-lg:   0 10px 15px -3px rgba(0,0,0,.1);
  --r:           12px;
  --r-sm:        8px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  background: var(--bg); color: var(--text); font-size: 14px;
  height: 100vh; overflow: hidden; display: flex; flex-direction: column;
}

/* ============================================================
   TOP PREVIEW NAV (dark bar)
   ============================================================ */
.pnav {
  background: #1e293b; padding: 0 14px;
  height: 36px; display: flex; align-items: center; gap: 6px;
  flex-shrink: 0; overflow-x: auto; z-index: 200;
}
.pnav__label { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; margin-right: 4px; }
.pnav__tab {
  padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;
  cursor: pointer; color: #94a3b8; white-space: nowrap; border: 1px solid transparent;
  transition: all .12s; user-select: none;
}
.pnav__tab:hover { background: #334155; color: white; }
.pnav__tab.is-active { background: var(--teal); color: white; border-color: var(--teal-dark); }
.pnav__sep { color: #334155; margin: 0 2px; }

/* ============================================================
   SHELL: SIDEBAR + MAIN
   ============================================================ */
.shell { display: flex; flex: 1; overflow: hidden; }

/* SIDEBAR */
.sidebar {
  width: 210px; min-width: 210px; background: var(--surface);
  border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0;
}
.sb-logo {
  padding: 16px 14px 14px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}
.sb-logo__icon {
  width: 34px; height: 34px; background: var(--teal); border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 14px; flex-shrink: 0;
}
.sb-logo__name { font-weight: 800; font-size: 15px; }
.sb-logo__sub  { font-size: 10px; color: var(--muted); }
.sb-nav { padding: 10px 8px; flex: 1; overflow-y: auto; }
.sb-sec { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; padding: 8px 8px 4px; }
.sb-item {
  display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px;
  color: var(--muted); cursor: pointer; transition: all .12s; font-size: 13px; font-weight: 500;
  margin-bottom: 1px; text-decoration: none;
}
.sb-item:hover { background: var(--muted-bg); color: var(--text); }
.sb-item.is-active { background: var(--teal-light); color: var(--teal-dark); }
.sb-item svg { width: 15px; height: 15px; flex-shrink: 0; }
.sb-badge { margin-left: auto; background: var(--teal); color: white; font-size: 10px; padding: 1px 6px; border-radius: 20px; font-weight: 700; }
.sb-foot {
  padding: 10px 10px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 9px;
}
.sb-avatar { width: 30px; height: 30px; background: var(--teal); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; }
.sb-user__name { font-size: 12px; font-weight: 700; }
.sb-user__role { font-size: 10px; color: var(--muted); }

/* MAIN */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* TOPBAR */
.topbar {
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0 20px; height: 50px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}
.topbar__left { display: flex; align-items: center; gap: 10px; }
.breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--muted); }
.breadcrumb__sep { opacity: .5; }
.breadcrumb__cur { color: var(--text); font-weight: 700; }
.topbar__right { display: flex; align-items: center; gap: 8px; }

/* PPF WORKFLOW HEADER BAND */
.wf-header {
  background: linear-gradient(135deg, var(--teal-dark) 0%, #134e4a 100%);
  color: white; padding: 12px 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
}
.wf-header__left { display: flex; align-items: center; gap: 16px; }
.wf-header__pill {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.2);
  border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}
.wf-header__title { font-size: 16px; font-weight: 800; }
.wf-header__sub { font-size: 12px; opacity: .75; margin-top: 1px; }
.wf-header__right { display: flex; align-items: center; gap: 20px; text-align: right; }
.wf-header__stat { }
.wf-header__stat-val { font-size: 22px; font-weight: 900; line-height: 1; }
.wf-header__stat-lbl { font-size: 10px; opacity: .7; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.wf-header__cond {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.1);
  border-radius: 8px; padding: 8px 12px;
}
.wf-header__cond-item { display: flex; flex-direction: column; align-items: center; }
.wf-header__cond-val { font-size: 16px; font-weight: 800; }
.wf-header__cond-lbl { font-size: 9px; opacity: .65; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.wf-header__cond-ok { font-size: 9px; color: var(--teal-mid); font-weight: 700; }
.wf-header__div { width: 1px; height: 32px; background: rgba(255,255,255,.2); }

/* STEP PROGRESS BAND */
.step-progress {
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 14px 20px; flex-shrink: 0;
}
.stepper { display: flex; align-items: center; }
.stepper__item { display: flex; align-items: center; flex: 1; }
.stepper__item:last-child { flex: none; }
.stepper__circle {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 13px; flex-shrink: 0; border: 2px solid; cursor: pointer; transition: all .2s;
}
.stepper__circle.done   { background: var(--teal); border-color: var(--teal); color: white; }
.stepper__circle.active { background: white; border-color: var(--teal); color: var(--teal); box-shadow: 0 0 0 4px var(--teal-light); }
.stepper__circle.locked { background: white; border-color: var(--border); color: var(--muted); cursor: not-allowed; }
.stepper__info { margin-left: 10px; flex: 1; }
.stepper__name { font-size: 12px; font-weight: 700; color: var(--text); }
.stepper__time { font-size: 10px; color: var(--muted); }
.stepper__line { flex: 1; height: 2px; margin: 0 8px; }
.stepper__line.done   { background: var(--teal); }
.stepper__line.active { background: linear-gradient(90deg, var(--teal) 40%, var(--border) 100%); }
.stepper__line.locked { background: var(--border); }

/* CONTENT AREA */
.content { flex: 1; overflow-y: auto; padding: 20px; }

/* PAGE SECTIONS */
.page { display: none; }
.page.is-active { display: block; }

/* ============================================================
   ATOMS: Buttons
   ============================================================ */
.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--r-sm);
  font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; text-decoration: none;
  white-space: nowrap;
}
.btn svg { width: 14px; height: 14px; flex-shrink: 0; }
.btn--primary  { background: var(--teal); color: white; }
.btn--primary:hover { background: var(--teal-dark); }
.btn--blue     { background: var(--blue); color: white; }
.btn--blue:hover { opacity: .9; }
.btn--outline  { background: transparent; color: var(--text); border: 1px solid var(--border); }
.btn--outline:hover { background: var(--muted-bg); }
.btn--ghost    { background: transparent; color: var(--muted); border: 1px solid transparent; }
.btn--ghost:hover { background: var(--muted-bg); color: var(--text); }
.btn--danger   { background: var(--red); color: white; }
.btn--success  { background: var(--green); color: white; }
.btn--lg { padding: 12px 22px; font-size: 14px; border-radius: var(--r); }
.btn--sm { padding: 5px 10px; font-size: 11px; }
.btn--w { width: 100%; justify-content: center; }
.btn[disabled] { opacity: .4; cursor: not-allowed; pointer-events: none; }

/* ============================================================
   ATOMS: Badges
   ============================================================ */
.badge {
  display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px;
  border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap;
}
.badge--teal   { background: var(--teal-light); color: var(--teal-dark); }
.badge--green  { background: var(--green-bg);  color: #15803d; }
.badge--blue   { background: var(--blue-bg);   color: #1d4ed8; }
.badge--orange { background: var(--orange-bg); color: #c2410c; }
.badge--red    { background: var(--red-bg);    color: #dc2626; }
.badge--gray   { background: var(--muted-bg);  color: var(--muted); }
.badge--purple { background: var(--purple-bg); color: #7c3aed; }

/* ============================================================
   ATOMS: Cards
   ============================================================ */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  box-shadow: var(--shadow); overflow: hidden;
}
.card--hover { transition: box-shadow .15s, border-color .15s; }
.card--hover:hover { box-shadow: var(--shadow-md); border-color: var(--teal-mid); }
.card__head { padding: 16px 18px 0; }
.card__body { padding: 16px 18px; }
.card__title { font-size: 14px; font-weight: 800; color: var(--text); }
.card__sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
.card__sep   { height: 1px; background: var(--border); margin: 0; }

/* ============================================================
   ATOMS: Form
   ============================================================ */
.input {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-sm);
  font-size: 13px; color: var(--text); background: white; outline: none; width: 100%;
  transition: border .15s;
}
.input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-light); }
.select { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 13px; color: var(--text); background: white; appearance: none; width: 100%; }
.textarea { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 13px; resize: vertical; min-height: 80px; width: 100%; }
.label { font-size: 11px; font-weight: 700; color: var(--text); display: block; margin-bottom: 4px; }
.hint  { font-size: 10px; color: var(--muted); margin-top: 3px; }
.hint--ok  { color: var(--green); }
.hint--warn { color: var(--orange); }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

/* ============================================================
   ATOMS: Progress
   ============================================================ */
.pbar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.pbar__fill { height: 100%; border-radius: 3px; transition: width .3s; }
.pbar__fill--teal   { background: var(--teal); }
.pbar__fill--blue   { background: var(--blue); }
.pbar__fill--green  { background: var(--green); }
.pbar__fill--orange { background: var(--orange); }

/* ============================================================
   ATOMS: Checklist
   ============================================================ */
.checklist { display: flex; flex-direction: column; gap: 6px; }
.check-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 13px;
  border: 1px solid var(--border); border-radius: var(--r-sm); cursor: pointer;
  transition: all .12s; user-select: none;
}
.check-item:hover { border-color: var(--teal); background: #f0fdfa; }
.check-item.is-checked { background: var(--green-bg); border-color: var(--green); }
.check-item.is-required:not(.is-checked) { border-color: #fcd34d; background: var(--yellow-bg); }
.check-box {
  width: 18px; height: 18px; border: 2px solid var(--border); border-radius: 4px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
  transition: all .12s; color: transparent;
}
.check-item.is-checked .check-box { background: var(--green); border-color: var(--green); color: white; }
.check-txt  { font-size: 13px; font-weight: 600; color: var(--text); }
.check-sub  { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* ============================================================
   ATOMS: Alerts
   ============================================================ */
.alert { display: flex; gap: 10px; padding: 11px 13px; border-radius: var(--r-sm); }
.alert svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
.alert p { font-size: 12px; }
.alert--info    { background: var(--blue-bg);   border: 1px solid #bfdbfe; color: #1d4ed8; }
.alert--warn    { background: var(--yellow-bg);  border: 1px solid #fde68a; color: #92400e; }
.alert--success { background: var(--green-bg);  border: 1px solid #bbf7d0; color: #15803d; }
.alert--danger  { background: var(--red-bg);    border: 1px solid #fecaca; color: #dc2626; }

/* ============================================================
   ATOMS: Divider
   ============================================================ */
.divider { height: 1px; background: var(--border); margin: 14px 0; }

/* ============================================================
   LAYOUT HELPERS
   ============================================================ */
.flex        { display: flex; }
.items-c     { align-items: center; }
.items-s     { align-items: flex-start; }
.justify-b   { justify-content: space-between; }
.justify-c   { justify-content: center; }
.gap-1       { gap: 4px; }
.gap-2       { gap: 8px; }
.gap-3       { gap: 12px; }
.gap-4       { gap: 16px; }
.mt-2        { margin-top: 8px; }
.mt-3        { margin-top: 12px; }
.mt-4        { margin-top: 16px; }
.mb-3        { margin-bottom: 12px; }
.mb-4        { margin-bottom: 16px; }
.two-col     { display: grid; grid-template-columns: 1fr 300px; gap: 18px; }
.two-col-eq  { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.three-col   { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.four-col    { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
.txt-xs      { font-size: 11px; }
.txt-sm      { font-size: 12px; }
.txt-muted   { color: var(--muted); }
.txt-teal    { color: var(--teal); }
.txt-green   { color: var(--green); }
.txt-bold    { font-weight: 700; }
.txt-xbold   { font-weight: 800; }
.txt-center  { text-align: center; }
.txt-right   { text-align: right; }
.rounded-sm  { border-radius: var(--r-sm); }
.rounded     { border-radius: var(--r); }
.w-full      { width: 100%; }
.p-3         { padding: 12px; }
.p-4         { padding: 16px; }
.bg-muted    { background: var(--muted-bg); }
.bg-teal-l   { background: var(--teal-light); }

/* ============================================================
   COMPONENT: Stat Card
   ============================================================ */
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px 18px; display: flex; align-items: flex-start; gap: 13px; box-shadow: var(--shadow); }
.stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon svg { width: 20px; height: 20px; }
.stat-icon--teal   { background: var(--teal-light); color: var(--teal-dark); }
.stat-icon--green  { background: var(--green-bg);   color: #16a34a; }
.stat-icon--blue   { background: var(--blue-bg);    color: var(--blue); }
.stat-icon--purple { background: var(--purple-bg);  color: var(--purple); }
.stat-icon--orange { background: var(--orange-bg);  color: var(--orange); }
.stat-val  { font-size: 24px; font-weight: 900; line-height: 1.1; }
.stat-lbl  { font-size: 11px; color: var(--muted); margin-top: 2px; }
.stat-dlta { font-size: 10px; color: var(--green); margin-top: 3px; font-weight: 700; }

/* ============================================================
   COMPONENT: Photo Drop Zone
   ============================================================ */
.photo-zone {
  border: 2px dashed var(--border); border-radius: var(--r); padding: 24px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
  transition: all .15s; text-align: center;
}
.photo-zone:hover { border-color: var(--teal); background: var(--teal-light); }
.photo-zone svg { color: var(--muted); width: 28px; height: 28px; }
.photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
.photo-thumb {
  aspect-ratio: 1; border-radius: 8px; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; overflow: hidden; position: relative; background: var(--muted-bg);
  cursor: pointer; transition: border-color .12s;
}
.photo-thumb:hover { border-color: var(--teal); }
.photo-thumb--filled { border-color: var(--green); background: var(--green-bg); }
.photo-thumb--add   { border: 2px dashed var(--border); background: transparent; }
.photo-label { position: absolute; bottom: 3px; right: 3px; font-size: 9px; background: rgba(0,0,0,.55); color: white; border-radius: 4px; padding: 1px 4px; font-weight: 600; }

/* ============================================================
   COMPONENT: Vehicle Diagram (SVG)
   ============================================================ */
.vdiag { width: 100%; background: var(--muted-bg); border-radius: var(--r); padding: 16px; border: 1px solid var(--border); }
.vdiag svg { width: 100%; max-width: 420px; display: block; margin: 0 auto; }
.vzone { cursor: pointer; transition: fill .15s, stroke .15s; }
.vzone:hover { fill: #99f6e4; stroke: var(--teal) !important; }
.vzone.is-defect { fill: #fed7aa; stroke: var(--orange) !important; }
.vzone.is-ok { fill: #bbf7d0; stroke: var(--green) !important; }
.vzone.is-selected { fill: var(--teal-light); stroke: var(--teal) !important; }

/* ============================================================
   COMPONENT: Zone Tracker (installation)
   ============================================================ */
.zone-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.zone-card {
  border: 2px solid var(--border); border-radius: var(--r-sm); padding: 13px;
  cursor: pointer; transition: all .15s;
}
.zone-card:hover { border-color: var(--teal); background: #f0fdfa; }
.zone-card.done  { border-color: var(--green); background: var(--green-bg); }
.zone-card.active{ border-color: var(--blue);  background: var(--blue-bg); }
.zone-card.warn  { border-color: var(--orange);background: var(--orange-bg); }
.zone-card__name { font-size: 13px; font-weight: 700; }
.zone-card__area { font-size: 11px; color: var(--muted); margin-top: 2px; }
.zone-card__score{ font-size: 22px; font-weight: 900; margin-top: 8px; }
.zone-card.done  .zone-card__score { color: var(--green); }
.zone-card.active .zone-card__score{ color: var(--blue);  }
.zone-card__status { font-size: 10px; font-weight: 700; margin-top: 4px; }
.zone-card.done  .zone-card__status { color: #16a34a; }
.zone-card.active .zone-card__status{ color: var(--blue); }

/* ============================================================
   COMPONENT: Quality Score Slider
   ============================================================ */
.quality-slider-wrap { display: flex; flex-direction: column; gap: 6px; }
.quality-slider-row  { display: flex; align-items: center; gap: 12px; }
.quality-slider-row input[type=range] { flex: 1; accent-color: var(--teal); cursor: pointer; }
.quality-score { font-size: 16px; font-weight: 800; min-width: 28px; text-align: right; }

/* ============================================================
   COMPONENT: Timeline
   ============================================================ */
.tl { display: flex; flex-direction: column; gap: 0; }
.tl__item { display: flex; gap: 11px; padding-bottom: 14px; position: relative; }
.tl__item:not(:last-child)::before { content: ''; position: absolute; left: 11px; top: 26px; bottom: 0; width: 1px; background: var(--border); }
.tl__dot { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 800; z-index: 1; margin-top: 2px; }
.tl__dot--teal  { background: var(--teal); }
.tl__dot--green { background: var(--green); }
.tl__dot--blue  { background: var(--blue); }
.tl__dot--gray  { background: var(--muted); }
.tl__dot--orange{ background: var(--orange); }
.tl__title { font-size: 12px; font-weight: 700; }
.tl__time  { font-size: 10px; color: var(--muted); }
.tl__desc  { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ============================================================
   COMPONENT: Signature Pad
   ============================================================ */
.sig-pad {
  border: 2px dashed var(--border); border-radius: var(--r); min-height: 110px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: all .15s; background: white; position: relative; overflow: hidden;
}
.sig-pad:hover { border-color: var(--teal); background: var(--teal-light); }
.sig-pad.is-signed { border-color: var(--green); border-style: solid; background: var(--green-bg); }
.sig-pad__label { font-size: 12px; color: var(--muted); }
.sig-pad__svg   { font-family: 'Dancing Script', cursive, serif; font-size: 36px; color: var(--teal-dark); opacity: .5; user-select: none; }

/* ============================================================
   COMPONENT: Report Preview Card
   ============================================================ */
.report-card {
  background: white; border: 2px solid var(--border); border-radius: var(--r);
  padding: 20px; font-size: 12px; position: relative;
}
.report-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--teal); }
.report-card__logo { width: 40px; height: 40px; background: var(--teal); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 16px; }
.report-card__badge { position: absolute; top: 16px; right: 16px; }

/* ============================================================
   ACTION BAR (sticky bottom)
   ============================================================ */
.action-bar {
  position: sticky; bottom: 0; background: var(--surface); border-top: 2px solid var(--border);
  padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 -4px 12px rgba(0,0,0,.06); z-index: 50; flex-shrink: 0;
}

/* ============================================================
   DEFECT MARKER (on vehicle diagram)
   ============================================================ */
.defect-tag { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--orange-bg); border: 1px solid #fed7aa; border-radius: var(--r-sm); }
.defect-tag__dot { width: 8px; height: 8px; background: var(--orange); border-radius: 50%; flex-shrink: 0; }
.defect-tag__zone  { font-size: 12px; font-weight: 700; }
.defect-tag__type  { font-size: 11px; color: var(--muted); }

/* ============================================================
   MISC
   ============================================================ */
.score-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.score-ring__bg { fill: none; stroke: var(--border); stroke-width: 7; }
.score-ring__fill { fill: none; stroke: var(--green); stroke-width: 7; stroke-linecap: round; stroke-dasharray: 188; stroke-dashoffset: 28; }
.score-ring__inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score-ring__n { font-size: 18px; font-weight: 900; color: var(--text); }
.score-ring__d { font-size: 10px; color: var(--muted); }
.pill-steps { display: flex; gap: 4px; }
.pill-step  { height: 4px; flex: 1; border-radius: 2px; }
.pill-step.done   { background: var(--teal); }
.pill-step.active { background: var(--blue); }
.pill-step.locked { background: var(--border); }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
.summary-row:last-child { border-bottom: none; }
.summary-row__label { color: var(--muted); font-weight: 500; }
.summary-row__val   { font-weight: 700; }
.env-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--muted-bg); border-radius: var(--r-sm); border: 1px solid var(--border); }
.env-item { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 40px; }
.env-val  { font-size: 18px; font-weight: 900; }
.env-lbl  { font-size: 10px; color: var(--muted); font-weight: 600; }
.env-ok   { font-size: 9px; font-weight: 700; }
.env-div  { width: 1px; height: 28px; background: var(--border); }
.timer    { font-size: 28px; font-weight: 900; font-variant-numeric: tabular-nums; color: var(--teal); letter-spacing: .02em; }
.page-h1 { font-size: 20px; font-weight: 900; color: var(--text); }
.page-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; background: var(--muted-bg); border-radius: 20px; font-size: 11px; color: var(--muted); }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
.pulse { animation: pulse 1.8s infinite; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════
     TOP PREVIEW NAV
     ════════════════════════════════════════════════════ -->
<div class="pnav">
  <span class="pnav__label">🗂 PPF Workflow :</span>
  <div class="pnav__tab is-active" onclick="gotoPage('pg-index',  this)">Index  /workflow/ppf</div>
  <span class="pnav__sep">›</span>
  <div class="pnav__tab" onclick="gotoPage('pg-step1', this)">① Inspection</div>
  <span class="pnav__sep">›</span>
  <div class="pnav__tab" onclick="gotoPage('pg-step2', this)">② Préparation</div>
  <span class="pnav__sep">›</span>
  <div class="pnav__tab" onclick="gotoPage('pg-step3', this)">③ Installation PPF</div>
  <span class="pnav__sep">›</span>
  <div class="pnav__tab" onclick="gotoPage('pg-step4', this)">④ Finalisation</div>
  <span class="pnav__sep" style="margin-left:8px;">|</span>
  <div class="pnav__tab" style="background:#334155;color:#94a3b8;" onclick="gotoPage('pg-completed',this)">✅ Terminée</div>
</div>

<!-- ═══════════════════════════════════════════════════════
     SHELL
     ════════════════════════════════════════════════════ -->
<div class="shell">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sb-logo">
      <div class="sb-logo__icon">R</div>
      <div>
        <div class="sb-logo__name">RPMA v2</div>
        <div class="sb-logo__sub">⬤ Offline · SQLite WAL</div>
      </div>
    </div>
    <nav class="sb-nav">
      <div class="sb-sec">Navigation</div>
      <a class="sb-item" onclick="history.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Retour Tâches
      </a>
      <a class="sb-item is-active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        PPF Workflow
        <span class="sb-badge">EN COURS</span>
      </a>
      <div class="sb-sec" style="margin-top:8px;">Étapes</div>
      <a class="sb-item" onclick="gotoPage('pg-step1',null)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        ① Inspection
      </a>
      <a class="sb-item" onclick="gotoPage('pg-step2',null)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        ② Préparation
      </a>
      <a class="sb-item" onclick="gotoPage('pg-step3',null)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        ③ Installation PPF
      </a>
      <a class="sb-item" onclick="gotoPage('pg-step4',null)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        ④ Finalisation
      </a>
    </nav>
    <div class="sb-foot">
      <div class="sb-avatar">JD</div>
      <div>
        <div class="sb-user__name">Jean Dupont</div>
        <div class="sb-user__role">Technicien · <span style="color:var(--green);">●</span> En ligne</div>
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <div class="main">

    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar__left">
        <button class="btn btn--ghost btn--sm" onclick="gotoPage('pg-index',null)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Tâches
        </button>
        <div class="breadcrumb">
          <span>Tâches</span><span class="breadcrumb__sep">/</span>
          <span>BMW X5 · #PPF-2026-042</span><span class="breadcrumb__sep">/</span>
          <span class="breadcrumb__cur" id="bc-cur">Workflow PPF</span>
        </div>
      </div>
      <div class="topbar__right">
        <div class="chip pulse" style="color:var(--orange);">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Chrono : <strong id="chrono-display">00:28:14</strong>
        </div>
        <button class="btn btn--outline btn--sm">⏸ Pause</button>
        <button class="btn btn--danger btn--sm">⚠ Incident</button>
      </div>
    </header>

    <!-- PPF WORKFLOW HEADER BAND -->
    <div class="wf-header">
      <div class="wf-header__left">
        <div class="wf-header__pill" id="wf-step-label">Étape 1 / 4</div>
        <div>
          <div class="wf-header__title">BMW X5 · Gris Sophisto Métallisé</div>
          <div class="wf-header__sub">Client : Martin Bernard · Tâche #PPF-2026-042 · Intégral 8.2 m²</div>
        </div>
      </div>
      <div class="wf-header__right">
        <div class="wf-header__cond">
          <div class="wf-header__cond-item">
            <span class="wf-header__cond-val" style="color:#5eead4;">21°C</span>
            <span class="wf-header__cond-lbl">Température</span>
            <span class="wf-header__cond-ok">✓ Optimal</span>
          </div>
          <div class="wf-header__div"></div>
          <div class="wf-header__cond-item">
            <span class="wf-header__cond-val" style="color:#a5f3fc;">52%</span>
            <span class="wf-header__cond-lbl">Humidité</span>
            <span class="wf-header__cond-ok">✓ Optimal</span>
          </div>
          <div class="wf-header__div"></div>
          <div class="wf-header__cond-item">
            <span class="wf-header__cond-val">8.2 m²</span>
            <span class="wf-header__cond-lbl">Surface</span>
            <span class="wf-header__cond-ok">PPF Intégral</span>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP PROGRESS BAND -->
    <div class="step-progress" id="step-progress-band">
      <div class="stepper">
        <!-- Step 1 -->
        <div class="stepper__item" id="sp1">
          <div class="stepper__circle active" onclick="gotoPage('pg-step1',null)" id="sc1">1</div>
          <div class="stepper__info">
            <div class="stepper__name" id="sn1">Inspection</div>
            <div class="stepper__time">~12 min</div>
          </div>
        </div>
        <div class="stepper__line locked" id="sl1"></div>
        <!-- Step 2 -->
        <div class="stepper__item" id="sp2">
          <div class="stepper__circle locked" onclick="" id="sc2">2</div>
          <div class="stepper__info">
            <div class="stepper__name" id="sn2">Préparation</div>
            <div class="stepper__time">~18 min</div>
          </div>
        </div>
        <div class="stepper__line locked" id="sl2"></div>
        <!-- Step 3 -->
        <div class="stepper__item" id="sp3">
          <div class="stepper__circle locked" onclick="" id="sc3">3</div>
          <div class="stepper__info">
            <div class="stepper__name" id="sn3">Installation</div>
            <div class="stepper__time">~45 min</div>
          </div>
        </div>
        <div class="stepper__line locked" id="sl3"></div>
        <!-- Step 4 -->
        <div class="stepper__item" id="sp4">
          <div class="stepper__circle locked" onclick="" id="sc4">4</div>
          <div class="stepper__info">
            <div class="stepper__name" id="sn4">Finalisation</div>
            <div class="stepper__time">~8 min</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════
         CONTENT AREA
         ════════════════════════════════════ -->
    <div class="content">

      <!-- ══════════════════════════════
           PAGE : INDEX /workflow/ppf
           ════════════════════════════ -->
      <div class="page is-active" id="pg-index">

        <div class="flex items-c justify-b mb-4">
          <div>
            <div class="page-h1">🛡 Workflow PPF — BMW X5</div>
            <div class="page-sub">Sélectionnez une étape pour commencer ou reprendre l'intervention</div>
          </div>
          <div class="flex gap-2">
            <div class="chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Sauvegarde auto activée
            </div>
          </div>
        </div>

        <!-- TASK CONTEXT CARD -->
        <div class="card mb-4" style="border-left:4px solid var(--teal);">
          <div class="card__body">
            <div class="flex items-c justify-b">
              <div class="flex items-c gap-3">
                <div style="width:48px;height:48px;background:var(--teal);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;">🚗</div>
                <div>
                  <div class="flex items-c gap-2 mb-1">
                    <span class="badge badge--red">Priorité Haute</span>
                    <span class="badge badge--teal">PPF Intégral</span>
                    <span class="badge badge--blue">Planifiée · 26/02/2026</span>
                  </div>
                  <div style="font-size:17px;font-weight:900;">BMW X5 · Gris Sophisto Métallisé</div>
                  <div class="txt-sm txt-muted">Client : Martin Bernard · 06 12 34 56 78 · Avignon</div>
                </div>
              </div>
              <div class="txt-right">
                <div style="font-size:32px;font-weight:900;color:var(--teal);">8.2 m²</div>
                <div class="txt-xs txt-muted">Surface totale · 6 zones</div>
                <div class="txt-xs txt-bold" style="color:var(--green);">Devis validé · 1 240 €</div>
              </div>
            </div>
            <!-- Step progress pills -->
            <div class="mt-3">
              <div class="flex justify-b txt-xs txt-muted mb-1">
                <span>Progression globale</span><span>0 / 4 étapes</span>
              </div>
              <div class="pill-steps">
                <div class="pill-step active"></div>
                <div class="pill-step locked"></div>
                <div class="pill-step locked"></div>
                <div class="pill-step locked"></div>
              </div>
              <div class="flex justify-b txt-xs txt-muted mt-1">
                <span style="color:var(--blue);">① Inspection</span>
                <span>② Préparation</span>
                <span>③ Installation</span>
                <span>④ Finalisation</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ALERT -->
        <div class="alert alert--info mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>L'intervention démarre à l'<strong>Étape 1 — Inspection</strong>. Chaque étape doit être complétée dans l'ordre. Les données sont sauvegardées automatiquement en local (offline-first).</p>
        </div>

        <!-- STEP CARDS GRID -->
        <div class="four-col">
          <!-- CARD 1 -->
          <div class="card card--hover" style="border:2px solid var(--teal);cursor:pointer;" onclick="gotoPage('pg-step1',null)">
            <div class="card__body">
              <div style="width:44px;height:44px;background:var(--blue-bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;">🔍</div>
              <div style="font-size:15px;font-weight:900;color:var(--text);">Inspection</div>
              <div class="txt-xs txt-muted mt-2">État du véhicule, défauts pré-existants, photos, conditions (temp/hum)</div>
              <div class="divider"></div>
              <div class="flex items-c gap-2 txt-xs txt-muted mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ~12 min · 3 sections
              </div>
              <div class="pill-steps mb-3">
                <div class="pill-step done"></div>
                <div class="pill-step done"></div>
                <div class="pill-step locked"></div>
              </div>
              <button class="btn btn--blue btn--sm btn--w" onclick="gotoPage('pg-step1',null)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Commencer
              </button>
            </div>
          </div>
          <!-- CARD 2 -->
          <div class="card" style="opacity:.55;cursor:not-allowed;">
            <div class="card__body">
              <div style="width:44px;height:44px;background:var(--muted-bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;">⚙️</div>
              <div style="font-size:15px;font-weight:900;">Préparation</div>
              <div class="txt-xs txt-muted mt-2">Dégraissage surface, découpe du film, vérification matériaux</div>
              <div class="divider"></div>
              <div class="flex items-c gap-2 txt-xs txt-muted mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Déverrouillée après étape 1
              </div>
              <div class="pill-steps mb-3">
                <div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div>
              </div>
              <button class="btn btn--outline btn--sm btn--w" disabled>🔒 Verrouillée</button>
            </div>
          </div>
          <!-- CARD 3 -->
          <div class="card" style="opacity:.55;cursor:not-allowed;">
            <div class="card__body">
              <div style="width:44px;height:44px;background:var(--muted-bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;">🎯</div>
              <div style="font-size:15px;font-weight:900;">Installation PPF</div>
              <div class="txt-xs txt-muted mt-2">Application zone par zone, contrôle qualité, photos après pose</div>
              <div class="divider"></div>
              <div class="flex items-c gap-2 txt-xs txt-muted mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Déverrouillée après étape 2
              </div>
              <div class="pill-steps mb-3">
                <div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div>
              </div>
              <button class="btn btn--outline btn--sm btn--w" disabled>🔒 Verrouillée</button>
            </div>
          </div>
          <!-- CARD 4 -->
          <div class="card" style="opacity:.55;cursor:not-allowed;">
            <div class="card__body">
              <div style="width:44px;height:44px;background:var(--muted-bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;">✅</div>
              <div style="font-size:15px;font-weight:900;">Finalisation</div>
              <div class="txt-xs txt-muted mt-2">Inspection finale, signature client, génération du rapport PDF</div>
              <div class="divider"></div>
              <div class="flex items-c gap-2 txt-xs txt-muted mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Déverrouillée après étape 3
              </div>
              <div class="pill-steps mb-3">
                <div class="pill-step locked"></div><div class="pill-step locked"></div><div class="pill-step locked"></div>
              </div>
              <button class="btn btn--outline btn--sm btn--w" disabled>🔒 Verrouillée</button>
            </div>
          </div>
        </div>

        <!-- NOTES -->
        <div class="card mt-4">
          <div class="card__body">
            <div class="flex items-c gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span class="card__title">Notes de la tâche</span>
            </div>
            <div class="alert alert--warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p>Véhicule récemment lavé — attendre 24h avant application confirmé par client. <strong>Film 200µ obligatoire sur capot</strong> (demande spéciale). Éviter toute humidité résiduelle dans les joints.</p>
            </div>
          </div>
        </div>

      </div><!-- /pg-index -->


      <!-- ══════════════════════════════
           PAGE : ÉTAPE 1 — INSPECTION
           ════════════════════════════ -->
      <div class="page" id="pg-step1">
        <!-- STEP HERO -->
        <div style="background:linear-gradient(90deg,#0ea5e9 0%,#0d9488 100%);color:white;border-radius:var(--r);padding:16px 20px;margin-bottom:18px;">
          <div class="flex items-c justify-b">
            <div>
              <div class="flex items-c gap-2 mb-1">
                <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">ÉTAPE 1 / 4</span>
                <span style="opacity:.7;font-size:11px;">BMW X5 · 8.2 m²</span>
              </div>
              <div style="font-size:18px;font-weight:900;">🔍 Inspection du Véhicule</div>
              <div style="opacity:.8;font-size:12px;margin-top:2px;">Documentez l'état pré-existant et vérifiez les conditions d'application</div>
            </div>
            <div class="txt-right">
              <div style="font-size:10px;opacity:.7;text-transform:uppercase;font-weight:700;letter-spacing:.06em;">Durée estimée</div>
              <div style="font-size:26px;font-weight:900;">~12 min</div>
              <div style="font-size:10px;opacity:.6;">Section en cours</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;margin-top:12px;">
            <div style="flex:1;height:4px;background:white;border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
          </div>
        </div>

        <div class="two-col">
          <!-- LEFT COLUMN -->
          <div>
            <!-- CONDITIONS PANEL -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div class="card__title">🌡 Conditions Atelier</div>
                  <span class="badge badge--green pulse">● Live</span>
                </div>
                <div class="env-bar">
                  <div class="env-item">
                    <span class="env-val" style="color:var(--orange);">21°C</span>
                    <span class="env-lbl">TEMPÉRATURE</span>
                    <span class="env-ok txt-green">✓ Optimal</span>
                  </div>
                  <div class="env-div"></div>
                  <div class="env-item">
                    <span class="env-val" style="color:var(--blue);">52%</span>
                    <span class="env-lbl">HUMIDITÉ</span>
                    <span class="env-ok txt-green">✓ Optimal</span>
                  </div>
                  <div class="env-div"></div>
                  <div class="env-item">
                    <span class="env-val" style="color:var(--teal);">08:42</span>
                    <span class="env-lbl">DÉMARRÉ</span>
                    <span class="env-ok txt-muted">28 min</span>
                  </div>
                </div>
                <div class="form-row mt-3">
                  <div class="form-group">
                    <label class="label">Température relevée (°C)</label>
                    <input class="input" type="number" value="21" />
                    <span class="hint hint--ok">✓ Zone 18-25°C</span>
                  </div>
                  <div class="form-group">
                    <label class="label">Humidité relative (%)</label>
                    <input class="input" type="number" value="52" />
                    <span class="hint hint--ok">✓ Zone 40-60%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CHECKLIST -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div class="card__title">✅ Checklist Pré-Inspection</div>
                  <span class="badge badge--gray" id="check1-count">0 / 6</span>
                </div>
                <div class="checklist" id="checklist-1">
                  <div class="check-item is-required" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Véhicule propre et sec</div>
                      <div class="check-sub">Aucune trace d'eau ou de graisse sur les zones PPF</div>
                    </div>
                  </div>
                  <div class="check-item is-required" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Température confirmée 18-25°C</div>
                      <div class="check-sub">Relevé manuel + capteur atelier</div>
                    </div>
                  </div>
                  <div class="check-item" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Humidité 40-60% vérifiée</div>
                      <div class="check-sub">Hygromètre de l'atelier</div>
                    </div>
                  </div>
                  <div class="check-item is-required" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Défauts pré-existants documentés</div>
                      <div class="check-sub">Marquer sur le diagramme véhicule →</div>
                    </div>
                  </div>
                  <div class="check-item" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Film PPF sélectionné et disponible</div>
                      <div class="check-sub">Lot : PPF-200µ-2025-09 · Exp. 12/2027</div>
                    </div>
                  </div>
                  <div class="check-item" onclick="toggleCheck(this,'check1-count',6)">
                    <div class="check-box">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div>
                      <div class="check-txt">Client informé des consignes post-pose</div>
                      <div class="check-sub">Séchage 48h, pas de lavage HP, pas de cire</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DEFECTS -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div class="card__title">⚠️ Défauts Constatés</div>
                  <button class="btn btn--outline btn--sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Ajouter défaut
                  </button>
                </div>
                <!-- Sample defect -->
                <div class="defect-tag mb-2">
                  <div class="defect-tag__dot"></div>
                  <div style="flex:1;">
                    <div class="defect-tag__zone">Aile avant droite</div>
                    <div class="defect-tag__type">Micro-rayure · Sévérité : Faible · Note : Présente avant intervention</div>
                  </div>
                  <button class="btn btn--ghost btn--sm" style="color:var(--red);">✕</button>
                </div>
                <div class="alert alert--info" style="margin-top:8px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p>Cliquez sur une zone du diagramme ci-contre pour ajouter un défaut localisé.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div>
            <!-- VEHICLE DIAGRAM -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-2">
                  <div class="card__title">📐 Diagramme Véhicule</div>
                  <span class="txt-xs txt-muted">Cliquez pour marquer</span>
                </div>
                <div class="vdiag">
                  <!-- Simplified top-down car SVG -->
                  <svg viewBox="0 0 280 520" xmlns="http://www.w3.org/2000/svg" style="font-family:sans-serif;">
                    <!-- Body -->
                    <rect x="60" y="30" width="160" height="460" rx="28" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
                    <!-- Windshield front -->
                    <rect x="75" y="45" width="130" height="70" rx="14" fill="#bae6fd" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Pare-brise avant')"/>
                    <!-- Hood -->
                    <rect x="70" y="115" width="140" height="90" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Capot')" id="vz-capot"/>
                    <!-- Front bumper -->
                    <rect x="65" y="32" width="150" height="28" rx="10" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Pare-choc avant')"/>
                    <!-- Left fender -->
                    <rect x="35" y="115" width="38" height="90" rx="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone is-defect" onclick="clickZone('Aile avant gauche')"/>
                    <!-- Right fender -->
                    <rect x="207" y="115" width="38" height="90" rx="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Aile avant droite')" id="vz-ad"/>
                    <!-- Roof -->
                    <rect x="80" y="205" width="120" height="110" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
                    <!-- Left doors -->
                    <rect x="35" y="210" width="38" height="100" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Portière avant gauche')"/>
                    <!-- Right doors -->
                    <rect x="207" y="210" width="38" height="100" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Portière avant droite')"/>
                    <!-- Left mirror -->
                    <rect x="18" y="190" width="22" height="14" rx="4" fill="#94a3b8" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Rétroviseur gauche')"/>
                    <!-- Right mirror -->
                    <rect x="240" y="190" width="22" height="14" rx="4" fill="#94a3b8" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Rétroviseur droit')"/>
                    <!-- Trunk -->
                    <rect x="70" y="320" width="140" height="80" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Coffre / Hayon')"/>
                    <!-- Rear bumper -->
                    <rect x="65" y="462" width="150" height="24" rx="10" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Pare-choc arrière')"/>
                    <!-- Rear windshield -->
                    <rect x="75" y="405" width="130" height="60" rx="12" fill="#bae6fd" stroke="#64748b" stroke-width="1.5" class="vzone" onclick="clickZone('Lunette arrière')"/>
                    <!-- Left rear fender -->
                    <rect x="35" y="320" width="38" height="80" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Aile arrière gauche')"/>
                    <!-- Right rear fender -->
                    <rect x="207" y="320" width="38" height="80" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" class="vzone" onclick="clickZone('Aile arrière droite')"/>
                    <!-- Defect indicator on left front fender -->
                    <circle cx="54" cy="155" r="9" fill="#f97316" stroke="white" stroke-width="2"/>
                    <text x="54" y="159" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text>
                    <!-- Labels -->
                    <text x="140" y="162" text-anchor="middle" fill="#475569" font-size="11" font-weight="600">CAPOT</text>
                    <text x="140" y="258" text-anchor="middle" fill="#475569" font-size="11" font-weight="600">TOIT</text>
                    <text x="140" y="362" text-anchor="middle" fill="#475569" font-size="11" font-weight="600">COFFRE</text>
                    <text x="140" y="80" text-anchor="middle" fill="#0369a1" font-size="10">PARE-BRISE</text>
                    <text x="140" y="44" text-anchor="middle" fill="#475569" font-size="10">PARE-CHOC AV.</text>
                    <text x="140" y="478" text-anchor="middle" fill="#475569" font-size="10">PARE-CHOC AR.</text>
                    <!-- Legend -->
                    <rect x="62" y="500" width="10" height="10" fill="#fed7aa" stroke="#f97316" stroke-width="1" rx="2"/>
                    <text x="76" y="509" fill="#f97316" font-size="9" font-weight="700">Défaut (1)</text>
                    <rect x="155" y="500" width="10" height="10" fill="#bbf7d0" stroke="#22c55e" stroke-width="1" rx="2"/>
                    <text x="169" y="509" fill="#22c55e" font-size="9" font-weight="700">OK</text>
                  </svg>
                </div>
                <div id="zone-clicked" class="txt-xs txt-muted txt-center mt-2">← Cliquez une zone pour l'inspecter</div>
              </div>
            </div>

            <!-- PHOTOS -->
            <div class="card">
              <div class="card__body">
                <div class="flex items-c justify-b mb-2">
                  <div class="card__title">📷 Photos Avant Pose</div>
                  <span class="badge badge--orange">Min. 4 requises</span>
                </div>
                <div class="photo-zone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <div class="txt-sm txt-muted">Appuyer pour prendre une photo</div>
                  <div class="txt-xs txt-muted">Face · Capot · Ailes G/D · Pare-choc</div>
                </div>
                <div class="photo-grid">
                  <div class="photo-thumb photo-thumb--filled">📸<span class="photo-label">Face</span></div>
                  <div class="photo-thumb photo-thumb--filled">📸<span class="photo-label">Capot</span></div>
                  <div class="photo-thumb photo-thumb--add">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div class="photo-thumb photo-thumb--add">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
                <div class="txt-xs txt-muted mt-2">2 / 4 photos · 2 restantes</div>
              </div>
            </div>
          </div>
        </div><!-- /two-col -->

        <!-- ACTION BAR -->
        <div class="action-bar">
          <div class="flex items-c gap-3">
            <button class="btn btn--ghost" onclick="gotoPage('pg-index',null)">← Retour</button>
            <span class="txt-xs txt-muted">0/6 checklist · 2/4 photos · 1 défaut</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn--outline">💾 Sauvegarder brouillon</button>
            <button class="btn btn--primary btn--lg" onclick="advanceStep(2)">
              Valider Inspection →
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div><!-- /pg-step1 -->


      <!-- ══════════════════════════════
           PAGE : ÉTAPE 2 — PRÉPARATION
           ════════════════════════════ -->
      <div class="page" id="pg-step2">
        <!-- STEP HERO -->
        <div style="background:linear-gradient(90deg,#8b5cf6,#0d9488);color:white;border-radius:var(--r);padding:16px 20px;margin-bottom:18px;">
          <div class="flex items-c justify-b">
            <div>
              <div class="flex items-c gap-2 mb-1">
                <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">ÉTAPE 2 / 4</span>
                <span style="opacity:.7;font-size:11px;background:rgba(255,255,255,.1);padding:1px 8px;border-radius:20px;">✓ Inspection complétée</span>
              </div>
              <div style="font-size:18px;font-weight:900;">⚙️ Préparation de la Surface</div>
              <div style="opacity:.8;font-size:12px;margin-top:2px;">Dégraissage, découpe du film et mise en place de l'atelier</div>
            </div>
            <div class="txt-right"><div style="font-size:10px;opacity:.7;text-transform:uppercase;font-weight:700;">Durée estimée</div><div style="font-size:26px;font-weight:900;">~18 min</div></div>
          </div>
          <div style="display:flex;gap:5px;margin-top:12px;">
            <div style="flex:1;height:4px;background:rgba(255,255,255,.4);border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:white;border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
            <div style="flex:1;height:4px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
          </div>
        </div>

        <div class="two-col">
          <!-- LEFT -->
          <div>
            <!-- DÉGRAISSAGE -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div class="card__title">🧴 Protocole Dégraissage IPA</div>
                  <span class="badge badge--green">2/6 zones ✓</span>
                </div>
                <div class="checklist">
                  <div class="check-item is-checked">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Capot (2.4 m²)</div><div class="check-sub">Terminé · 3 min · Microfibre propre</div></div>
                  </div>
                  <div class="check-item is-checked">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Aile avant gauche (1.2 m²)</div><div class="check-sub">Terminé · 2 min</div></div>
                  </div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Aile avant droite (1.2 m²)</div><div class="check-sub">En attente</div></div>
                  </div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Pare-choc avant (0.9 m²)</div></div>
                  </div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Rétroviseurs + Montants A</div></div>
                  </div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')">
                    <div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><div class="check-txt">IPA 70% · Seuils de porte (1.0 m²)</div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DÉCOUPE FILM -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="card__title mb-3">✂️ Pré-Découpe Film PPF</div>
                <div style="border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden;">
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;background:var(--muted-bg);padding:9px 12px;gap:8px;">
                    <span class="txt-xs txt-bold txt-muted" style="text-transform:uppercase;letter-spacing:.05em;">Zone</span>
                    <span class="txt-xs txt-bold txt-muted" style="text-transform:uppercase;letter-spacing:.05em;">Surface</span>
                    <span class="txt-xs txt-bold txt-muted" style="text-transform:uppercase;letter-spacing:.05em;">Film</span>
                    <span class="txt-xs txt-bold txt-muted" style="text-transform:uppercase;letter-spacing:.05em;">Statut</span>
                  </div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);"><span class="txt-sm">Capot</span><span class="txt-sm">2.4 m²</span><span class="txt-sm">200µ</span><span><span class="badge badge--green">✓ Prêt</span></span></div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);"><span class="txt-sm">Aile G</span><span class="txt-sm">1.2 m²</span><span class="txt-sm">150µ</span><span><span class="badge badge--green">✓ Prêt</span></span></div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);background:var(--blue-bg);"><span class="txt-sm txt-bold">Aile D</span><span class="txt-sm">1.2 m²</span><span class="txt-sm">150µ</span><span><span class="badge badge--blue">⏳ En cours</span></span></div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);"><span class="txt-sm">Pare-choc</span><span class="txt-sm">0.9 m²</span><span class="txt-sm">150µ</span><span><span class="badge badge--gray">À faire</span></span></div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);"><span class="txt-sm">Rétros</span><span class="txt-sm">0.3 m²</span><span class="txt-sm">100µ</span><span><span class="badge badge--gray">À faire</span></span></div>
                  <div style="display:grid;grid-template-columns:2fr 70px 70px 90px;padding:9px 12px;gap:8px;border-top:1px solid var(--border);"><span class="txt-sm">Seuils</span><span class="txt-sm">1.0 m²</span><span class="txt-sm">150µ</span><span><span class="badge badge--gray">À faire</span></span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT -->
          <div>
            <!-- MATÉRIAUX -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="card__title mb-3">📦 Vérification Matériaux</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <div class="flex justify-b items-c txt-sm"><span>Film PPF 200µ (capot)</span><span class="txt-bold txt-green">✓ En stock</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Film PPF 150µ (ailes × 4)</span><span class="txt-bold txt-green">✓ En stock</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Film PPF 100µ (rétros)</span><span class="txt-bold txt-green">✓ En stock</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Solution d'application 1L</span><span class="txt-bold txt-green">✓ Disponible</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Squeegee pro (dur)</span><span class="txt-bold txt-green">✓ Disponible</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Pistolet chaleur</span><span class="txt-bold" style="color:var(--orange);">⚠ 1 seul dispo</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Cutter de précision</span><span class="txt-bold txt-green">✓ Disponible</span></div>
                  <div class="flex justify-b items-c txt-sm"><span>Microfibre (×10)</span><span class="txt-bold txt-green">✓ Disponible</span></div>
                </div>
              </div>
            </div>

            <!-- NOTES PREP -->
            <div class="card mb-4">
              <div class="card__body">
                <label class="label">Notes préparation</label>
                <textarea class="textarea" placeholder="Observations sur la préparation...">Défaut micro-rayure aile D protégé avec cache adhésif. Film Aile G pré-découpé parfait.</textarea>
              </div>
            </div>

            <!-- ENV + TIMER -->
            <div class="card" style="background:var(--muted-bg);">
              <div class="card__body">
                <div class="flex justify-b items-c mb-2">
                  <span class="card__title">⏱ Chrono</span>
                  <span class="badge badge--blue pulse">● Étape 2</span>
                </div>
                <div class="timer">08:47</div>
                <div class="txt-xs txt-muted mt-1">Démarré à 09h03 · Étape 1 : 12 min 34 s</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTION BAR -->
        <div class="action-bar">
          <div class="flex items-c gap-3">
            <button class="btn btn--ghost" onclick="advanceStep(1)">← Étape 1</button>
            <span class="txt-xs txt-muted">2/6 dégraissage · 2/6 films découpés</span>
          </div>
          <div class="flex gap-2">
            <button class="btn btn--outline">💾 Sauvegarder</button>
            <button class="btn btn--primary btn--lg" onclick="advanceStep(3)">
              Valider Préparation →
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div><!-- /pg-step2 -->


      <!-- ══════════════════════════════
           PAGE : ÉTAPE 3 — INSTALLATION
           ════════════════════════════ -->
      <div class="page" id="pg-step3">
        <!-- STEP HERO -->
        <div style="background:linear-gradient(90deg,#0d9488,#065f46);color:white;border-radius:var(--r);padding:16px 20px;margin-bottom:18px;">
          <div class="flex items-c justify-b">
            <div>
              <div class="flex items-c gap-2 mb-1">
                <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">ÉTAPE 3 / 4</span>
                <span style="opacity:.7;font-size:11px;background:rgba(255,255,255,.1);padding:1px 8px;border-radius:20px;">✓ Inspection · ✓ Préparation</span>
              </div>
              <div style="font-size:18px;font-weight:900;">🎯 Installation du Film PPF</div>
              <div style="opacity:.8;font-size:12px;margin-top:2px;">Application zone par zone avec contrôle qualité continu</div>
            </div>
            <div class="txt-right">
              <div style="font-size:10px;opacity:.7;text-transform:uppercase;font-weight:700;">Progression</div>
              <div style="font-size:26px;font-weight:900;">2 / 6 zones</div>
              <div style="font-size:10px;opacity:.7;">3.6 m² / 8.2 m²</div>
            </div>
          </div>
          <!-- Zones progress -->
          <div style="display:flex;gap:4px;margin-top:12px;">
            <div style="flex:1;height:5px;background:white;border-radius:2px;"></div>
            <div style="flex:1;height:5px;background:white;border-radius:2px;"></div>
            <div style="flex:.8;height:5px;background:rgba(255,255,255,.5);border-radius:2px;"></div>
            <div style="flex:.6;height:5px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
            <div style="flex:.2;height:5px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
            <div style="flex:.2;height:5px;background:rgba(255,255,255,.3);border-radius:2px;"></div>
          </div>
          <div class="flex justify-b txt-xs mt-1" style="opacity:.7;">
            <span>Capot ✓</span><span>Aile G ✓</span><span>Aile D ⏳</span><span>P-choc</span><span>Rétros</span><span>Seuils</span>
          </div>
        </div>

        <div class="two-col">
          <!-- LEFT -->
          <div>
            <!-- ZONE TRACKER -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div class="card__title">🗂 Zones PPF · Avancement</div>
                  <div class="flex gap-2">
                    <span class="badge badge--green">2 ✓</span>
                    <span class="badge badge--blue">1 ⏳</span>
                    <span class="badge badge--gray">3 restantes</span>
                  </div>
                </div>
                <div class="zone-grid">
                  <div class="zone-card done">
                    <div class="zone-card__name">Capot</div>
                    <div class="zone-card__area">2.4 m² · Film 200µ</div>
                    <div class="zone-card__score">9.4</div>
                    <div class="zone-card__status">✓ Posé · Score qualité</div>
                  </div>
                  <div class="zone-card done">
                    <div class="zone-card__name">Aile avant G</div>
                    <div class="zone-card__area">1.2 m² · Film 150µ</div>
                    <div class="zone-card__score">8.8</div>
                    <div class="zone-card__status">✓ Posé · Score qualité</div>
                  </div>
                  <div class="zone-card active">
                    <div class="zone-card__name">Aile avant D</div>
                    <div class="zone-card__area">1.2 m² · Film 150µ</div>
                    <div class="zone-card__score">—</div>
                    <div class="zone-card__status">⏳ En cours de pose</div>
                  </div>
                  <div class="zone-card" onclick="this.classList.add('active')">
                    <div class="zone-card__name">Pare-choc av.</div>
                    <div class="zone-card__area">0.9 m² · Film 150µ</div>
                    <div class="zone-card__score txt-muted" style="font-size:16px;">À faire</div>
                    <div class="zone-card__status txt-muted">En attente</div>
                  </div>
                  <div class="zone-card">
                    <div class="zone-card__name">Rétroviseurs</div>
                    <div class="zone-card__area">0.3 m² × 2 · Film 100µ</div>
                    <div class="zone-card__score txt-muted" style="font-size:16px;">À faire</div>
                    <div class="zone-card__status txt-muted">En attente</div>
                  </div>
                  <div class="zone-card">
                    <div class="zone-card__name">Seuils de porte</div>
                    <div class="zone-card__area">1.0 m² · Film 150µ</div>
                    <div class="zone-card__score txt-muted" style="font-size:16px;">À faire</div>
                    <div class="zone-card__status txt-muted">En attente</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ZONE EN COURS: AILE D -->
            <div class="card mb-4" style="border:2px solid var(--blue);">
              <div class="card__body">
                <div class="flex items-c justify-b mb-3">
                  <div>
                    <div class="badge badge--blue mb-1">Zone active</div>
                    <div class="card__title">Aile Avant Droite · 1.2 m²</div>
                  </div>
                  <button class="btn btn--success btn--sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Valider cette zone
                  </button>
                </div>

                <!-- Checklist zone -->
                <div class="checklist mb-3">
                  <div class="check-item is-checked"><div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="check-txt">Surface dégraissée et sèche</div></div>
                  <div class="check-item is-checked"><div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="check-txt">Film pré-découpé et vérifié</div></div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')"><div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="check-txt">Application solution d'installation</div></div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')"><div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="check-txt">Pose film — pas de bulles ni plis</div></div>
                  <div class="check-item" onclick="this.classList.toggle('is-checked')"><div class="check-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="check-txt">Chauffage bords + squeegee final</div></div>
                </div>

                <!-- Quality score -->
                <div class="quality-slider-wrap">
                  <div class="flex justify-b items-c">
                    <label class="label">Score qualité pose (0-10)</label>
                    <span class="quality-score txt-bold" id="qs-val" style="color:var(--teal);">8.5</span>
                  </div>
                  <div class="quality-slider-row">
                    <input type="range" min="0" max="10" step="0.5" value="8.5" oninput="document.getElementById('qs-val').textContent=this.value" />
                  </div>
                  <div class="flex justify-b txt-xs txt-muted"><span>0 — Mauvais</span><span>5 — Acceptable</span><span>10 — Parfait</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT -->
          <div>
            <!-- PHOTOS ZONE ACTIVE -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="flex items-c justify-b mb-2">
                  <div class="card__title">📷 Photos Après Pose</div>
                  <span class="badge badge--teal">Aile D</span>
                </div>
                <div class="photo-zone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <div class="txt-sm txt-muted">Photo après pose zone active</div>
                </div>
                <div class="photo-grid">
                  <div class="photo-thumb photo-thumb--filled">📸<span class="photo-label">Capot ✓</span></div>
                  <div class="photo-thumb photo-thumb--filled">📸<span class="photo-label">Aile G ✓</span></div>
                  <div class="photo-thumb photo-thumb--add"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                  <div class="photo-thumb photo-thumb--add"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                </div>
              </div>
            </div>

            <!-- SCORES DES ZONES -->
            <div class="card mb-4">
              <div class="card__body">
                <div class="card__title mb-3">🏆 Scores Qualité</div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <div>
                    <div class="flex justify-b txt-sm mb-1"><span>Capot</span><span class="txt-bold txt-green">9.4 / 10</span></div>
                    <div class="pbar"><div class="pbar__fill pbar__fill--green" style="width:94%;"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-b txt-sm mb-1"><span>Aile G</span><span class="txt-bold txt-green">8.8 / 10</span></div>
                    <div class="pbar"><div class="pbar__fill pbar__fill--green" style="width:88%;"></div></div>
                  </div>
                  <div>
                    <div class="flex justify-b txt-sm mb-1"><span>Aile D</span><span class="txt-bold" style="color:var(--blue);">⏳ En cours</span></div>
                    <div class="pbar"><div class="pbar__fill pbar__fill--blue" style="width:40%;"></div></div>
                  </div>
                  <div class="flex justify-b txt-sm" style="opacity:.4;"><span>Pare-choc av.</span><span>—</span></div>
                  <div class="flex justify-b txt-sm" style="opacity:.4;"><span>Rétroviseurs</span><span>—</span></div>
                  <div class="flex justify-b txt-sm" style="opacity:.4;"><span>Seuils</span><span>—</span></div>
                  <div class="divider"></div>
                  <div class="flex justify-b txt-sm"><span class="txt-bold">Moyenne actuelle</span><span class="txt-bold txt-green">9.1 / 10</span></div>
                </div>
              </div>
            </div>

            <!-- ENV -->
            <div class="card" style="background:var(--muted-bg);">
              <div class="card__body">
                <div class="flex justify-b items-c mb-2">
                  <span class="card__title">⏱ Chrono Étape 3</span>
                  <span class="badge badge--t
