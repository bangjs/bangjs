;!function (bang, angular, atc) {

var injector = angular.injector();

bang.service = function (fn) {
	var init = function (context, value) {
		return (angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this, value);
	};
	init.$inject = injector.annotate(fn);

	return bang.service.chain(init);
};

bang.service.chain = function (fn) {
	if (angular.isFunction(fn))
		fn.$inject = fn.$inject || [];

	var env;

	if (this === bang.service) {
		env = function (deps) {
			var context = this;

			angular.forEach(deps, function (dep, key) {
				if (dep instanceof atc.Field)
					deps[key] = dep.instance(context.$scope);
			});

			env.run.forEach(function (fn) {
				var result = fn.call(deps, context, env.value);
				if (result !== undefined)
					env.value = result;
			});

			return env.value;
		};
		env.run = [];
		env.value = undefined;
		env.$inject = [];
		env.chain = bang.service.chain;
	} else {
		env = this;
	}

	env.run.push(angular.isArray(fn) ? fn[fn.length - 1] : fn);
	// Make sure `injector.annotate(fn)` does not deduce argument names as
	// dependencies.
	env.$inject = env.$inject || [];
	env.$inject = env.$inject.concat(injector.annotate(fn));

	return env;
};

/*
angular.module(...).config(bang.controller('myCtrl', {
	a: bang.service(function () {
		return 'x';
	}).scopeDigest(),
	b: bang.service(['.a', function () {
		return this.a.toUpperCase();
	}])
}));

angular.module(...).config(bang.service('mySvc', function () {
	return 'x';
}).scopeDigest());
*/

}(window.bang, window.angular, window.atc);