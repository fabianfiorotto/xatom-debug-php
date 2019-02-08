var CompositeDisposable, XatomDebugPhp;

({CompositeDisposable} = require('atom'));

var PhpPlugin = require('./plugin/php-plugin');

module.exports = XatomDebugPhp = {
  subscriptions: null,
  didLaunchError: function(message) {
    console.log(message);
  },
  registerPlugin: function(pluginManager) {
    this.pluginManager = pluginManager;
    this.plugin = new PhpPlugin();
    return this.pluginManager.addPlugin(this.plugin);
  },
  activate: function(state) {

  },
  deactivate: function() {
    if (this.plugin) {
        this.plugin.didStop();
    }
    if (this.pluginManager) {
        this.pluginManager.removePlugin(this.plugin);
    }
  },
  serialize: function() {

  }
};
