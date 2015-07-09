;!function (angular) { 'use strict';

angular.module('bang').

/**
@ngdoc service
@name bang
@module bang
@description

Exposes tools for building FRP-grade services and controllers.

The following example gives an overview of how the functions in this service can
be combined to implement powerful and robust asynchronous controller logic that
can be easily hooked into any kind of view.

```js
angular.module('demoModule', ['bang']).controller('demoCtrl', [
'$scope', '$http', 'Bacon', 'bang',
function ($scope, $http, Bacon, bang) {

	$scope.toString = function () {
		// Use this name in debug logs:
		return "demoCtrl";
	};

	bang.component($scope, {

		loggedInUser: bang.property.digest(function () {
			return Bacon.fromPromise( $http.get('/me') );
		}),

		books: {
		
			search: bang.stream.method(function (query) {
				return query;
			}),

			all: bang.property(function () {
				return this.books.search.flatMapLatest(function (query) {
					return Bacon.fromPromise( $http.get('/searchBooks', { q: query }) );
				});
			})

		},

		isBusy: bang.property.digest(function () {
			return this.books.search.awaiting(this.books.all.mapError());
		}),

		input: {
			
			rating: bang.property.watch(function () {
				return Bacon.once(0);
			})

		}

		'books.listed': bang.property.digest(function () {
			return Bacon.combineWith(
				function (books, rating) {
					return books.filter(function (book) {
						return book.rating >= rating;
					});
				}, this.books.all, this.input.rating
			);
		}),
		
		deals: bang.property.digest(function (sink) {
			// This field could be implemented similar to the previous,
			// combining listed books and user country, but we could also opt
			// for a more traditional approach as follows. (But also notice how
			// much more verbose it is.)

			var bookIds;
			this.books.listed.onValue(function (books) {
				bookIds = books.map(function (book) {
					return book.id;
				});
				update();
			});

			var country;
			this.loggedInUser.onValue(function (user) {
				country = user.country;
				update();
			});

			var pending = 0;
			function update() {
				if (bookIds === undefined || country === undefined) return;

				pending++;
				$http.get('/searchDeals', {
					bookIds: bookIds,
					country: country,
					limit: 5
				}).then(function (deals) {
					if (pending === 1) sink(deals);
				}, function (err) {
					sink(new Bacon.Error(err));
				}).finally(function () {
					pending--;
				});
			}
		})

	});

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
service('bang', ['$rootScope', '$parse', '$q', '$log', 'Bacon', function ($rootScope, $parse, $q, $log, Bacon) {
	
	// Circuit type used on service singletons.
	
	function Service() {
		Bacon.Circuit.apply(this, arguments);
	}
	Service.prototype = new Bacon.Circuit();
	Service.prototype.constructor = Service;
	
	Service.prototype.toString = function () {
		return this.face.hasOwnProperty('toString') ?
			this.face.toString() : this.face.constructor.name;
	};
	
	// Circuit type used on scope instances.
	
	function Scope() {
		Bacon.Circuit.apply(this, arguments);
	}
	Scope.prototype = new Bacon.Circuit();
	Scope.prototype.constructor = Scope;
	
	Scope.prototype.toString = function () {
		return (this.face.hasOwnProperty('toString') ?
			this.face.toString() : "Scope") + "(" + this.face.$id + ")";
	};
	// TODO: Remove this, as not used and not part of Bacon.Circuit interface.
	Scope.prototype.get = function (key) {
		return $parse(key)(this.face);
	};
	// TODO: Do not set value if new value equals current value (as in `watch`).
	Scope.prototype.set = function (key, value) {
		// Let Angular know that the scope has (probably) been changed, without
		// forcing an(other) digest loop right away. Assign the actual value
		// *before* doing so because `set()` is expected to assign
		// synchronously.
		$parse(key).assign(this.face, value);
		this.face.$evalAsync();
		return this;
	};
	Scope.prototype.watch = function (key, cb) {
		this.face.$watch(key, function (to, from) {
			if (to !== from) cb(to);
		});
		return this;
	};
	
	// General component behavior.
	
	var promiseConstructor = $q;
	if (!angular.isFunction(promiseConstructor))
		// Imitate ES6 `Promise` and `Q.Promise` constructor interface for Angular 1.2.
		promiseConstructor = function (resolver) {
			var deferred = $q.defer();
			resolver(deferred.resolve, deferred.reject);
			angular.extend(this, deferred.promise);
		};
	Service.prototype.promiseConstructor = Scope.prototype.promiseConstructor = promiseConstructor;
	
	Service.prototype.onEvent = Scope.prototype.onEvent = function (key, observable, event) {
		var eventTypeColor = "SaddleBrown";
		if (event.isError())
			eventTypeColor = "Crimson";

		var args = [
			["%c\uD83D\uDCA5%s", "%c%s", "%c%s"].join(" "),
			"color: Gray", this.toString(),
			"color: " + eventTypeColor, key,
			"color: Gray", event.isEnd() ? "\u00D7" : observable instanceof Bacon.Property ? "=" : "\u2192"
		];

		if (!event.isEnd())
			args.push(event.isError() ? event.error : event.value());

		$log.debug.apply($log, args);
	};
	
/**
@ngdoc method
@name module:bang.service:bang#component
@description

Creates an integrated collection of observables powering an outward facing
application programming interface. Ready to power either controller view scope
or service interface.

The collection of supplied `fields` will first be transformed into a collection
of observable instances by assigning each of them onto the (nested) object
property as defined by their field name (flattened object key).

Then each of these observables will be activated by executing their
initialization logic in the context of the collection of observables. More
specifically: the setup function as supplied upon factory construction will be
invoked with said collection as `this`, and with corresponding field name and
scope as arguments.

Logs all events in each of its observables to debug console for instant insight
and rapid debugging during development. Note that currently this feature looks
best in Google Chrome and Safari. Messages are outputted via `$log.debug()`,
which means they can be disabled using the `$logProvider.debugEnabled()` flag.

@param {Object|$rootScope.Scope} face
Object onto which public interface of component should be constructed, which can
be a scope in case of a controller component.

@param {Object.<string, (Bacon.Field|Object)>} fields
Object with stream and property factories, indexed by their names. Objects may
be nested.

Multiple `fields` objects can be specified, all of which will be flattened and
then merged into a single one-dimensional map of key–value pairs.

@returns {Bacon.Circuit}
Returns the constructed component.
*/
	this.component = function (face) {
		var fields = [].slice.call(arguments, 1);
		
		if (face instanceof $rootScope.constructor)
			return new Scope(face, fields);
		
		return new Service(face, fields);
	};
	
/**
@ngdoc method
@name module:bang.service:bang#stream
@description

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

@param {function(sink, me, name, component)} setup
Initialization function that defines stream dependencies and behavior. Should
return an observable from which the eventual event stream will be instantiated.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events according to the this setup function's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed stream field.
*/

/**
@ngdoc method
@name module:bang.service:bang#stream.expose
@description

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Resulting observable will be exposed on the outward facing interface object
(`face`) represented by the component and field name as supplied on stream
activation.

@param {function(sink, me, name, component)} setup
Initialization function that defines stream dependencies and behavior. Should
return an observable from which the eventual event stream will be instantiated.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events according to the this setup function's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed stream field.
*/

/**
@ngdoc method
@name module:bang.service:bang#stream.method
@description

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Upon stream activation a function will be made available on the outward facing
interface object (`face`) represented by the component and field name as
supplied on property activation. Every invocation of this function will result
in an event in the created event stream.

@param {function(...arguments)=} flatMapLatest
Determines how the function call arguments map (or more precisely:
flat-map-latest) to events in the resulting event stream. If not specified, the
full `arguments` object will make up the event value.

@returns {Bacon.Field}
Returns the constructed stream field.
*/
	this.stream = Bacon.Circuit.Field.stream;
	
/**
@ngdoc method
@name module:bang.service:bang#property
@description

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

@param {function(sink, me, name, component)} setup
Initialization function that defines property dependencies and behavior. Should
return an observable from which the eventual property stream will be
instantiated.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events according to the this setup function's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed property field.
*/

/**
@ngdoc method
@name module:bang.service:bang#property.expose
@description

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Resulting observable will be exposed on the outward facing interface object
(`face`) represented by the component and field name as supplied on property
activation.

@param {function(sink, me, name, component)} setup
Initialization function that defines property dependencies and behavior. Should
return an observable from which the eventual property stream will be
instantiated.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events according to the this setup function's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed property field.
*/

/**
@ngdoc method
@name module:bang.service:bang#property.digest
@description

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Every value of resulting observable will be assigned to outward facing interface
object (`face`) represented by the component and field name as supplied on
property activation.

@param {function(sink, me, name, component)} setup
Initialization function that defines property dependencies and behavior. Should
return an observable from which the eventual property stream will be
instantiated.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events according to the this setup function's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed property field.
*/

/**
@ngdoc method
@name module:bang.service:bang#property.watch
@description

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Events of this property reflect changes of value on the outward facing interface
object (`face`) represented by the component and field name as supplied on
property activation. Note that initial scope variable value (if any) is ignored
by default, as to make room for initial values from other sources (provided via
`merge`).

@param {function(sink, me, name, component)=} merge
Should return an observable which will be merged into the event stream that
watches the interface variable. Can be used to define an initial value.

The function `sink` provided as first argument can be used to push events to the
resulting observable (similar to the first argument of the callback function
passed to `Bacon.fromBinder`). The second argument `me` refers to the observable
instance that will dispatch the events resulting from this field's
implementation. Having this available inside its own factory method makes it
easy to assign side-effects to its own stream of events. The values of `this`,
`name` and `component` are determined upon activation (i.e. calling
`field.start(context, name, component)`).

If field is constructed and activated in the context of `bang.component()`,
`this` will equal the collection of observables, and the `name` and `component`
arguments will be the corresponding field name (flattened object key) and
component (`Bacon.Circuit` instance) respectively.

@returns {Bacon.Field}
Returns the constructed property field.
*/
	this.property = Bacon.Circuit.Field.property;
	
}]);

}(window.angular);