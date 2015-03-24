// TODO: THe angular dependency here is not a true dependency (only used for its
// utiilties), so that would indicate that we can make this thing a stand-alone
// library.
;!function (bang, angular, Bacon) {

var _bang = {};

// TODO: Where do we want to expose these globally?
bang.util = _bang;

// TODO: For properly dealing with the lazyiness issue as reported in my big-ass
// laziness property issue on the bacon github, consider whether there may be
// more concise approaches, such as what the one contributor in that issue
// thread mentioned, sth like: `$(...).asEventStream('x').toProperty(MyNullType).map(...)`
_bang.createProperty = function (value, invalidate, end) {
	var args = [].slice.call(arguments);

	var property = new Bacon.Property(function (sink) {
		var initial = value();
		if (initial !== _bang)	// TODO
			sink(new Bacon.Initial(initial));

		function sinkNext (next) {
			if (arguments.length === 0)
				next = value();

			if (sink(new Bacon.Next(next)) === Bacon.noMore)
				unsubscribe();
		}

		var dispose = [
			invalidate(sinkNext, function () {
				// Strip arguments to make sure we do not accidentally pass
				// on a next value.
				sinkNext();
			})
		];

		if (angular.isFunction(end))
			dispose.push(
				end(function () {
					sink(new Bacon.End());
				})
			);

		function unsubscribe () {
			// TODO: Support nested lists in `dispose`.
			dispose.forEach(function (fn) {
				if (angular.isFunction(fn)) fn();
			});
		}

		return unsubscribe;
	});

	return property.withDescription.apply(
		property,
		[this, 'property'].concat(args)
	);
};

_bang.createPropertyFromObjectProperty = function (object, propertyName) {
	var property = {
		notify: angular.noop
	};
	if (propertyName in object)
		property.value = object[propertyName];

	Object.defineProperty(object, propertyName, {
		get: function () {
			return 'value' in property ? property.value : _bang;	// TODO
		},
		set: function (value) {
			property.value = value;
			property.notify();
		},
		configurable: true
   	});

	return this.createProperty(function () {
		return object[propertyName];
	}, function (next) {
		property.notify = function () {
			next(object[propertyName]);
		};
		return function () {
			property.notify = angular.noop;
		};
	});
};

// Convenience alias
_bang.defineProperty = _bang.createPropertyFromObjectProperty;

_bang.createConditionalProperty = function (observable, condition) {
	return Bacon.combineWith(
		function (value, pass) {
			if (pass !== false) return value;
		}, observable, condition
	).filter(function (value) {
		return value !== undefined;
	}).skipDuplicates();
};

_bang.toString = function () {
	return 'bang';
};

}(window.bang, window.angular, window.Bacon);
