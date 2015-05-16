Module [`bang`](index.md) :boom:
# Service `bang.scope`

Exposes helper functions to integrate with AngularJS scopes.


## createStream(scope, subscribe)

:octocat: [`src/scope.js#L16`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L16)

Creates a stream that automatically ends when provided scope is
destroyed.

This method is also available on `$rootScope` under the same name, minus
the `scope` parameter.

```js
angular.module('myModule').controller(['$scope', function ($scope) {
	 
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
  
}]);
```

:baby_bottle: **scope** _$rootScope.Scope_

Context in which stream should operate.

:baby_bottle: **subscribe** _function(Function, Function)_

Binder function that
  describes its incoming events. Its first argument is a function that
  can be called to issue a next event with given value. Its second
  argument is a function that can be called to end the stream.

:dash: _Bacon.EventStream_

Returns the created event stream.

## createProperty(scope, getValue, subscribe)

:octocat: [`src/scope.js#L86`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L86)

Creates a property with an initial value that accounts for laziness of
the property. In other words; the initial value is not generated as long
as the property is not subscribed to.

Resulting property automatically ends when provided scope is destroyed.

This method is also available on `$rootScope` under the same name, minus
the `scope` parameter.

```js
angular.module('myModule').controller(['$scope', '$document', function ($scope, $document) {
	 
  // `$document.title` has some value other than `"Initial title"` here.

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
  
}]);
```

:baby_bottle: **scope** _$rootScope.Scope_

Context in which property should
  operate.

:baby_bottle: **getValue** _Function_

Function that will be called every time the
  property needs to know its current value.

:baby_bottle: **subscribe** _function(Function, Function, Function)_

Binder
  function that describes its incoming events. Its first argument is a
  function that can be called to issue a next event with given value. Its
  second argument is a function that can be called to issue a next event
  with value as provided by `getValue`. Its third argument is a function
  that can be called to end the stream.

:dash: _Bacon.Property_

Returns the created property.

## watchAsProperty()

:octocat: [`src/scope.js#L178`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L178)




## functionAsStream()

:octocat: [`src/scope.js#L196`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L196)




## digestObservable()

:octocat: [`src/scope.js#L224`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L224)




