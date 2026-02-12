#!/usr/bin/env node

/**
 * Code Duplication Detection Script
 *
 * Detects duplication patterns across:
 * - Frontend components (tables/forms/modals)
 * - Backend command/service/repository patterns
 *
 * Outputs:
 * - Top duplication clusters and extraction candidates
 * - Proposed module boundaries and naming conventions
 */

const fs = require('fs');
const path = require('path');

class DuplicationDetector {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.frontendSrc = path.join(this.projectRoot, 'frontend', 'src');
        this.backendSrc = path.join(this.projectRoot, 'src-tauri', 'src');
        this.clusters = [];
        this.candidates = [];
    }

    async detect() {
        console.log('🔍 Detecting code duplication patterns...\n');

        const frontendClusters = this.detectFrontendDuplication();
        const backendClusters = this.detectBackendDuplication();

        this.clusters = [...frontendClusters, ...backendClusters];
        this.candidates = this.identifyExtractionCandidates();

        this.displayResults();
        this.saveReport();

        const hasHighSeverity = this.clusters.some(c => c.severity === 'HIGH');
        if (hasHighSeverity) {
            console.log('\n⚠️  High-severity duplication clusters detected. See report for details.');
        } else {
            console.log('\n✅ No high-severity duplication clusters detected.');
        }

        return { clusters: this.clusters, candidates: this.candidates };
    }

    // ─── Frontend Detection ──────────────────────────────────────────────

    detectFrontendDuplication() {
        const clusters = [];

        clusters.push(...this.detectModalDuplication());
        clusters.push(...this.detectTableDuplication());
        clusters.push(...this.detectFormDuplication());

        return clusters;
    }

    detectModalDuplication() {
        const clusters = [];
        const modalDir = path.join(this.frontendSrc, 'components', 'tasks', 'TaskActions');
        const dialogPattern = /Dialog|DialogContent|DialogHeader|DialogTitle|DialogFooter/;
        const statePattern = /useState\s*<?\s*(?:boolean|string)/g;
        const mutationPattern = /useMutation/;

        const modalFiles = this.findFiles(this.frontendSrc, /\.(tsx|ts)$/)
            .filter(f => {
                try {
                    const content = fs.readFileSync(f, 'utf8');
                    return dialogPattern.test(content) && statePattern.test(content);
                } catch { return false; }
            });

        // Group by directory to find clusters
        const dirGroups = new Map();
        for (const file of modalFiles) {
            const dir = path.dirname(file);
            if (!dirGroups.has(dir)) dirGroups.set(dir, []);
            dirGroups.get(dir).push(file);
        }

        // Find directories with 2+ modal files sharing patterns
        for (const [dir, files] of dirGroups) {
            if (files.length < 2) continue;

            const patterns = files.map(f => {
                const content = fs.readFileSync(f, 'utf8');
                return {
                    file: path.relative(this.projectRoot, f),
                    hasDialog: dialogPattern.test(content),
                    stateCount: (content.match(/useState/g) || []).length,
                    hasMutation: mutationPattern.test(content),
                    hasSubmitHandler: /onSubmit|handleSubmit/.test(content),
                    hasFooter: /DialogFooter|footer/.test(content),
                };
            });

            const dialogFiles = patterns.filter(p => p.hasDialog);
            if (dialogFiles.length >= 2) {
                clusters.push({
                    id: `modal-${path.basename(dir)}`,
                    layer: 'frontend',
                    category: 'modals',
                    severity: dialogFiles.length >= 3 ? 'HIGH' : 'MEDIUM',
                    title: `Modal dialog duplication in ${path.basename(dir)}`,
                    description: `${dialogFiles.length} components share identical Dialog + useState + submit patterns`,
                    files: dialogFiles.map(p => p.file),
                    sharedPatterns: [
                        'Dialog/DialogContent/DialogHeader layout',
                        'useState for open/close state',
                        dialogFiles.some(p => p.hasMutation) ? 'useMutation submit pattern' : 'manual submit handler',
                        'Form reset on cancel/success',
                    ].filter(Boolean),
                    estimatedDuplicateLines: dialogFiles.length * 25,
                });
            }
        }

        // Cross-directory modal pattern detection
        const allModalPatterns = modalFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasDialog: true,
                stateCount: (content.match(/useState/g) || []).length,
                hasMutation: mutationPattern.test(content),
                hasToast: /toast|sonner/.test(content),
                toastLib: /sonner/.test(content) ? 'sonner' : (/react-hot-toast/.test(content) ? 'react-hot-toast' : 'none'),
            };
        });

        const toastLibs = [...new Set(allModalPatterns.map(p => p.toastLib).filter(l => l !== 'none'))];
        if (toastLibs.length > 1) {
            clusters.push({
                id: 'modal-toast-inconsistency',
                layer: 'frontend',
                category: 'modals',
                severity: 'MEDIUM',
                title: 'Inconsistent toast notification libraries across modals',
                description: `Modals use ${toastLibs.length} different toast libraries: ${toastLibs.join(', ')}`,
                files: allModalPatterns.filter(p => p.toastLib !== 'none').map(p => p.file),
                sharedPatterns: ['Toast success/error notification pattern'],
                estimatedDuplicateLines: allModalPatterns.filter(p => p.hasToast).length * 5,
            });
        }

        return clusters;
    }

    detectTableDuplication() {
        const clusters = [];
        const tableFiles = this.findFiles(this.frontendSrc, /\.(tsx|ts)$/)
            .filter(f => {
                try {
                    const content = fs.readFileSync(f, 'utf8');
                    const basename = path.basename(f).toLowerCase();
                    return (basename.includes('table') || basename.includes('list') || basename.includes('grid'))
                        && (content.includes('<table') || content.includes('<Table') || content.includes('Column'));
                } catch { return false; }
            });

        if (tableFiles.length < 2) return clusters;

        const tablePatterns = tableFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasSorting: /sort|Sort|sortBy|sortColumn|sortDirection/.test(content),
                hasPagination: /page|Page|pagination|Pagination|pageSize/.test(content),
                hasVirtualization: /virtual|Virtual|useVirtualizer|VirtualizedList/.test(content),
                hasColumnDef: /Column<|ColumnDef|columns.*:/.test(content),
                hasSelection: /select|Select|checkbox|isSelected/.test(content),
                hasSearch: /search|Search|filter|Filter/.test(content),
            };
        });

        // Find tables with identical sort logic
        const sortingTables = tablePatterns.filter(p => p.hasSorting);
        if (sortingTables.length >= 2) {
            clusters.push({
                id: 'table-sorting-duplication',
                layer: 'frontend',
                category: 'tables',
                severity: 'HIGH',
                title: 'Duplicated sorting logic across table components',
                description: `${sortingTables.length} table components implement their own sorting (asc/desc cycle, useMemo)`,
                files: sortingTables.map(p => p.file),
                sharedPatterns: [
                    'Sort state (sortColumn + sortDirection)',
                    'Click-to-cycle sort handler',
                    'useMemo with sort comparator',
                    'Sort indicator icons',
                ],
                estimatedDuplicateLines: sortingTables.length * 30,
            });
        }

        // Find tables with overlapping column definitions
        const columnTables = tablePatterns.filter(p => p.hasColumnDef);
        if (columnTables.length >= 2) {
            clusters.push({
                id: 'table-column-def-duplication',
                layer: 'frontend',
                category: 'tables',
                severity: 'MEDIUM',
                title: 'Overlapping column definition interfaces',
                description: `${columnTables.length} table components define similar Column<T> interfaces`,
                files: columnTables.map(p => p.file),
                sharedPatterns: [
                    'Column interface (key, header/label, render, sortable)',
                    'Row rendering via column.render() or string coercion',
                ],
                estimatedDuplicateLines: columnTables.length * 15,
            });
        }

        // Mixed virtualization approaches
        const virtualTables = tablePatterns.filter(p => p.hasVirtualization);
        if (virtualTables.length >= 2) {
            clusters.push({
                id: 'table-virtualization-mixed',
                layer: 'frontend',
                category: 'tables',
                severity: 'MEDIUM',
                title: 'Multiple virtualization approaches for tables',
                description: `${virtualTables.length} table components use different virtualization strategies`,
                files: virtualTables.map(p => p.file),
                sharedPatterns: [
                    'Virtual row rendering',
                    'Scroll container management',
                ],
                estimatedDuplicateLines: virtualTables.length * 40,
            });
        }

        return clusters;
    }

    detectFormDuplication() {
        const clusters = [];
        const formFiles = this.findFiles(this.frontendSrc, /\.(tsx|ts)$/)
            .filter(f => {
                try {
                    const basename = path.basename(f).toLowerCase();
                    const content = fs.readFileSync(f, 'utf8');
                    return (basename.includes('form') || basename.includes('signup') || basename.includes('login'))
                        && (content.includes('useState') || content.includes('useForm'))
                        && /onSubmit|handleSubmit/.test(content);
                } catch { return false; }
            });

        if (formFiles.length < 2) return clusters;

        const formPatterns = formFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                validationApproach: /zodResolver|z\.object/.test(content) ? 'zod'
                    : /validate\w*\(/.test(content) ? 'manual'
                    : 'minimal',
                stateApproach: /useForm|react-hook-form/.test(content) ? 'react-hook-form'
                    : /useState/.test(content) ? 'useState'
                    : 'other',
                hasErrorDisplay: /errors\.|formState\.errors|error\s*&&/.test(content),
                hasLoadingState: /isLoading|loading|isSubmitting|isPending/.test(content),
                hasResetLogic: /reset\(|setFormData\(|setState\(/.test(content),
            };
        });

        // Detect inconsistent validation approaches
        const validationGroups = {};
        for (const p of formPatterns) {
            if (!validationGroups[p.validationApproach]) validationGroups[p.validationApproach] = [];
            validationGroups[p.validationApproach].push(p.file);
        }

        const validationApproaches = Object.keys(validationGroups);
        if (validationApproaches.length > 1) {
            clusters.push({
                id: 'form-validation-inconsistency',
                layer: 'frontend',
                category: 'forms',
                severity: 'HIGH',
                title: 'Inconsistent form validation approaches',
                description: `${formPatterns.length} forms use ${validationApproaches.length} different validation strategies: ${validationApproaches.join(', ')}`,
                files: formPatterns.map(p => p.file),
                sharedPatterns: validationApproaches.map(a =>
                    `${validationGroups[a].length} form(s) use '${a}' validation`
                ),
                estimatedDuplicateLines: formPatterns.length * 20,
            });
        }

        // Detect inconsistent state management
        const stateGroups = {};
        for (const p of formPatterns) {
            if (!stateGroups[p.stateApproach]) stateGroups[p.stateApproach] = [];
            stateGroups[p.stateApproach].push(p.file);
        }

        const stateApproaches = Object.keys(stateGroups);
        if (stateApproaches.length > 1) {
            clusters.push({
                id: 'form-state-inconsistency',
                layer: 'frontend',
                category: 'forms',
                severity: 'MEDIUM',
                title: 'Inconsistent form state management',
                description: `Forms use ${stateApproaches.length} different state management approaches: ${stateApproaches.join(', ')}`,
                files: formPatterns.map(p => p.file),
                sharedPatterns: stateApproaches.map(a =>
                    `${stateGroups[a].length} form(s) use '${a}' state management`
                ),
                estimatedDuplicateLines: formPatterns.length * 15,
            });
        }

        // Detect duplicate MaterialForm files
        const materialForms = formFiles.filter(f => path.basename(f) === 'MaterialForm.tsx');
        if (materialForms.length > 1) {
            clusters.push({
                id: 'form-material-duplicate',
                layer: 'frontend',
                category: 'forms',
                severity: 'HIGH',
                title: 'Duplicate MaterialForm implementations',
                description: `${materialForms.length} copies of MaterialForm.tsx exist at different paths`,
                files: materialForms.map(f => path.relative(this.projectRoot, f)),
                sharedPatterns: [
                    'Same SKU/name/description/type fields',
                    'Same Zod validation schema',
                    'Same submit handler pattern',
                ],
                estimatedDuplicateLines: 100,
            });
        }

        return clusters;
    }

    // ─── Backend Detection ───────────────────────────────────────────────

    detectBackendDuplication() {
        const clusters = [];

        clusters.push(...this.detectRepositoryDuplication());
        clusters.push(...this.detectCommandDuplication());
        clusters.push(...this.detectValidationDuplication());
        clusters.push(...this.detectReportDuplication());

        return clusters;
    }

    detectRepositoryDuplication() {
        const clusters = [];
        const repoDir = path.join(this.backendSrc, 'repositories');

        if (!fs.existsSync(repoDir)) return clusters;

        const repoFiles = this.findFiles(repoDir, /\.rs$/)
            .filter(f => !path.basename(f).startsWith('mod') && path.basename(f) !== 'base.rs');

        if (repoFiles.length < 2) return clusters;

        const repoPatterns = repoFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasFindById: /find_by_id/.test(content),
                hasFindAll: /find_all/.test(content),
                hasSave: /\bsave\b/.test(content),
                hasDelete: /delete_by_id|delete\b/.test(content),
                hasExists: /exists_by_id/.test(content),
                hasCachePattern: /cache_key|cache\.get|cache\.set/.test(content),
                hasWhereClause: /build_where_clause|where_clauses|conditions\.push/.test(content),
                hasSortValidation: /validate_sort_column/.test(content),
                hasQueryBuilder: /params\.push|params!/.test(content),
                methodCount: (content.match(/pub\s+(async\s+)?fn\s+/g) || []).length,
            };
        });

        // CRUD boilerplate detection
        const crudRepos = repoPatterns.filter(p =>
            p.hasFindById && p.hasSave && (p.hasDelete || p.hasFindAll)
        );

        if (crudRepos.length >= 3) {
            clusters.push({
                id: 'repo-crud-boilerplate',
                layer: 'backend',
                category: 'repositories',
                severity: 'HIGH',
                title: 'Repository CRUD boilerplate duplication',
                description: `${crudRepos.length} repositories implement identical find_by_id/save/delete/find_all signatures`,
                files: crudRepos.map(p => p.file),
                sharedPatterns: [
                    'find_by_id() with cache lookup',
                    'save() with cache invalidation',
                    'delete_by_id() with soft delete',
                    'find_all() with query builder',
                    'exists_by_id() helper',
                ],
                estimatedDuplicateLines: crudRepos.length * 60,
            });
        }

        // Cache pattern duplication
        const cachedRepos = repoPatterns.filter(p => p.hasCachePattern);
        if (cachedRepos.length >= 3) {
            clusters.push({
                id: 'repo-cache-pattern',
                layer: 'backend',
                category: 'repositories',
                severity: 'MEDIUM',
                title: 'Cache lookup/set pattern duplicated across repositories',
                description: `${cachedRepos.length} repositories repeat identical cache_key_builder + cache.get/set pattern`,
                files: cachedRepos.map(p => p.file),
                sharedPatterns: [
                    'Cache key construction',
                    'Cache lookup before query',
                    'Cache set after query',
                    'Cache invalidation on write',
                ],
                estimatedDuplicateLines: cachedRepos.length * 20,
            });
        }

        // WHERE clause builder duplication
        const whereRepos = repoPatterns.filter(p => p.hasWhereClause);
        if (whereRepos.length >= 2) {
            clusters.push({
                id: 'repo-where-clause-builder',
                layer: 'backend',
                category: 'repositories',
                severity: 'MEDIUM',
                title: 'WHERE clause builder pattern duplicated',
                description: `${whereRepos.length} repositories implement similar dynamic WHERE clause construction`,
                files: whereRepos.map(p => p.file),
                sharedPatterns: [
                    'conditions.push() with LIKE pattern',
                    'params.push() with format!("%{}%")',
                    'Sort column validation',
                    'Dynamic query composition',
                ],
                estimatedDuplicateLines: whereRepos.length * 40,
            });
        }

        return clusters;
    }

    detectCommandDuplication() {
        const clusters = [];
        const cmdDir = path.join(this.backendSrc, 'commands');

        if (!fs.existsSync(cmdDir)) return clusters;

        const cmdFiles = this.findFiles(cmdDir, /\.rs$/)
            .filter(f => !path.basename(f).startsWith('mod'));

        if (cmdFiles.length < 2) return clusters;

        const cmdPatterns = cmdFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasAuthenticate: /authenticate!/.test(content),
                hasRateLimiter: /rate_limiter|check_and_record/.test(content),
                hasRbacCheck: /can_perform|AuthMiddleware|permission/.test(content),
                hasTimeout: /tokio::time::timeout/.test(content),
                hasApiResponse: /ApiResponse::success|ApiResponse::error/.test(content),
                hasValidation: /ValidationService|sanitize_text_input|validate/.test(content),
                commandCount: (content.match(/#\[tauri::command\]/g) || []).length,
            };
        });

        // Auth + RBAC + timeout pattern duplication
        const authCmds = cmdPatterns.filter(p => p.hasAuthenticate);
        if (authCmds.length >= 5) {
            clusters.push({
                id: 'cmd-auth-boilerplate',
                layer: 'backend',
                category: 'commands',
                severity: 'HIGH',
                title: 'Authentication/RBAC boilerplate across commands',
                description: `${authCmds.length} command files repeat identical authenticate! + RBAC + rate limiting patterns`,
                files: authCmds.map(p => p.file),
                sharedPatterns: [
                    'authenticate!(&session_token, &state) macro',
                    'Rate limiter check_and_record()',
                    'RBAC permission check',
                    'tokio::time::timeout wrapper',
                    'ApiResponse::success/error envelope',
                ],
                estimatedDuplicateLines: authCmds.length * 15,
            });
        }

        // Validation in commands
        const validationCmds = cmdPatterns.filter(p => p.hasValidation);
        if (validationCmds.length >= 3) {
            clusters.push({
                id: 'cmd-validation-inline',
                layer: 'backend',
                category: 'commands',
                severity: 'MEDIUM',
                title: 'Inline validation logic repeated in command handlers',
                description: `${validationCmds.length} command files contain inline ValidationService calls`,
                files: validationCmds.map(p => p.file),
                sharedPatterns: [
                    'ValidationService::new() instantiation',
                    'sanitize_text_input() calls',
                    'Field-by-field validation blocks',
                ],
                estimatedDuplicateLines: validationCmds.length * 20,
            });
        }

        return clusters;
    }

    detectValidationDuplication() {
        const clusters = [];
        const serviceDir = path.join(this.backendSrc, 'services');

        if (!fs.existsSync(serviceDir)) return clusters;

        const validationFiles = this.findFiles(serviceDir, /validation\.rs$/)
            .filter(f => !path.basename(f).startsWith('mod'));

        if (validationFiles.length < 2) return clusters;

        const validationPatterns = validationFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasEmailValidation: /validate_email|email.*regex|email_regex/.test(content),
                hasPhoneValidation: /validate_phone|phone.*regex/.test(content),
                hasRequiredFields: /validate_required|is_empty|required/.test(content),
                hasDateValidation: /validate_date|validate_future_date/.test(content),
                hasStatusTransition: /validate_status_transition|status.*match/.test(content),
                hasSanitize: /sanitize|trim|strip/.test(content),
                functionCount: (content.match(/pub\s+(async\s+)?fn\s+/g) || []).length,
            };
        });

        // Email validation duplication
        const emailValidators = validationPatterns.filter(p => p.hasEmailValidation);
        if (emailValidators.length >= 2) {
            clusters.push({
                id: 'validation-email-duplicate',
                layer: 'backend',
                category: 'services',
                severity: 'HIGH',
                title: 'Email validation logic duplicated across validation services',
                description: `${emailValidators.length} validation services independently implement email validation`,
                files: emailValidators.map(p => p.file),
                sharedPatterns: [
                    'Email regex pattern',
                    'Empty check',
                    'Length limit (254 chars)',
                    'Format validation (contains @, valid domain)',
                ],
                estimatedDuplicateLines: emailValidators.length * 15,
            });
        }

        // Required field validation duplication
        const requiredValidators = validationPatterns.filter(p => p.hasRequiredFields);
        if (requiredValidators.length >= 2) {
            clusters.push({
                id: 'validation-required-duplicate',
                layer: 'backend',
                category: 'services',
                severity: 'MEDIUM',
                title: 'Required field validation repeated across services',
                description: `${requiredValidators.length} services repeat similar required-field checks`,
                files: requiredValidators.map(p => p.file),
                sharedPatterns: [
                    'validate_required_fields() method',
                    'is_empty() checks',
                    'Error message formatting',
                ],
                estimatedDuplicateLines: requiredValidators.length * 10,
            });
        }

        return clusters;
    }

    detectReportDuplication() {
        const clusters = [];
        const reportsDir = path.join(this.backendSrc, 'services', 'reports');

        if (!fs.existsSync(reportsDir)) return clusters;

        const reportFiles = this.findFiles(reportsDir, /\.rs$/)
            .filter(f => {
                const basename = path.basename(f);
                return !basename.startsWith('mod') && basename !== 'types.rs'
                    && basename !== 'validation.rs';
            });

        if (reportFiles.length < 2) return clusters;

        const reportPatterns = reportFiles.map(f => {
            const content = fs.readFileSync(f, 'utf8');
            return {
                file: path.relative(this.projectRoot, f),
                hasDateRange: /date_range|DateRange|start_date|end_date/.test(content),
                hasFilters: /ReportFilters|filters/.test(content),
                hasWhereClause: /where_clauses|WHERE/.test(content),
                hasAggregation: /SUM|COUNT|AVG|GROUP BY/.test(content),
                hasTimestampConvert: /from_timestamp|timestamp\(\)/.test(content),
                hasQueryExecution: /query_row|query_as|db\.query/.test(content),
                functionCount: (content.match(/pub\s+(async\s+)?fn\s+/g) || []).length,
            };
        });

        const pipelineReports = reportPatterns.filter(p =>
            p.hasDateRange && p.hasWhereClause
        );

        if (pipelineReports.length >= 3) {
            clusters.push({
                id: 'report-pipeline-duplicate',
                layer: 'backend',
                category: 'services',
                severity: 'HIGH',
                title: 'Report generation pipeline duplicated across report services',
                description: `${pipelineReports.length} report services follow identical validate → filter → query → aggregate pipeline`,
                files: pipelineReports.map(p => p.file),
                sharedPatterns: [
                    'validate_date_range() call',
                    'Timestamp conversion (from_timestamp)',
                    'Dynamic WHERE clause construction',
                    'Filter parameter binding',
                    'SQL aggregation (SUM/COUNT/AVG)',
                    'Derived metric calculation',
                ],
                estimatedDuplicateLines: pipelineReports.length * 50,
            });
        }

        return clusters;
    }

    // ─── Extraction Candidates ───────────────────────────────────────────

    identifyExtractionCandidates() {
        const candidates = [];

        // Frontend candidates based on detected clusters
        const modalClusters = this.clusters.filter(c => c.category === 'modals');
        if (modalClusters.length > 0) {
            candidates.push({
                id: 'extract-base-modal',
                layer: 'frontend',
                targetModule: 'frontend/src/components/shared/modals',
                exports: ['BaseModal', 'ModalFooter', 'useModalState'],
                description: 'Extract shared dialog wrapper, footer layout, and open/close state hook',
                reducesFiles: modalClusters.flatMap(c => c.files),
                estimatedLineReduction: modalClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P1',
            });
        }

        const tableClusters = this.clusters.filter(c => c.category === 'tables');
        if (tableClusters.length > 0) {
            candidates.push({
                id: 'extract-data-table',
                layer: 'frontend',
                targetModule: 'frontend/src/components/shared/tables',
                exports: ['DataTable', 'useSorting', 'usePagination', 'ColumnDef'],
                description: 'Unified data table with optional virtualization and shared sorting/pagination hooks',
                reducesFiles: tableClusters.flatMap(c => c.files),
                estimatedLineReduction: tableClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P0',
            });
        }

        const formClusters = this.clusters.filter(c => c.category === 'forms');
        if (formClusters.length > 0) {
            candidates.push({
                id: 'extract-form-builder',
                layer: 'frontend',
                targetModule: 'frontend/src/lib/forms',
                exports: ['useFormBuilder', 'FormSchema', 'useFormValidation'],
                description: 'Shared form builder hook with unified validation, state management, and error display',
                reducesFiles: formClusters.flatMap(c => c.files),
                estimatedLineReduction: formClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P1',
            });
        }

        // Backend candidates
        const repoClusters = this.clusters.filter(c => c.category === 'repositories');
        if (repoClusters.length > 0) {
            candidates.push({
                id: 'extract-crud-repository',
                layer: 'backend',
                targetModule: 'src-tauri/src/repositories/crud.rs',
                exports: ['CrudRepository<T>', 'FilterBuilder', 'CacheableRepository'],
                description: 'Generic CRUD trait with shared cache pattern, WHERE clause builder, and sort validation',
                reducesFiles: repoClusters.flatMap(c => c.files),
                estimatedLineReduction: repoClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P0',
            });
        }

        const cmdClusters = this.clusters.filter(c => c.category === 'commands');
        if (cmdClusters.length > 0) {
            candidates.push({
                id: 'extract-command-middleware',
                layer: 'backend',
                targetModule: 'src-tauri/src/commands/middleware.rs',
                exports: ['CommandMiddleware', 'with_auth', 'with_rbac', 'with_rate_limit'],
                description: 'Consolidated middleware stack for authentication, RBAC, rate limiting, and timeout',
                reducesFiles: cmdClusters.flatMap(c => c.files),
                estimatedLineReduction: cmdClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P1',
            });
        }

        const validationClusters = this.clusters.filter(c =>
            c.category === 'services' && c.id.startsWith('validation')
        );
        if (validationClusters.length > 0) {
            candidates.push({
                id: 'extract-validation-core',
                layer: 'backend',
                targetModule: 'src-tauri/src/services/validation/core.rs',
                exports: ['Validator<T>', 'ValidationEngine', 'CommonValidators'],
                description: 'Centralized validation trait with shared email/phone/required field helpers',
                reducesFiles: validationClusters.flatMap(c => c.files),
                estimatedLineReduction: validationClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P1',
            });
        }

        const reportClusters = this.clusters.filter(c =>
            c.category === 'services' && c.id.startsWith('report')
        );
        if (reportClusters.length > 0) {
            candidates.push({
                id: 'extract-report-pipeline',
                layer: 'backend',
                targetModule: 'src-tauri/src/services/reports/pipeline.rs',
                exports: ['ReportPipeline', 'ReportGenerator<T>', 'ReportFormatter'],
                description: 'Shared report generation pipeline with validate → filter → query → aggregate stages',
                reducesFiles: reportClusters.flatMap(c => c.files),
                estimatedLineReduction: reportClusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                priority: 'P1',
            });
        }

        return candidates;
    }

    // ─── Output ──────────────────────────────────────────────────────────

    displayResults() {
        console.log('📊 Duplication Analysis Results');
        console.log('='.repeat(60));

        // Summary
        const highCount = this.clusters.filter(c => c.severity === 'HIGH').length;
        const medCount = this.clusters.filter(c => c.severity === 'MEDIUM').length;
        const totalDupLines = this.clusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0);

        console.log(`\n📈 Summary: ${this.clusters.length} duplication clusters found`);
        console.log(`   🔴 HIGH: ${highCount}  🟡 MEDIUM: ${medCount}`);
        console.log(`   📝 Estimated duplicate lines: ~${totalDupLines}`);
        console.log(`   🎯 Extraction candidates: ${this.candidates.length}\n`);

        // Clusters by layer
        console.log('─'.repeat(60));
        console.log('🖥️  FRONTEND DUPLICATION CLUSTERS');
        console.log('─'.repeat(60));

        const frontendClusters = this.clusters.filter(c => c.layer === 'frontend');
        for (const cluster of frontendClusters) {
            this.displayCluster(cluster);
        }

        console.log('─'.repeat(60));
        console.log('⚙️  BACKEND DUPLICATION CLUSTERS');
        console.log('─'.repeat(60));

        const backendClusters = this.clusters.filter(c => c.layer === 'backend');
        for (const cluster of backendClusters) {
            this.displayCluster(cluster);
        }

        // Extraction candidates
        console.log('─'.repeat(60));
        console.log('🎯 EXTRACTION CANDIDATES');
        console.log('─'.repeat(60));

        for (const candidate of this.candidates) {
            this.displayCandidate(candidate);
        }

        // Module boundaries table
        console.log('─'.repeat(60));
        console.log('📐 PROPOSED MODULE BOUNDARIES');
        console.log('─'.repeat(60));

        this.displayModuleBoundaries();
    }

    displayCluster(cluster) {
        const icon = cluster.severity === 'HIGH' ? '🔴' : '🟡';
        console.log(`\n${icon} [${cluster.severity}] ${cluster.title}`);
        console.log(`   ${cluster.description}`);
        console.log(`   Files (${cluster.files.length}):`);
        for (const file of cluster.files) {
            console.log(`     • ${file}`);
        }
        console.log(`   Shared patterns:`);
        for (const pattern of cluster.sharedPatterns) {
            console.log(`     → ${pattern}`);
        }
        console.log(`   Est. duplicate lines: ~${cluster.estimatedDuplicateLines}`);
    }

    displayCandidate(candidate) {
        console.log(`\n🎯 [${candidate.priority}] ${candidate.id}`);
        console.log(`   Module: ${candidate.targetModule}`);
        console.log(`   Exports: ${candidate.exports.join(', ')}`);
        console.log(`   ${candidate.description}`);
        console.log(`   Reduces duplication in ${candidate.reducesFiles.length} file(s)`);
        console.log(`   Est. line reduction: ~${candidate.estimatedLineReduction}`);
    }

    displayModuleBoundaries() {
        const boundaries = [
            { layer: 'Frontend UI', module: 'frontend/src/components/shared/modals', naming: 'BaseModal, ModalFooter, useModalState', notes: 'Standard dialog + footer + open state handling' },
            { layer: 'Frontend Forms', module: 'frontend/src/lib/forms', naming: 'useFormBuilder, FormSchema, useFormValidation', notes: 'Shared validation + field registration conventions' },
            { layer: 'Frontend Tables', module: 'frontend/src/components/shared/tables', naming: 'DataTable, useSorting, usePagination, ColumnDef', notes: 'Shared rendering + behavior hooks' },
            { layer: 'Backend Validation', module: 'src-tauri/src/services/validation/core.rs', naming: 'Validator<T>, ValidationEngine, CommonValidators', notes: 'Centralizes validation helpers' },
            { layer: 'Backend Repos', module: 'src-tauri/src/repositories/crud.rs', naming: 'CrudRepository<T>, FilterBuilder, CacheableRepository', notes: 'Shared CRUD signatures + error handling' },
            { layer: 'Backend Commands', module: 'src-tauri/src/commands/middleware.rs', naming: 'CommandMiddleware, with_auth, with_rbac', notes: 'Auth + RBAC + rate limiting stack' },
            { layer: 'Backend Reports', module: 'src-tauri/src/services/reports/pipeline.rs', naming: 'ReportPipeline, ReportGenerator<T>, ReportFormatter', notes: 'Shared report pipeline stages' },
        ];

        console.log('\n   Layer              │ Module                                    │ Key Exports');
        console.log('   ' + '─'.repeat(18) + '┼' + '─'.repeat(43) + '┼' + '─'.repeat(30));
        for (const b of boundaries) {
            const layer = b.layer.padEnd(18);
            const module = b.module.padEnd(43);
            console.log(`   ${layer}│ ${module}│ ${b.naming}`);
        }
        console.log('');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    findFiles(dir, pattern) {
        const results = [];
        if (!fs.existsSync(dir)) return results;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__tests__') {
                    results.push(...this.findFiles(fullPath, pattern));
                } else if (entry.isFile() && pattern.test(entry.name)) {
                    results.push(fullPath);
                }
            }
        } catch {
            // Skip inaccessible directories
        }

        return results;
    }

    saveReport() {
        const reportDir = path.join(this.projectRoot, 'docs');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalClusters: this.clusters.length,
                highSeverity: this.clusters.filter(c => c.severity === 'HIGH').length,
                mediumSeverity: this.clusters.filter(c => c.severity === 'MEDIUM').length,
                estimatedDuplicateLines: this.clusters.reduce((sum, c) => sum + c.estimatedDuplicateLines, 0),
                extractionCandidates: this.candidates.length,
            },
            clusters: this.clusters,
            extractionCandidates: this.candidates,
            moduleBoundaries: [
                { layer: 'Frontend UI', module: 'frontend/src/components/shared/modals', naming: 'BaseModal, ModalFooter, useModalState', notes: 'Standard dialog + footer + open state handling' },
                { layer: 'Frontend Forms', module: 'frontend/src/lib/forms', naming: 'useFormBuilder, FormSchema, useFormValidation', notes: 'Shared validation + field registration conventions' },
                { layer: 'Frontend Tables', module: 'frontend/src/components/shared/tables', naming: 'DataTable, useSorting, usePagination, ColumnDef', notes: 'Shared rendering + behavior hooks' },
                { layer: 'Backend Validation', module: 'src-tauri/src/services/validation/core.rs', naming: 'Validator<T>, ValidationEngine, CommonValidators', notes: 'Centralizes validation helpers' },
                { layer: 'Backend Repos', module: 'src-tauri/src/repositories/crud.rs', naming: 'CrudRepository<T>, FilterBuilder, CacheableRepository', notes: 'Shared CRUD signatures + error handling' },
                { layer: 'Backend Commands', module: 'src-tauri/src/commands/middleware.rs', naming: 'CommandMiddleware, with_auth, with_rbac', notes: 'Auth + RBAC + rate limiting stack' },
                { layer: 'Backend Reports', module: 'src-tauri/src/services/reports/pipeline.rs', naming: 'ReportPipeline, ReportGenerator<T>, ReportFormatter', notes: 'Shared report pipeline stages' },
            ],
        };

        const jsonPath = path.join(reportDir, 'duplication-report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
        console.log(`📄 JSON report saved to: ${path.relative(this.projectRoot, jsonPath)}`);
    }

    getSeverityIcon(severity) {
        switch (severity) {
            case 'HIGH': return '🔴';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🟢';
            default: return '⚪';
        }
    }
}

// Run detection if called directly
if (require.main === module) {
    const detector = new DuplicationDetector();
    detector.detect().catch(console.error);
}

module.exports = DuplicationDetector;
