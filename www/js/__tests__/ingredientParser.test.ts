// @ts-check
// Test for the ingredient parser utility
import { parseIngredients } from '../utils/ingredientParser';

describe('Ingredient Parser', () => {
  describe('parseIngredients', () => {
    it('should parse simple ingredients', () => {
      const result = parseIngredients('tomatoes and eggs');
      expect(result).toContain('tomatoes');
      expect(result).toContain('eggs');
    });

    it('should remove quantity prefixes', () => {
      const result = parseIngredients('2 cups of flour');
      expect(result).toContain('flour');
      expect(result).not.toContain('2');
      expect(result).not.toContain('cups');
    });

    it('should handle "a" and "an" articles', () => {
      const result = parseIngredients('a dozen eggs and an onion');
      expect(result).toContain('dozen eggs');
      expect(result).toContain('onion');
    });

    it('should split by "and"', () => {
      const result = parseIngredients('milk and bread and eggs');
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).toContain('eggs');
    });

    it('should split by comma', () => {
      const result = parseIngredients('milk, bread, eggs');
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).toContain('eggs');
    });

    it('should handle complex phrases with multiple words', () => {
      const result = parseIngredients('olive oil');
      expect(result).toContain('olive oil');
    });

    it('should filter single-character words', () => {
      const result = parseIngredients('a b c tomatoes');
      expect(result).toContain('b c tomatoes');
    });

    it('should handle empty input', () => {
      const result = parseIngredients('');
      expect(result).toEqual([]);
    });

    it('should handle unit measurements', () => {
      const result = parseIngredients('2 tablespoons of olive oil');
      expect(result).toContain('olive oil');
    });

    it('should handle weight measurements', () => {
      const result = parseIngredients('1 pound of ground beef');
      expect(result).toContain('ground beef');
    });

    it('should handle "some" quantity', () => {
      const result = parseIngredients('some tomatoes');
      expect(result).toContain('tomatoes');
    });

    it('should handle "couple of" quantity', () => {
      const result = parseIngredients('couple of eggs');
      expect(result).toContain('eggs');
    });

    it('should handle "few" quantity', () => {
      const result = parseIngredients('few basil leaves');
      expect(result).toContain('basil leaves');
    });

    it('should handle size modifiers', () => {
      const result = parseIngredients('large eggs');
      expect(result).toContain('eggs');
    });

    it('should handle fractional quantities', () => {
      const result = parseIngredients('1/2 cup of milk');
      expect(result).toContain('milk');
    });

    it('should handle decimal quantities', () => {
      const result = parseIngredients('2.5 pounds of chicken');
      expect(result).toContain('chicken');
    });
  });
});
