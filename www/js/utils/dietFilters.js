const DIET_KEYWORDS = {
  meat: [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'bacon',
    'ham',
    'sausage',
    'prosciutto',
    'pepperoni',
    'salami',
    'veal',
    'duck',
    'goose',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'crab',
    'lobster',
    'anchov',
    'sardine',
    'tilapia',
    'cod',
  ],
  dairy: [
    'milk',
    'cheese',
    'butter',
    'cream',
    'yogurt',
    'whey',
    'casein',
    'ghee',
  ],
  eggs: ['egg'],
  gluten: [
    'flour',
    'bread',
    'pasta',
    'noodle',
    'wheat',
    'barley',
    'rye',
    'couscous',
    'tortilla',
    'cracker',
    'biscuit',
    'bagel',
    'pita',
    'crouton',
    'semolina',
    'farina',
    'bulgur',
    'spaghetti',
    'penne',
    'macaroni',
    'lasagna',
    'ramen',
  ],
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  nuts: [
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'pistachio',
    'hazelnut',
    'peanut',
    'macadamia',
  ],
};

const DIET_RESTRICTIONS = {
  vegetarian: [DIET_KEYWORDS.meat],
  vegan: [DIET_KEYWORDS.meat, DIET_KEYWORDS.dairy, DIET_KEYWORDS.eggs],
  'gluten-free': [DIET_KEYWORDS.gluten],
};

export function recipeHasAny(recipe, keywords) {
  return recipe.ingredients.some((ing) =>
    keywords.some((k) => ing.includes(k))
  );
}

export function passesDiet(recipe, diet) {
  const diets = Array.isArray(diet)
    ? diet
    : diet && diet !== 'none'
      ? [diet]
      : [];
  if (diets.length === 0) return true;
  return diets.every((d) => {
    const groups = DIET_RESTRICTIONS[d];
    if (!groups) return true;
    return groups.every((group) => !recipeHasAny(recipe, group));
  });
}

export function passesAllergy(recipe, allergy) {
  if (!allergy || allergy === 'none') return true;
  const kws = DIET_KEYWORDS[allergy];
  if (!kws) return true;
  return !recipeHasAny(recipe, kws);
}

export function getAllergensInRecipe(recipe, selectedAllergies) {
  const found = [];
  if (!selectedAllergies || selectedAllergies.length === 0) return found;
  for (const allergy of selectedAllergies) {
    const kws = DIET_KEYWORDS[allergy];
    if (kws && recipeHasAny(recipe, kws)) {
      found.push(allergy);
    }
  }
  return found;
}

export function passesCuisine(recipe, cuisine) {
  if (!cuisine || cuisine === 'all') return true;
  const text = ((recipe.category || '') + ' ' + recipe.name).toLowerCase();
  return text.includes(cuisine.toLowerCase().replace('-', ' '));
}

export function normalizeCuisine(cuisine) {
  if (!cuisine) return 'other';
  const normalized = cuisine.toLowerCase().trim();
  const cuisineMap = {
    italian: 'italian',
    pizza: 'italian',
    pasta: 'italian',
    mexican: 'mexican',
    taco: 'mexican',
    burrito: 'mexican',
    asian: 'asian',
    chinese: 'asian',
    japanese: 'asian',
    thai: 'asian',
    indian: 'asian',
    american: 'american',
    burger: 'american',
    bbq: 'american',
    mediterranean: 'mediterranean',
    greek: 'mediterranean',
    'middle eastern': 'middle-eastern',
    middleeastern: 'middle-eastern',
  };
  return cuisineMap[normalized] || normalized;
}
