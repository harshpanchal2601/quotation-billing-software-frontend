import { describe, expect, it } from 'vitest';

const testFilePattern = /(?:^|\/)(?:[^/]+\.)?(?:test|spec)\.[tj]sx?$/;
const testFolderPattern = /(?:^|\/)__tests__\//;
const sourceModules = import.meta.glob<string>('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
});

type SourceImport = {
  file: string;
  specifier: string;
};

describe('frontend architecture boundaries', () => {
  const imports = collectProductionImports();

  it('keeps shared production code independent from app and features', () => {
    const violations = imports.filter(
      ({ file, specifier }) =>
        file.startsWith('shared/') &&
        (specifier === '@app' ||
          specifier.startsWith('@app/') ||
          specifier === '@features' ||
          specifier.startsWith('@features/')),
    );

    expect(formatViolations(violations)).toEqual([]);
  });

  it('keeps feature production code independent from app internals', () => {
    const violations = imports.filter(
      ({ file, specifier }) =>
        file.startsWith('features/') && (specifier === '@app' || specifier.startsWith('@app/')),
    );

    expect(formatViolations(violations)).toEqual([]);
  });

  it('keeps app production imports on public feature entries', () => {
    const violations = imports.filter(
      ({ file, specifier }) =>
        file.startsWith('app/') &&
        specifier.startsWith('@features/') &&
        specifier.split('/').length > 2,
    );

    expect(formatViolations(violations)).toEqual([]);
  });

  it('keeps cross-feature imports on public feature entries', () => {
    const violations = imports.filter(({ file, specifier }) => {
      if (!file.startsWith('features/') || !specifier.startsWith('@features/')) return false;

      const featureName = file.split('/')[1];
      const [, importedFeature, ...rest] = specifier.split('/');

      if (importedFeature === featureName) return true;
      return rest.length > 0;
    });

    expect(formatViolations(violations)).toEqual([]);
  });
});

function collectProductionImports() {
  return Object.entries(sourceModules)
    .filter(([filePath]) => isProductionSourceFile(filePath))
    .flatMap(([filePath, source]) => {
      const relativePath = toSourceRelativePath(filePath);
      return extractImportSpecifiers(stripComments(source)).map((specifier) => ({
        file: relativePath,
        specifier,
      }));
    });
}

function isProductionSourceFile(filePath: string) {
  const relativePath = toSourceRelativePath(filePath);
  return (
    /\.(ts|tsx)$/.test(relativePath) &&
    !relativePath.startsWith('shared/test/') &&
    !testFilePattern.test(relativePath) &&
    !testFolderPattern.test(relativePath)
  );
}

function extractImportSpecifiers(source: string) {
  const specifiers: string[] = [];
  const importPattern = /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const exportPattern = /\bexport\s+(?:type\s+)?[^'"]*?\s+from\s+['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const pattern of [importPattern, exportPattern, dynamicImportPattern]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }

  return specifiers;
}

function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function toSourceRelativePath(filePath: string) {
  return filePath.replace(/^\.\//, '');
}

function formatViolations(violations: SourceImport[]) {
  return violations.map(({ file, specifier }) => `${file} -> ${specifier}`).sort();
}
