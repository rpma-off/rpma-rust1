LOGS ISSUES IN THE PAGE /QUOTES : 


2026-02-16T22:36:25.506663Z ERROR ThreadId(21) quote_create{request=QuoteCreateRequest { session_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZTM1NTdhNi04YTU2LTRmNjYtODA2My00NTVlYWExNDAxMjAiLCJlbWFp
bCI6InJheWVwYXNtb25hdXRvQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiYWhtZWRfYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzEyODA4NDcsImV4cCI6MTc3MTI4ODA0NywianRpIjoiYjQzNDRiYTgtNzYzYS00MTkwLWE5NjctMzhmYTU3NmNiNDUyIiwic2Vzc2lvbl
9pZCI6IjFjYzg3ZWQyLTY1NjktNDBjNC1iYWU5LTdlNTI1YzNmNGQ2YiJ9.ugdlZWQelxEVN3ZmsQNwxmbXaiqp5MTvSlzJOhHCxyY", data: CreateQuoteRequest { client_id: "test", task_id: None, valid_until: None, notes: Some("test"), term
s: Some("test"), vehicle_plate: Some("test"), vehicle_make: Some("test"), vehicle_model: Some("test"), vehicle_year: Some("2020"), vehicle_vin: None, items: [CreateQuoteItemRequest { kind: Service, label: "test
", description: None, qty: 1.0, unit_price: 20000, tax_rate: Some(20.0), material_id: None, position: Some(0) }] }, correlation_id: None }}: main::commands::quote: src-tauri\src\commands\quote.rs:138: Failed to
 create quote: Database error: Failed to create quote: FOREIGN KEY constraint failed

 app-index.tsx:25  16/02/2026, 23:36:25 [CORR:req-mlpqvnen-0002-kgwckv] [FRONTEND] [API] [ERROR] IPC call failed: quote_create | user_id: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZTM1NTdhNi04YTU2LTRmNjYtODA2My00NTVlYWExNDAxMjAiLCJlbWFpbCI6InJheWVwYXNtb25hdXRvQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiYWhtZWRfYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzEyODA4NDcsImV4cCI6MTc3MTI4ODA0NywianRpIjoiYjQzNDRiYTgtNzYzYS00MTkwLWE5NjctMzhmYTU3NmNiNDUyIiwic2Vzc2lvbl9pZCI6IjFjYzg3ZWQyLTY1NjktNDBjNC1iYWU5LTdlNTI1YzNmNGQ2YiJ9.ugdlZWQelxEVN3ZmsQNwxmbXaiqp5MTvSlzJOhHCxyY | data: {"command":"quote_create","correlation_id":"ipc-1771281385495-7214","error":"Validation error: Database error: Failed to create quote: FOREIGN KEY constraint failed","error_code":"VALIDATION_ERROR","duration_ms":45} {id: '1771281385511-24ble24gzjc', timestamp: '2026-02-16T22:36:25.511Z', correlation_id: 'req-mlpqvnen-0002-kgwckv', layer: 'FRONTEND', domain: 'API', …}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
log @ logger.ts:171
error @ logger.ts:273
safeInvoke @ utils.ts:125
await in safeInvoke
create @ client.ts:1841
eval @ useQuotes.ts:136
handleSubmit @ page.tsx:68
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
app-index.tsx:25  16/02/2026, 23:36:25 [CORR:req-mlpqvnen-0002-kgwckv] [FRONTEND] [API] [ERROR] IPC call error: quote_create | user_id: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZTM1NTdhNi04YTU2LTRmNjYtODA2My00NTVlYWExNDAxMjAiLCJlbWFpbCI6InJheWVwYXNtb25hdXRvQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiYWhtZWRfYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzEyODA4NDcsImV4cCI6MTc3MTI4ODA0NywianRpIjoiYjQzNDRiYTgtNzYzYS00MTkwLWE5NjctMzhmYTU3NmNiNDUyIiwic2Vzc2lvbl9pZCI6IjFjYzg3ZWQyLTY1NjktNDBjNC1iYWU5LTdlNTI1YzNmNGQ2YiJ9.ugdlZWQelxEVN3ZmsQNwxmbXaiqp5MTvSlzJOhHCxyY | error: Error: Une erreur inattendue s'est produite. Veuillez réessayer. {id: '1771281385518-e9eqnjbfs2o', timestamp: '2026-02-16T22:36:25.518Z', correlation_id: 'req-mlpqvnen-0002-kgwckv', layer: 'FRONTEND', domain: 'API', …}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
log @ logger.ts:171
error @ logger.ts:273
safeInvoke @ utils.ts:238
await in safeInvoke
create @ client.ts:1841
eval @ useQuotes.ts:136
handleSubmit @ page.tsx:68
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
