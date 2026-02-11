﻿logger.ts:167  11/02/2026, 17:40:57 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828057694-g79sy4pnlpb', timestamp: '2026-02-11T16:40:57.694Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
hot-reloader-client.tsx:297 [Fast Refresh] rebuilding
logger.ts:167  11/02/2026, 17:41:01 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828061044-2pcou5qgpgi', timestamp: '2026-02-11T16:41:01.044Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
hot-reloader-client.tsx:74 [Fast Refresh] done in 942ms
logger.ts:167  11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828062206-nvl0hl9oete', timestamp: '2026-02-11T16:41:02.206Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
client.ts:811 [IPC] getActiveByTask called for task: e3a5ef80-d3ab-4530-8a75-86bce193f4ca
logger.ts:161 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_workflow","args":{"action":{"action":"GetActiveByTask","task_id":"e3a5ef80-d3ab-4530-8a75-86bce193f4ca"},"session_token":"[REDACTED]","sessionToken":"[REDACTED]","task_id":"e3a5ef80-d3ab-4530-8a75-86bce193f4ca"},"timeout_ms":120000} {id: '1770828062289-dc7vhqmj9fb', timestamp: '2026-02-11T16:41:02.289Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
cache.ts:127 [IPC Cache] task_crud -> cache hit for key: task:e3a5ef80-d3ab-4530-8a75-86bce193f4ca
RootClientLayout.tsx:76 checkAdminRedirect running {pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf', user: 'a2975c76-eeda-41f8-9efe-d0741c9785a5'}
logger.ts:161 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828062345-mkky51rkmq', timestamp: '2026-02-11T16:41:02.345Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_workflow","duration_ms":177,"response_type":"object"} {id: '1770828062466-i7sludcsao', timestamp: '2026-02-11T16:41:02.467Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
client.ts:820 [IPC] getActiveByTask raw result: {type: 'ActiveByTask', interventions: Array(1)}
client.ts:826 [IPC] getActiveByTask workflow response: {type: 'ActiveByTask', interventions: Array(1)}
logger.ts:164 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","duration_ms":200,"response_type":"boolean"} {id: '1770828062545-l5ug2d790vp', timestamp: '2026-02-11T16:41:02.545Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
RootClientLayout.tsx:80 hasAdmins result true
RootClientLayout.tsx:95 No redirect needed {hasAdmins: true, pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf'}
logger.ts:161 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","args":{"action":{"action":"Get","intervention_id":"f2f299a7-1acc-4c89-a9dc-3ae7c0023c3f"},"session_token":"[REDACTED]","sessionToken":"[REDACTED]"},"timeout_ms":120000} {id: '1770828062619-5jgid5w3hgb', timestamp: '2026-02-11T16:41:02.619Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
react-dom.development.js:8016 [Violation] 'setTimeout' handler took 56ms
logger.ts:167  11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: user_crud | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"user_crud","timeout_ms":120000} {id: '1770828062674-4gh8pq6sm96', timestamp: '2026-02-11T16:41:02.674Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
utils.ts:92 [Violation] 'setTimeout' handler took 53ms
logger.ts:167  11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: user_crud | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"user_crud","timeout_ms":120000} {id: '1770828062728-ks41v54rz2e', timestamp: '2026-02-11T16:41:02.728Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:164 11/02/2026, 17:41:02 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","duration_ms":254,"response_type":"object"} {id: '1770828062873-th3hdoqtmmc', timestamp: '2026-02-11T16:41:02.873Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
hot-reloader-client.tsx:297 [Fast Refresh] rebuilding
logger.ts:167  11/02/2026, 17:41:04 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828064421-0tk2x9v7ce5', timestamp: '2026-02-11T16:41:04.421Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
utils.ts:92 [Violation] 'setTimeout' handler took 56ms
hot-reloader-client.tsx:74 [Fast Refresh] done in 2746ms
RootClientLayout.tsx:76 checkAdminRedirect running {pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/inspection', user: 'a2975c76-eeda-41f8-9efe-d0741c9785a5'}
logger.ts:161 11/02/2026, 17:41:07 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828067183-n3101s09izk', timestamp: '2026-02-11T16:41:07.183Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:07 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","duration_ms":54,"response_type":"boolean"} {id: '1770828067237-ejzgrmaf4w', timestamp: '2026-02-11T16:41:07.237Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
RootClientLayout.tsx:80 hasAdmins result true
RootClientLayout.tsx:95 No redirect needed {hasAdmins: true, pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/inspection'}
dialog.tsx:543  Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
eval @ dialog.tsx:543
commitHookEffectListMount @ react-dom.development.js:21102
commitHookPassiveMountEffects @ react-dom.development.js:23154
commitPassiveMountOnFiber @ react-dom.development.js:23259
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23370
recursivelyTraversePassiveMountEffects @ react-dom.development.js:23237
commitPassiveMountOnFiber @ react-dom.development.js:23256
dialog.tsx:543  Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
eval @ dialog.tsx:543
commitHookEffectListMount @ react-dom.development.js:21102
invokePassiveEffectMountInDEV @ react-dom.development.js:23980
invokeEffectsInDev @ react-dom.development.js:26852
legacyCommitDoubleInvokeEffectsInDEV @ react-dom.development.js:26835
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:26816
flushPassiveEffectsImpl @ react-dom.development.js:26514
flushPassiveEffects @ react-dom.development.js:26438
commitRootImpl @ react-dom.development.js:26337
commitRoot @ react-dom.development.js:26077
performSyncWorkOnRoot @ react-dom.development.js:24925
flushSyncWorkAcrossRoots_impl @ react-dom.development.js:7758
flushSyncWorkOnAllRoots @ react-dom.development.js:7718
processRootScheduleInMicrotask @ react-dom.development.js:7863
eval @ react-dom.development.js:8034
logger.ts:161 11/02/2026, 17:41:14 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","args":{"action":{"action":"AdvanceStep","intervention_id":"f2f299a7-1acc-4c89-a9dc-3ae7c0023c3f","step_id":"916400a1-4b30-4c93-a9fb-2f1bd03b7e01","collected_data":{"defects":[{"id":"roof-1770828073127","zone":"roof","type":"scratch","severity":"medium","notes":"lkj"}],"meta":{"photos_count":0}},"notes":null,"photos":null,"quality_check_passed":true,"issues":null},"session_token":"[REDACTED]","sessionToken":"[REDACTED]"},"timeout_ms":120000} {id: '1770828074894-sqmysi0mff', timestamp: '2026-02-11T16:41:14.894Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:14 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","duration_ms":51,"response_type":"object"} {id: '1770828074945-h84qgyxfjcj', timestamp: '2026-02-11T16:41:14.945Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
client.ts:811 [IPC] getActiveByTask called for task: e3a5ef80-d3ab-4530-8a75-86bce193f4ca
logger.ts:161 11/02/2026, 17:41:14 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_workflow","args":{"action":{"action":"GetActiveByTask","task_id":"e3a5ef80-d3ab-4530-8a75-86bce193f4ca"},"session_token":"[REDACTED]","sessionToken":"[REDACTED]","task_id":"e3a5ef80-d3ab-4530-8a75-86bce193f4ca"},"timeout_ms":120000} {id: '1770828074977-jjyl0si5z8f', timestamp: '2026-02-11T16:41:14.977Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:161 11/02/2026, 17:41:15 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","args":{"action":{"action":"Get","intervention_id":"f2f299a7-1acc-4c89-a9dc-3ae7c0023c3f"},"session_token":"[REDACTED]","sessionToken":"[REDACTED]"},"timeout_ms":120000} {id: '1770828075012-64nlwt9mnuu', timestamp: '2026-02-11T16:41:15.012Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:15 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_workflow","duration_ms":167,"response_type":"object"} {id: '1770828075144-4c392998efl', timestamp: '2026-02-11T16:41:15.144Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
client.ts:820 [IPC] getActiveByTask raw result: {type: 'ActiveByTask', interventions: Array(1)}
client.ts:826 [IPC] getActiveByTask workflow response: {type: 'ActiveByTask', interventions: Array(1)}
logger.ts:164 11/02/2026, 17:41:15 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: intervention_progress | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_progress","duration_ms":168,"response_type":"object"} {id: '1770828075180-qwlfv5qg1j9', timestamp: '2026-02-11T16:41:15.180Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
hot-reloader-client.tsx:297 [Fast Refresh] rebuilding
hot-reloader-client.tsx:74 [Fast Refresh] done in 876ms
RootClientLayout.tsx:76 checkAdminRedirect running {pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/installation', user: 'a2975c76-eeda-41f8-9efe-d0741c9785a5'}
logger.ts:161 11/02/2026, 17:41:17 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828077254-jarzozpmo5', timestamp: '2026-02-11T16:41:17.254Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:17 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","duration_ms":64,"response_type":"boolean"} {id: '1770828077318-alzpnwc05pn', timestamp: '2026-02-11T16:41:17.318Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
RootClientLayout.tsx:80 hasAdmins result true
RootClientLayout.tsx:95 No redirect needed {hasAdmins: true, pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/installation'}
logger.ts:167  11/02/2026, 17:41:17 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828077583-qvl4jmt340b', timestamp: '2026-02-11T16:41:17.583Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:21 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828081132-odft8dyo7f', timestamp: '2026-02-11T16:41:21.132Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:22 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828082380-o049gcz8dxj', timestamp: '2026-02-11T16:41:22.380Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:22 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: intervention_management | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_management","timeout_ms":120000} {id: '1770828082647-2pgifn6wu69', timestamp: '2026-02-11T16:41:22.647Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:22 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: intervention_management | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_management","timeout_ms":120000} {id: '1770828082719-5w46penb7jx', timestamp: '2026-02-11T16:41:22.719Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:24 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828084498-2jelevxdnv3', timestamp: '2026-02-11T16:41:24.498Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:167  11/02/2026, 17:41:24 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: task_crud | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"task_crud","timeout_ms":120000} {id: '1770828084912-0yslx14lu4pe', timestamp: '2026-02-11T16:41:24.912Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
hot-reloader-client.tsx:297 [Fast Refresh] rebuilding
hot-reloader-client.tsx:74 [Fast Refresh] done in 1151ms
RootClientLayout.tsx:76 checkAdminRedirect running {pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/finalization', user: 'a2975c76-eeda-41f8-9efe-d0741c9785a5'}
logger.ts:161 11/02/2026, 17:41:27 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828087986-1dds7nipdt4k', timestamp: '2026-02-11T16:41:27.986Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
logger.ts:164 11/02/2026, 17:41:28 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [INFO] IPC call completed: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","duration_ms":53,"response_type":"boolean"} {id: '1770828088040-9kzg1552clq', timestamp: '2026-02-11T16:41:28.040Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
RootClientLayout.tsx:80 hasAdmins result true
RootClientLayout.tsx:95 No redirect needed {hasAdmins: true, pathname: '/tasks/e3a5ef80-d3ab-4530-8a75-86bce193f4ca/workflow/ppf/steps/finalization'}
logger.ts:167  11/02/2026, 17:41:28 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828088544-ageblqdoofi', timestamp: '2026-02-11T16:41:28.545Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
utils.ts:92 [Violation] 'setTimeout' handler took 63ms
logger.ts:167  11/02/2026, 17:41:34 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [WARN] IPC call timeout: has_admins | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"has_admins","timeout_ms":120000} {id: '1770828094633-vh2hddmkvqi', timestamp: '2026-02-11T16:41:34.633Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
log @ logger.ts:167
warn @ logger.ts:256
eval @ utils.ts:94
logger.ts:161 11/02/2026, 17:41:48 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [DEBUG] IPC call started: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | data: {"command":"intervention_workflow","args":{"action":{"action":"Finalize","data":{"intervention_id":"f2f299a7-1acc-4c89-a9dc-3ae7c0023c3f","collected_data":{"qc_checklist":{"edges_sealed":true,"no_bubbles":true,"smooth_surface":true,"alignment_correct":true,"no_dust":true,"cure_time_respected":true},"customer_signature":{"svg_data":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAV4AAACWCAYAAACW5+B3AAAN90lEQVR4Aeydy4ssSRWHa3wMjiIo4g...[truncated]","signatory":"kejn eoeop","customer_comments":"zlzlzk zlklz"},"quality_score":95,"final_observations":["Intervention PPF terminée avec succès"]},"photos":null,"customer_satisfaction":null,"quality_score":95,"final_observations":["Intervention PPF terminée avec succès"],"customer_signature":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAV4AAACWCAYAAACW5+B3AAAN90lEQVR4Aeydy4ssSRWHa3wMjiIo4g...[truncated]","customer_comments":"zlzlzk zlklz"}},"session_token":"[REDACTED]","sessionToken":"[REDACTED]"},"timeout_ms":120000} {id: '1770828108807-fnyhj6sib14', timestamp: '2026-02-11T16:41:48.807Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
app-index.tsx:25  11/02/2026, 17:41:48 [CORR:req-mli97mjk-0002-ig50b0] [FRONTEND] [API] [ERROR] IPC call error: intervention_workflow | user_id: a2975c76-eeda-41f8-9efe-d0741c9785a5 | error: Error: {"Database":"Failed to finalize intervention: Workflow error: Cannot finalize intervention: 3 mandatory steps incomplete: [1, 2, 3]"} {id: '1770828108861-fkrnilfqlur', timestamp: '2026-02-11T16:41:48.861Z', correlation_id: 'req-mli97mjk-0002-ig50b0', layer: 'FRONTEND', domain: 'API', …}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
log @ logger.ts:171
error @ logger.ts:273
safeInvoke @ utils.ts:218
await in safeInvoke
finalize @ client.ts:962
mutationFn @ PPFWorkflowContext.tsx:374
fn @ mutation.js:74
run @ retryer.js:77
start @ retryer.js:119
execute @ mutation.js:115
await in execute
mutate @ mutationObserver.js:61
finalizeIntervention @ PPFWorkflowContext.tsx:414
handleCompleteFinalization @ page.tsx:149
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
app-index.tsx:25  Error finalizing intervention: {Database: 'Failed to finalize intervention: Workflow error: C…rvention: 3 mandatory steps incomplete: [1, 2, 3]'}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
onError @ PPFWorkflowContext.tsx:388
execute @ mutation.js:159
await in execute
mutate @ mutationObserver.js:61
finalizeIntervention @ PPFWorkflowContext.tsx:414
handleCompleteFinalization @ page.tsx:149
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
app-index.tsx:25  Error completing finalization: {Database: 'Failed to finalize intervention: Workflow error: C…rvention: 3 mandatory steps incomplete: [1, 2, 3]'}
window.console.error @ app-index.tsx:25
console.error @ hydration-error-info.ts:72
handleCompleteFinalization @ page.tsx:154
await in handleCompleteFinalization
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
