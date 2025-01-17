module.exports = async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error('Erreur dans le middleware cleanup:', error);
        throw error;
    }
}; 