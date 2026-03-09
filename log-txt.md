> rpma-frontend@0.1.0 lint
> eslint . --ext .ts,.tsx --max-warnings 10000


D:\rpma-rust\frontend\playwright.config.ts
  6:7  warning  'reuseExistingServer' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\src\domains\quotes\components\QuoteDetailPageContent.tsx
  263:13  warning  Image elements must have an alt prop, either with meaningful text, or an empty string for decorative images  jsx-a11y/alt-text

D:\rpma-rust\frontend\tests\e2e\ppf-workflow-smoke.spec.ts
  2:10  warning  'resetMockDb' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\tests\e2e\utils\auth.ts
  32:12  warning  'error' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  52:12  warning  'error' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

D:\rpma-rust\frontend\tests\e2e\utils\mock.ts
  15:12  warning  'error' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
