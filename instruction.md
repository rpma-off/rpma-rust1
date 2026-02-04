﻿You are migrating a React application's design system based on the DESIGN.md file uploaded.

TASK: Update all components to match the new design specifications.

KEY CHANGES:
1. Replace all color references with new design tokens:
   - Primary: #1ad1ba (teal)
   - Status colors: Blue #3b82f6, Yellow #f59e0b, Green #22c55e, Red #ef4444
   - Neutrals: Use the gray scale defined in DESIGN.md

2. Update spacing to use the 4px-based system (space-1 through space-20)

3. Standardize all component styles to match specifications:
   - Buttons: 8px vertical, 16px horizontal padding, 6px border-radius
   - Cards: 24px padding, 8px border-radius, standard shadow
   - Inputs: 12px padding, 6px border-radius
   - Badges: 4px/12px padding, 12px border-radius

4. Apply consistent typography scale (xs through 4xl)

5. Ensure all layouts match the specifications:
   - Navigation bar: 60px height, teal background
   - Sidebar: 280px width
   - Proper spacing and card structures

6. Add hover, focus, and loading states as specified

7. Implement responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

PROCESS:
- Start with design token files (colors, spacing, typography)
- Update base UI components first
- Then update feature-specific components
- Test each component after updating
- Ensure accessibility standards are met

Prioritize: Navigation, buttons, cards, forms, then feature-specific components.