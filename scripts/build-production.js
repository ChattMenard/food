#!/usr/bin/env node

/**
 * Production Build Script
 * Minifies and optimizes the application for production deployment
 */

import esbuild from 'esbuild';
import { minify as terserMinify } from 'terser';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const config = {
  // Entry points for the application
  entryPoints: [
    'www/js/app.js',
    'www/js/data/dataManager.ts',
    'www/js/core/appState.ts'
  ],
  
  // Output directory
  outdir: 'www/dist',
  
  // Bundling options
  bundle: true,
  minify: true,
  sourcemap: false,
  target: 'es2020',
  format: 'esm',
  metafile: true, // Enable metafile for analysis
  
  // External dependencies (don't bundle these)
  external: [
    'dompurify',
    '@capacitor/core',
    '@capacitor/android',
    '@capacitor/ios'
  ],
  
  // Define production environment
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"'
  },
  
  // Plugins for additional processing
  plugins: [
    // Custom plugin for CSS processing
    {
      name: 'css-plugin',
      setup(build) {
        build.onResolve({ filter: /\.css$/ }, (args) => ({
          path: args.path,
          namespace: 'css'
        }));
        
        build.onLoad({ filter: /\.css$/, namespace: 'css' }, (args) => {
          const css = readFileSync(args.path, 'utf8');
          return {
            contents: `export default \`${css}\`;`,
            loader: 'js'
          };
        });
      }
    }
  ]
};

async function buildProduction() {
  console.log('🚀 Starting production build...');
  
  try {
    // Ensure output directory exists
    if (!existsSync(config.outdir)) {
      mkdirSync(config.outdir, { recursive: true });
    }
    
    // Build with esbuild
    console.log('📦 Bundling JavaScript...');
    const result = await esbuild.build(config);
    
    if (result.errors.length > 0) {
      console.error('❌ Build errors:', result.errors);
      process.exit(1);
    }
    
    // Additional minification with Terser for better compression
    console.log('🗜️  Optimizing with Terser...');
    const metafile = result.metafile;
    if (!metafile || !metafile.outputs) {
      console.log('⚠️  No metafile outputs available, skipping Terser optimization');
    } else {
      for (const file of Object.keys(metafile.outputs)) {
        if (file.endsWith('.js')) {
          const code = readFileSync(file, 'utf8');
          const minified = await terserMinify(code, {
            compress: {
              drop_console: true, // Remove console statements
              drop_debugger: true, // Remove debugger statements
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              dead_code: true, // Remove dead code
              passes: 2 // Multiple passes for better optimization
            },
            mangle: {
              toplevel: true, // Mangle top-level names
              properties: {
                regex: /^_/, // Mangle private properties
              }
            },
            format: {
              comments: false,
              preamble: '/* Minified with Terser */'
            }
          });
          
          if (minified.code) {
            const originalSize = Buffer.byteLength(code, 'utf8');
            const minifiedSize = Buffer.byteLength(minified.code, 'utf8');
            const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);
            console.log(`📦 ${file}: ${originalSize} → ${minifiedSize} bytes (${savings}% reduction)`);
            writeFileSync(file, minified.code);
          }
        }
      }
    }
    // Generate build info
    generateBuildInfo(result.metafile);
    
    console.log('✅ Production build completed successfully!');
    console.log(`📊 Build output: ${config.outdir}`);
    console.log(`📦 Bundle size: ${getBundleSize(config.outdir)}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function copyStaticAssets() {
  const staticFiles = [
    'www/index.html',
    'www/css/output.css',
    'www/data/recipes_enhanced.json',
    'www/images'
  ];
  
  for (const file of staticFiles) {
    const source = file;
    const dest = join(config.outdir, file.replace('www/', ''));
    
    if (existsSync(source)) {
      const stats = statSync(source);
      if (stats.isDirectory()) {
        // Copy directory recursively
        copyDirectory(source, dest);
      } else {
        // Copy file
        const dir = dirname(dest);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        copyFileSync(source, dest);
      }
    }
  }
}

function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function generateBuildInfo(metafile) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const buildInfo = {
    timestamp: new Date().toISOString(),
    version: packageJson.version,
    bundles: metafile && metafile.outputs ? 
      Object.keys(metafile.outputs).map(file => ({
        file,
        size: metafile.outputs[file].bytes,
        inputs: Object.keys(metafile.outputs[file].inputs || {})
      })) : []
  };
  
  writeFileSync(
    join(config.outdir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );
}

function getBundleSize(outdir) {
  if (!existsSync(outdir)) {
    return '0 KB';
  }
  
  const files = readdirSync(outdir);
  const totalSize = files
    .filter(file => file.endsWith('.js'))
    .reduce((total, file) => {
      const fileSize = statSync(join(outdir, file)).size;
      return total + fileSize;
    }, 0);
  
  return `${(totalSize / 1024).toFixed(2)} KB`;
}

// Run the build
buildProduction().catch(console.error);
