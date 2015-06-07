describe("bang", function () {

	beforeEach(module('bang'));

	var $rootScope, Bacon, bang;
	beforeEach(inject(function (_$rootScope_, _Bacon_, _bang_) {
		$rootScope = _$rootScope_;
		Bacon = _Bacon_;
		bang = _bang_;
	}));

	describe("promiseConstructor", function () {

		it("is instantiatable into a promise that Bacon can deal with", function (done) {
			
			var circuit = bang.component({}, {});
			
			var promise = new circuit.promiseConstructor(function (resolve) {
				resolve(1);
			});
			
			Bacon.fromPromise(promise).onValue(function (value) {
				expect(value).to.equal(1);
				
				done();
			});
			
			$rootScope.$digest();
			
		});

	});

});