# Service `bang`

Lives in module [`bang`](index.md).

Exposes AngularJS-level helper functions.


### Method `bang.createScopeStream(scope, subscribe)`

Creates a stream that automatically ends when provided scope is
destroyed.

##### Argument `scope`

_$rootScope.Scope_ — Context in which stream should operate.

##### Argument `subscribe`

_function(Function, Function)_ — Stream binder function
  that describes its incoming events. Its first argument is a function
  that can be called to issue a next event with given value. Its second
  argument is a function that can be called to end the stream.

##### Returns

_Bacon.EventStream_ — The created event stream.

