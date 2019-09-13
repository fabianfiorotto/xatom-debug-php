  var EventEmitter, PhpDebugger;

  var net = require('net');
  var path = require('path');

  var xml2js = require('xml2js');

  ({EventEmitter} = require("events"));

  module.exports = PhpDebugger = (function() {
    class PhpDebugger {
      constructor() {
        this.events = new EventEmitter();
        this.transaction = 0;
        this.mapPath = '';
      }

      initialize() {
        this.buffer = "";
        this.transaction = 0;
        this.breakpoints = [];
        this.callbacks = [];
      }

      isConnected() {
        return (this.socket != null) && !this.socket.destroyed;
      }

      // async
      didConnect() {}

      stop() {
        return this.sendCommand("stop");
      }

      disconnect() {
        return new Promise((resolve, reject) => {
          var ref;
          if ((ref = this.socket) != null) {
            ref.destroy();
          }
          return this.server.close(() => {
            this.listening = false;
            return resolve(this.server);
          });
        });
      }

      getFilePathFromUrl() {}

      fileExists() {}

      connect(options) {
        this.mapPath = options.mapPath;
        return new Promise((resolve, reject) => {
          var err;
          try {
            this.server = net.createServer((socket) => {
              if (!this.isConnected()) {
                this.socket = socket;
                this.initialize();
                return this.socket.on('data', (data) => {
                  var done, message, size;
                  this.buffer += String.fromCharCode.apply(null, data);
                  [size, message, done] = this.buffer.split("\0");
                  if (done != null) {
                    this.buffer = "";
                    return xml2js.parseString(message, (err, xml) => {
                      if (err != null) {
                        return console.log(err);
                      } else {
                        return this.dispatchMessage(xml);
                      }
                    });
                  }
                });
              } else {
                return socket.end();
              }
            });
            this.server.on('error', function(e) {
              if (e.code === 'EADDRINUSE') {
                return reject("Address in use");
              } else {
                return reject(e.message);
              }
            });
            return this.server.listen(options.port, () => {
              this.listening = true;
              return resolve(this.server);
            });
          } catch (error1) {
            err = error1;
            return reject(err);
          }
        });
      }

      addParsedScript() {}

      getUrlForMappedSource() {}

      getObjectFromUrl() {}

      getObjectFromString() {}

      getObjectFromFile() {}

      resume() {
        return this.sendCommand("run");
      }

      pause() {
        return this.sendCommand("break");
      }

      stepOver() {
        return this.sendCommand("step_over");
      }

      stepInto() {
        return this.sendCommand("step_into");
      }

      stepOut() {
        return this.sendCommand("step_out");
      }

      getCallStack() {
        return this.sendCommand("stack_get");
      }

      getProperties(obj) {
        return this.sendCommand('property_get', {
          n: obj.fullname,
          d: obj.frame
        });
      }

      evaluateOnFrames(frame) {
        return this.sendCommand("eval", {
          d: frame
        }, expression);
      }

      evaluate(expression) {
        return this.sendCommand("eval", {}, expression);
      }

      getScriptById() {}

      getScriptByUrl() {}

      getFrameByIndex() {}

      setBreakpointFromScript() {}

      addBreakpoint(filePath, lineNumber, condition) {
        filePath = this.mapLocalToServer(filePath);
        this.breakpoints.push({filePath, lineNumber});
        if ((condition != null) && condition !== '') {
          return this.sendCommand("breakpoint_set", {
            t: 'line',
            f: filePath,
            n: lineNumber + 1
          }, condition);
        } else {
          return this.sendCommand("breakpoint_set", {
            t: 'line',
            f: filePath,
            n: lineNumber + 1
          });
        }
      }

      changeBreakpoint(filePath, lineNumber) {
        var breakpoint;
        filePath = this.mapLocalToServer(filePath);
        breakpoint = this.getBreakpoint(filePath, lineNumber);
        return this.sendCommand("breakpoint_update", {
          d: breakpoint.id
        });
      }

      getBreakpointById(id) {
        var b, i, j, len, ref;
        ref = this.breakpoints;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          b = ref[i];
          if (b.id === id) {
            return b;
          }
        }
      }

      getBreakpoint(filePath, lineNumber) {
        var b, i, j, len, ref;
        ref = this.breakpoints;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          b = ref[i];
          if (b.filePath === filePath && b.lineNumber === lineNumber) {
            return b;
          }
        }
      }

      removeBreakpoint(filePath, lineNumber) {
        var breakpoint;
        filePath = this.mapLocalToServer(filePath);
        breakpoint = this.getBreakpoint(filePath, lineNumber);
        return this.sendCommand("breakpoint_remove", {
          d: breakpoint.id
        });
      }

      mapLocalToServer(filePath) {
        if (this.mapPath == '') {
          return filePath;
        }
        else {
          let [projectPath, relativePath] = atom.project.relativizePath(filePath);
          return path.join(this.mapPath, relativePath);
        }
      }

      mapServerToLocal(filePath) {
        if (this.mapPath != '' && filePath.indexOf(this.mapPath) === 0) {
          filePath = filePath.substr(this.mapPath.length);
          let paths = atom.project.getPaths().map((p) => path.join(p, filePath));
          return paths.find((p) => atom.project.contains(p));
        }
        else {
          return filePath;
        }
      }

      getScopeFromFrame(frame) {
        return this.sendCommand("context_get", {
          d: frame
        });
      }

      getScope() {
        return this.sendCommand("context_get");
      }

      // Events
      didClose(cb) {
        return this.events.addListener('didClose', cb);
      }

      didLogMessage(cb) {
        return this.events.addListener('didLogMessage', cb);
      }

      didThrownException(cb) {
        return this.events.addListener('didThrownException', cb);
      }

      didLoadScript(cb) {
        return this.events.addListener('didLoadScript', cb);
      }

      didPause(cb) {
        return this.events.addListener('didPause', cb);
      }

      didResume(cb) {
        return this.events.addListener('didResume', cb);
      }

      didInit(cb) {
        return this.events.addListener('didInit', cb);
      }

      getScript() {}

      //custom
      encode64(data) {
        return new Buffer(data, 'utf8').toString('base64');
      }

      decode64(data) {
        return new Buffer(data, 'base64').toString();
      }

      sendCommand(command, args, data) {
        var k, strargs, strdata, v;
        if (args == null) {
          args = {};
        }
        this.transaction += 1;
        args["i"] = this.transaction;
        strargs = "";
        for (k in args) {
          v = args[k];
          strargs += ` -${k} ${v}`;
        }
        strdata = data != null ? " -- " + this.encode64(data) : '';
        if (this.debug) {
          console.log("send: " + command + strargs + strdata + "\0");
        }
        return new Promise((resolve, reject) => {
          if (this.isConnected()) {
            this.socket.write(command + strargs + strdata + "\0");
            return this.callbacks.push({
              resolve,
              reject,
              transaction: this.transaction,
              args
            });
          } else {
            console.log(this.socket);
            return reject(" Not connected"); //#reject???
          }
        });
      }

      getCallback(transaction, cb) {
        var c, i, j, len, ref, results;
        ref = this.callbacks;
        results = [];
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          c = ref[i];
          if ((c != null) && c.transaction === transaction) {
            this.callbacks.splice(i, 1);
            results.push(cb(c.resolve, c.reject, c.args));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      prepareScope(p, frame) {
        var scope;
        scope = {
          name: p.$.name,
          type: p.$.type,
          value: {
            type: p.$.type,
            description: p.$.name,
            value: p._
          }
        };
        switch (p.$.type) {
          case 'bool':
            scope.value.value = p._ === "1" ? "true" : "false";
            scope.value.type = 'boolean';
            break;
          case 'uninitialized':
            scope.value.value = '(uninitialized)';
            break;
          case 'string':
            scope.value.value = p._ != null ? this.decode64(p._) : '';
            break;
          case 'object':
            scope.className = p.$.classname;
            scope.value = {
              type: "object",
              className: p.$.classname,
              // objectId: p.$.address,
              objectId: 1,
              description: p.$.name,
              fullname: p.$.fullname,
              frame: frame
            };
            break;
          case "array":
            scope.value = {
              type: "object",
              className: 'array',
              // objectId: p.$.address,
              objectId: 1,
              description: p.$.name,
              fullname: p.$.fullname,
              frame: frame
            };
        }
        if (p.property != null) {
          scope.value.children = p.property.map((p1) => {
            return this.prepareScope(p1, frame);
          });
        }
        return scope;
      }

      dispatchCommandResponse(response, args) {
        var breakpoint, frame, scope, stack;
        switch (response.$.command) {
          case 'stack_get':
            stack = response.stack.map((f) => {
              var filename, type;
              [type, filename] = f.$.filename.split('://');
              return {
                filePath: this.mapServerToLocal(filename),
                lineNumber: f.$.lineno - 1,
                name: f.$.where,
                scope: []
              };
            });
            return stack;
          case "context_get":
          case "property_get":
          case "eval":
            frame = args.d != null ? args.d : 0;
            scope = [];
            if (response.property != null) {
              scope = response.property.map((p) => {
                return this.prepareScope(p, frame);
              });
            }
            if (response.$.command == "property_get") {
              scope = scope[0].value.children;
            }
            return scope;
          case "breakpoint_set":
            breakpoint = this.getBreakpoint(args.f, args.n - 1);
            breakpoint.id = response.$.id;
            return breakpoint;
          default:
            return null;
        }
      }

      dispatchMessage(message) {
        var transaction;
        if (this.debug) {
          console.log(message);
        }
        if (message.init != null) {
          this.events.emit('didInit');
        }
        if (message.response != null) {
          transaction = parseInt(message.response.$.transaction_id);
          return this.getCallback(transaction, (resolve, reject, args) => {
            var error, errors, j, len, ref;
            if (message.response.error != null) {
              errors = [];
              ref = message.response.error;
              for (j = 0, len = ref.length; j < len; j++) {
                error = ref[j];
                errors.push(error.message[0]);
              }
              return reject(errors.join("\n"));
            } else if (message.response.$.status === 'break') {
              this.events.emit('didPause');
              return resolve("break");
            } else if (message.response.$.status === 'stopping') {
              this.events.emit('didClose');
              return resolve("stoping");
            } else if (message.response.$.status === 'stopped') {
              this.socket.destroy();
              return resolve("stoped");
            } else {
              return resolve(this.dispatchCommandResponse(message.response, args));
            }
          });
        }
      }

    };

    PhpDebugger.prototype.listening = false;

    PhpDebugger.prototype.buffer = "";

    PhpDebugger.prototype.breakpoints = [];

    // PhpDebugger.prototype.debug = true; //toggle to debug

    return PhpDebugger;

  }).call(this);
