describe("bang.property.watch", function () {

	it("returns a factory method", function () {
		expect(bang.property.watch()).to.be.a.function;
	});

	// Check that it will not end up referencing `arguments[-1]`, as Safari does
	// not [like
	// that](https://twitter.com/timmolendijk/status/578246289554554881) [at
	// all](https://twitter.com/timmolendijk/status/578247051458273280).
	it("does not choke on function as context", function () {
		var spy = sinon.spy();

		var atcDef = bang.property.watch.call(spy)('elementName');

		atcDef[atcDef.length - 2].call({
			Bacon: Bacon,
			$scope: {
				watchAsProperty: sinon.stub().returns(Bacon.never())
			}
		});
		
		expect(spy).to.not.have.been.called;

	});

	it("swallows the initial scope value", function (done) {
		// Initial scope value is always `undefined`, which may not be a
		// desirable value for the resulting observable to hold.

		var atcDef = bang.property.watch()('elementName');

		var observable = atcDef[atcDef.length - 2].call({
			Bacon: Bacon,
			$scope: {
				watchAsProperty: sinon.stub().returns(Bacon.fromArray([undefined, 'user value']))
			}
		});

		observable.onValue(function (value) {
			expect(value).to.equal('user value');

			done();
		});

	});

	it("does not inject `$scope` and `Bacon` into merge function if not explicitly depended on", function (done) {
		var inj = {
			Bacon: Bacon,
			$scope: {
				watchAsProperty: sinon.stub()
			},
			explicitDependency: 'should surive'
		};

		var atcDef = bang.property.watch('explicitDependency', function () {
			expect(this).to.deep.equal(_.pick(inj, 'explicitDependency'));

			done();
		})('elementName');

		var observable = atcDef[atcDef.length - 2].call(inj);

	});

	it("does inject `$scope` and `Bacon` into merge function if explicitly depended on", function (done) {
		var inj = {
			Bacon: Bacon,
			$scope: {
				watchAsProperty: sinon.stub()
			},
			explicitDependency: 'should surive'
		};

		var atcDef = bang.property.watch('explicitDependency', 'Bacon', '$scope', function () {
			expect(this).to.deep.equal(inj);

			done();
		})('elementName');

		var observable = atcDef[atcDef.length - 2].call(inj);

	});

	it("makes initial value configurable by merging an observable with an instantaneous value", function (done) {

		var atcDef = bang.property.watch(function () {
			return Bacon.once('initial value not from scope');
		})('elementName');

		var observable = atcDef[atcDef.length - 2].call({
			Bacon: Bacon,
			$scope: {
				watchAsProperty: sinon.stub().returns(Bacon.fromArray([undefined, 'user value']))
			}
		});

		observable.onValue(function (value) {
			expect(value).to.equal('initial value not from scope');

			done();
		});

	});

});
