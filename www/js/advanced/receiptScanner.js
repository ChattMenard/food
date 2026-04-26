/**
 * Receipt Scanner Module
 * Handles photo receipt scanning with OCR to extract ingredients
 */

import { Camera } from '@capacitor/camera';

export class ReceiptScanner {
  constructor() {
    this.ocrEngine = null;
  }

  /**
   * Initialize OCR engine
   */
  async init() {
    // In production, initialize Tesseract.js or similar OCR library
    console.log('[ReceiptScanner] Initialized');
  }

  /**
   * Capture photo of receipt
   * @returns {Promise<string>} Base64 image data
   */
  async captureReceipt() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'base64',
        source: 'camera',
      });
      return image.base64String;
    } catch (error) {
      console.error('[ReceiptScanner] Photo capture failed:', error);
      throw error;
    }
  }

  /**
   * Process receipt image with OCR
   * @param {string} imageData - Base64 image data
   * @returns {Promise<Array>} Extracted text/ingredients
   */
  async processReceipt(_imageData) {
    // Placeholder OCR implementation
    // In production, use Tesseract.js or similar
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulated OCR results
        const mockIngredients = [
          { name: 'Tomatoes', quantity: 5, confidence: 0.95 },
          { name: 'Chicken Breast', quantity: 2, confidence: 0.92 },
          { name: 'Onions', quantity: 3, confidence: 0.88 },
          { name: 'Garlic', quantity: 1, confidence: 0.85 },
        ];
        resolve(mockIngredients);
      }, 1500);
    });
  }

  /**
   * Extract ingredients from OCR text
   * @param {string} text - OCR text
   * @returns {Array} Parsed ingredients
   */
  extractIngredients(text) {
    const ingredients = [];
    const lines = text.split('\n');

    lines.forEach((line) => {
      // Simple pattern matching for ingredients
      const match = line.match(/(\d+)\s*(x|lb|kg|g|oz)?\s*(.+)/i);
      if (match) {
        ingredients.push({
          name: match[3].trim(),
          quantity: parseInt(match[1]),
          unit: match[2] || 'piece',
          confidence: 0.8,
        });
      }
    });

    return ingredients;
  }

  /**
   * Scan receipt and return ingredients
   * @returns {Promise<Array>} Extracted ingredients
   */
  async scanReceipt() {
    try {
      const imageData = await this.captureReceipt();
      const ingredients = await this.processReceipt(imageData);
      return ingredients;
    } catch (error) {
      console.error('[ReceiptScanner] Scan failed:', error);
      throw error;
    }
  }

  /**
   * Confirm and add ingredients to pantry
   * @param {Array} ingredients - Extracted ingredients
   * @param {Function} onConfirm - Confirmation callback
   */
  async confirmAndAdd(ingredients, onConfirm) {
    // Show confirmation dialog with detected ingredients
    const confirmed = confirm(
      `Found ${ingredients.length} ingredients. Add to pantry?`
    );

    if (confirmed) {
      onConfirm(ingredients);
    }
  }
}

// Global receipt scanner instance
let globalReceiptScanner = null;

/**
 * Get or create the global receipt scanner
 * @returns {ReceiptScanner}
 */
export function getReceiptScanner() {
  if (!globalReceiptScanner) {
    globalReceiptScanner = new ReceiptScanner();
  }
  return globalReceiptScanner;
}
