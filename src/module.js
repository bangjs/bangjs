;!function (bang, angular, Bacon) {

angular.module('bang', ['atc']).

value('Bacon', Bacon).

factory('bang', ['$parse', function ($parse) {

	var fns = {};

	fns.createScopeStream = function (scope, subscribe) {
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

	fns.createScopeProperty = function (scope, getValue, subscribe) {
		var initial;
		function getInitialValue () {
			return initial;
		}

		return fns.createScopeStream(scope, function (next, end) {
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

	fns.watchAsProperty = function (scope, expression) {
		return fns.createScopeProperty(scope, function () {

			return $parse(expression)(this);

		}, function (next) {

			return this.$watch(expression, next);

		}).skipDuplicates();
	};

	var sendToStreams = {};
	fns.functionAsStream = function (scope, name) {
		sendToStreams[name] = sendToStreams[name] || [];

		scope[name] = scope[name] || function () {
			var args = [].slice.call(arguments);
			sendToStreams[name].forEach(function (send) {
				send(args);
			});
		};

		return fns.createScopeStream(scope, function (next) {

			sendToStreams[name].push(next);

			return function () {
				sendToStreams[name].splice(sendToStreams[name].indexOf(next), 1);
				if (sendToStreams[name].length === 0)
					delete sendToStreams[name];
			};
		});
	};

	fns.digestObservable = function (scope, expression, observable) {
		var assign = $parse(expression).assign;

		return observable.doAction(function (value) {
			scope.$evalAsync(function () {
				assign(scope, value);
			});
		});
	};

	return fns;

}]).

config(['$provide', function ($provide) {

	$provide.decorator('$rootScope', ['$delegate', 'bang', function ($delegate, bang) {

		var fns = {};

		angular.forEach({
			createStream: 'createScopeStream',
			createProperty: 'createScopeProperty',
			watchAsProperty: 'watchAsProperty',
			functionAsStream: 'functionAsStream',
			digestObservable: 'digestObservable'
		}, function (from, to) {

			fns[to] = function () {
				return bang[from].apply(bang, [this].concat([].slice.call(arguments)));
			};
			
		});

		angular.extend(Object.getPrototypeOf($delegate), fns);

		return $delegate;

	}]);

}]);

}(window.bang, window.angular, window.Bacon);