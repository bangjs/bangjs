;!function (angular) { 'use strict';

angular.module('bang').

/**
 * @ngdoc service
 * @name bang.location
 * @module bang
 * @requires $location
 * @description
 * Exposes helper functions to integrate with `$location`.
 */
service('bang.location', ['$location', function ($location) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.location#asProperty
	 */
	this.asProperty = function (getValue) {
		return $location.asProperty(getValue);
	};

}]).

config(['$provide', function ($provide) {

	$provide.decorator('$location', ['$delegate', '$rootScope', function ($delegate, $rootScope) {

		Object.getPrototypeOf($delegate).asProperty = function (getValue) {
			var $location = this;

			return $rootScope.createProperty(function () {

				return getValue.call($location);

			}, function (next, invalidate) {

				return this.$on('$locationChangeSuccess', invalidate);

			}).skipDuplicates();

		};

		return $delegate;

	}]);

}]);

}(window.angular);