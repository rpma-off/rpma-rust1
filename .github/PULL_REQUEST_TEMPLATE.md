# Pull Request Template

## Description
<!-- Describe the changes made in this PR -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Style/UI update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] 🧪 Tests (adding or updating tests)
- [ ] 🔒 Security (security-related changes)
- [ ] 🚀 Performance (performance-related changes)
- [ ] 🔄 CI/CD (changes to build process or deployment)

## Checklist
### Code Quality
- [ ] ✅ **Linting**: `npm run frontend:lint` passes
- [ ] ✅ **Type Checking**: `npm run frontend:type-check` passes
- [ ] ✅ **Tests**: All tests pass (`npm run test`)
- [ ] ✅ **Coverage**: Code coverage meets requirements (70%+)
- [ ] ✅ **Security**: Security audit passes (`npm run security:audit`)

### Testing
- [ ] ✅ **Unit Tests**: Added/updated unit tests for new functionality
- [ ] ✅ **Integration Tests**: Added integration tests for API calls
- [ ] ✅ **E2E Tests**: Added e2e tests for critical user flows
- [ ] ✅ **Edge Cases**: Tested error conditions and edge cases

### Performance & Security
- [ ] ✅ **Performance**: No performance regressions (`npm run performance:test`)
- [ ] ✅ **Bundle Size**: Bundle size within acceptable limits
- [ ] ✅ **Security**: No security vulnerabilities introduced
- [ ] ✅ **Dependencies**: No new high-risk dependencies added

### Documentation
- [ ] ✅ **Code Comments**: Complex logic is well-documented
- [ ] ✅ **API Docs**: Public APIs are documented
- [ ] ✅ **README**: Updated if necessary
- [ ] ✅ **Migration Guide**: Added for breaking changes

### Database & Data
- [ ] ✅ **Migrations**: Database migrations are safe and tested
- [ ] ✅ **Data Integrity**: No data loss or corruption risks
- [ ] ✅ **Backwards Compatibility**: Existing data remains accessible

## Testing Instructions
<!-- Provide instructions for testing this change -->

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Additional Notes
<!-- Any additional information reviewers should know -->

## Related Issues
<!-- Link to related issues or PRs -->

---
**By submitting this pull request, I confirm that:**
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published