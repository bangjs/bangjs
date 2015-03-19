;!function (global, angular, Bacon) {

var _bang = {},
	_angularBang = {};

global.bang = {};

global.bang.controller = function (moduleName, ctrlName) {
	var elements = angular.extend.apply(angular, [].slice.call(arguments, 2));

	atc(moduleName, ctrlName, elements, function (elementName, element) {
		if (angular.isFunction(element) && element.atcify === true)
			element = element(elementName);
		return element;
	});
};

global.bang.stream = function () {
	var args = [].slice.call(arguments);

	var fn = function (elementName) {

		var invokable = args.filter(function (part) {
			return angular.isFunction(part);
		});

		var deps = args.slice(0, args.indexOf(setup));

		var digest = typeof args[args.length - 1] === 'boolean' ?
			args[args.length - 1] : false;

		var setup = function () {
			var me = new Bacon.Bus();
			var setupContext = angular.extend({}, this);
			delete setupContext.$scope;
			var result = invokable[0].call(setupContext, me);
			// TODO: We could throw a warning (in debug mode) if `invokable[0]`
			// does not define an argument *and* `result` is not plugable.
			if (result instanceof Bacon.Observable)
				// TODO: Unplug under any condition?
				me.plug(result);
			// TODO: Do not expose the `Bus` interface in the returned stream.
			return me;
		};

		var sidefx = function (me) {
			if (angular.isFunction(invokable[1]))
				invokable[1].apply(this, arguments);
			if (digest)
				this.$scope.digest(elementName, me);
		};

		return deps.concat([setup, sidefx]);
	};
	fn.atcify = true;
	return fn;
};

global.bang.stream.invocations = function () {
	var fn = function (elementName) {
		return function () {
			return this.$scope.functionAsStream(elementName).map(function (args) {
				// TODO: We should probably move this behavior (or a spread) to
				// `functionAsStream()`.
				return args[0];
			});
		};
	};
	fn.atcify = true;
	return fn;
};

global.bang.property = function () {
	var args = [].slice.call(arguments);

	var fn = function (elementName) {

		var invokable = args.filter(function (part) {
			return angular.isFunction(part);
		});

		var deps = args.slice(0, args.indexOf(invokable[0]));

		var digest = typeof args[args.length - 1] === 'boolean' ?
			args[args.length - 1] : elementName.charAt(0) !== '_';

		var setup = function () {
			var me = new Bacon.Bus();
			var setupContext = angular.extend({}, this);
			delete setupContext.$scope;
			var result = invokable[0].call(setupContext, me);
			if (result instanceof Bacon.Observable)
				// TODO: Unplug under any condition?
				me.plug(result);
			return me.toProperty();
		};

		var sidefx = function (me) {
			if (angular.isFunction(invokable[1]))
				invokable[1].apply(this, arguments);
			if (digest)
				this.$scope.digest(elementName, me);
		};

		return deps.concat([setup, sidefx]);
	};
	fn.atcify = true;
	return fn;
};

global.bang.property.conditional = function (source, condition) {
	return this('bang', source, condition, function () {
		return this.bang.createConditionalProperty(this[source], this[condition]);
	});
};

/**
 * Defines an observable property `element` that follows *corresponding* scope
 * value.
 *
 * @static
 * @memberOf bang.property
 * @param {...string} [dependencies] Dependencies to be injected into
 *  context of `initial`.
 * @param {Function} initial Observable that initializes scope value.
 * @returns {Function} Returns `atc`ifiable element factory method.
 */
global.bang.property.watch = function () {
	// Ending up at `arguments[-1]` should be avoided as [it behaves
	// inconsistently in
	// Safari](https://twitter.com/timmolendijk/status/578246289554554881).
	// [Very inconsistently](https://twitter.com/timmolendijk/status/57824705145
	// 8273280).
	var initial = arguments.length > 0 ? arguments[arguments.length - 1] : undefined,
		deps = ['Bacon'].concat([].slice.call(arguments, 0, arguments.length - 1));

	var fn = function (elementName) {
		return deps.concat([function () {
			var setupContext = angular.extend({}, this);
			delete setupContext.$scope;
			// TODO: Pretty sure that this is not a bullet-proof means of
			// assigning an initial value to scope variable.
			return this.Bacon.mergeAll(
				angular.isFunction(initial) ?
					initial.call(setupContext) : this.Bacon.never(),
				this.$scope.watchAsProperty(elementName)
			).toProperty();
		}, function (me) {
			this.$scope.digest(elementName, me);
		}]);
	};
	fn.atcify = true;
	return fn;
};

global.bang.value = function (value) {
	var fn = function (elementName) {
		return [function () {
			return value;
		}, function (me) {
			this.$scope[elementName] = me;
		}];
	};
	fn.atcify = true;
	return fn;
};

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
			if (pass) return value;
		}, observable, condition
	).filter(function (value) {
		return value !== undefined;
	}).skipDuplicates();
};

_bang.toString = function () {
	return 'bang';
};

angular.module('bang', []).

factory('Bacon', function () {
	return Bacon;
}).

run(['$rootScope', '$parse', function ($rootScope, $parse) {

	angular.extend(_angularBang, _bang);

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

}]);

}(window, window.angular, window.Bacon);
