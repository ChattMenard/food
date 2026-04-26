/**
 * Barcode Scanner Module
 * Handles native camera access for barcode scanning via Capacitor
 */

import { Camera } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

export class BarcodeScannerManager {
  constructor() {
    this.isScanning = false;
    this.scanCallback = null;
  }

  /**
   * Check if barcode scanner is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const result = await BarcodeScanner.isAvailable();
      return result.available;
    } catch (error) {
      console.error('[BarcodeScanner] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Start barcode scanning
   * @param {Function} callback - Callback for scan results
   * @returns {Promise<void>}
   */
  async startScan(callback) {
    if (this.isScanning) {
      console.warn('[BarcodeScanner] Already scanning');
      return;
    }

    try {
      // Check permissions
      const permission = await BarcodeScanner.checkPermission({ force: true });

      if (permission.denied) {
        // Request permission
        const request = await BarcodeScanner.requestPermissions();
        if (!request.camera) {
          throw new Error('Camera permission denied');
        }
      }

      this.isScanning = true;
      this.scanCallback = callback;

      // Hide background
      document.body.classList.add('barcode-scanner-active');

      // Start scanning
      await BarcodeScanner.start();

      // Listen for scan results
      BarcodeScanner.addListener('barcodeScanned', (result) => {
        if (this.scanCallback) {
          this.scanCallback(result);
        }
      });

      console.log('[BarcodeScanner] Scanning started');
    } catch (error) {
      console.error('[BarcodeScanner] Failed to start scan:', error);
      this.stopScan();
      throw error;
    }
  }

  /**
   * Stop barcode scanning
   * @returns {Promise<void>}
   */
  async stopScan() {
    if (!this.isScanning) return;

    try {
      await BarcodeScanner.stop();
      document.body.classList.remove('barcode-scanner-active');
      this.isScanning = false;
      this.scanCallback = null;
      console.log('[BarcodeScanner] Scanning stopped');
    } catch (error) {
      console.error('[BarcodeScanner] Failed to stop scan:', error);
    }
  }

  /**
   * Scan a single barcode (returns immediately)
   * @returns {Promise<string>} Barcode value
   */
  async scanOnce() {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await BarcodeScanner.scan();
        resolve(result.content);
      } catch (error) {
        if (error.message.includes('cancelled')) {
          reject(new Error('Scan cancelled'));
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Parse barcode to identify product
   * @param {string} barcode - Barcode value
   * @returns {Promise<Object>} Product information
   */
  async parseBarcode(barcode) {
    // This would integrate with a product lookup API
    // For now, return placeholder data
    return {
      barcode,
      name: 'Unknown Product',
      category: 'Other',
      nutrition: null,
    };
  }

  /**
   * Add ingredient from barcode scan
   * @param {string} barcode - Scanned barcode
   * @param {Function} onProductFound - Callback when product is identified
   */
  async addIngredientFromBarcode(barcode, onProductFound) {
    try {
      const product = await this.parseBarcode(barcode);
      onProductFound(product);
    } catch (error) {
      console.error('[BarcodeScanner] Failed to parse barcode:', error);
      // Allow manual entry as fallback
      onProductFound({
        barcode,
        name: 'Scanned Item',
        category: 'Other',
        requiresManualEntry: true,
      });
    }
  }

  /**
   * Open camera for photo capture (fallback for devices without barcode scanner)
   * @returns {Promise<string>} Base64 image data
   */
  async capturePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'base64',
        source: 'camera',
      });
      return image.base64String;
    } catch (error) {
      console.error('[BarcodeScanner] Photo capture failed:', error);
      throw error;
    }
  }

  /**
   * Prepare background for scanner overlay
   */
  prepareScannerOverlay() {
    // Create scanner overlay if it doesn't exist
    let overlay = document.getElementById('scanner-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'scanner-overlay';
      overlay.className =
        'fixed inset-0 bg-black z-50 flex items-center justify-center hidden';
      overlay.innerHTML = `
                <div class="text-white text-center">
                    <div class="text-4xl mb-4">📷</div>
                    <div class="text-xl font-semibold mb-2">Scanning...</div>
                    <div class="text-sm text-gray-400">Point camera at barcode</div>
                    <button id="cancel-scan" class="mt-8 px-6 py-2 bg-red-500 rounded-lg">Cancel</button>
                </div>
            `;
      document.body.appendChild(overlay);

      document.getElementById('cancel-scan').addEventListener('click', () => {
        this.stopScan();
      });
    }
  }

  /**
   * Show scanner overlay
   */
  showOverlay() {
    const overlay = document.getElementById('scanner-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  /**
   * Hide scanner overlay
   */
  hideOverlay() {
    const overlay = document.getElementById('scanner-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
}

// Global barcode scanner instance
let globalBarcodeScanner = null;

/**
 * Get or create the global barcode scanner
 * @returns {BarcodeScannerManager}
 */
export function getBarcodeScanner() {
  if (!globalBarcodeScanner) {
    globalBarcodeScanner = new BarcodeScannerManager();
  }
  return globalBarcodeScanner;
}

/**
 * Helper function to scan barcode and add to pantry
 * @param {Function} onAdd - Callback to add item to pantry
 */
export async function scanAndAddToPantry(onAdd) {
  const scanner = getBarcodeScanner();

  try {
    const available = await scanner.isAvailable();

    if (!available) {
      // Fallback to photo capture
      console.log(
        '[BarcodeScanner] Barcode scanner not available, using photo capture'
      );
      await scanner.capturePhoto();
      // Would need OCR integration here
      alert('Photo captured. Manual entry required.');
      return;
    }

    await scanner.startScan((result) => {
      scanner.stopScan();
      scanner.addIngredientFromBarcode(result.content, (product) => {
        onAdd(product);
      });
    });
  } catch (error) {
    console.error('[BarcodeScanner] Scan failed:', error);
    alert('Failed to scan barcode: ' + error.message);
  }
}
