Module [`bang`](index.md) :boom:
# Service `bang`

Exposes AngularJS-level helper functions.

## bang.createScopeStream(scope, subscribe)

:octocat: [`src/module.js#L26`](https://github.com/nouncy/bangjs/tree/master/src/module.js#L26)

Creates a stream that automatically ends when provided scope is
destroyed.

:baby_bottle: **scope** _$rootScope.Scope_

Context in which stream should operate.

:baby_bottle: **subscribe** _function(Function, Function)_

Stream binder function
  that describes its incoming events. Its first argument is a function
  that can be called to issue a next event with given value. Its second
  argument is a function that can be called to end the stream.

:dash: **Returns** _Bacon.EventStream_

The created event stream.

