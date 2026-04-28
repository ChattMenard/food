// @ts-check
export class LeftoverTracker {
    constructor({ getPantry, setPantry, persistPantry, announce }) {
        this.getPantry = getPantry;
        this.setPantry = setPantry;
        this.persistPantry = persistPantry;
        this.announce = announce;
    }

    markAsLeftover(index) {
        const pantry = this.getPantry();
        const item = pantry[index];
        
        if (!item) return false;

        if (!item.isLeftover) {
            item.isLeftover = true;
            item.leftoverDate = new Date().toISOString().split('T')[0];
            this.announce(`Marked ${item.name} as leftover`);
        } else {
            item.isLeftover = false;
            delete item.leftoverDate;
            this.announce(`Removed leftover status from ${item.name}`);
        }

        this.persistPantry();
        return true;
    }

    getLeftovers() {
        const pantry = this.getPantry();
        return pantry.filter(item => item.isLeftover);
    }

    suggestLeftoverRecipes(recipes) {
        const leftovers = this.getLeftovers();
        if (leftovers.length === 0) return [];

        const leftoverIngredients = leftovers.map(item => 
            item.name.toLowerCase().replace(/[^a-z]/g, '')
        );

        const suggestions = recipes.filter(recipe => {
            const recipeIngredients = recipe.ingredients.map(ing => 
                ing.toLowerCase().replace(/[^a-z]/g, '')
            );
            
            return recipeIngredients.some(ing => 
                leftoverIngredients.some(leftover => 
                    ing.includes(leftover) || leftover.includes(ing)
                )
            );
        }).slice(0, 5);

        return suggestions;
    }
}
