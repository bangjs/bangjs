;!function (bang, angular, atc, Bacon) {

bang.controller = function (ctrlName) {
	var fieldDefs = [].slice.call(arguments, 1);

	return atc.apply(this, [ctrlName].concat(fieldDefs).concat([function (scope, fields) {

		angular.forEach(fields, function (field) {
			// TODO: Listen for errors and log those when in debug mode.
			// OR: read section Errors on Bacon site to understand exactly
			// what is swallowed and when, as we may also want a try catch
			// block here and there. For example, the fact that `.doAction`
			// swallows exceptions is truly messed up.
			var value = field.instance(scope);
			if (value instanceof Bacon.Observable)
				value.subscribe(angular.noop);
		});

	}]));

};

}(window.bang, window.angular, window.atc, window.Bacon);