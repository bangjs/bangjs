Module [`bang`](index.md) :boom:
# Service `bang`

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

### Index

* [`component`](#componentface-fields)
* [`stream`](#streamsetup)
* [`stream.expose`](#streamexposesetup)
* [`stream.method`](#streammethodflatmaplatest)
* [`property`](#propertysetup)
* [`property.expose`](#propertyexposesetup)
* [`property.digest`](#propertydigestsetup)
* [`property.watch`](#propertywatchmerge)


## component(face, fields)

:octocat: [`src/bang.js#L225`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L225)

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

:baby_bottle:  **face** _Object|$rootScope.Scope_

Object onto which public interface of component should be constructed, which can
be a scope in case of a controller component.

:baby_bottle:  **fields** _Object.&lt;string, (Bacon.Field|Object)&gt;_

Object with stream and property factories, indexed by their names. Objects may
be nested.

Multiple `fields` objects can be specified, all of which will be flattened and
then merged into a single one-dimensional map of key–value pairs.

:dash: _Bacon.Circuit_

Returns the constructed component.

## stream(setup)

:octocat: [`src/bang.js#L272`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L272)

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

:baby_bottle:  **setup** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed stream field.

## stream.expose(setup)

:octocat: [`src/bang.js#L302`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L302)

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Resulting observable will be exposed on the outward facing interface object
(`face`) represented by the component and field name as supplied on stream
activation.

:baby_bottle:  **setup** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed stream field.

## stream.method([flatMapLatest])

:octocat: [`src/bang.js#L336`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L336)

Creates a stream field; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Upon stream activation a function will be made available on the outward facing
interface object (`face`) represented by the component and field name as
supplied on property activation. Every invocation of this function will result
in an event in the created event stream.

:baby_bottle: optional **flatMapLatest** _function(...arguments)_

Determines how the function call arguments map (or more precisely:
flat-map-latest) to events in the resulting event stream. If not specified, the
full `arguments` object will make up the event value.

:dash: _Bacon.Field_

Returns the constructed stream field.

## property(setup)

:octocat: [`src/bang.js#L359`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L359)

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

:baby_bottle:  **setup** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed property field.

## property.expose(setup)

:octocat: [`src/bang.js#L390`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L390)

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Resulting observable will be exposed on the outward facing interface object
(`face`) represented by the component and field name as supplied on property
activation.

:baby_bottle:  **setup** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed property field.

## property.digest(setup)

:octocat: [`src/bang.js#L425`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L425)

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Every value of resulting observable will be assigned to outward facing interface
object (`face`) represented by the component and field name as supplied on
property activation.

:baby_bottle:  **setup** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed property field.

## property.watch([merge])

:octocat: [`src/bang.js#L460`](https://github.com/bangjs/bangjs/tree/master/src/bang.js#L460)

Creates a property field; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Events of this property reflect changes of value on the outward facing interface
object (`face`) represented by the component and field name as supplied on
property activation. Note that initial scope variable value (if any) is ignored
by default, as to make room for initial values from other sources (provided via
`merge`).

:baby_bottle: optional **merge** _function(sink, me, name, component)_

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

:dash: _Bacon.Field_

Returns the constructed property field.

