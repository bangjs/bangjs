describe("bang.property", function () {
	
	it("delivers a `Bacon.Property` instance", function () {

		module('bang', atc('myCtrl', {
			a: bang.property(angular.noop)
		}));

		inject(['myCtrl.a', function (a) {
			expect(a.instance()).to.be.instanceof(Bacon.Property);
		}]);

	});

	it("can be used as an `angular-testable-controller` field", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.property(['$window', 'Bacon', function () {
				return this.Bacon.constant(this.$window);
			}]),

			b: bang.property(['.a', function () {
				return this.a;
			}])

		}));

		inject(['myCtrl.b', function (b) {
			b.instance().onValue(function (value) {
				expect(value).to.equal(window);

				done();
			});
		}]);

	});

	it("is chainable", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.property(['Bacon', function () {
				return this.Bacon.constant(2);
			}]).chain(function (context, property) {
				return property.map(function (value) {
					return context.$scope[context.name] * value;
				});
			}).chain(['.plus', function (context, property) {
				return property.map(function (value) {
					return value + this.plus;
				}.bind(this));
			}]),

			plus: function () {
				return 3;
			}

		}, function (scope, fields) {
			fields[0].instance(scope).onValue(function (value) {
				expect(value).to.equal(2 * 2 + 3);

				done();
			});
		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: { a: 2 } });
		});

	});

	it("allows base function call to be omitted when using chaining", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.property.chain(['Bacon', function (context) {
				return this.Bacon.constant(context.$scope[context.name]);
			}])

		}, function (scope, fields) {
			fields[0].instance(scope).onValue(function (value) {
				expect(value).to.equal(2);

				done();
			});
		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: { a: 2 } });
		});

	});

	it("merges all dependencies of all chained parts", function () {

		var fn = bang.property(['$window', angular.noop]).
			chain(['$parse', angular.noop]);
		
		var deps = angular.injector().annotate(fn);
		expect(deps).to.include('$window');
		expect(deps).to.include('$parse');
		expect(deps.length).to.equal(2);

	});

	it("can merge in observables", function (done) {

		module('bang', atc('myCtrl', {

			a: function () {
				return 'value of a';
			},

			b: bang.property.merge(['Bacon', '.a', function () {
				return this.Bacon.once(this.a);
			}])

		}));

		inject(['myCtrl.b', function (b) {
			b.instance().onValue(function (value) {
				expect(value).to.equal('value of a');

				done();
			});
		}]);

	});

	it("digests to scope", function (done) {

		var scope = {};

		module('bang', atc('myCtrl', {

			a: bang.property(['Bacon', function () {
				return this.Bacon.once('digestMe');
			}])

		}, function (scope, fields) {

			fields[0].instance(scope).onValue(function (value) {
				expect(scope.a).to.equal(value);

				done();
			});

		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: scope });
		});

	});

});