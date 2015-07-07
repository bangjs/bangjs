;!function (angular, Bacon) { 'use strict';

/**
@ngdoc module
@name bang
@description

The main BangJS module. Add this to your app module dependencies to get going.
*/
angular.module('bang', []).

/**
@ngdoc service
@name Bacon
@module bang
@description

Exposes {@link https://baconjs.github.io/ Bacon.js} as a service.
*/
constant('Bacon', Bacon);

}(window.angular, typeof exports === 'object' ? require('baconjs') : window.Bacon);