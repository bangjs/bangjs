;!function (angular, Bacon) {

var bang = {};

// Non-AngularJS-related functionality.

bang.createProperty = function (value, invalidate, end) {
	var args = [].slice.call(arguments);

	var property = new Bacon.Property(function (sink) {
		var initial = value();
		if (initial !== bang)	// TODO
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

		return function unsubscribe () {
			// TODO: Support nested lists in `dispose`.
			dispose.forEach(function (fn) {
				if (angular.isFunction(fn)) fn();
			});
		}
	});

	return property.withDescription.apply(
		property,
		[this, 'property'].concat(args)
	);
};

bang.createPropertyFromObjectProperty = function (object, propertyName) {
	var property = {
		notify: angular.noop
	};
	if (propertyName in object)
		property.value = object[propertyName];

	Object.defineProperty(object, propertyName, {
		get: function () {
			return 'value' in property ? property.value : bang;	// TODO
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

// Convenience naming
bang.defineProperty = bang.createPropertyFromObjectProperty;

bang.toString = function () {
	return 'bang';
};


angular.module('bang', []).

factory('Bacon', function () {
	return Bacon;
}).

run(['$rootScope', '$parse', function ($rootScope, $parse) {

	// AngularJS-related functionality.

	// TODO: This one feels a bit clunky, with its optional `scope` argument.
	// Shouldn't it have a version on `$rootScope`?
	bang.createScopeProperty = function (scope, value, invalidate) {
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
				return scope.$on('destroy', end);
			}
		);

		return property.withDescription.apply(
			property,
			[this, 'scopeProperty'].concat(args)
		);
	};

	bang.watchAsProperty = function (scope, expression) {
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
	bang.functionAsStream = function (scope, name) {
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

	bang.digest = function (scope, expressions) {
		angular.forEach(expressions, function (observable, expression) {
			var assign = $parse(expression).assign;

			scope.$on('$destroy', observable.onValue(function (value) {
				scope.$evalAsync(function () {
					assign(scope, value);
				});
			}));
		});
	};

}]).

factory('bang', function () {
	return bang;
}).

config(['$provide', function ($provide) {

	$provide.decorator('$rootScope', ['$delegate', function ($delegate) {

		angular.extend(
			Object.getPrototypeOf($delegate),
			{
				watchAsProperty: function () {
					return bang.watchAsProperty.apply(bang, [this].concat([].slice.call(arguments)));
				},
				functionAsStream: function () {
					return bang.functionAsStream.apply(bang, [this].concat([].slice.call(arguments)));
				},
				digest: function () {
					return bang.digest.apply(bang, [this].concat([].slice.call(arguments)));
				}
			}
		);

		return $delegate;

	}]);

}]);

}(window.angular, window.Bacon);
