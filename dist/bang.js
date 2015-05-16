;!function (angular) { 'use strict';

/**
 * @ngdoc module
 * @name bang
 * @description
 * The main module.
 */
angular.module('bang', []);

}(window.angular);
;!function (angular, Bacon) { 'use strict';

angular.module('bang').

run(['$window', '$location', function ($window, $location) {

	Bacon.Observable.prototype.redirect = function (to, replace) {

		return this.doAction(function (value) {
			var redirectTo = angular.isFunction(to) ? to(value) : to;
			// TODO: This condition is not accurate as a determiner for doing an
			// "internal" versus "external" redirect, but for now it suffices.
			if (redirectTo.indexOf("://") === -1) {
				// TODO: Assuming that `redirectTo` holds solely a path is a bit
				// tricky.
				$location.path(redirectTo);
				if (replace)
					$location.replace();
			} else {
				$window.location[replace ? 'replace' : 'assign'](redirectTo);
			}
		});
	};

	Bacon.Observable.prototype.doErrorAction = function (fn) {
		return Bacon.mergeAll(
			this,
			this.errors().mapError(angular.identity).doAction(fn).filter(false)
		);
	};

}]).

/**
 * @ngdoc service
 * @name Bacon
 * @module bang
 * @description
 * Exposes {@link https://baconjs.github.io/ Bacon.js} as a service.
 */
constant('Bacon', Bacon);

}(window.angular, window.Bacon);
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
		}).toProperty(getInitialValue).map(function (value) {
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
;!function (angular) { 'use strict';

angular.module('bang').

/**
 * @ngdoc service
 * @name bang.location
 * @module bang
 * @requires $location
 * @description
 * Exposes helper functions to integrate with `$location`.
 */
service('bang.location', ['$location', function ($location) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.location#asProperty
	 */
	this.asProperty = function (getValue) {
		return $location.asProperty(getValue);
	};

}]).

config(['$provide', function ($provide) {

	$provide.decorator('$location', ['$delegate', '$rootScope', function ($delegate, $rootScope) {

		Object.getPrototypeOf($delegate).asProperty = function (getValue) {
			var $location = this;

			return $rootScope.createProperty(function () {

				return getValue.call($location);

			}, function (next, invalidate) {

				return this.$on('$locationChangeSuccess', invalidate);

			}).skipDuplicates();

		};

		return $delegate;

	}]);

}]);

}(window.angular);
;!function (angular) { 'use strict';

angular.module('bang').

/**
 * @ngdoc service
 * @name bang.controller
 * @module bang
 * @requires $parse
 * @requires Bacon
 * @description
 * Exposes tools to facilitate in building controllers.
 */
service('bang.controller', ['$parse', 'Bacon', function ($parse, Bacon) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#create
	 */
	this.create = function (scope) {
		var fields = [].slice.call(arguments, 1);

		fields = angular.extend.apply(angular, [{}].concat(
			flattenArray(fields).map(function (field) {
				return unnestKeys(field);
			})
		));

		var context = {};

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				$parse(name).assign(context, field.get());
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof PropertyFactory)
				field.chain(function (me) {
					return scope.digestObservable(name, me);
				});
			if (field instanceof Factory)
				field.deploy(context, name, scope);
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				field.get().subscribe(angular.noop);
		});

		return context;
	};

	function unnestKeys (obj, path) {
		path = path || [];
		var flat = {};
		angular.forEach(obj, function (value, key) {
			var thisPath = path.concat([key]);
			if (value instanceof Factory)
				flat[thisPath.join('.')] = value;
			else
				angular.extend(flat, unnestKeys(value, thisPath));
		});
		return flat;
	}

	function flattenArray (array) {
		var flat = [];
		array.forEach(function (item) {
			if (angular.isArray(item))
				flat.push.apply(flat, flattenArray(item));
			else
				flat.push(item);
		});
		return flat;
	}
	
	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#stream
	 */
	this.stream = function (init) {

		return new StreamFactory(init);

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#stream.calls
	 */
	this.stream.calls = function (arg) {

		return this(function (me, name, scope) {
			var stream = scope.functionAsStream(name);
			if (arguments.length > 0)
				stream = stream.map('.' + arg);
			return stream;
		});

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#property
	 */
	this.property = function (init) {

		return new PropertyFactory(init);

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#property.watch
	 */
	this.property.watch = function (merge) {

		return this(function (me, name, scope) {
			var stream = scope.watchAsProperty(name).changes();
			if (angular.isFunction(merge))
				stream = Bacon.mergeAll(stream, merge.call(this));
			return stream;
		});

	};

	function Factory () {}

	function StreamFactory (init) {
		var chain = [];
		this.chain = function (fn) {
			if (fn) chain.push(fn);
			return this;
		};

		this.chain(init);

		var bus = new Bacon.Bus();

		var get = bus.toProperty().toEventStream();
		this.get = function () {
			return get;
		};

		this.deploy = function (context, name, scope) {
			var chained = chain.reduce(function (observable, fn) {

				var result = fn.call(context, observable, name, scope);

				// TODO: Support more non-EventStream types?
				if (result instanceof Bacon.Bus)
					result = result.toProperty();
				if (result instanceof Bacon.Property)
					result = result.toEventStream();

				return result instanceof Bacon.EventStream ? result : observable;

			}, Bacon.never());

			bus.plug(chained);

			delete this.deploy;

			return this;
		};
	}
	StreamFactory.prototype = new Factory();
	StreamFactory.prototype.constructor = StreamFactory;

	function PropertyFactory (init) {
		var chain = [];
		this.chain = function (fn) {
			if (fn) chain.push(fn);
			return this;
		};

		this.chain(init);

		var bus = new Bacon.Bus();

		var get = bus.toProperty();
		this.get = function () {
			return get;
		};

		this.deploy = function (context, name, scope) {
			var chained = chain.reduce(function (observable, fn) {

				var result = fn.call(context, observable, name, scope);

				// TODO: Support more non-EventStream types?
				if (result instanceof Bacon.Bus)
					result = result.toProperty();
				if (result instanceof Bacon.Property)
					result = result.toEventStream();

				return result instanceof Bacon.EventStream ? result : observable;

			}, Bacon.never());

			bus.plug(chained);

			delete this.deploy;

			return this;
		};
	}
	PropertyFactory.prototype = new Factory();
	PropertyFactory.prototype.constructor = PropertyFactory;

}]);

}(window.angular);