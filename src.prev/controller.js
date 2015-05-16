;!function (bang, angular, atc, Bacon) {

bang.controller = function () {

	return atc.apply(this, [].slice.call(arguments).concat([function (scope, fields) {

		angular.forEach(fields, function (field) {
			// TODO: Listen for errors and log those when in debug mode.
			// OR: read section Errors on Bacon site to understand exactly
			// what is swallowed and when, as we may also want a try catch
			// block here and there. For example, the fact that `.doAction`
			// swallows exceptions is truly messed up.
			if (field instanceof Bacon.Observable)
				field.subscribe(angular.noop);
		});

	}]));

};

}(window.bang, window.angular, window.atc, window.Bacon);