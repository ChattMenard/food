// @ts-check
export class IngredientVectors {
  constructor(recipes) {
    this.recipes = recipes;
    this.vocabulary = this.buildVocabulary();
    this.vectors = this.buildVectors();
  }

  buildVocabulary() {
    const vocab = new Set();
    this.recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const terms = this.tokenize(ing);
        terms.forEach((term) => vocab.add(term));
      });
    });
    return Array.from(vocab);
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  buildVectors() {
    const vectors = new Map();

    this.recipes.forEach((recipe) => {
      const vector = new Map();
      recipe.ingredients.forEach((ing) => {
        const terms = this.tokenize(ing);
        terms.forEach((term) => {
          const count = vector.get(term) || 0;
          vector.set(term, count + 1);
        });
      });
      vectors.set(recipe.name, vector);
    });

    return vectors;
  }

  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);

    allTerms.forEach((term) => {
      const v1 = vec1.get(term) || 0;
      const v2 = vec2.get(term) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    });

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  findSimilarRecipes(recipeName, limit = 3) {
    const targetVector = this.vectors.get(recipeName);
    if (!targetVector) return [];

    const similarities = [];
    this.vectors.forEach((vector, name) => {
      if (name === recipeName) return;
      const similarity = this.cosineSimilarity(targetVector, vector);
      if (similarity > 0) {
        similarities.push({ name, similarity });
      }
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit).map((s) => s.name);
  }

  updateRecipes(recipes) {
    this.recipes = recipes;
    this.vocabulary = this.buildVocabulary();
    this.vectors = this.buildVectors();
  }
}
