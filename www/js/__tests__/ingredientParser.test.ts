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

    it('should handle null input', () => {
      const result = parseIngredients(null as any);
      expect(result).toEqual([]);
    });

    it('should handle undefined input', () => {
      const result = parseIngredients(undefined as any);
      expect(result).toEqual([]);
    });

    it('should trim whitespace', () => {
      const result = parseIngredients('  tomatoes  and  eggs  ');
      expect(result).toContain('tomatoes');
      expect(result).toContain('eggs');
    });

    it('should remove common cooking terms', () => {
      const result = parseIngredients('fresh tomatoes and chopped onions');
      expect(result).toContain('tomatoes');
      expect(result).toContain('onions');
      expect(result).not.toContain('fresh');
      expect(result).not.toContain('chopped');
    });

    it('should handle measurements and units', () => {
      const result = parseIngredients('1 lb ground beef and 2 tbsp olive oil');
      expect(result).toContain('ground beef');
      expect(result).toContain('olive oil');
      expect(result).not.toContain('1');
      expect(result).not.toContain('lb');
      expect(result).not.toContain('2');
      expect(result).not.toContain('tbsp');
    });

    it('should handle fractions', () => {
      const result = parseIngredients('1/2 cup sugar and 3/4 tsp salt');
      expect(result).toContain('sugar');
      expect(result).toContain('salt');
      expect(result).not.toContain('1/2');
      expect(result).not.toContain('3/4');
    });

    it('should handle mixed separators', () => {
      const result = parseIngredients('milk, bread and eggs');
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).toContain('eggs');
    });

    it('should handle parentheses', () => {
      const result = parseIngredients('tomatoes (ripe) and onions (yellow)');
      expect(result).toContain('tomatoes');
      expect(result).toContain('onions');
    });

    it('should handle duplicate ingredients', () => {
      const result = parseIngredients('tomatoes and tomatoes');
      expect(result.filter((item: string) => item === 'tomatoes')).toHaveLength(1);
    });

    it('should handle case insensitivity', () => {
      const result1 = parseIngredients('TOMATOES');
      const result2 = parseIngredients('tomatoes');
      expect(result1).toEqual(result2);
    });

    it('should preserve multi-word ingredients', () => {
      const result = parseIngredients('extra virgin olive oil and heavy cream');
      expect(result).toContain('extra virgin olive oil');
      expect(result).toContain('heavy cream');
    });

    it('should handle numbers in ingredient names', () => {
      const result = parseIngredients('5 spice powder and 8 grain bread');
      expect(result).toContain('5 spice powder');
      expect(result).toContain('8 grain bread');
    });

    it('should remove preparation instructions', () => {
      const result = parseIngredients('tomatoes, diced and onions, sliced');
      expect(result).toContain('tomatoes');
      expect(result).toContain('onions');
      expect(result).not.toContain('diced');
      expect(result).not.toContain('sliced');
    });

    it('should handle apostrophes in ingredients', () => {
      const result = parseIngredients("garlic cloves and chef's knife");
      expect(result).toContain('garlic cloves');
      expect(result).toContain("chef's knife");
    });

    it('should handle hyphenated ingredients', () => {
      const result = parseIngredients('all-purpose flour and self-rising flour');
      expect(result).toContain('all-purpose flour');
      expect(result).toContain('self-rising flour');
    });

    it('should filter out empty results', () => {
      const result = parseIngredients('milk and and bread');
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).not.toContain('');
    });

    it('should handle very long ingredient lists', () => {
      const longList = 'milk, bread, eggs, cheese, tomatoes, onions, garlic, olive oil, salt, pepper, flour, sugar, butter, cream, chicken, beef, pork, fish, rice, pasta, potatoes, carrots, celery, lettuce, spinach, broccoli, cauliflower, corn, peas, beans, lentils, nuts, seeds, herbs, spices, vinegar, soy sauce, mustard, ketchup, mayonnaise, yogurt, cottage cheese, parmesan, mozzarella, cheddar, blue cheese, feta, goat cheese, cream cheese, sour cream, ice cream, chocolate, vanilla, cinnamon, nutmeg, cloves, ginger, turmeric, paprika, cumin, coriander, basil, oregano, thyme, rosemary, sage, dill, parsley, cilantro, mint, bay leaves, allspice, cardamom, cloves, mace, saffron, star anise, sumac, tamarind, pomegranate, figs, dates, raisins, apricots, peaches, plums, cherries, berries, apples, oranges, lemons, limes, grapefruit, bananas, grapes, melons, watermelon, cantaloupe, honeydew, pineapple, mango, papaya, kiwi, avocado, coconut, olives, capers, anchovies, sardines, tuna, salmon, trout, cod, halibut, shrimp, scallops, clams, mussels, oysters, crab, lobster, octopus, squid, eel, frog legs, snails, insects, honey, maple syrup, molasses, brown sugar, powdered sugar, confectioners sugar, granulated sugar, raw sugar, turbinado sugar, muscovado sugar, demerara sugar, coconut sugar, palm sugar, agave nectar, corn syrup, glucose, fructose, lactose, sucrose, maltose, dextrose, galactose, xylose, arabinose, ribose, deoxyribose, glucose, fructose, sucrose, maltose, lactose';
      
      const result = parseIngredients(longList);
      expect(result.length).toBeGreaterThan(50);
      expect(result).toContain('milk');
      expect(result).toContain('bread');
      expect(result).toContain('eggs');
    });
  });
});
