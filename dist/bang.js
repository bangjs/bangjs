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

function makeName (ctrlName, fieldName) {
	return [ctrlName, fieldName].join('.');
}

global.atc = function (ctrlName, fieldDefs, onInstantiate) {
	// TODO: Support multiple `fieldDefs` arguments.

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

	// TODO: no dependency on angular

var _bang = {};

// TODO: Where do we want to expose these globally?
bang.util = _bang;

// TODO: For properly dealing with the lazyiness issue as reported in my big-ass
// laziness property issue on the bacon github, consider whether there may be
// more concise approaches, such as what the one contributor in that issue
// thread mentioned, sth like: `$(...).asEventStream('x').toProperty(MyNullType).map(...)`
_bang.createProperty = function (value, invalidate, end) {
	var args = [].slice.call(arguments);

	var property = new Bacon.Property(function (sink) {
		var initial = value();
		if (initial !== _bang)	// TODO
			sink(new Bacon.Initial(initial));

		function sinkNext (next) {
			if (arguments.length === 0)
				next = value();

			if (sink(new Bacon.Next(next)) === Bacon.noMore)
				unsubscribe();
		}

		var dispose = [
			invalidate(sinkNext, function () {
				// Strip arguments to make sure we do not accidentally pass
				// on a next value.
				sinkNext();
			})
		];

		if (angular.isFunction(end))
			dispose.push(
				end(function () {
					sink(new Bacon.End());
				})
			);

		function unsubscribe () {
			// TODO: Support nested lists in `dispose`.
			dispose.forEach(function (fn) {
				if (angular.isFunction(fn)) fn();
			});
		}

		return unsubscribe;
	});

	return property.withDescription.apply(
		property,
		[this, 'property'].concat(args)
	);
};

_bang.createPropertyFromObjectProperty = function (object, propertyName) {
	var property = {
		notify: angular.noop
	};
	if (propertyName in object)
		property.value = object[propertyName];

	Object.defineProperty(object, propertyName, {
		get: function () {
			return 'value' in property ? property.value : _bang;	// TODO
		},
		set: function (value) {
			property.value = value;
			property.notify();
		},
		configurable: true
   	});

	return this.createProperty(function () {
		return object[propertyName];
	}, function (next) {
		property.notify = function () {
			next(object[propertyName]);
		};
		return function () {
			property.notify = angular.noop;
		};
	});
};

// Convenience alias
_bang.defineProperty = _bang.createPropertyFromObjectProperty;

_bang.createConditionalProperty = function (observable, condition) {
	return Bacon.combineWith(
		function (value, pass) {
			if (pass !== false) return value;
		}, observable, condition
	).filter(function (value) {
		return value !== undefined;
	}).skipDuplicates();
};

_bang.toString = function () {
	return 'bang';
};

}(window.bang, window.angular, window.Bacon);

;!function (bang, angular, Bacon) {

var _angularBang = {};

angular.module('bang', ['atc']).

factory('Bacon', function () {
	return Bacon;
})/*.

run(['$rootScope', '$parse', function ($rootScope, $parse) {

	angular.extend(_angularBang, bang.util);

	// TODO: This one feels a bit clunky, with its optional `scope` argument.
	// Shouldn't it have a version on `$rootScope`?
	_angularBang.createScopeProperty = function (scope, value, invalidate) {
		var args = [].slice.call(arguments);

		if (args.length < 3) {
			invalidate = value;
			value = scope;
			scope = $rootScope;
		}

		var property = this.createProperty(
			value,
			invalidate.bind(scope),
			function (end) {
				return scope.$on('$destroy', end);
			}
		);

		return property.withDescription.apply(
			property,
			[this, 'scopeProperty'].concat(args)
		);
	};

	_angularBang.watchAsProperty = function (scope, expression) {
		var args = [].slice.call(arguments);
		
		var initial, isInitial = true;
		var property = this.createScopeProperty(
			scope,
			function () {
				initial = $parse(expression)(scope);
				return initial;
			},
			function (next) {
				return scope.$watch(expression, function (value) {
					if (isInitial) {
						isInitial = false;
						if (value === initial) return;
					}
					next(value);
				});
			}
		);

		return property.withDescription.apply(
			property,
			[this, 'watchAsProperty'].concat(args)
		);
	};

	// TODO: Deal with scenario of binding twice to the same function name.
	_angularBang.functionAsStream = function (scope, name) {
		scope[name] = angular.noop;

		return Bacon.fromBinder(function (sink) {
			var unsubscribe = scope.$on('$destroy', function () {
				sink(new Bacon.End());
			});

			scope[name] = function () {
				// TODO: Take in argument definition at `functionAsStream`, so
				// we can construct an arguments object with named keys here.
				var args = [].slice.call(arguments);
				// TODO: Use `_.spread()` here?
				if (sink.call(this, args) === Bacon.noMore)
					unsubscribe();
			};

			return unsubscribe;
		});
	};

	// TODO: Add variant that uses `doAction` instead of `onValue`
	_angularBang.digest = function (scope, expressions) {
		if (typeof expressions === 'string' && arguments.length > 2) {
			var expression = expressions;
			expressions = {};
			expressions[expression] = arguments[2];
		}

		angular.forEach(expressions, function (observable, expression) {
			var assign = $parse(expression).assign;

			scope.$on('$destroy', observable.onValue(function (value) {
				scope.$evalAsync(function () {
					// TODO: Make it possible to enable debug logging through
					// some flag somehow.
					// console.log('scope.', expression, '=', value);
					assign(scope, value);
				});
			}));
		});
	};

}]).

factory('bang', function () {
	return _angularBang;
}).

config(['$provide', function ($provide) {

	$provide.decorator('$rootScope', ['$delegate', function ($delegate) {

		angular.extend(
			Object.getPrototypeOf($delegate),
			{
				watchAsProperty: function () {
					return _angularBang.watchAsProperty.apply(_angularBang, [this].concat([].slice.call(arguments)));
				},
				functionAsStream: function () {
					return _angularBang.functionAsStream.apply(_angularBang, [this].concat([].slice.call(arguments)));
				},
				digest: function () {
					return _angularBang.digest.apply(_angularBang, [this].concat([].slice.call(arguments)));
				}
			}
		);

		return $delegate;

	}]);

}])*/;

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
				value.subscribe(angular.noop);
		});

	});
};

}(window.bang, window.angular, window.atc, window.Bacon);
;!function (bang, angular, atc) {

var injector = angular.injector();

bang.service = function (fn) {
	var init = function (context, value) {
		return (angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this, value);
	};
	init.$inject = injector.annotate(fn);

	return bang.service.chain(init);
};

bang.service.chain = function (fn) {
	if (angular.isFunction(fn))
		fn.$inject = fn.$inject || [];

	var env;

	if (this === bang.service) {
		env = function (deps) {
			var context = this;

			angular.forEach(deps, function (dep, key) {
				if (dep instanceof atc.Field)
					deps[key] = dep.instance(context.$scope);
			});

			env.run.forEach(function (fn) {
				var result = fn.call(deps, context, env.value);
				if (result !== undefined)
					env.value = result;
			});

			return env.value;
		};
		env.run = [];
		env.value = undefined;
		env.$inject = [];
		env.chain = bang.service.chain;
	} else {
		env = this;
	}

	env.run.push(angular.isArray(fn) ? fn[fn.length - 1] : fn);
	// Make sure `injector.annotate(fn)` does not deduce argument names as
	// dependencies.
	env.$inject = env.$inject || [];
	env.$inject = env.$inject.concat(injector.annotate(fn));

	return env;
};

/*
angular.module(...).config(bang.controller('myCtrl', {
	a: bang.service(function () {
		return 'x';
	}).scopeDigest(),
	b: bang.service(['.a', function () {
		return this.a.toUpperCase();
	}])
}));

angular.module(...).config(bang.service('mySvc', function () {
	return 'x';
}).scopeDigest());
*/

}(window.bang, window.angular, window.atc);
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
	env.$inject = env.$inject.concat(injector.annotate(fn));

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