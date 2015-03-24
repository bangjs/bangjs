;!function (bang, angular, Bacon) {

var _angularBang = {};

angular.module('bang', []).

factory('Bacon', function () {
	return Bacon;
}).

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

}]);

}(window.bang, window.angular, window.Bacon);
