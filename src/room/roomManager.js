const Singleton = (function () {
  let instance = undefined;

  function createInstance() {
    return new Map();
  }

  function getInstance() {
    if (instance) {
      console.log("instance exist ");
      return instance;
    }

    instance = createInstance();
    return instance;
  }

  return {
    getInstance,
  };
})();

export const roomManager = Singleton.getInstance();
