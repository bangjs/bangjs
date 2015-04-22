describe("bang.service", function () {

	it("can be used as an `angular-testable-controller` field", function () {

		module('bang', atc('myCtrl', {

			a: bang.service(['$window', function () {
				return this.$window;
			}]),

			b: bang.service(['.a', function () {
				return this.a;
			}])

		}));

		inject(['myCtrl.b', function (b) {
			expect(b.instance()).to.equal(window);
		}]);

	});

	it("is chainable", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.service(function () {
				return 2;
			}).chain(function (context, value) {
				return context.$scope[context.name] * value;
			}).chain(['.plus', function (context, value) {
				return value + this.plus;
			}]),

			plus: bang.service(function () {
				return 3;
			})

		}, function (scope, fields) {
			expect(fields[0].instance(scope)).to.equal(2 * 2 + 3);

			done();
		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: { a: 2 } });
		});

	});

	it("allows base function call to be omitted when using chaining", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.service.chain(function (context) {
				return context.$scope[context.name];
			})

		}, function (scope, fields) {
			expect(fields[0].instance(scope)).to.equal(2);

			done();
		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: { a: 2 } });
		});

	});

	it("merges all dependencies of all chained parts", function () {

		var fn = bang.service(['$window', angular.noop]).
			chain(['$parse', angular.noop]);
		
		expect(angular.injector().annotate(fn)).to.deep.equal(['$window', '$parse']);

	});

});