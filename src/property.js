;!function (bang, angular, atc, Bacon) {

var injector = angular.injector();

bang.property = function (fn) {
	var init = function (context, value) {
		return (angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this, value);
	};
	init.$inject = injector.annotate(fn);

	return bang.property.chain(init);
};

bang.property.chain = function (fn, makeLast) {
	if (angular.isFunction(fn))
		fn.$inject = fn.$inject || [];

	var env;

	if (this === bang.property) {
		env = function (deps) {
			var context = this;

			angular.forEach(deps, function (dep, key) {
				if (dep instanceof atc.Field)
					deps[key] = dep.instance(context.$scope);
			});

			env.run.concat(env.runLast).forEach(function (fn) {
				var result = fn.call(deps, context, env.value);
				if (result !== undefined)
					env.value = result;
			});

			return env.value.toProperty();
		};
		env.run = [];
		env.runLast = [];
		env.value = new Bacon.Bus();
		env.$inject = [];
		env.chain = bang.property.chain;
		env.merge = bang.property.merge;
		
		// TODO: Move to its own chainable method (`scopeDigest()`)? How would
		// it be useful?
		var wrap = function (context, value) {
			var assign = this.$parse(context.name).assign;
			return value.doAction(function (v) {
				// TODO: Implement more exact condition
				if (angular.isObject(context.$scope))
					if (angular.isFunction(context.$scope.$evalAsync))
						context.$scope.$evalAsync(function () {
							assign(context.$scope, v);
						});
					else
						assign(context.$scope, v);
			});
		};
		wrap.$inject = ['$parse'];
		env.chain(wrap, true);
	} else {
		env = this;
	}

	(makeLast === true ? env.runLast : env.run).push(angular.isArray(fn) ? fn[fn.length - 1] : fn);
	env.$inject = env.$inject || [];
	env.$inject = env.$inject.concat(injector.annotate(fn));

	return env;
};

bang.property.merge = function (fn) {
	var wrap = function (context, value) {
		return value.merge((angular.isArray(fn) ? fn[fn.length - 1] : fn).call(this/*, value*/));
	};
	wrap.$inject = injector.annotate(fn);

	return this.chain(wrap);
};

}(window.bang, window.angular, window.atc, window.Bacon);