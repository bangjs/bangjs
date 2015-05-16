describe("bang.controller", function () {

	beforeEach(module('bang'));

	var $rootScope, $location, Bacon;
	beforeEach(inject(function (_$rootScope_, _$location_, _Bacon_) {
		$rootScope = _$rootScope_;
		$location = _$location_;
		Bacon = _Bacon_;
	}));

	var bc;
	beforeEach(inject(['bang.controller', function (_bc_) {
		bc = _bc_;
	}]));

	describe("stream", function () {

		it("passes empty stream to setup function", function (done) {

			bc.stream(function (me) {
				expect(me).to.be.instanceof(Bacon.EventStream);
				
				return me.merge(Bacon.once("first!"));
			}).deploy().
			get().onValue(function (value) {
				expect(value).to.equal("first!");

				done();
			});

		});

		it("is chainable", function () {

			var factory = bc.stream();

			expect(factory.chain).is.a.function;
			expect(factory.chain(_.noop).chain).is.a.function;

		});

		it("passes stream through each chained function", function (done) {

			bc.stream(function () {
				return Bacon.once(2);
			}).chain(function (me) {
				return me.map(function (value) {
					return value * 3;
				});
			}).chain(function (me) {
				return Bacon.zipAsArray(me, Bacon.once(1));
			}).deploy().
			get().onValue(function (value) {
				expect(value).to.deep.equal([6, 1]);

				done();
			});

		});

		it("passes deploy context to each chained function", function () {

			var context = {};

			bc.stream(function () {
				expect(this).to.equal(context);
			}).chain(function () {
				expect(this).to.equal(context);
			}).deploy(context).
			get().subscribe(_.noop);

		});

		it("can provide output stream of type `Bacon.EventStream` (singleton)", function () {

			var factory = bc.stream();

			expect(factory.get()).instanceof(Bacon.EventStream);
			expect(factory.get()).to.equal(factory.get());

		});

		it("provides a method for deploying (activating) stream behavior", function () {

			var init = sinon.spy(),
				factory = bc.stream(init);

			expect(init).to.have.not.been.called;

			factory.deploy();

			expect(init).to.have.been.calledOnce;

		});

		it("will not end its output stream when parts of its chain end", function (done) {

			var onEnd = sinon.spy();

			bc.stream(function () {
				return Bacon.fromBinder(function (sink) {
					sink(new Bacon.End());

					_.defer(function () {
						expect(onEnd).to.have.not.been.called;
						done();
					});

					return _.noop;
				});
			}).deploy().
			get().onEnd(onEnd);

		});

	});

	describe("create", function () {

		it("returns object with defined observable fields", function () {

			var a = bc.stream();

			var obj = bc.create({}, {
				a: a
			});

			expect(obj).to.deep.equal({
				a: a.get()
			});

		});

		it("takes in one to many field definition objects", function () {

			var obj = bc.create({}, {
				a: bc.stream()
			}, {
				b: bc.stream()
			});

			expect(obj).to.have.property('a');
			expect(obj).to.have.property('b');

		});

		it("flattens the supplied list of field definition objects", function () {

			var obj = bc.create({}, {
				a: bc.stream()
			}, [{
				b: bc.stream()
			}, {
				c: bc.stream()
			}]);

			expect(obj).to.have.property('a');
			expect(obj).to.have.property('b');
			expect(obj).to.have.property('c');

		});

		it("deep merges multiple field definition objects", function () {

			var obj = bc.create({}, {
				a: bc.stream(),
				nested: {
					x: bc.stream()
				}
			}, {
				b: bc.stream(),
				nested: {
					y: bc.stream()
				}
			});

			expect(obj.nested).to.have.property('x');
			expect(obj.nested).to.have.property('y');

		});

		it("will have instantiated all observables as soon as first one is referred to", function () {

			bc.create({}, {
				a: bc.stream(function () {
					return this.b.doAction(function (value) {
						expect(value).to.equal("b");
					});
				}),
				b: bc.stream(function (me) {
					return me.startWith("b");
				})
			});

		});

	});

});