;!function (angular, Bacon) { 'use strict';

angular.module('bang').

run(['$window', '$location', function ($window, $location) {

	Bacon.Observable.prototype.redirect = function (to, replace) {

		return this.doAction(function (value) {
			var redirectTo = angular.isFunction(to) ? to(value) : to;
			// TODO: This condition is not accurate as a determiner for doing an
			// "internal" versus "external" redirect, but for now it suffices.
			if (redirectTo.indexOf("://") === -1) {
				// TODO: Assuming that `redirectTo` holds solely a path is a bit
				// tricky.
				$location.path(redirectTo);
				if (replace)
					$location.replace();
			} else {
				$window.location[replace ? 'replace' : 'assign'](redirectTo);
			}
		});
	};

	Bacon.Observable.prototype.doErrorAction = function (fn) {
		return Bacon.mergeAll(
			this,
			this.errors().mapError(angular.identity).doAction(fn).filter(false)
		);
	};

}]).

/**
@ngdoc service
@name Bacon
@module bang
@description

Exposes {@link https://baconjs.github.io/ Bacon.js} as a service.
*/
constant('Bacon', Bacon);

}(window.angular, window.Bacon);