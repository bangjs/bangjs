;!function (angular) { 'use strict';

angular.module('bang').

/**
@ngdoc service
@name bang.location
@module bang
@description

Exposes helper functions to integrate Bacon.js observables with `$location`.
*/
service('bang.location', ['$rootScope', 'Bacon', function ($rootScope, Bacon) {

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
		return Bacon.fromBinder(function (sink) {
			
			sink(new Bacon.Initial(getValue()));
			
			$rootScope.$on('$locationChangeSuccess', function () {
				sink(new Bacon.Next(getValue()));
			});
			
		}).skipDuplicates().toProperty();
	};

}]).

config(['$provide', function ($provide) {
	
	$provide.decorator('$location', ['$delegate', 'bang.location', function ($delegate, bangLocation) {
		
		Object.getPrototypeOf($delegate).asProperty = bangLocation.asProperty;
		
		return $delegate;
		
	}]);

}]);

}(window.angular);