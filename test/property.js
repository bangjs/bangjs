describe("bang.property", function () {
	
	it("delivers a `Bacon.Property` instance", function () {

		module('bang', atc('myCtrl', {
			a: bang.property(angular.noop)
		}));

		inject(['myCtrl.a', function (a) {
			expect(a.instance()).to.be.instanceof(Bacon.Property);
		}]);

	});

	it("can merge in observables", function (done) {

		module('bang', atc('myCtrl', {

			a: bang.service(function () {
				return 'value of a';
			}),

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