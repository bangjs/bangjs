### 0.4.0 :dizzy:
_Monday 5 October 2015_

* Expose Service and Scope circuit types.
* Component returns circuit context instead of circuit instance.
* Component takes optional name.
* `Scope.prototype.set` doesn't do anything if value not changed.
* Ditch `Scope.prototype.get` because not used.
* Update to use Bacon.Circuit v0.2.4.
* Expand tests and update docs.


### 0.3.3 :sparkles:
_Sunday 6 September 2015_

* Update to use Bacon.Circuit v0.2.3 (bugfix release).
* Be a little more cautious with automatic Bacon.Circuit updates.


### 0.3.2 :sparkles:
_Sunday 30 August 2015_

* Update to use Bacon.Circuit v0.2.2 (bugfix release).
* Minor tweak in NPM package configuration.
* Tiny docs improvement.


### 0.3.1 :sparkles:
_Thursday 9 July 2015_

* Update to use Bacon.Circuit v0.2.1 (bugfix release).


### 0.3.0 :dizzy:
_Tuesday 7 July 2015_

* Update to use Bacon.Circuit v0.2.0.
* Adjust corresponding parts of our API and docs accordingly.
* Scopes can be assigned a name to be used by debug logger.
* Debug logger can deal with events of type `Bacon.End`.


### 0.2.1 :sparkles:
_Sunday 7 June 2015_

* Add verified support for AngularJS v1.3 and v1.4.
* Enable test suite to run against multiple versions of AngularJS.
* Move test and doc configurations to their own directories.
* Update documentation of `bang.location` to reflect a change from v0.2.
* Logger ignores the `Bacon.Initial` event type because of [its dubious semantics](https://github.com/baconjs/bacon.js/issues/598).
* Better string representation of various types of interface objects; improves logger expressiveness.


### 0.2.0 :dizzy:
_Tuesday 2 June 2015_

* Make the functionality that used to be in `bang.controller` more generic (no longer exclusively useful for building controllers).
* Make the resulting service into BangJS's central offering (in service `bang`).
* Move its core logic towards an autonomous package `bacon.circuit` and implement BangJS in terms of it.
* Refactor `bang.location` and slightly modify its interface to get rid of circular dependency issue.
* Use npm in favor of Bower for front-end package management.
* Facelift for CHANGES.


### 0.1.5 :sparkles:
_Monday 25 May 2015_

* Fancy debug logging in `bang.controller#create`.
* Some trivial improvements in README and CHANGES.


### 0.1.4 :sparkles:
_Sunday 24 May 2015_

* Fix bug in `stream.calls()` when used without arguments.
* Do not crash `createStream()` when supplied scope does not have `$on()`.
* Add reference to TodoMVC app in README.
* Tiny improvement in docs for `bang.controller#create`.


### 0.1.3 :sparkles:
_Tuesday 19 May 2015_

* Include dist and docs that reflect changes from 0.1.2.
* Update change log.


### 0.1.2 :sparkles:
_Tuesday 19 May 2015_

* Fix bug where `functionAsStream` omitted to separate functions with the same name but on different scopes.


### 0.1.1 :sparkles:
_Monday 18 May 2015_

* Fix bug in links from documentation to source code.
* Add release history.
* Add links to home page and release history to README.


### 0.1.0 :zap:
_Sunday 17 May 2015_

Initial release.