Module [`bang`](index.md) :boom:
# Service `bang.controller`

Exposes tools to build controllers.

The following example gives an overview of how the functions in this service can
be combined to implement controller logic that can be easily hooked into any
kind of view.

```js
angular.module('demoModule', ['bang']).controller('demoCtrl', [
'$scope', '$http', 'Bacon', 'bang.controller',
function ($scope, $http, Bacon, ctrl) {

	ctrl.create($scope, {

		loggedInUser: ctrl.property(function () {
			return Bacon.fromPromise($http.get('/me'));
		}),

		books: {
		
			search: ctrl.stream.calls(0),

			all: ctrl.property(function () {
				return this.books.search.flatMapLatest(function (query) {
					return Bacon.fromPromise($http.get('/searchBooks', { q: query }));
				});
			})

		},

		isBusy: ctrl.property(function () {
			return this.books.search.awaiting(this.books.all.mapError());
		}),

		input: {
			
			rating: ctrl.property.watch()

		}

	// Splitting this object does not serve any real purpose in this particular
	// example, other than demonstrating how object merging works.
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
				return Bacon.fromPromise($http.get('/searchDeals', queryDeals));
			});
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
  
  <h2>{{books.listed.length}} out of {{books.all.length}} results</h2>
  <ul>
    <li ng-repeat="book in books.listed">
      <a ng-href="{{book.url}}">{{book.title}}</a> by {{book.author}}
      <span class="rating">{{book.rating}}</span>
    </li>
  </ul>
</div>
```

### Index

* [`create`](#createscope-observables)
* [`stream`](#stream)
* [`stream.calls`](#streamcalls)
* [`property`](#property)
* [`property.watch`](#propertywatch)


## create(scope, observables)

:octocat: [`src/controller.js#L119`](https://github.com/nouncy/bangjs/tree/master/src/controller.js#L119)

Creates an integrated collection of observables bound to a scope, ready to power
any type of view.

:baby_bottle: **scope** _$rootScope.Scope_

Scope to which the defined observables are connected.

:baby_bottle: **observables** _Object.&lt;string, (Factory|Object)&gt;_

Object with stream and property factories, indexed by their names. Objects may
be nested.

Multiple `observables` objects can be specified, all of which will be flattened
and then merged into a single non-nested map of key–value pairs.

:dash: _Object.&lt;string, Bacon.Observable&gt;_

Returns the merged, flattened and activated collection of observables.

## stream()

:octocat: [`src/controller.js#L197`](https://github.com/nouncy/bangjs/tree/master/src/controller.js#L197)




## stream.calls()

:octocat: [`src/controller.js#L207`](https://github.com/nouncy/bangjs/tree/master/src/controller.js#L207)




## property()

:octocat: [`src/controller.js#L222`](https://github.com/nouncy/bangjs/tree/master/src/controller.js#L222)




## property.watch()

:octocat: [`src/controller.js#L232`](https://github.com/nouncy/bangjs/tree/master/src/controller.js#L232)




