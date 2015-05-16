;!function (angular) { 'use strict';

angular.module('bang').

/**
@ngdoc service
@name bang.controller
@module bang
@description

Exposes tools to build controllers.
*/
service('bang.controller', ['$parse', 'Bacon', function ($parse, Bacon) {

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#create
	 */
	this.create = function (scope) {
		var fields = [].slice.call(arguments, 1);

		fields = angular.extend.apply(angular, [{}].concat(
			flattenArray(fields).map(function (field) {
				return unnestKeys(field);
			})
		));

		var context = {};

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				$parse(name).assign(context, field.get());
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof PropertyFactory)
				field.chain(function (me) {
					return scope.digestObservable(name, me);
				});
			if (field instanceof Factory)
				field.deploy(context, name, scope);
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				field.get().subscribe(angular.noop);
		});

		return context;
	};

	function unnestKeys (obj, path) {
		path = path || [];
		var flat = {};
		angular.forEach(obj, function (value, key) {
			var thisPath = path.concat([key]);
			if (value instanceof Factory)
				flat[thisPath.join('.')] = value;
			else
				angular.extend(flat, unnestKeys(value, thisPath));
		});
		return flat;
	}

	function flattenArray (array) {
		var flat = [];
		array.forEach(function (item) {
			if (angular.isArray(item))
				flat.push.apply(flat, flattenArray(item));
			else
				flat.push(item);
		});
		return flat;
	}
	
	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#stream
	 */
	this.stream = function (init) {

		return new StreamFactory(init);

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#stream.calls
	 */
	this.stream.calls = function (arg) {

		return this(function (me, name, scope) {
			var stream = scope.functionAsStream(name);
			if (arguments.length > 0)
				stream = stream.map('.' + arg);
			return stream;
		});

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#property
	 */
	this.property = function (init) {

		return new PropertyFactory(init);

	};

	/**
	 * @ngdoc method
	 * @name module:bang.service:bang.controller#property.watch
	 */
	this.property.watch = function (merge) {

		return this(function (me, name, scope) {
			var stream = scope.watchAsProperty(name).changes();
			if (angular.isFunction(merge))
				stream = Bacon.mergeAll(stream, merge.call(this));
			return stream;
		});

	};

	function Factory () {}

	function StreamFactory (init) {
		var chain = [];
		this.chain = function (fn) {
			if (fn) chain.push(fn);
			return this;
		};

		this.chain(init);

		var bus = new Bacon.Bus();

		var get = bus.toProperty().toEventStream();
		this.get = function () {
			return get;
		};

		this.deploy = function (context, name, scope) {
			var chained = chain.reduce(function (observable, fn) {

				var result = fn.call(context, observable, name, scope);

				// TODO: Support more non-EventStream types?
				if (result instanceof Bacon.Bus)
					result = result.toProperty();
				if (result instanceof Bacon.Property)
					result = result.toEventStream();

				return result instanceof Bacon.EventStream ? result : observable;

			}, Bacon.never());

			bus.plug(chained);

			delete this.deploy;

			return this;
		};
	}
	StreamFactory.prototype = new Factory();
	StreamFactory.prototype.constructor = StreamFactory;

	function PropertyFactory (init) {
		var chain = [];
		this.chain = function (fn) {
			if (fn) chain.push(fn);
			return this;
		};

		this.chain(init);

		var bus = new Bacon.Bus();

		var get = bus.toProperty();
		this.get = function () {
			return get;
		};

		this.deploy = function (context, name, scope) {
			var chained = chain.reduce(function (observable, fn) {

				var result = fn.call(context, observable, name, scope);

				// TODO: Support more non-EventStream types?
				if (result instanceof Bacon.Bus)
					result = result.toProperty();
				if (result instanceof Bacon.Property)
					result = result.toEventStream();

				return result instanceof Bacon.EventStream ? result : observable;

			}, Bacon.never());

			bus.plug(chained);

			delete this.deploy;

			return this;
		};
	}
	PropertyFactory.prototype = new Factory();
	PropertyFactory.prototype.constructor = PropertyFactory;

}]);

}(window.angular);