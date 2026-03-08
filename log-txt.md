app-index.tsx:25  08/03/2026, 14:18:31 [CORR:req-mmhs2wwm-000v-h37vp9] [FRONTEND] [API] [ERROR] IPC call failed: quote_convert_to_task | user_id: 991a3604-d990-4d10-912d-bc0ae5b820f5 | data: {"command":"quote_convert_to_task","correlation_id":"ipc-1772975911816-8870","error":"Internal error: An internal error occurred. Please try again.","error_code":"INTERNAL_ERROR","duration_ms":128} {id: '1772975911831-9ozis73bgg6', timestamp: '2026-03-08T13:18:31.831Z', correlation_id: 'req-mmhs2wwm-000v-h37vp9', layer: 'FRONTEND', domain: 'API', …}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
log @ logger.ts:171
error @ logger.ts:273
safeInvoke @ utils.ts:236
await in safeInvoke
convertToTask @ quotes.ipc.ts:187
eval @ useQuoteOperations.ts:93
eval @ QuoteConvertDialog.tsx:69
callCallback @ react-dom.development.js:20565
invokeGuardedCallbackImpl @ react-dom.development.js:20614
invokeGuardedCallback @ react-dom.development.js:20689
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:20703
executeDispatch @ react-dom.development.js:32128
processDispatchQueueItemsInOrder @ react-dom.development.js:32160
processDispatchQueue @ react-dom.development.js:32173
dispatchEventsForPlugins @ react-dom.development.js:32184
eval @ react-dom.development.js:32374
batchedUpdates$1 @ react-dom.development.js:24953
batchedUpdates @ react-dom.development.js:28844
dispatchEventForPluginEventSystem @ react-dom.development.js:32373
dispatchEvent @ react-dom.development.js:30141
dispatchDiscreteEvent @ react-dom.development.js:30112

2026-03-08T13:18:31.826016Z ERROR ThreadId(15) quote_convert_to_task{correlation_id=ipc-1772975911816-8870 user_id=991a3604-d990-4d10-912d-bc0ae5b820f5}: main::domains::quotes::ipc::quote: src-tauri\src\domains
\quotes\ipc\quote.rs:812: Failed to create task from quote error=Validation error: Invalid name: PPF zones are required
2026-03-08T13:18:31.827517Z ERROR ThreadId(15) quote_convert_to_task{correlation_id=ipc-1772975911816-8870 user_id=991a3604-d990-4d10-912d-bc0ae5b820f5}: main::shared::ipc::errors: src-tauri\src\shared\ipc\erro
rs.rs:238: Internal error (sanitized for frontend) internal_error=Impossible de créer la tâche à partir du devis.