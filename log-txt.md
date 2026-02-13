app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react/cjs/react.development.js","lineno":2070,"colno":5,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  Warning: Cannot update a component (`HotReload`) while rendering a different component (`Slot.SlotClone`). To locate the bad setState() call inside `Slot.SlotClone`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-slot/dist/index.mjs:56:11)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-slot/dist/index.mjs:29:11)
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/button.tsx:45:11)
    at label
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-label/node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at _c
    at Label (webpack-internal:///(app-pages-browser)/./src/components/ui/label.tsx:15:11)
    at div
    at div
    at div
    at _c8 (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:74:11)
    at div
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:18:11)
    at div
    at ProfileSettingsTab (webpack-internal:///(app-pages-browser)/./src/components/settings/ProfileSettingsTab.tsx:53:11)
    at Suspense
    at LoadableComponent
    at Suspense
    at div
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at Presence (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-presence/dist/index.mjs:27:13)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-tabs/dist/index.mjs:176:13)
    at _c4 (webpack-internal:///(app-pages-browser)/./src/components/ui/tabs.tsx:49:11)
    at div
    at div
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at Provider (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-context/dist/index.mjs:34:15)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-tabs/dist/index.mjs:44:13)
    at div
    at _c8 (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:74:11)
    at div
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:18:11)
    at div
    at PageShell (webpack-internal:///(app-pages-browser)/./src/components/layout/PageShell.tsx:13:11)
    at SettingsPage (webpack-internal:///(app-pages-browser)/./src/app/settings/page.tsx:226:89)
    at ClientPageRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/client-page.js:14:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at Suspense
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at div
    at main
    at div
    at div
    at AppShell (webpack-internal:///(app-pages-browser)/./src/components/layout/AppShell.tsx:16:11)
    at RPMALayout (webpack-internal:///(app-pages-browser)/./src/components/RPMALayout.tsx:10:11)
    at AppNavigation (webpack-internal:///(app-pages-browser)/./src/components/AppNavigation.tsx:15:11)
    at AppLayout (webpack-internal:///(app-pages-browser)/./src/app/RootClientLayout.tsx:47:11)
    at V (webpack-internal:///(app-pages-browser)/./node_modules/next-themes/dist/index.mjs:54:24)
    at J (webpack-internal:///(app-pages-browser)/./node_modules/next-themes/dist/index.mjs:47:47)
    at ThemeProvider (webpack-internal:///(app-pages-browser)/./src/components/theme-provider.tsx:13:11)
    at AuthProvider (webpack-internal:///(app-pages-browser)/./src/contexts/AuthContext.tsx:29:11)
    at QueryClientProvider (webpack-internal:///(app-pages-browser)/./node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js:27:11)
    at Providers (webpack-internal:///(app-pages-browser)/./src/components/providers.tsx:23:11)
    at GlobalErrorWrapper (webpack-internal:///(app-pages-browser)/./src/error-boundaries/GlobalErrorBoundary.tsx:625:9)
    at BaseErrorBoundary (webpack-internal:///(app-pages-browser)/./src/error-boundaries/BaseErrorBoundary.tsx:402:9)
    at GlobalErrorBoundary (webpack-internal:///(app-pages-browser)/./src/error-boundaries/GlobalErrorBoundary.tsx:499:11)
    at div
    at RootClientLayout (webpack-internal:///(app-pages-browser)/./src/app/RootClientLayout.tsx:217:11)
    at body
    at html
    at RootLayout (Server)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at DevRootNotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/dev-root-not-found-boundary.js:33:11)
    at ReactDevOverlay (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/ReactDevOverlay.js:87:9)
    at HotReload (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:321:11)
    at Router (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:207:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at AppRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:585:13)
    at ServerRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:112:27)
    at Root (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:117:11)
window.console.error @ app-index.tsx:25
react.development.js:2069  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at HTMLUnknownElement.callCallback (react-dom.development.js:20565:1)
    at Object.invokeGuardedCallbackImpl (react-dom.development.js:20614:1)
    at invokeGuardedCallback (react-dom.development.js:20689:1)
    at beginWork (react-dom.development.js:26949:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopConcurrent (react-dom.development.js:25734:1)
    at renderRootConcurrent (react-dom.development.js:25690:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24504:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js","lineno":57,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
redirect-boundary.tsx:59  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopConcurrent (react-dom.development.js:25734:1)
    at renderRootConcurrent (react-dom.development.js:25690:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24504:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js","lineno":57,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
redirect-boundary.tsx:59  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopConcurrent (react-dom.development.js:25734:1)
    at renderRootConcurrent (react-dom.development.js:25690:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24504:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js","lineno":37,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
not-found-boundary.tsx:69  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopConcurrent (react-dom.development.js:25734:1)
    at renderRootConcurrent (react-dom.development.js:25690:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24504:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react/cjs/react.development.js","lineno":2070,"colno":5,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
react.development.js:2069  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at HTMLUnknownElement.callCallback (react-dom.development.js:20565:1)
    at Object.invokeGuardedCallbackImpl (react-dom.development.js:20614:1)
    at invokeGuardedCallback (react-dom.development.js:20689:1)
    at beginWork (react-dom.development.js:26949:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopSync (react-dom.development.js:25464:1)
    at renderRootSync (react-dom.development.js:25419:1)
    at recoverFromConcurrentError (react-dom.development.js:24597:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24542:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js","lineno":57,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
redirect-boundary.tsx:59  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopSync (react-dom.development.js:25464:1)
    at renderRootSync (react-dom.development.js:25419:1)
    at recoverFromConcurrentError (react-dom.development.js:24597:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24542:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js","lineno":57,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
redirect-boundary.tsx:59  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopSync (react-dom.development.js:25464:1)
    at renderRootSync (react-dom.development.js:25419:1)
    at recoverFromConcurrentError (react-dom.development.js:24597:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24542:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  13/02/2026, 22:36:57 [CORR:req-mllenos7-0002-8r8ie8] [FRONTEND] [SYSTEM] [ERROR] Uncaught error | user_id: ae3557a6-8a56-4f66-8063-455eaa140120 | data: {"message":"Uncaught Error: React.Children.only expected to receive a single React element child.","filename":"webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js","lineno":37,"colno":9,"error":{}} Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  [13/02/2026, 22:36:57] ERROR [system] system | Data: "Uncaught error" Object
window.console.error @ app-index.tsx:25
not-found-boundary.tsx:69  Uncaught Error: React.Children.only expected to receive a single React element child.
    at Object.onlyChild [as only] (react.development.js:2069:1)
    at eval (index.mjs:56:63)
    at renderWithHooks (react-dom.development.js:11121:1)
    at updateForwardRef (react-dom.development.js:15854:1)
    at beginWork$1 (react-dom.development.js:18521:1)
    at beginWork (react-dom.development.js:26927:1)
    at performUnitOfWork (react-dom.development.js:25748:1)
    at workLoopSync (react-dom.development.js:25464:1)
    at renderRootSync (react-dom.development.js:25419:1)
    at recoverFromConcurrentError (react-dom.development.js:24597:1)
    at performConcurrentWorkOnRoot (react-dom.development.js:24542:1)
    at workLoop (scheduler.development.js:256:1)
    at flushWork (scheduler.development.js:225:1)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:1)
app-index.tsx:25  The above error occurred in the <NotFoundErrorBoundary> component:

    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-slot/dist/index.mjs:56:11)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-slot/dist/index.mjs:29:11)
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/button.tsx:45:11)
    at label
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-label/node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at _c
    at Label (webpack-internal:///(app-pages-browser)/./src/components/ui/label.tsx:15:11)
    at div
    at div
    at div
    at _c8 (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:74:11)
    at div
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:18:11)
    at div
    at ProfileSettingsTab (webpack-internal:///(app-pages-browser)/./src/components/settings/ProfileSettingsTab.tsx:53:11)
    at Suspense
    at LoadableComponent
    at Suspense
    at div
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at Presence (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-presence/dist/index.mjs:27:13)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-tabs/dist/index.mjs:176:13)
    at _c4 (webpack-internal:///(app-pages-browser)/./src/components/ui/tabs.tsx:49:11)
    at div
    at div
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-primitive/dist/index.mjs:38:13)
    at Provider (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-context/dist/index.mjs:34:15)
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-tabs/dist/index.mjs:44:13)
    at div
    at _c8 (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:74:11)
    at div
    at _c (webpack-internal:///(app-pages-browser)/./src/components/ui/card.tsx:18:11)
    at div
    at PageShell (webpack-internal:///(app-pages-browser)/./src/components/layout/PageShell.tsx:13:11)
    at SettingsPage (webpack-internal:///(app-pages-browser)/./src/app/settings/page.tsx:226:89)
    at ClientPageRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/client-page.js:14:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:243:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at Suspense
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:349:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:153:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:228:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:16:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:370:11)
    at div
    at main
    at div
    at div
    at AppShell (webpack-internal:///(app-pages-browser)/./src/components/layout/AppShell.tsx:16:11)
    at RPMALayout (webpack-internal:///(app-pages-browser)/./src/components/RPMALayout.tsx:10:11)
    at AppNavigation (webpack-internal:///(app-pages-browser)/./src/components/AppNavigation.tsx:15:11)
    at AppLayout (webpack-internal:///(app-pages-browser)/./src/app/RootClientLayout.tsx:47:11)
    at V (webpack-internal:///(app-pages-browser)/./node_modules/next-themes/dist/index.mjs:54:24)
    at J (webpack-internal:///(app-pages-browser)/./node_modules/next-themes/dist/index.mjs:47:47)
    at ThemeProvider (webpack-internal:///(app-pages-browser)/./src/components/theme-provider.tsx:13:11)
    at AuthProvider (webpack-internal:///(app-pages-browser)/./src/contexts/AuthContext.tsx:29:11)
    at QueryClientProvider (webpack-internal:///(app-pages-browser)/./node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js:27:11)
    at Providers (webpack-internal:///(app-pages-browser)/./src/components/providers.tsx:23:11)
    at GlobalErrorWrapper (webpack-internal:///(app-pages-browser)/./src/error-boundaries/GlobalErrorBoundary.tsx:625:9)
    at BaseErrorBoundary (webpack-internal:///(app-pages-browser)/./src/error-boundaries/BaseErrorBoundary.tsx:402:9)
    at GlobalErrorBoundary (webpack-internal:///(app-pages-browser)/./src/error-boundaries/GlobalErrorBoundary.tsx:499:11)
    at div
    at RootClientLayout (webpack-internal:///(app-pages-browser)/./src/app/RootClientLayout.tsx:217:11)
    at body
    at html
    at RootLayout (Server)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:74:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:82:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:76:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:84:11)
    at DevRootNotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/dev-root-not-found-boundary.js:33:11)
    at ReactDevOverlay (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/ReactDevOverlay.js:87:9)
    at HotReload (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/app/hot-reloader-client.js:321:11)
    at Router (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:207:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:113:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:160:11)
    at AppRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:585:13)
    at ServerRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:112:27)
    at Root (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:117:11)

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundaryHandler.
window.console.error @ app-index.tsx:25
app-index.tsx:25  Error boundary caught: Object
window.console.error @ app-index.tsx:25
app-index.tsx:25  Error boundary caught: Object
window.console.error @ app-index.tsx:25
