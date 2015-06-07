Module [`bang`](index.md) :boom:
# Service `bang.location`

Exposes helper functions to integrate Bacon.js observables with `$location`.

### Index

* [`asProperty`](#aspropertygetvalue)


## asProperty(getValue)

:octocat: [`src/location.js#L15`](https://github.com/bangjs/bangjs/tree/master/src/location.js#L15)

Watches a value from `$location` and makes it available as a property.

This method is also available on `$location` under the same name.

```js
var isLoggedIn = false;

var path = $location.asProperty(function () {
	return $location.path();
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

:baby_bottle:  **getValue** _function()_

Function that will be called every time the property needs to know its current
value.

:dash: _Bacon.Property_

Returns the created property.

