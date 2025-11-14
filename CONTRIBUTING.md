# Contributing to ToonJS

Thank you for considering contributing to ToonJS! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive. We want this project to be welcoming to everyone.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Code sample** (minimal reproducible example)
- **Version** of ToonJS, Node.js, and OS
- **Error messages** and stack traces

Example:

```markdown
## Bug: filter() returns incorrect results

**Version**: ToonJS 1.0.0, Node.js 16.14.0

**Code**:
```typescript
const data = ToonFactory.from(`test[2]{id,value}:\n1,10\n2,20`);
const result = data.filter(r => r.value > 15);
console.log(result.count()); // Expected: 1, Got: 0
```

**Expected**: 1 row  
**Actual**: 0 rows
```

### Suggesting Features

Feature requests are welcome! Please:

1. Check if feature already exists or is planned
2. Describe the **use case** clearly
3. Provide **example code** showing desired API
4. Explain **why** this would be valuable

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** if needed
6. **Ensure tests pass**:
   ```bash
   npm test
   npm run build
   ```
7. **Commit** with clear messages
8. **Push** to your fork
9. **Open a Pull Request**

### Coding Standards

#### TypeScript Style

```typescript
// Use meaningful names
function calculateAverage(values: number[]): number { }

// Prefer const over let
const result = data.filter(r => r.active);

// Use type annotations for parameters and return types
function transform(input: string): Toon {
  // ...
}

// Document public APIs
/**
 * Filters rows based on a predicate function.
 * @param predicate Function that tests each row
 * @returns New Toon instance with filtered rows
 */
filter(predicate: (row: Row) => boolean): Toon {
  // ...
}
```

#### File Organization

```
toon.ts          # Core Toon class
factory.ts       # Factory for creating Toon instances
parser.ts        # TOON format parser
types.ts         # Type definitions
*.test.ts        # Test files
```

#### Testing

- **Coverage**: Maintain 100% test coverage
- **Test names**: Descriptive and specific
- **Arrange-Act-Assert** pattern

```typescript
test('filter() removes rows that do not match predicate', () => {
  // Arrange
  const data = ToonFactory.from(`test[3]{id,val}:\n1,10\n2,20\n3,30`);
  
  // Act
  const result = data.filter(r => r.val > 15);
  
  // Assert
  expect(result.count()).toBe(2);
  expect(result.first()?.val).toBe(20);
});
```

#### Performance Considerations

When adding features:

1. **Profile first**: Measure before optimizing
2. **Pre-allocate**: Use `new Array(length)` when size is known
3. **Avoid unnecessary objects**: Reuse when possible
4. **Single-pass**: Combine operations when feasible
5. **Benchmark**: Compare with manual implementation

Example benchmark:

```typescript
const start = process.hrtime.bigint();
const result = data.myNewMethod();
const end = process.hrtime.bigint();
const duration = Number(end - start) / 1_000_000; // ms
console.log(`Duration: ${duration.toFixed(3)}ms`);
```

### Commit Messages

Follow conventional commits:

```
feat: add percentile() method
fix: correct correlation calculation for negative values
docs: update API examples for rolling()
test: add edge cases for normalize()
perf: optimize rank() for large datasets
refactor: simplify filter() implementation
```

### Documentation

Update documentation for:

- **New methods**: Add to README.md API section
- **Breaking changes**: Note in CHANGELOG.md
- **Performance**: Update PERFORMANCE.md if relevant
- **Examples**: Add usage examples

## Development Setup

```bash
# Clone repository
git clone https://github.com/cesco/toonjs.git
cd toonjs

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Format code
npm run format

# Lint code
npm run lint
```

## Project Structure

```
ToonJS/
├── toon.ts              # Core class (60+ methods)
├── factory.ts           # Factory methods
├── parser.ts            # TOON format parser
├── types.ts             # Type definitions
├── *.test.ts            # Test suites
├── ejemplos-*.ts        # Examples
├── package.json         # NPM metadata
├── tsconfig.json        # TypeScript config
├── jest.config.js       # Jest config
├── README.md            # Main documentation
├── PERFORMANCE.md       # Performance details
├── CONTRIBUTING.md      # This file
└── LICENSE              # MIT license
```

## Testing Guidelines

### Test Categories

1. **Unit Tests** (`*.test.ts`):
   - Test individual methods
   - Mock dependencies if needed
   - Fast execution (<1ms each)

2. **Integration Tests** (`advanced.test.ts`):
   - Test method combinations
   - Real-world scenarios
   - Larger datasets

3. **Performance Tests** (`analisis-empresarial.js`):
   - Benchmark critical operations
   - Compare with manual implementations
   - Track performance regressions

### Test Coverage

Maintain 100% coverage:

```bash
npm test -- --coverage
```

All statements, branches, functions, and lines must be covered.

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite: `npm test`
4. Build: `npm run build`
5. Tag release: `git tag v1.0.1`
6. Push: `git push --tags`
7. Publish: `npm publish`

## Questions?

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Email**: cesco@toonjs.dev (if applicable)

## Recognition

Contributors will be acknowledged in:

- README.md contributors section
- Release notes
- Package metadata

Thank you for contributing to ToonJS! 🎉
