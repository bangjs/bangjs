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