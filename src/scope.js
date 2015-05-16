;!function (angular) { 'use strict';

angular.module('bang').

/**
 * @ngdoc service
 * @name bang.scope
 * @module bang
 * @requires $parse
 * @requires Bacon
 * @description
 * Exposes helper functions to integrate with AngularJS scopes.
 */
service('bang.scope', ['$parse', 'Bacon', function ($parse, Bacon) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.scope#createStream
	 * @description
	 * 
	 * Creates a stream that automatically ends when provided scope is
	 * destroyed.
	 *
	 * This method is also available on `$rootScope` under the same name, minus
	 * the `scope` parameter.
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
	 *   stream.subscribe(function (event) {
	 *     console.log(event.constructor.name, event.isEnd() || event.value());
	 *   });
	 *   
	 *   // → "Next" 1
	 *   // → <2 second delay>
	 *   // → "Next" 2
	 *   // → "End" true
	 *   
	 * }]);
	 * ```
	 * 
	 * @param {$rootScope.Scope} scope - Context in which stream should operate.
	 * @param {function(Function, Function)} subscribe - Binder function that
	 *   describes its incoming events. Its first argument is a function that
	 *   can be called to issue a next event with given value. Its second
	 *   argument is a function that can be called to end the stream.
	 * @returns {Bacon.EventStream} Returns the created event stream.
	 */
	this.createStream = function (scope, subscribe) {
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

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.scope#createProperty
	 * @description
	 *
	 * Creates a property with an initial value that accounts for laziness of
	 * the property. In other words; the initial value is not generated as long
	 * as the property is not subscribed to.
	 *
	 * Resulting property automatically ends when provided scope is destroyed.
	 *
	 * This method is also available on `$rootScope` under the same name, minus
	 * the `scope` parameter.
	 *
	 * ```js
	 * angular.module('myModule').controller(['$scope', '$document', function ($scope, $document) {
	 * 	 
	 *   // `$document.title` has some value other than `"Initial title"` here.
	 *
	 *   var property = $scope.createProperty(function () {
	 *     return $document.title;
	 *   }, function (next, invalidate, end) {
	 *     next("Fake title");
	 *     setTimeout(function () {
	 *       invalidate();
	 *       end();
	 *     }, 2000);
	 *   });
	 *
	 *   $document.title = "Initial title";
	 *
	 *   property.subscribe(function (event) {
	 *     console.log(event.constructor.name, event.isEnd() || event.value());
	 *
	 *     $document.title = "Changed title";
	 *   });
	 *
	 *   // → "Initial" "Initial title"
	 *   // → "Next" "Fake title"
	 *   // → <2 second delay>
	 *   // → "Next" "Changed title"
	 *   // → "End" true
	 *   
	 * }]);
	 * ```
	 * 
	 * @param {$rootScope.Scope} scope - Context in which property should
	 *   operate.
	 * @param {Function} getValue - Function that will be called every time the
	 *   property needs to know its current value.
	 * @param {function(Function, Function, Function)} subscribe - Binder
	 *   function that describes its incoming events. Its first argument is a
	 *   function that can be called to issue a next event with given value. Its
	 *   second argument is a function that can be called to issue a next event
	 *   with value as provided by `getValue`. Its third argument is a function
	 *   that can be called to end the stream.
	 * @returns {Bacon.Property} Returns the created property.
	 */
	this.createProperty = function (scope, getValue, subscribe) {
		var initial;
		function getInitialValue () {
			return initial;
		}

		return this.createStream(scope, function (next, end) {
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
		}).
		// Set initial value placeholder, to be replaced by actual value as soon
		// as the property is activated (subscribed to). Inspired on [this idea]
		// (https://github.com/baconjs/bacon.js/issues/536#issuecomment-
		// 75656100).
		toProperty(getInitialValue).map(function (value) {
			return value === getInitialValue ? getInitialValue() : value;
		});
	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.scope#watchAsProperty
	 */
	this.watchAsProperty = function (scope, expression) {
		return this.createProperty(scope, function () {

			return $parse(expression)(this);

		}, function (next) {

			return this.$watch(expression, next);

		}).skipDuplicates();
	};

	var sendToStreams = {};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.scope#functionAsStream
	 */
	this.functionAsStream = function (scope, name) {
		sendToStreams[name] = sendToStreams[name] || [];

		var parsed = $parse(name);
		if (!angular.isFunction(parsed(scope)))
			parsed.assign(scope, function () {
				var args = [].slice.call(arguments);
				sendToStreams[name].forEach(function (send) {
					send(args);
				});
			});

		return this.createStream(scope, function (next) {

			sendToStreams[name].push(next);

			return function () {
				sendToStreams[name].splice(sendToStreams[name].indexOf(next), 1);
				if (sendToStreams[name].length === 0)
					delete sendToStreams[name];
			};
		});
	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.scope#digestObservable
	 */
	this.digestObservable = function (scope, expression, observable) {
		var assign = $parse(expression).assign;

		return observable.doAction(function (value) {
			scope.$evalAsync(function () {
				assign(scope, value);
			});
		});
	};

}]).

config(['$provide', function ($provide) {

	$provide.decorator('$rootScope', ['$delegate', 'bang.scope', function ($delegate, fns) {

		angular.extend(
			Object.getPrototypeOf($delegate),
			Object.keys(fns).reduce(function (decorate, name) {

				decorate[name] = function () {
					return fns[name].apply(
						fns, [this].concat([].slice.call(arguments))
					);
				};
				return decorate;

			}, {})
		);

		return $delegate;

	}]);

}]);

}(window.angular);