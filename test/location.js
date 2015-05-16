describe("bang.location", function () {

	beforeEach(module('bang'));

	var $location, Bacon;
	beforeEach(inject(function (_$location_, _Bacon_) {
		$location = _$location_;
		Bacon = _Bacon_;
	}));

	var bl;
	beforeEach(inject(['bang.location', function (_bl_) {
		bl = _bl_;
	}]));

	describe("asProperty", function () {

		it("provides `$location` as the callback context", function () {

			bl.asProperty(function () {
				expect(this).to.equal($location);
			});

		});

	});

	it("exposes all functions from service `bang.location` on `$location`", function () {

		expect(Object.keys(Object.getPrototypeOf($location))).to.include.members(Object.keys(bl));

	});

});