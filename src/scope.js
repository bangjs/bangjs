;!function (angular) { 'use strict';

angular.module('bang').

/**
@ngdoc service
@name bang.scope
@module bang
@description

Exposes helper functions to integrate Bacon.js observables with AngularJS
scopes.
*/
service('bang.scope', ['$parse', 'Bacon', function ($parse, Bacon) {

/**
@ngdoc method
@name module:bang.service:bang.scope#createStream
@description

Creates a stream that automatically ends when provided scope is destroyed.

This method is also available on `$rootScope` under the same name, minus the
`scope` parameter.

```js
var stream = $scope.createStream(function (next, end) {
	next(1);
	setTimeout(function () {
		next(2);
		end();
	}, 2000);
});

stream.subscribe(function (event) {
	console.log(event.constructor.name, event.isEnd() || event.value());
});

// → "Next" 1
// → <2 second delay>
// → "Next" 2
// → "End" true
```

@param {$rootScope.Scope} scope
Context in which stream should operate.

@param {function(next, end)} subscribe
Binder function that initializes the events that will be passed along the
stream. Receives provided `scope` as `this`.
- Invoke `next(value)` to issue a next event with given value.
- Invoke `end()` to end the stream.

@returns {Bacon.EventStream}
Returns the created event stream.
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
@ngdoc method
@name module:bang.service:bang.scope#createProperty
@description

Creates a property with an initial value that accounts for laziness of the
property. In other words; the initial value is not generated as long as the
property is not subscribed to.

Resulting property automatically ends when provided scope is destroyed.

This method is also available on `$rootScope` under the same name, minus the
`scope` parameter.

```js
// `$document.title` has some value other than `"Initial title"` at this point.

var property = $scope.createProperty(function () {
	return $document.title;
}, function (next, invalidate, end) {
	next("Fake title");
	setTimeout(function () {
		invalidate();
		end();
	}, 2000);
});

$document.title = "Initial title";

property.subscribe(function (event) {
	console.log(event.constructor.name, event.isEnd() || event.value());

	$document.title = "Changed title";
});

// → "Initial" "Initial title"
// → "Next" "Fake title"
// → <2 second delay>
// → "Next" "Changed title"
// → "End" true
```

@param {$rootScope.Scope} scope
Context in which property should operate.

@param {function()} getValue
Function that will be called every time the property needs to know its current
value. Receives provided `scope` as `this`.

@param {function(next, invalidate, end)} subscribe
Binder function that initializes the events that will be passed along the
property stream. Receives provided `scope` as `this`.
- Invoke `next(value)` to issue a next event with given value.
- Invoke `invalidate()` to issue a next event with value as provided by
  `getValue()`.
- Invoke `end()` to end the stream.

@returns {Bacon.Property}
Returns the created property.
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
@ngdoc method
@name module:bang.service:bang.scope#watchAsProperty
@description

Watches an expression on scope and makes it available as a property.

Initial value is always the current value of watched expression, regardless of
whether it exists yet or not.

Resulting property automatically ends when provided scope is destroyed.

This method is also available on `$rootScope` under the same name, minus the
`scope` parameter.

```js
$scope.user = {
	name: "Tim",
	city: "Amsterdam"
};

var property = $scope.watchAsProperty("user.name");

$scope.user.name = "Tony";

property.onValue(function (value) {
	console.log(value);
});

$scope.$apply(function () {
	$scope.user = {
		name: "William",
		city: "Amsterdam"
	};
});

// → "Tony"
// → "William"
```

@param {$rootScope.Scope} scope
Context in which `expression` should be evaluated.

@param {string} expression
Expression that will be evaluated within the context of `scope` to obtain our
current value.

@returns {Bacon.Property}
Returns the created property.
*/
	this.watchAsProperty = function (scope, expression) {
		return this.createProperty(scope, function () {

			return $parse(expression)(this);

		}, function (next) {

			return this.$watch(expression, next);

		}).skipDuplicates();
	};

/**
@ngdoc method
@name module:bang.service:bang.scope#functionAsStream
@description

Exposes a function on scope and makes its invocations (including arguments)
available as a stream of events.

Supports registering multiple streams at the same scope function.

Resulting stream automatically ends when provided scope is destroyed.

This method is also available on `$rootScope` under the same name, minus the
`scope` parameter.

```js
$scope.functionAsStream("login").
	flatMapLatest(function (args) {
		return Bacon.fromPromise($http.post('/login', {
			username: args[0],
			password: args[1]
		}));
	}).
	onValue(function (user) {
		console.log("logged in as", user.name);
	}).
	onError(function (err) {
		console.error("login failed", err);
	});

// This call will usually be done from an AngularJS view.
$scope.login("tim", "31337h4x0r");
```

@param {$rootScope.Scope} scope
Context in which stream origin function should be registered.

@param {string} expression
Expression that determines where in `scope` our stream origin function will be
exposed.

@returns {Bacon.EventStream}
Returns the created event stream.
*/
	this.functionAsStream = function (scope, expression) {
		var parsed = $parse(expression),
			fn = parsed(scope);

		if (!angular.isFunction(fn)) {
			fn = function () {
				var args = [].slice.call(arguments);
				fn.streams.forEach(function (send) {
					send(args);
				});
			}
			fn.streams = [];
			parsed.assign(scope, fn);
		}

		return this.createStream(scope, function (next) {

			// Register our "event issuer" to be called every time `fn` is
			// invoked.
			fn.streams.push(next);

			return function () {
				fn.streams.splice(fn.streams.indexOf(next), 1);
				// TODO: Automatically remove function from scope at some point?
				// Tricky because we would need a reliable way of detecting when
				// a function has no more registered non-ended streams. Simply
				// checking from `fn.streams.length === 0` won't cut it because
				// it could be that some streams have not yet been activated
				// (are still lazy).
			};
		});
	};

/**
@ngdoc method
@name module:bang.service:bang.scope#digestObservable
@description

Digests an observable to scope. Note that the supplied observable is not
subscribed to but is rather extended with a side effect. In order to effectuate
the digest the returned observable should be captured and subscribed to.

This method is also available on `$rootScope` under the same name, minus the
`scope` parameter.

```js
var user = Bacon.fromPromise($http.post('/login', {
	username: "tim",
	password: "31337h4x0r"
}));

user = $scope.digestObservable("loggedInUser", user);

console.log($scope.loggedInUser);

user.subscribe(function (user) {
	console.log($scope.loggedInUser === user);
});

// → undefined
// → true
```

@param {$rootScope.Scope} scope
Context in which values from `observable` should be made available.

@param {string} expression
Expression that determines where in `scope` values from `observable` will be
exposed.

@param {Bacon.Observable} observable
The observable that should be amended with the digest logic.

@returns {Bacon.Observable}
Returns the original observable but extended with the digest logic.
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