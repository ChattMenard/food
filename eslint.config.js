import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '**/*.min.js'
        ]
    },
    {
        files: ['www/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                indexedDB: 'readonly',
                fetch: 'readonly',
                Notification: 'readonly',
                CustomEvent: 'readonly',
                Event: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                Response: 'readonly',
                DecompressionStream: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                IntersectionObserver: 'readonly',
                MutationObserver: 'readonly',
                crypto: 'readonly',
                FileReader: 'readonly',
                HTMLElement: 'readonly',
                Node: 'readonly',
                performance: 'readonly',
                caches: 'readonly',
                atob: 'readonly',
                btoa: 'readonly',
                Audio: 'readonly',
                structuredClone: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly'
            }
        },
        rules: {
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ],
            'no-console': 'off'
        }
    },
    {
        files: ['www/js/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json'
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                indexedDB: 'readonly',
                fetch: 'readonly',
                Notification: 'readonly',
                CustomEvent: 'readonly',
                Event: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                Response: 'readonly',
                DecompressionStream: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                IntersectionObserver: 'readonly',
                MutationObserver: 'readonly',
                crypto: 'readonly',
                FileReader: 'readonly',
                HTMLElement: 'readonly',
                Node: 'readonly',
                performance: 'readonly',
                caches: 'readonly',
                atob: 'readonly',
                btoa: 'readonly',
                Audio: 'readonly',
                structuredClone: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript
        },
        rules: {
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'always'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ],
            'no-console': 'off'
        }
    }
];
