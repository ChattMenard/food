#!/usr/bin/env node

/**
 * Production Build Script
 * Minifies and optimizes the application for production deployment
 */

import esbuild from 'esbuild';
import { minify as terserMinify } from 'terser';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

interface BuildConfig {
  entryPoints: string[];
  outdir: string;
  bundle: boolean;
  minify: boolean;
  sourcemap: boolean;
  target: string;
  format: string;
  metafile: boolean;
  external: string[];
  define: Record<string, string>;
  plugins: any[];
}

interface Metafile {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

const config: BuildConfig = {
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
  [
    // Custom plugin for CSS processing
    {
      name: 'css-plugin',
      setup(build: any) {
        build.onResolve({ filter: /\.css$/ }, (args: any) => ({
          path: args.path,
          namespace: 'css'
        }));
        
        build.onLoad({ filter: /\.css$/, namespace: 'css' }, (args: any) => {
          const css = readFileSync(args.path, 'utf8');
          return {
            contents: css,
            loader: 'css'
          };
        });
      }
    },
    
    // Plugin for image optimization
    {
      name: 'image-plugin',
      setup(build: any) {
        build.onResolve({ filter: /\.(png|jpg|jpeg|gif|svg|webp)$/ }, (args: any) => ({
          path: args.path,
          namespace: 'image'
        }));
        
        build.onLoad({ filter: /\.(png|jpg|jpeg|gif|svg|webp)$/, namespace: 'image' }, (args: any) => {
          const imageBuffer = readFileSync(args.path);
          return {
            contents: imageBuffer,
            loader: 'binary'
          };
        });
      }
    }
  ]
};

/**
 * Main build function
 */
async function build(): Promise<void> {
  try {
    console.log('🚀 Starting production build...');
    
    // Clean output directory
    await cleanOutputDirectory();
    
    // Build with esbuild
    const result = await esbuild.build(config);
    
    // Process metafile for analysis
    if (result.metafile) {
      await analyzeMetafile(result.metafile);
    }
    
    // Additional optimizations
    await performAdditionalOptimizations();
    
    // Copy static assets
    await copyStaticAssets();
    
    // Generate build report
    await generateBuildReport(result.metafile);
    
    console.log('✅ Production build completed successfully!');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Clean the output directory
 */
async function cleanOutputDirectory(): Promise<void> {
  if (existsSync(config.outdir)) {
    const files = readdirSync(config.outdir);
    for (const file of files) {
      const filePath = join(config.outdir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        // Recursively remove directories
        await removeDirectory(filePath);
      } else {
        // Remove files
        // Note: In a real implementation, you'd use fs.promises.rm
        console.log(`Removing file: ${filePath}`);
      }
    }
  } else {
    mkdirSync(config.outdir, { recursive: true });
  }
}

/**
 * Remove directory recursively
 */
async function removeDirectory(dirPath: string): Promise<void> {
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath);
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        await removeDirectory(filePath);
      } else {
        // Remove file
        console.log(`Removing file: ${filePath}`);
      }
    }
    // Remove directory
    console.log(`Removing directory: ${dirPath}`);
  }
}

/**
 * Analyze build metafile
 */
async function analyzeMetafile(metafile: Metafile): Promise<void> {
  console.log('\n📊 Build Analysis:');
  
  const inputs = Object.keys(metafile.inputs);
  const outputs = Object.keys(metafile.outputs);
  
  console.log(`📁 Input files: ${inputs.length}`);
  console.log(`📦 Output files: ${outputs.length}`);
  
  // Calculate total bundle size
  let totalSize = 0;
  for (const output of outputs) {
    const outputInfo = metafile.outputs[output];
    if (outputInfo.bytes) {
      totalSize += outputInfo.bytes;
    }
  }
  
  console.log(`📏 Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Find largest files
  const sortedOutputs = outputs
    .map(output => ({
      path: output,
      size: metafile.outputs[output].bytes || 0
    }))
    .sort((a, b) => b.size - a.size);
  
  console.log('\n📈 Largest files:');
  sortedOutputs.slice(0, 5).forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}: ${(file.size / 1024).toFixed(2)} KB`);
  });
}

/**
 * Perform additional optimizations
 */
async function performAdditionalOptimizations(): Promise<void> {
  console.log('\n🔧 Performing additional optimizations...');
  
  // Minify JavaScript files with Terser
  const jsFiles = readdirSync(config.outdir).filter(file => file.endsWith('.js'));
  
  for (const file of jsFiles) {
    const filePath = join(config.outdir, file);
    const content = readFileSync(filePath, 'utf8');
    
    try {
      const result = await terserMinify(content, {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        },
        mangle: true,
        format: {
          comments: false
        }
      });
      
      if (result.code) {
        writeFileSync(filePath, result.code);
        console.log(`✅ Minimized: ${file}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to minify ${file}:`, error);
    }
  }
}

/**
 * Copy static assets
 */
async function copyStaticAssets(): Promise<void> {
  console.log('\n📋 Copying static assets...');
  
  const staticAssets = [
    'www/index.html',
    'www/manifest.json',
    'www/logo.png',
    'www/css/output.css'
  ];
  
  for (const asset of staticAssets) {
    if (existsSync(asset)) {
      const destPath = join(config.outdir, asset.replace('www/', ''));
      const destDir = dirname(destPath);
      
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      
      copyFileSync(asset, destPath);
      console.log(`✅ Copied: ${asset}`);
    } else {
      console.log(`⚠️  Asset not found: ${asset}`);
    }
  }
}

/**
 * Generate build report
 */
async function generateBuildReport(metafile?: Metafile): Promise<void> {
  console.log('\n📄 Generating build report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      entryPoints: config.entryPoints,
      outdir: config.outdir,
      bundle: config.bundle,
      minify: config.minify,
      target: config.target
    },
    metafile: metafile || {},
    summary: {
      totalInputs: metafile ? Object.keys(metafile.inputs).length : 0,
      totalOutputs: metafile ? Object.keys(metafile.outputs).length : 0
    }
  };
  
  const reportPath = join(config.outdir, 'build-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Build report saved to: ${reportPath}`);
}

/**
 * Watch mode for development
 */
async function watch(): Promise<void> {
  console.log('👀 Starting watch mode...');
  
  const watchConfig = {
    ...config,
    watch: {
      onRebuild(error: any, result: any) {
        if (error) {
          console.error('❌ Watch build failed:', error);
        } else {
          console.log('🔄 Watch build completed');
          if (result.metafile) {
            analyzeMetafile(result.metafile);
          }
        }
      }
    }
  };
  
  const context = await esbuild.context(watchConfig);
  await context.watch();
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--watch')) {
    await watch();
  } else if (args.includes('--analyze')) {
    // Build and analyze only
    const result = await esbuild.build(config);
    if (result.metafile) {
      await analyzeMetafile(result.metafile);
    }
  } else {
    await build();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { build, watch, analyzeMetafile };
export default build;
