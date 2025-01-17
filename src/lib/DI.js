const fnArgs = require("../utils/getFunctionArgs");

/**
 * DI Container Factory
 * @returns {object} Dependency injection container
 */
module.exports = () => {
  const dependencies = new Map();
  const factories = new Map();
  const diContainer = {};

  /**
   * Register dependency
   * @param {string} name - Dependency name
   * @param {*} dependency - Dependency value
   */
  diContainer.register = (name, dependency) => {
    dependencies.set(name, dependency);
  };

  /**
   * Register factory
   * @param {string} name - Factory name
   * @param {Function} factory - Factory function
   */
  diContainer.factory = (name, factory) => {
    factories.set(name, factory);
  };

  /**
   * Inject dependencies into factory
   * @param {Function} factory - Factory function
   * @returns {*} Factory result
   */
  diContainer.inject = (factory) => {
    const args = fnArgs(factory).map((dependency) => {
      const dep = diContainer.get(dependency);
      if (!dep) {
        throw new Error(`Missing dependency: ${dependency} for factory`);
      }
      return dep;
    });
    return factory.apply(null, args);
  };

  /**
   * Get dependency by name
   * @param {string} name - Dependency name
   * @returns {*} Resolved dependency
   */
  diContainer.get = (name) => {
    if (!dependencies.has(name)) {
      const factory = factories.get(name);
      if (!factory) {
        throw new Error(`No dependency or factory registered for: ${name}`);
      }
      try {
        const resolved = diContainer.inject(factory);
        if (!resolved) {
          throw new Error(`Factory ${name} returned null/undefined`);
        }
        dependencies.set(name, resolved);
      } catch (error) {
        throw new Error(`Failed to instantiate ${name}: ${error.message}`);
      }
    }
    return dependencies.get(name);
  };

  return diContainer;
};
