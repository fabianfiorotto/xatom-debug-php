var PhpDebugger, PhpOptions, PhpPlugin;

PhpDebugger = require('./php-debugger');

({PhpOptions} = require('./php-options'));

module.exports = PhpPlugin = (function() {
  class PhpPlugin {
    constructor() {
      this.options = PhpOptions;
      this.debugger = new PhpDebugger();
      this.addEventListeners();
    }

    addEventListeners() {
      this.debugger.didInit(() => {
        var breaks;
        this.pluginClient.status.update('Connected', 'status-success');
        breaks = this.pluginClient.getBreakpoints();
        this.syncBreakpoints(breaks).then(() => {
          this.debugger.resume();
        }).catch(function(err) {
          this.pluginClient.console.log(err);
        });
      });
      this.debugger.didPause(() => {
        this.pluginClient.pause();
        this.syncStateOnPause().catch((err) => {
          this.pluginClient.console.log(err);
        });
      });
      this.debugger.didClose(() => {
        this.debugger.stop();
        this.pluginClient.stop();
        this.pluginClient.run(); // Client keeps listening.
        this.pluginClient.status.update('Listening', 'status-success');
      });
      this.debugger.didResume(() => {
        this.pluginClient.resume();
      });
    }

    async syncBreakpoints(breaks) { //custom
      for (var i = 0; i < breaks.length; i++) {
        var b = breaks[i];
        await this.debugger.addBreakpoint(b.filePath, b.lineNumber, b.condition)
      }
    }

    async syncFramesScope(frames) { //custom
      for (var i = 0; i < frames.length; i++) {
        frames[i].scope = await this.debugger.getScopeFromFrame(i);
      }
    }

    async syncStateOnPause() {
      var stack = await this.debugger.getCallStack()
      this.pluginClient.activateBreakpoint(stack[0].filePath, stack[0].lineNumber);
      this.pluginClient.setCallStack(stack);
      stack = await this.syncFramesScope(stack);
      var scope = await this.debugger.getScope();
      return await this.pluginClient.setScope(scope);
    }

    register(pluginClient) {
      this.pluginClient = pluginClient;
    }

    enableConsole() {
      return this.isConsoleEnabled = true;
    }

    disableConsole() {
      return this.isConsoleEnabled = false;
    }

    didLaunchError(message) {
      return atom.notifications.addError('XAtom Debug: PHP', {
        detail: "Launcher error: " + message,
        dismissable: true
      });
    }

    normalizePath(dir, verify) {}

    activateFirstFrame() {}

    addBreakpointsForScript(script) {}

    async didAddBreakpoint(filePath, lineNumber, condition) {
      if (this.debugger.isConnected()) {
        return this.debugger.addBreakpoint(filePath, lineNumber, condition);
      }
    }

    async didChangeBreakpoint(filePath, lineNumber, condition) {
      if (this.debugger.isConnected()) {
        // Xdebug doesn't allow to change the condition so I have to remove the breakpoint.
        await this.debugger.removeBreakpoint(filePath, lineNumber);
        await this.debugger.addBreakpoint(filePath, lineNumber, condition);
      }
    }

    async didRemoveBreakpoint(filePath, lineNumber) {
      if (this.debugger.isConnected()) {
        return this.debugger.removeBreakpoint(filePath, lineNumber);
      }
    }

    async didRequestProperties(request, propertyView) {
      if (request.children != null) {
        return await propertyView.insertFromDescription(request.children);
      } else {
        var scope = await this.debugger.getProperties(request);
        return await propertyView.insertFromDescription(scope);
      }
    }

    async didEvaluateExpression(expression, evaluationView) {
      var regexp;
      regexp = /^[a-z_][a-zA-Z0-9_]*$/; //ignore expression if it only contains a constant
      if (this.debugger.isConnected() && expression.search(regexp) === -1) {
        try {
          var result = await this.debugger.evaluate(expression);
          await evaluationView.insertFromResult(result[0].value);
        }
        catch (err) {
          console.log(expression);
          return this.pluginClient.console.log(err);
        }
      }
    }

    async start() {
      try {
        var options = await this.pluginClient.getOptions();
        var client = await this.debugger.connect(options);
        this.pluginClient.status.update('Listening', 'status-success');
        return await this.pluginClient.run();
      }
      catch (err) {
        this.pluginClient.status.update(err, 'status-error');
      }
    }

    async restart() {
      await this.debugger.disconnect()
      await this.debugger.connect();
    }

    async didStepOver() {
      if (this.debugger.isConnected()) {
        await this.debugger.stepOver();
      }
    }

    async didStepInto() {
      if (this.debugger.isConnected()) {
        await this.debugger.stepInto();
      }
    }

    async didStepOut() {
      if (this.debugger.isConnected()) {
        await this.debugger.stepOut();
      }
    }

    async didStop() {
      await this.debugger.disconnect()
      this.pluginClient.status.reset();
      this.pluginClient.stop();
    }

    async didResume() {
      await this.debugger.resume();
    }

    async didPause() {
      await this.debugger.pause();
    }

    async didRun() {
      if (!this.debugger.listening) {
        await this.start();
      }
    }

  };

  PhpPlugin.prototype.name = 'PHP';

  PhpPlugin.prototype.iconPath = 'atom://xatom-debug-php/icons/php.svg';

  PhpPlugin.prototype.isConsoleEnabled = true;

  return PhpPlugin;

}).call(this);
