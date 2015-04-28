;!function (global, angular) {

global.ani = function (name, definition) {
	var obj = {};
	obj[name] = function (nsInjector) {
		// This is not a watertight condition, because when using
		// `$injector.invoke` directly one could pass in an empty object as its
		// `self` argument and we would be drawing incorrect conclusions. But we
		// consider that an edge case because there is no obvious motive to do
		// so and usually `$injector` will not be used directly but rather
		// indirectly through `$provide` or similar, and those will never pass
		// an empty object as `self`.
		if (this && typeof this === 'object' && Object.keys(this).length === 0)
			return nsInjector.instantiate(name, definition);

		return nsInjector.invoke(name, definition, this);
	};
	obj[name].$inject = ['nsInjector'];
	return obj;
};

angular.module('ani', []).factory('nsInjector', ['$injector', '$parse', function ($injector, $parse) {

	function wrapNamespaced (path, namespaced) {
		var base = path.split('.').slice(0, -1);

		// Normalize annotation style.
		if (!angular.isFunction(namespaced)) {
			var inject = namespaced.slice(0, -1);
			namespaced = namespaced[namespaced.length - 1];
			namespaced.$inject = inject;
		}
		// TODO: Support implicit annotations?
		namespaced.$inject = namespaced.$inject || [];

		// Wrap namespaced definition to adapt it to `$injector`.
		function regular () {
			var injectables = [].slice.call(arguments);

			// Invoke namespaced definition with bundled injectables.
			return namespaced.call(this, regular.$inject.reduce(function (bundle, dep, i) {
				var injectable = injectables[i];

				bundle[dep] = injectable;

				dep = dep.split('.');
				if (base.length > 0 && angular.equals(dep.slice(0, base.length), base)) {
					var relativePath = dep.slice(base.length).join('.');
					// Enable `bundle['.nested.service']`
					bundle['.' + relativePath] = injectable;
					// Enable `bundle.nested.service`
					$parse(relativePath).assign(bundle, injectable);
				}

				return bundle;
			}, {}));
		}

		// Normalize dependencies.
		regular.$inject = namespaced.$inject.reduce(function (normalized, dep) {
			if (dep.charAt(0) === '.')
				dep = base.join('.') + dep;
			normalized.push(dep);
			return normalized;
		}, []);

		return regular;
	}

	return {
		invoke: function (path, namespacedFn, self, locals) {
			return $injector.invoke(
				wrapNamespaced(path, namespacedFn),
				self, locals
			);
		},
		instantiate: function (path, namespacedType, locals) {
			return $injector.instantiate(
				wrapNamespaced(path, namespacedType),
				self, locals
			);
		}
	};

}]);

}(window, window.angular);
;!function (global, angular, ani) {

angular.module('atc', ['ani']);

var CHILD_SEPARATOR = '.';

function makeName (ctrlName, fieldName) {
	return [ctrlName, fieldName].join(CHILD_SEPARATOR);
}

function unnestKeys (obj, path) {
	path = path || [];
	var flat = {};
	angular.forEach(obj, function (value, key) {
		var thisPath = path.concat([key]);
		if (angular.isArray(value) || angular.isFunction(value))
			flat[thisPath.join(CHILD_SEPARATOR)] = value;
		else
			angular.extend(flat, unnestKeys(value, thisPath));
	});
	return flat;
}

global.atc = function (ctrlName, fieldDefs, onInstantiate) {
	// TODO: Support multiple `fieldDefs` arguments.
	fieldDefs = unnestKeys(fieldDefs);

	return ['$provide', '$controllerProvider', function ($provide, $controllerProvider) {

		// Register each of the controller fields as a service.
		angular.forEach(fieldDefs, function (fieldDef, fieldName) {

			// Normalize annotations.
			if (angular.isArray(fieldDef)) {
				var inject = fieldDef.slice(0, -1);
				fieldDef = fieldDef[fieldDef.length - 1];
				fieldDef.$inject = inject;
			}
			// TODO: Deal with implicit annotations (argument names)?
			fieldDef.$inject = fieldDef.$inject || [];

			// Register service for this field.
			$provide.factory(ani(
				makeName(ctrlName, fieldName),
				fieldDef.$inject.concat([function (deps) {
					return new atc.Field(fieldName, fieldDef, deps);
				}])
			));

		});

		// The controller's constructor.
		function ctor ($scope) {
			var fields = [].slice.call(arguments, 1);

			// Create instances of all fields in the context of this controller
			// instance, effectively starts running this controller's behavior.
			angular.forEach(fields, function (field) {
				field.instance($scope);
			});

			if (angular.isFunction(onInstantiate))
				onInstantiate($scope, fields);
		}

		// TODO: Use `ani()` here as soon as it supports "child operator".
		ctor.$inject = ['$scope'].concat(Object.keys(fieldDefs).map(function (fieldName) {
			return makeName(ctrlName, fieldName);
		}));

		$controllerProvider.register(ctrlName, ctor);

	}];

};

global.atc.Field = function Field (name, fieldDef, deps) {

	var instances = {};
	this.instance = function (scope) {
		var key = scope ? scope.$id : null;

		if (!(key in instances)) {
			var context = {
				name: this.name
			};
			// TODO: `context.scope` would probably be a better name, as I am
			// not sure whether our concept requires it to be an AngularJS
			// scope.
			if (scope)
				context.$scope = scope;
			instances[key] = fieldDef.call(context, deps);
		}

		return instances[key];
	};

	Object.defineProperties(this, {

		name: {
			enumerable: true,
			value: name
		}

	});

};

}(window, window.angular, window.ani);
;!function (global) {

global.bang = {};

}(window);

;!function (bang, angular, Bacon) {

var svc = {};

/**
 * @ngdoc module
 * @name bang
 * @description
 * The main module.
 *
 * It depends on {@link https://github.com/nouncy/angular-testable-controller}.
 */
angular.module('bang', ['atc']).

/**
 * @ngdoc service
 * @name Bacon
 * @module bang
 * @description
 * Exposes {@link https://baconjs.github.io/ Bacon.js} as an AngularJS service.
 */
value('Bacon', Bacon).

run(['$rootScope', '$parse', '$location', function ($rootScope, $parse, $location) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang#createScopeStream
	 * @description
	 * Creates a stream that automatically ends when provided scope is
	 * destroyed.
	 *
	 * ```js
	 * angular.module('myModule').controller(['$scope', function ($scope) {
	 * 	 
	 *   var stream = $scope.createStream(function (next, end) {
	 *     next(1);
	 *     setTimeout(function () {
	 *       next(2);
	 *       end();
	 *     }, 2000);
	 *   });
	 *   
	 * }]);
	 * ```
	 * @param {$rootScope.Scope} scope Context in which stream should operate.
	 * @param {function(Function, Function)} subscribe Stream binder function
	 *   that describes its incoming events. Its first argument is a function
	 *   that can be called to issue a next event with given value. Its second
	 *   argument is a function that can be called to end the stream.
	 * @returns {Bacon.EventStream} The created event stream.
	 */
	svc.createScopeStream = function (scope, subscribe) {
		return Bacon.fromBinder(function (sink) {
			function sinkEvent (e) {
				if (sink(e) === Bacon.noMore)
					unsubscribe();
			}

			var dispose = [];

			dispose.push(subscribe.call(scope, function (value) {
				sinkEvent(new Bacon.Next(value));
			}, function () {
				sinkEvent(new Bacon.End());
			}));

			dispose.push(scope.$on('$destroy', function () {
				sinkEvent(new Bacon.End());
			}));
			
			function unsubscribe () {
				dispose.forEach(function (fn) {
					if (angular.isFunction(fn)) fn();
				});
			};

			return unsubscribe;
		});
	};

	svc.createScopeProperty = function (scope, getValue, subscribe) {
		var initial;
		function getInitialValue () {
			return initial;
		}

		return svc.createScopeStream(scope, function (next, end) {
			// As soon as this observable loses its laziness, the first thing we
			// should do is generate an initial value, or else we end up using
			// the value that results from the second call to `getValue` as
			// initial value.
			initial = getValue.call(this);

			var sinkNext = function (value) {
				if (arguments.length === 0)
					value = getValue.call(this);
				next(value);
			}.bind(this);

			return subscribe.call(this, sinkNext, function () {
				// Make sure no value argument is passed along to make it act as
				// an invalidate.
				sinkNext();
			}, end);
		}).toProperty(getInitialValue).map(function (value) {
			return value === getInitialValue ? getInitialValue() : value;
		});
	};

	svc.watchAsProperty = function (scope, expression) {
		return svc.createScopeProperty(scope, function () {

			return $parse(expression)(this);

		}, function (next) {

			return this.$watch(expression, next);

		}).skipDuplicates();
	};

	var sendToStreams = {};
	svc.functionAsStream = function (scope, name) {
		sendToStreams[name] = sendToStreams[name] || [];

		scope[name] = scope[name] || function () {
			var args = [].slice.call(arguments);
			sendToStreams[name].forEach(function (send) {
				send(args);
			});
		};

		return svc.createScopeStream(scope, function (next) {

			sendToStreams[name].push(next);

			return function () {
				sendToStreams[name].splice(sendToStreams[name].indexOf(next), 1);
				if (sendToStreams[name].length === 0)
					delete sendToStreams[name];
			};
		});
	};

	svc.digestObservable = function (scope, expression, observable) {
		var assign = $parse(expression).assign;

		return observable.doAction(function (value) {
			scope.$evalAsync(function () {
				assign(scope, value);
			});
		});
	};

	svc.locationAsProperty = function (getValue) {
		return svc.createScopeProperty($rootScope, function () {
			return getValue.call($location);
		}, function (next, invalidate) {
			return this.$on('$locationChangeSuccess', invalidate);
		});
	};

	return svc;

}]).

/**
 * @ngdoc service
 * @name bang
 * @module bang
 * @requires $rootScope
 * @requires $parse
 * @requires $location
 * @description
 * Exposes AngularJS-level helper functions.
 *
 * ```js
 * angular.module('myModule', ['bang']).factory('myCtrl', ['bang', function (bang) {
 * 
 *   // Enjoy your `bang`.
 *     
 * }]);
 * ```
 */
value('bang', svc).

config(['$provide', function ($provide) {

	$provide.decorator('$rootScope', ['$delegate', function ($delegate) {

		var decorate = {};

		angular.forEach({
			createStream: 'createScopeStream',
			createProperty: 'createScopeProperty',
			watchAsProperty: 'watchAsProperty',
			functionAsStream: 'functionAsStream',
			digestObservable: 'digestObservable'
		}, function (from, to) {

			decorate[to] = function () {
				return svc[from].apply(svc, [this].concat([].slice.call(arguments)));
			};
			
		});

		angular.extend(Object.getPrototypeOf($delegate), decorate);

		return $delegate;

	}]);

	$provide.decorator('$location', ['$delegate', function ($delegate) {

		angular.extend(Object.getPrototypeOf($delegate), {
			toProperty: function () {
				return svc.locationAsProperty.apply(svc, arguments);
			}
		});

		return $delegate;

	}]);

}]);

}(window.bang, window.angular, window.Bacon);
;!function (bang, angular, atc, Bacon) {

bang.controller = function (ctrlName, fieldDefs) {
	return atc(ctrlName, fieldDefs, function (scope, fields) {

		angular.forEach(fields, function (field) {
			// TODO: Listen for errors and log those when in debug mode.
			// OR: read section Errors on Bacon site to understand exactly
			// what is swallowed and when, as we may also want a try catch
			// block here and there. For example, the fact that `.doAction`
			// swallows exceptions is truly messed up.
			var value = field.instance(scope);
			if (value instanceof Bacon.Observable)
				value.subscribe(function (v) {
					// console.log(field.name, v);
				});
		});

	});
};

}(window.bang, window.angular, window.atc, window.Bacon);
;!function (bang, angular, atc, Bacon) {

var injector = angular.injector();

bang.property = function (fn) {
	var init = function (context, value) {
		return (angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this, value);
	};
	init.$inject = injector.annotate(fn);

	return bang.property.chain(init);
};

bang.property.chain = function (fn, makeLast) {
	if (angular.isFunction(fn))
		fn.$inject = fn.$inject || [];

	var env;

	if (this === bang.property) {
		env = function (deps) {
			var context = this;

			angular.forEach(deps, function (dep, key) {
				if (dep instanceof atc.Field)
					deps[key] = dep.instance(context.$scope);
			});

			env.run.concat(env.runLast).forEach(function (fn) {
				var result = fn.call(deps, context, env.value);
				if (result !== undefined)
					env.value = result;
			});

			return env.value.toProperty();
		};
		env.run = [];
		env.runLast = [];
		env.value = new Bacon.Bus();
		env.$inject = [];
		env.chain = bang.property.chain;
		env.merge = bang.property.merge;
		
		// TODO: Move to its own chainable method (`scopeDigest()`)? How would
		// it be useful?
		var wrap = function (context, value) {
			var assign = this.$parse(context.name).assign;
			return value.doAction(function (v) {
				// TODO: Implement more exact condition
				if (angular.isObject(context.$scope))
					if (angular.isFunction(context.$scope.$evalAsync))
						context.$scope.$evalAsync(function () {
							assign(context.$scope, v);
						});
					else
						assign(context.$scope, v);
			});
		};
		wrap.$inject = ['$parse'];
		env.chain(wrap, true);
	} else {
		env = this;
	}

	(makeLast === true ? env.runLast : env.run).push(angular.isArray(fn) ? fn[fn.length - 1] : fn);
	env.$inject = env.$inject || [];
	injector.annotate(fn).forEach(function (dep) {
		if (env.$inject.indexOf(dep) === -1)
			env.$inject.push(dep);
	});

	return env;
};

bang.property.merge = function (fn) {
	var wrap = function (context, value) {
		return value.merge((angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this/*, value*/));
	};
	wrap.$inject = injector.annotate(fn);

	return this.chain(wrap);
};

}(window.bang, window.angular, window.atc, window.Bacon);