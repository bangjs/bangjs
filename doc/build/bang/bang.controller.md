Module [`bang`](index.md) :boom:
# Service `bang.controller`

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

### Index

* [`create`](#createscope-factories)
* [`stream`](#streaminit)
* [`stream.calls`](#streamcallsarg)
* [`property`](#propertyinit)
* [`property.watch`](#propertywatchmerge)


## create(scope, factories)

:octocat: [`src/controller.js#L130`](https://github.com/bangjs/bangjs/tree/master/src/controller.js#L130)

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

Logs all events in each of its observables to debug console for instant insight
and rapid debugging during development. Note that currently this feature looks
best in Google Chrome and Safari. Messages are outputted via `$log.debug()`,
which means they can be disabled using the `$logProvider.debugEnabled()` flag.

:baby_bottle:  **scope** _$rootScope.Scope_

Scope to which the defined observables should be connected.

:baby_bottle:  **factories** _Object.&lt;string, (Factory|Object)&gt;_

Object with stream and property factories, indexed by their names. Objects may
be nested.

Multiple `factories` objects can be specified, all of which will be flattened
and then merged into a single one-dimensional map of key–value pairs.

:dash: _Object.&lt;string, Bacon.Observable&gt;_

Returns the merged, flattened and activated collection of observables.

## stream(init)

:octocat: [`src/controller.js#L241`](https://github.com/bangjs/bangjs/tree/master/src/controller.js#L241)

Creates a stream factory; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

:baby_bottle:  **init** _function(stream, name, scope)_

Initialization function that defines stream dependencies and behavior. Should
return an observable from which the eventual event stream will be instantiated.
The values of `this`, `name` and `scope` are determined upon observable
activation.

If factory is constructed and activated in the context of `create()`, `this`
will equal the collection of observables, and the `name` and `scope` arguments
will be the corresponding field name (flattened object key) and controller scope
respectively. The value of `stream` will be the current stream, which will
always be an empty stream upon initialization.

:dash: _Factory_

Returns the constructed stream factory.

## stream.calls([arg])

:octocat: [`src/controller.js#L270`](https://github.com/bangjs/bangjs/tree/master/src/controller.js#L270)

Creates a stream factory; an object from which an observable of type
`Bacon.EventStream` can be instantiated and initialized.

Upon stream activation a function will be made available on the supplied scope
at the supplied field name. Every invocation of this function will result in an
event in the created event stream.

:baby_bottle: optional **arg** _number_

Determines which of the function call arguments is passed on as event value in
the event stream. If not specified, the full arguments array will make up the
event value.

:dash: _Factory_

Returns the constructed stream factory.

## property(init)

:octocat: [`src/controller.js#L301`](https://github.com/bangjs/bangjs/tree/master/src/controller.js#L301)

Creates a property factory; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

:baby_bottle:  **init** _function(stream, name, scope)_

Initialization function that defines property dependencies and behavior. Should
return an observable from which the eventual property stream will be
instantiated. The values of `this`, `name` and `scope` are determined upon
observable activation.

If factory is constructed and activated in the context of `create()`, `this`
will equal the collection of observables, and the `name` and `scope` arguments
will be the corresponding field name (flattened object key) and controller scope
respectively. The value of `stream` will be the current stream, which will
always be an empty stream upon initialization.

:dash: _Factory_

Returns the constructed property factory.

## property.watch([merge])

:octocat: [`src/controller.js#L330`](https://github.com/bangjs/bangjs/tree/master/src/controller.js#L330)

Creates a property factory; an object from which an observable of type
`Bacon.Property` can be instantiated and initialized.

Events of this property reflect value changes of the scope variable as defined
by the scope and field name that are supplied upon property activation. Note
that initial scope variable value (if any) is ignored by default, as to make
room for initial values from other sources (provided via `merge`).

:baby_bottle: optional **merge** _function()_

Should return an observable which will be merged into the event stream that
watches the scope variable. Can be used to define an initial value.

:dash: _Factory_

Returns the constructed property factory.

