Module [`bang`](index.md) :boom:
# Service `bang.scope`

Exposes helper functions to integrate with AngularJS scopes.

## bang.scope.createStream(scope, subscribe)

:octocat: [`src/scope.js#L16`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L16)

Creates a stream that automatically ends when provided scope is
destroyed.

```js
angular.module('myModule').controller(['$scope', function ($scope) {
	 
  var stream = $scope.createStream(function (next, end) {
    next(1);
    setTimeout(function () {
      next(2);
      end();
    }, 2000);
  });
  
}]);
```

:baby_bottle: **scope** _$rootScope.Scope_

Context in which stream should operate.

:baby_bottle: **subscribe** _function(Function, Function)_

Stream binder function
  that describes its incoming events. Its first argument is a function
  that can be called to issue a next event with given value. Its second
  argument is a function that can be called to end the stream.

:dash: _Bacon.EventStream_

Returns the created event stream.
## bang.scope.createProperty()

:octocat: [`src/scope.js#L72`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L72)



## bang.scope.watchAsProperty()

:octocat: [`src/scope.js#L105`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L105)



## bang.scope.functionAsStream()

:octocat: [`src/scope.js#L123`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L123)



## bang.scope.digestObservable()

:octocat: [`src/scope.js#L151`](https://github.com/nouncy/bangjs/tree/master/src/scope.js#L151)




