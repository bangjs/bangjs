// TODO: Rename this file to `components.js` or sth like that

;!function (bang, angular, Bacon) {

bang.controller = function (moduleName, ctrlName) {
	var elements = angular.extend.apply(angular, [].slice.call(arguments, 2));

	// TODO: Auto-add subscribe side effect to each element? As soon as we have
	// that adding or omitting side effects will never have an impact on
	// behavior.
	// ==> Then, we could unsubscribe them all when we receive a $destroy for
	// the scope of this controller.

	atc(moduleName, ctrlName, elements, function (elementName, element) {
		if (angular.isFunction(element) && element.atcify === true)
			element = element(elementName);
		return element;
	});
};

// TODO: can't we also offer the other provider types?
// bang.factory('myStandAloneSvc', bang.property('dep', setup () {}).
// 	merge(...).
// 	promise(...)
// 	onValue(, fn () {
// 		...
// 	}).
// 	storage()
// );

bang.stream = function () {
	var args = [].slice.call(arguments);

	var fn = function (elementName) {

		var invokable = args.filter(function (part) {
			return angular.isFunction(part);
		});

		var deps = args.slice(0, args.indexOf(setup));

		var digest = typeof args[args.length - 1] === 'boolean' ?
			args[args.length - 1] : false;

		var setup = function () {
			var me = new Bacon.Bus();
			var setupContext = angular.extend({}, this);
			delete setupContext.$scope;
			var result = invokable[0].call(setupContext, me);
			// TODO: We could throw a warning (in debug mode) if `invokable[0]`
			// does not define an argument *and* `result` is not plugable.
			if (result instanceof Bacon.Observable)
				// TODO: Unplug under any condition?
				me.plug(result);
			// TODO: Do not expose the `Bus` interface in the returned stream.
			return me;
		};

		var sidefx = function (me) {
			if (angular.isFunction(invokable[1]))
				invokable[1].apply(this, arguments);
			if (digest)
				this.$scope.digest(elementName, me);
		};

		return deps.concat([setup, sidefx]);
	};
	fn.atcify = true;
	return fn;
};

bang.stream.invocations = function () {
	var fn = function (elementName) {
		return function () {
			return this.$scope.functionAsStream(elementName).map(function (args) {
				// TODO: We should probably move this behavior (or a spread) to
				// `functionAsStream()`.
				return args[0];
			});
		};
		// TODO: No problems caused by the fact that this stream remains lazy?
	};
	fn.atcify = true;
	return fn;
};

bang.property = function () {
	var args = [].slice.call(arguments);

	var fn = function (elementName) {

		var invokable = args.filter(function (part) {
			return angular.isFunction(part);
		});

		var deps = args.slice(0, args.indexOf(invokable[0]));

		var digest = typeof args[args.length - 1] === 'boolean' ?
			args[args.length - 1] : elementName.charAt(0) !== '_';

		var setup = function () {
			// TODO: The idea behind offering this Bus is that inside `setup`
			// one can choose to work more conventional, as follows:
			//	function (me) { this.x.onValue(function (v) { me.push(v); })}
			// This looks nice, but wouldn't it reintroduce the lazy evaluation/
			// subscribe ordering issue that this controller was supposed to
			// resolve??
			// ==> Isn't the answer that you should use `doAction` instead of
			// `onValue`/`subscribe`??
			var me = new Bacon.Bus();
			var setupContext = angular.extend({}, this);
			delete setupContext.$scope;
			var result = invokable[0].call(setupContext, me);
			if (result instanceof Bacon.Observable)
				// TODO: Unplug under any condition?
				me.plug(result);
			return me.toProperty();
		};

		var sidefx = function (me) {
			if (angular.isFunction(invokable[1]))
				invokable[1].apply(this, arguments);
			if (digest)
				this.$scope.digest(elementName, me);
		};

		return deps.concat([setup, sidefx]);
	};
	fn.atcify = true;
	return fn;
};

bang.property.conditional = function (source, condition) {
	return this('bang', source, condition, function () {
		return this.bang.createConditionalProperty(this[source], this[condition]);
	});
};

/**
 * Defines an observable property `element` that follows *corresponding* scope
 * value.
 *
 * @static
 * @memberOf bang.property
 * @param {...string} [dependencies] Dependencies to be injected into
 *  context of `merge`.
 * @param {Function} merge Observable whose values should be merged into watched scope values.
 * @returns {Function} Returns `atc`ifiable element factory method.
 */
bang.property.watch = function () {
	// Ending up at `arguments[-1]` should be avoided as [it behaves
	// inconsistently in
	// Safari](https://twitter.com/timmolendijk/status/578246289554554881).
	// [Very inconsistently](https://twitter.com/timmolendijk/status/57824705145
	// 8273280).
	var merge = arguments.length > 0 ? arguments[arguments.length - 1] : undefined,
		deps = [].slice.call(arguments, 0, arguments.length - 1);

	var fn = function (elementName) {
		// TODO: Make sure that `atc` does not choke on duplicate dependencies.
		return ['Bacon'].concat(deps).concat([function () {
			// TODO: Use `_.omit()`.
			var setupContext = angular.extend({}, this);
			if (deps.indexOf('$scope') === -1)
				delete setupContext.$scope;
			if (deps.indexOf('Bacon') === -1)
				delete setupContext.Bacon;
			return this.Bacon.mergeAll(
				angular.isFunction(merge) ?
					// TODO: Pass `me` to `merge` just like in other helpers?
					merge.call(setupContext) : this.Bacon.never(),
				// TODO: Skipping the initial scope value is gonna be fine
				// *until* somebody writes to $scope during setup. Which is
				// most probably gonna happen.
				// ==> Well no, it's not gonna happen because setup functions
				// do not get a $scope in bang.controller.
				this.$scope.watchAsProperty(elementName).skip(1)
			).toProperty();
		}, function (me) {
			this.$scope.digest(elementName, me);
		}]);
	};
	fn.atcify = true;
	return fn;
};

bang.value = function (value) {
	var fn = function (elementName) {
		return [function () {
			return value;
		}, function (me) {
			this.$scope[elementName] = me;
		}];
	};
	fn.atcify = true;
	return fn;
};

}(window.bang, window.angular, window.Bacon);
