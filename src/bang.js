;!function (angular) { 'use strict';

angular.module('bang').

service('bang', ['$parse', '$q', '$log', 'Bacon', function ($parse, $q, $log, Bacon) {
	
	this.create = function (external) {
		var fields = [].slice.call(arguments, 1);

		fields = angular.extend.apply(angular, [{}].concat(
			flattenArray(fields).map(function (field) {
				return unnestKeys(field);
			})
		));

		var internal = {};

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				$parse(name).assign(internal, field.observable());
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				field.start(internal, name, external);
		});

		angular.forEach(fields, function (field, name) {
			if (field instanceof Factory)
				field.observable().subscribe(function (event) {

					var eventTypeColor = "SaddleBrown";
					if (event.isInitial())
						eventTypeColor = "Peru";
					if (event.isError())
						eventTypeColor = "Crimson";

					$log.debug(["%c\uD83D\uDCA5%s", "%c%s", "%c%s"].join(" "),
						"color: Gray", external.$id || external,
						"color: " + eventTypeColor, name,
						"color: Gray", "=", //field instanceof PropertyFactory ? "=" : "\u2192",
						event.isError() ? event.error : event.value()
					);

				});
		});

		return internal;
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
	
	this.stream = function (setup) {
		return new Factory(setup, Bacon.EventStream);
	};
	
	this.stream.expose = function (setup) {
		var factory = this(function (name, external) {
			$parse(name).assign(external, factory.observable());
			return setup.apply(this, arguments);
		});
		return factory;
	};
	
	this.stream.function = function (flatMapLatest) {
		return this(function (name, external) {
			var bus = new Bacon.Bus();
			$parse(name).assign(external, function () {
				var args = arguments;
				// TODO: Can we make `.firstToPromise()` work with `$q`?
				return $q(function (resolve, reject) {
					// TODO: Unplug at any point in time??
					bus.plug(
						Bacon.once(true).flatMapLatest(function () {
							return flatMapLatest.apply(this, args);
						}).doAction(resolve).doError(reject)
					);
				});
			});
			return bus;
		});
	};
	
	this.property = function (setup) {
		return new Factory(setup, Bacon.Property);
	};
	
	this.property.expose = function (setup) {
		var factory = this(function (name, external) {
			$parse(name).assign(external, factory.observable());
			return setup.apply(this, arguments);
		});
		return factory;
	};
	
	this.property.digest = function (setup) {
		return this(function (name, external) {
			var assign = $parse(name).assign;
			return setup.apply(this, arguments).doAction(function (value) {
				if (angular.isFunction(external.$evalAsync))
					external.$evalAsync(function () {
						assign(external, value);
					});
				else
					assign(external, value);
			});
		});
	};
	
	this.property.watch = function (merge) {
		return this.digest(function (name, external) {
			return Bacon.mergeAll(
				Bacon.fromBinder(function (sink) {
					if (angular.isFunction(external.$watch))
						external.$watch(name, function (value) {
							sink(new Bacon.Next(value));
						});
				}).skipDuplicates().skip(1),
				merge.call(this)
			).skipDuplicates();
		});
	};
	
	function Factory(setup, Type) {
		var bus = new Bacon.Bus();
		
		var observable = bus.toProperty();
		if (Type === Bacon.EventStream) 
			observable = observable.toEventStream();
		
		this.observable = function () {
			return observable;
		};
		
		this.start = function (internal, name, external) {
			var result = setup.call(internal, name, external);
			
			if (result instanceof Bacon.Bus)
				result = result.toProperty();
			if (result instanceof Bacon.Property)
				result = result.toEventStream();
			if (result instanceof Bacon.EventStream)
				bus.plug(result);
			
			delete this.start;
			
			return this;
		};
	}
	
}]);

}(window.angular);