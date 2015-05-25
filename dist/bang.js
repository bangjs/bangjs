;!function (angular) { 'use strict';

/**
@ngdoc module
@name bang
@description

The main BangJS module. Add this to your app module dependencies to get going.
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
@ngdoc service
@name Bacon
@module bang
@description

Exposes {@link https://baconjs.github.io/ Bacon.js} as a service.
*/
constant('Bacon', Bacon);

}(window.angular, window.Bacon);
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

			if (angular.isFunction(scope.$on))
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
;!function (angular) { 'use strict';

angular.module('bang').

/**
@ngdoc service
@name bang.location
@module bang
@description

Exposes helper functions to integrate Bacon.js observables with `$location`.
*/
service('bang.location', ['$location', function ($location) {

/**
@ngdoc method
@name module:bang.service:bang.location#asProperty
@description

Watches a value from `$location` and makes it available as a property.

This method is also available on `$location` under the same name.

```js
var isLoggedIn = false;

var path = $location.asProperty(function () {
	return this.path();
}).doAction(function (value) {
	if (isLoggedIn) return;

	$scope.$apply(function () {
		$location.path('/login').replace();
	});
});

$scope.$apply(function () {
	$location.path('/home').replace();
});

path.onValue(function (value) {
	console.log(value);
});

// → "/home"
// → "/login"
```

@param {function()} getValue
Function that will be called every time the property needs to know its current
value. Receives `$location` as `this`.

@returns {Bacon.Property}
Returns the created property.
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
@ngdoc service
@name bang.controller
@module bang
@description

Exposes tools for building controllers.

The following example gives an overview of how the functions in this service can
be combined to implement powerful and robust asynchronous controller logic that
can be easily hooked into any kind of view.

```js
angular.module('demoModule', ['bang']).controller('demoCtrl', [
'$scope', '$http', 'Bacon', 'bang.controller',
function ($scope, $http, Bacon, ctrl) {

	var collection = ctrl.create($scope, {

		loggedInUser: ctrl.property(function () {
			return Bacon.fromPromise( $http.get('/me') );
		}),

		books: {
		
			search: ctrl.stream.calls(0),

			all: ctrl.property(function () {
				return this.books.search.flatMapLatest(function (query) {
					return Bacon.fromPromise( $http.get('/searchBooks', { q: query }) );
				});
			})

		},

		isBusy: ctrl.property(function () {
			return this.books.search.awaiting(this.books.all.mapError());
		}),

		input: {
			
			rating: ctrl.property.watch()

		}

	// Note that splitting this object does not serve any real purpose in this
	// particular example, other than demonstrating how object merging works.
	}, {

		'books.listed': ctrl.property(function () {
			return Bacon.combineWith(
				function (books, rating) {
					return books.filter(function (book) {
						return book.rating >= rating;
					});
				}, this.books.all, this.input.rating
			);
		}),
		
		deals: ctrl.property(function () {
			return Bacon.combineTemplate({
				bookIds: this.books.listed.map(function (books) {
					return books.map(function (book) {
						return book.id;
					});
				}),
				country: this.loggedInUser.map('.country'),
				limit: 5
			}).flatMapLatest(function (queryDeals) {
				return Bacon.fromPromise( $http.get('/searchDeals', queryDeals) );
			});
		})

	});

	angular.forEach(collection, function (value, key) {
		console.log(key, value.constructor.name);
	});
	// → "loggedInUser" "Property"
	// → "books.search" "EventStream"
	// → "books.all" "Property"
	// → "books.listed" "Property"
	// → "isBusy" "Property"
	// → "input.rating" "Property"
	// → "deals" "Property"

}]);
```

A corresponding view could look as follows:

```html
<div ng-controller="demoCtrl">
  <h1>Book search</h1>
  
  <form ng-submit="books.search(input.query)">
    <input type="search" ng-model="input.query">
    <button type="submit">
      <span ng-hide="isBusy">Search</span>
      <span ng-show="isBusy">Please wait&hellip;</span>
    </button>
  </form>
  
  <input type="number" placeholder="Minimum rating" ng-model="input.rating">
  
  <h2>Deals</h2>
  <ul>
    <li ng-repeat="deal in deals">
      <a ng-href="{{deal.url}}">Buy {{deal.book.title}} for only
        {{deal.price|currency:loggedInUser.currency}} at {{deal.outlet.name}}</a>
    </li>
  </ul>
  
  <h2>{{books.listed.length}} sufficiently rated out of {{books.all.length}} total matches</h2>
  <ul>
    <li ng-repeat="book in books.listed">
      <a ng-href="{{book.url}}">{{book.title}}</a> by {{book.author}}
      <span class="rating">{{book.rating}}</span>
    </li>
  </ul>
</div>
```
*/
service('bang.controller', ['$parse', 'Bacon', function ($parse, Bacon) {

/**
@ngdoc method
@name module:bang.service:bang.controller#create
@description

Creates an integrated collection of observables bound to a scope, ready to power
any type of view.

Automatically digests all instances of type `Bacon.Property` onto the supplied
scope.

The collection of supplied `factories` will first be transformed into a
collection of observable instances by assigning each of them onto the (nested)
property as defined by their field name (flattened object key).

Then each of these observables will be activated by executing their
initialization logic in the context of the collection of observables. More
specifically: the setup function as supplied upon factory construction will be
invoked with said collection as `this`, and with corresponding field name and
scope as arguments.

@param {$rootScope.Scope} scope
Scope to which the defined observables should be connected.

@param {Object.<string, (Factory|Object)>} factories
Object with stream and property factories, indexed by their names. Objects may
be nested.

Multiple `factories` objects can be specified, all of which will be flattened
and then merged into a single one-dimensional map of key–value pairs.

@returns {Object.<string, Bacon.Observable>}
Returns the merged, flattened and activated collection of observables.
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
@ngdoc method
@name module:bang.service:bang.controller#stream
@description

Creates a stream factory; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

@param {function(stream, name, scope)} init
Initialization function that defines stream dependencies and behavior. Should
return an observable from which the eventual event stream will be instantiated.
The values of `this`, `name` and `scope` are determined upon observable
activation.

If factory is constructed and activated in the context of `create()`, `this`
will equal the collection of observables, and the `name` and `scope` arguments
will be the corresponding field name (flattened object key) and controller scope
respectively. The value of `stream` will be the current stream, which will
always be an empty stream upon initialization.

@returns {Factory}
Returns the constructed stream factory.
*/
	this.stream = function (init) {

		return new StreamFactory(init);

	};

/**
@ngdoc method
@name module:bang.service:bang.controller#stream.calls
@description

Creates a stream factory; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Upon stream activation a function will be made available on the supplied scope
at the supplied field name. Every invocation of this function will result in an
event in the created event stream.

@param {number=} arg
Determines which of the function call arguments is passed on as event value in
the event stream. If not specified, the full arguments array will make up the
event value.

@returns {Factory}
Returns the constructed stream factory.
*/
	this.stream.calls = function (arg) {

		return this(function (me, name, scope) {
			var stream = scope.functionAsStream(name);
			if (arg !== undefined)
				stream = stream.map('.' + arg);
			return stream;
		});

	};

/**
@ngdoc method
@name module:bang.service:bang.controller#property
@description

Creates a property factory; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

@param {function(stream, name, scope)} init
Initialization function that defines property dependencies and behavior. Should
return an observable from which the eventual property stream will be
instantiated. The values of `this`, `name` and `scope` are determined upon
observable activation.

If factory is constructed and activated in the context of `create()`, `this`
will equal the collection of observables, and the `name` and `scope` arguments
will be the corresponding field name (flattened object key) and controller scope
respectively. The value of `stream` will be the current stream, which will
always be an empty stream upon initialization.

@returns {Factory}
Returns the constructed property factory.
*/
	this.property = function (init) {

		return new PropertyFactory(init);

	};

/**
@ngdoc method
@name module:bang.service:bang.controller#property.watch
@description

Creates a property factory; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Events of this property reflect value changes of the scope variable as defined
by the scope and field name that are supplied upon property activation. Note
that initial scope variable value (if any) is ignored by default, as to make
room for initial values from other sources (provided via `merge`).

@param {function()=} merge
Should return an observable which will be merged into the event stream that
watches the scope variable. Can be used to define an initial value.

@returns {Factory}
Returns the constructed property factory.
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