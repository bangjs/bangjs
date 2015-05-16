describe("bang.controller", function () {

	it("registers a controller", function () {

		module(bang.controller('myCtrl', {}));

		inject(function ($controller) {
			expect($controller('myCtrl', { $scope: {} })).to.exist;
		});

	});

	it("makes sure that none of the fields of type `Bacon.Observable` remain lazy", function (done) {

		module('bang', bang.controller('myCtrl', {

			a: ['Bacon', function (deps) {
				return deps.Bacon.once('eager').doAction(function (v) {
					// Not called while this observable is lazy.

					expect(v).to.equal('eager');

					done();
				});
			}]

		}));

		inject(function ($controller) {
			$controller('myCtrl', { $scope: {} });
		});

	});

});