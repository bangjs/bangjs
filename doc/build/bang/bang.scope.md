Module [`bang`](index.md) :boom:
# Service `bang.scope`

Exposes helper functions to integrate Bacon.js observables with AngularJS
scopes.


* [`createStream`](#createstreamscope-subscribe)
* [`createProperty`](#createpropertyscope-getvalue-subscribe)
* [`watchAsProperty`](#watchaspropertyscope-expression)
* [`functionAsStream`](#functionasstreamscope-expression)
* [`digestObservable`](#digestobservablescope-expression-observable)


## createStream(scope, subscribe)

:octocat: [`src/scope.js#L16`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L16)

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

:baby_bottle: **scope** _$rootScope.Scope_

Context in which stream should operate.

:baby_bottle: **subscribe** _function(next, end)_

Binder function that initializes the events that will be passed along the
stream. Receives provided `scope` as `this`.
- Invoke `next(value)` to issue a next event with given value.
- Invoke `end()` to end the stream.

:dash: _Bacon.EventStream_

Returns the created event stream.

## createProperty(scope, getValue, subscribe)

:octocat: [`src/scope.js#L87`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L87)

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

:baby_bottle: **scope** _$rootScope.Scope_

Context in which property should operate.

:baby_bottle: **getValue** _function()_

Function that will be called every time the property needs to know its current
value. Receives provided `scope` as `this`.

:baby_bottle: **subscribe** _function(next, invalidate, end)_

Binder function that initializes the events that will be passed along the
property stream. Receives provided `scope` as `this`.
- Invoke `next(value)` to issue a next event with given value.
- Invoke `invalidate()` to issue a next event with value as provided by
  `getValue()`.
- Invoke `end()` to end the stream.

:dash: _Bacon.Property_

Returns the created property.

## watchAsProperty(scope, expression)

:octocat: [`src/scope.js#L181`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L181)

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

:baby_bottle: **scope** _$rootScope.Scope_

Context in which `expression` should be evaluated.

:baby_bottle: **expression** _string_

Expression that will be evaluated within the context of `scope` to obtain our
current value.

:dash: _Bacon.Property_

Returns the created property.

## functionAsStream(scope, expression)

:octocat: [`src/scope.js#L243`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L243)

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

:baby_bottle: **scope** _$rootScope.Scope_

Context in which stream origin function should be registered.

:baby_bottle: **expression** _string_

Expression that determines where in `scope` our stream origin function will be
exposed.

:dash: _Bacon.EventStream_

Returns the created event stream.

## digestObservable(scope, expression, observable)

:octocat: [`src/scope.js#L314`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L314)

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

:baby_bottle: **scope** _$rootScope.Scope_

Context in which values from `observable` should be made available.

:baby_bottle: **expression** _string_

Expression that determines where in `scope` values from `observable` will be
exposed.

:baby_bottle: **observable** _Bacon.Observable_

The observable that should be amended with the digest logic.

:dash: _Bacon.Observable_

Returns the original observable but extended with the digest logic.

