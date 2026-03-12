
emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (feat-mainv-1)
$ npm run frontend:type-check

> rpma-rust@0.1.0 frontend:type-check
> cd frontend && npm run type-check


> rpma-frontend@0.1.0 type-check
> tsc --noEmit

src/lib/ipc/index.ts:2:72 - error TS2305: Module '"./mock/mock-client"' has no exported member 'initMockIpc'.

2 import { ipcClient as mockIpcClient, useIpcClient as mockUseIpcClient, initMockIpc } from './mock/mock-client';
                                                                         ~~~~~~~~~~~

src/lib/ipc/mock/mock-client.ts:123:43 - error TS2304: Cannot find name 'UserSettings'.

123     getUserSettings: () => mockSafeInvoke<UserSettings>('get_user_settings', {}),
                                              ~~~~~~~~~~~~

src/lib/ipc/mock/mock-client.ts:179:52 - error TS2552: Cannot find name 'UserListResponse'. Did you mean 'TaskListResponse'?

179     list: (limit: number, offset: number): Promise<UserListResponse> =>
                                                       ~~~~~~~~~~~~~~~~

src/lib/ipc/mock/mock-client.ts:228:229 - error TS2322: Type '(JsonValue | undefined)[]' is not assignable to type 'JsonValue | undefined'.
  Type '(JsonValue | undefined)[]' is not assignable to type 'JsonArray'.
    Type 'JsonValue | undefined' is not assignable to type 'JsonValue'.
      Type 'undefined' is not assignable to type 'JsonValue'.

228     upload: (interventionId: string, file: any, photoType: string) => mockSafeInvoke('document_store_photo', { request: { intervention_id: interventionId, file_name: file.name, mime_type: file.mimeType, pho
to_type: photoType }, image_data: Array.from(file.bytes) }),

                      ~~~~~~~~~~


Found 4 errors in 2 files.

Errors  Files
     1  src/lib/ipc/index.ts:2
     3  src/lib/ipc/mock/mock-client.ts:123

emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (feat-mainv-1)
$ npm run frontend:lint

> rpma-rust@0.1.0 frontend:lint
> cd frontend && npm run lint


> rpma-frontend@0.1.0 lint
> eslint . --ext .ts,.tsx --max-warnings 10000


D:\rpma-rust\frontend\src\app\onboarding\page.tsx
  12:1  warning  `@/shared/hooks` import should occur before import of `@/domains/settings`        import/order
  13:1  warning  `@/lib/backend` type import should occur before import of `@/components/ui/card`  import/order

D:\rpma-rust\frontend\src\app\staff\__tests__\page.test.tsx
   3:1  warning  `react` import should occur before import of `@testing-library/react`                                                import/order
  62:5  error    Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

D:\rpma-rust\frontend\src\domains\performance\api\performanceProvider.tsx
  16:17  warning  'setStats' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u         @typescript-eslint/no-unused-vars
  17:22  warning  'setCacheStats' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u    @typescript-eslint/no-unused-vars
  18:24  warning  'setSystemHealth' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u  @typescript-eslint/no-unused-vars
  19:19  warning  'setLoading' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u       @typescript-eslint/no-unused-vars
  20:17  warning  'setError' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u         @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\src\domains\settings\__tests__\useSettings.test.tsx
   4:1   warning  `@tanstack/react-query` import should occur before import of `../api/useSettings`  import/order
   5:1   warning  `react` import should occur before import of `@testing-library/react`              import/order
  31:10  error    Component definition is missing display name                                       react/display-name

D:\rpma-rust\frontend\src\domains\settings\api\configurationService.ts
    3:10   warning  'AuthSecureStorage' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
    4:26   warning  'JsonObject' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars
   78:43   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
   87:55   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
   96:35   warning  'id' is defined but never used. Allowed unused args must match /^_/u                 @typescript-eslint/no-unused-vars
  105:105  warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  109:59   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  112:30   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  118:42   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  118:72   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  127:52   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  131:40   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  131:70   warning  Unexpected any. Specify a different type                                             @typescript-eslint/no-explicit-any
  162:28   warning  'id' is defined but never used. Allowed unused args must match /^_/u                 @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\src\domains\settings\api\useSettings.ts
  6:1  warning  `@/lib/backend` type import should occur before import of `@/domains/auth`  import/order

D:\rpma-rust\frontend\src\domains\settings\api\useSettingsActions.ts
  4:1  warning  `@/domains/auth` import should occur after type import of `@/types/json`  import/order

D:\rpma-rust\frontend\src\domains\settings\components\OrganizationSettingsTab.tsx
  13:1  warning  `@/lib/backend` type import should occur before import of `@/components/ui/card`  import/order

D:\rpma-rust\frontend\src\domains\settings\components\__tests__\PerformanceTab.payload.test.tsx
  4:1  warning  `react` import should occur before import of `@testing-library/react`  import/order

D:\rpma-rust\frontend\src\domains\settings\components\__tests__\SecurityTab.contract.test.tsx
  1:18  warning  'screen' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  4:1   warning  `react` import should occur before import of `@testing-library/react`     import/order

D:\rpma-rust\frontend\src\domains\settings\components\__tests__\SecurityTab.error.test.tsx
  1:18  warning  'screen' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  4:1   warning  `react` import should occur before import of `@testing-library/react`     import/order

D:\rpma-rust\frontend\src\domains\settings\hooks\usePerformanceSettings.ts
   10:1   warning  `@/lib/ipc/client` import should occur before import of `@/shared/hooks/useLogger`                                       import/order
   78:22  warning  'setCacheStats' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u      @typescript-eslint/no-unused-vars
   79:21  warning  'setSyncStats' is assigned a value but never used. Allowed unused elements of array destructuring must match /^_/u       @typescript-eslint/no-unused-vars
  135:6   warning  React Hook useEffect has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  166:6   warning  React Hook useCallback has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\rpma-rust\frontend\src\domains\settings\hooks\useSecuritySettings.ts
   10:1  warning  `@/lib/ipc/client` import should occur before import of `@/shared/hooks/useLogger`                                       import/order
  125:6  warning  React Hook useEffect has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  157:6  warning  React Hook useCallback has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  175:6  warning  React Hook useCallback has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  190:6  warning  React Hook useCallback has a missing dependency: 'ipcClient.settings'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\rpma-rust\frontend\src\domains\tasks\components\TaskActions\ActionButtons.tsx
  25:1  warning  `@/shared/features/documents/report-export` import should occur before import of `@/domains/auth`  import/order

D:\rpma-rust\frontend\src\lib\ipc\mock\mock-client.ts
   15:15   warning  'Material' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars
   15:25   warning  'MaterialStats' is defined but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars
   19:10   warning  'defaultFixtures' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   77:31   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
   78:32   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
   99:29   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  105:34   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  109:22   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  111:21   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  115:26   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  116:21   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  175:20   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  180:121  warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  181:32   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  220:30   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  221:42   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  228:44   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  232:19   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  233:20   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  234:32   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  237:25   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  238:25   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  239:31   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  240:56   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  241:40   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  242:56   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  243:28   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any
  245:28   warning  Unexpected any. Specify a different type                                           @typescript-eslint/no-explicit-any

D:\rpma-rust\frontend\src\lib\ipc\real-adapter.ts
  39:17  warning  'command' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\src\lib\ipc\test-adapter.ts
  100:10  warning  'ipcError' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\src\lib\ipc\utils.ts
  7:1  warning  `@/shared/contracts/session` import should occur before import of `../logging`  import/order

✖ 76 problems (2 errors, 74 warnings)
  0 errors and 15 warnings potentially fixable with the `--fix` option.


emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust (feat-mainv-1)
$
