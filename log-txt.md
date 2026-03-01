   GET http://localhost:3000/tasks/3e3aba31-d613-4860-93cc-f3e1d7b47fb2/workflow/ppf 500 (Internal Server Error)
Router @ webpack-internal:///…s/app-router.js:390
renderWithHooksAgain @ webpack-internal:///…evelopment.js:11272
replaySuspendedComponentWithHooks @ webpack-internal:///…evelopment.js:11219
replayFunctionComponent @ webpack-internal:///…evelopment.js:16324
replaySuspendedUnitOfWork @ webpack-internal:///…evelopment.js:25806
renderRootConcurrent @ webpack-internal:///…evelopment.js:25578
performConcurrentWorkOnRoot @ webpack-internal:///…evelopment.js:24504
workLoop @ webpack-internal:///….development.js:256
flushWork @ webpack-internal:///….development.js:225
performWorkUntilDeadline @ webpack-internal:///….development.js:534
index.tsx:935  Uncaught ModuleBuildError: Module build failed (from ./node_modules/next/dist/build/webpack/loaders/next-swc-loader.js):
Error: 
  × You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\components\GPS\DesktopGPS.tsx:1:1]
 1 │ // src/domains/interventions/components/GPS/DesktopGPS.tsx
 2 │ import { useState, useEffect } from 'react';
   ·          ────────
 3 │ import { MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
 4 │ import { gps } from '@/lib/utils/gps';
 4 │ import { shellOps } from '@/lib/utils/desktop';
   ╰────

  × You're importing a component that needs useEffect. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\components\GPS\DesktopGPS.tsx:1:1]
 1 │ // src/domains/interventions/components/GPS/DesktopGPS.tsx
 2 │ import { useState, useEffect } from 'react';
   ·                    ─────────
 3 │ import { MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
 4 │ import { gps } from '@/lib/utils/gps';
 4 │ import { shellOps } from '@/lib/utils/desktop';
   ╰────

    at processResult (file://D:\rpma-rust\frontend\node_modules\next\dist\compiled\webpack\bundle5.js:28:400590)
    at <unknown> (file://D:\rpma-rust\frontend\node_modules\next\dist\compiled\webpack\bundle5.js:28:402302)
    at <unknown> (file://D:\rpma-rust\frontend\node_modules\next\dist\compiled\loader-runner\LoaderRunner.js:1:8645)
    at <unknown> (file://D:\rpma-rust\frontend\node_modules\next\dist\compiled\loader-runner\LoaderRunner.js:1:5019)
    at r.callback (file://D:\rpma-rust\frontend\node_modules\next\dist\compiled\loader-runner\LoaderRunner.js:1:4039)
getServerError @ nodeStackFrames.ts:30
eval @ index.tsx:935
setTimeout
hydrate @ index.tsx:922
await in hydrate
pageBootrap @ page-bootstrap.ts:22
eval @ next-dev.ts:21
Promise.then
eval @ next-dev.ts:20
./node_modules/next/dist/client/next-dev.js @ main.js:820
options.factory @ webpack.js:647
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ main.js:1975
(anonymous) @ main.js:1976
webpackJsonpCallback @ webpack.js:1195
(anonymous) @ main.js:9
hydration-error-info.ts:72  ./src/domains/interventions/components/GPS/DesktopGPS.tsx
Error: 
  × You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\components\GPS\DesktopGPS.tsx:1:1]
 1 │ // src/domains/interventions/components/GPS/DesktopGPS.tsx
 2 │ import { useState, useEffect } from 'react';
   ·          ────────
 3 │ import { MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
 4 │ import { gps } from '@/lib/utils/gps';
 4 │ import { shellOps } from '@/lib/utils/desktop';
   ╰────

  × You're importing a component that needs useEffect. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\components\GPS\DesktopGPS.tsx:1:1]
 1 │ // src/domains/interventions/components/GPS/DesktopGPS.tsx
 2 │ import { useState, useEffect } from 'react';
   ·                    ─────────
 3 │ import { MapPin, Navigation, Crosshair, RefreshCw } from 'lucide-react';
 4 │ import { gps } from '@/lib/utils/gps';
 4 │ import { shellOps } from '@/lib/utils/desktop';
   ╰────
console.error @ hydration-error-info.ts:72
window.console.error @ setup-hydration-warning.ts:21
handleErrors @ hot-reloader-client.ts:199
processMessage @ hot-reloader-client.ts:295
eval @ hot-reloader-client.ts:82
handleMessage @ websocket.ts:34
hydration-error-info.ts:72  ./src/domains/interventions/hooks/useInterventionState.ts
Error: 
  × You're importing a component that needs useState. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\hooks\useInterventionState.ts:1:1]
 1 │ import { useState, useEffect, useCallback } from 'react';
   ·          ────────
 2 │ import type {
 3 │   PPFInterventionData,
 3 │   PPFInterventionStep,
   ╰────

  × You're importing a component that needs useEffect. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\hooks\useInterventionState.ts:1:1]
 1 │ import { useState, useEffect, useCallback } from 'react';
   ·                    ─────────
 2 │ import type {
 3 │   PPFInterventionData,
 3 │   PPFInterventionStep,
   ╰────
console.error @ hydration-error-info.ts:72
window.console.error @ setup-hydration-warning.ts:21
handleErrors @ hot-reloader-client.ts:199
processMessage @ hot-reloader-client.ts:295
eval @ hot-reloader-client.ts:82
handleMessage @ websocket.ts:34
hydration-error-info.ts:72  ./src/domains/interventions/hooks/useInterventionSync.ts
Error: 
  × You're importing a component that needs useEffect. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\hooks\useInterventionSync.ts:1:1]
 1 │ import { useQuery } from '@tanstack/react-query';
 2 │ import { useEffect } from 'react';
   ·          ─────────
 3 │ import { AuthSecureStorage } from '@/lib/secureStorage';
 4 │ import { ipcClient } from '@/lib/ipc';
 4 │ import { interventionsIpc } from '../ipc/interventions.ipc';
   ╰────
console.error @ hydration-error-info.ts:72
window.console.error @ setup-hydration-warning.ts:21
handleErrors @ hot-reloader-client.ts:199
processMessage @ hot-reloader-client.ts:295
eval @ hot-reloader-client.ts:82
handleMessage @ websocket.ts:34
hydration-error-info.ts:72  ./src/domains/interventions/hooks/usePpfWorkflow.ts
Error: 
  × You're importing a component that needs useRef. It only works in a Client Component but none of its parents are marked with "use client", so they're Server Components by default.
  │ Learn more: https://nextjs.org/docs/getting-started/react-essentials
  │ 
  │ 
   ╭─[D:\rpma-rust\frontend\src\domains\interventions\hooks\usePpfWorkflow.ts:1:1]
 1 │ import { useCallback, useMemo, useRef } from 'react';
   ·                                ──────
 2 │ import { useQueryClient } from '@tanstack/react-query';
 3 │ import { toast } from 'sonner';
 3 │ import { useAuth } from '@/domains/auth';
   ╰────
console.error @ hydration-error-info.ts:72
window.console.error @ setup-hydration-warning.ts:21
handleErrors @ hot-reloader-client.ts:199
processMessage @ hot-reloader-client.ts:295
eval @ hot-reloader-client.ts:82
handleMessage @ websocket.ts:34